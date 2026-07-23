/**
 * Import Brooklyn teachers / students / classes / weekly schedules from Google Calendar .ics export.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx ./scripts/import-brooklyn-ical.ts
 *   node --env-file=.env.local --import tsx ./scripts/import-brooklyn-ical.ts --apply
 *   node --env-file=.env.local --import tsx ./scripts/import-brooklyn-ical.ts --backfill-grades
 *   node --env-file=.env.local --import tsx ./scripts/import-brooklyn-ical.ts --backfill-schedule-students
 *
 * Default is dry-run preview only. --apply wipes Brooklyn campus data then inserts.
 * --backfill-grades updates enrollments.grade_level from SUMMARY patterns without wiping.
 * --backfill-schedule-students sets class_schedules.student_id from ICS (Brooklyn only).
 * Staten Island is never modified.
 *
 * Classes are consolidated: one class per (teacher, subject, lesson_type, duration_minutes).
 * Each ICS series becomes an enrollment (+ weekly schedule rows) on that shared class.
 * Schedule rows store student_id when the series maps to a single student cleanly.
 * Grade levels stay on enrollments.grade_level (default G0-2).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { inferClassTrackFromSubject } from "@/lib/class-track";
import {
  DEFAULT_GRADE_LEVEL,
  parseGradeLevelFromSummary,
  type GradeLevelOption,
} from "@/lib/class-subject";
import type { Database } from "@/types/database.types";

const ICS_DIR =
  process.env.ICS_DIR?.trim() ||
  "/Users/danielchen/Downloads/theonemusic99@gmail.com.ical";

const BROOKLYN_LOCATION_ID = 1;
const APPLY = process.argv.includes("--apply");
const BACKFILL_GRADES = process.argv.includes("--backfill-grades");
const BACKFILL_SCHEDULE_STUDENTS = process.argv.includes(
  "--backfill-schedule-students",
);

const BYDAY_TO_DOW: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

type LessonType = "private" | "group" | "trial";

type ParsedSeries = {
  calendarName: string;
  teacherName: string;
  summaryRaw: string;
  studentNames: string[];
  subject: string;
  gradeLevel: GradeLevelOption;
  lessonType: LessonType;
  durationMinutes: number;
  daysOfWeek: number[];
  startTime: string; // HH:MM:SS
  endTime: string;
  rrule: string;
  sourceFile: string;
};

type Preview = {
  teachers: { key: string; firstName: string; lastName: string | null }[];
  students: { key: string; firstName: string; lastName: string | null }[];
  classes: {
    teacherKey: string;
    studentKeys: string[];
    subject: string;
    gradeLevel: GradeLevelOption;
    lessonType: LessonType;
    durationMinutes: number;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    summaryRaw: string;
  }[];
  skipped: { reason: string; count: number }[];
};

function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function getProp(block: string, prop: string): string | null {
  const match = new RegExp(`(?:^|\\n)${prop}(?:;[^:\\n]*)?:(.+)`).exec(block);
  if (!match) return null;
  return match[1].trim().replace(/\\,/g, ",").replace(/\\n/g, " ").replace(/\\\\/g, "\\");
}

function stripPhoneAndLabels(name: string) {
  return name
    .replace(/\d[\d\s\-().]{6,}\d/g, " ")
    .replace(/老师/g, " ")
    .replace(/[|/／]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPersonName(raw: string): { firstName: string; lastName: string | null } {
  const cleaned = raw
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return { firstName: "Unknown", lastName: null };
  }

  // Chinese names without spaces: keep as first name
  if (!/\s/.test(cleaned) && /[\u4e00-\u9fff]/.test(cleaned)) {
    return { firstName: cleaned, lastName: null };
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: null };
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

function inferSubject(calendarName: string, summary: string): string {
  const hay = `${calendarName} ${summary}`;
  if (/乐理/.test(hay)) return "Music Theory";
  if (/声乐|Singing|Voice|vocal/i.test(hay)) return "Singing / Voice";
  if (/小提琴|Violin/i.test(hay)) return "Violin";
  if (/古筝|Guzheng|Zither/i.test(hay)) return "Guzheng";
  if (/架子鼓|Drum/i.test(hay) || (/鼓/.test(hay) && !/古筝/.test(hay))) {
    return "Drums";
  }
  if (/吉他|Guitar/i.test(hay)) return "Guitar";
  if (/大提琴|Cello/i.test(hay)) return "Cello";
  if (/画画|美术|\bArt\b/i.test(hay)) return "Art";
  if (/钢琴|Piano/i.test(hay)) return "Piano";
  // Default from teacher calendar instrument guess
  if (/画画|美术/.test(calendarName)) return "Art";
  if (/吉他/.test(calendarName)) return "Guitar";
  if (/钢琴/.test(calendarName)) return "Piano";
  return "Piano";
}

function cleanStudentToken(token: string) {
  return token
    .replace(
      /声乐|钢琴|吉他|小提琴|大提琴|古筝|架子鼓|画画|美术|试课|乐理|小组课?|老师转?/g,
      " ",
    )
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/[\\/|／、,，]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStudentNames(summary: string): string[] {
  let body = summary.trim();
  // Group lesson: 乐理小组课（sien\sophia） or （a、b）
  const groupMatch = /[（(]([^）)]+)[）)]/.exec(body);
  if (/小组/.test(body) && groupMatch) {
    const inner = groupMatch[1]!.replace(/\\/g, " ");
    return inner
      .split(/[、,，\/]/)
      .map((part) => cleanStudentToken(part))
      .filter(Boolean);
  }

  const cleaned = cleanStudentToken(body);
  return cleaned ? [cleaned] : [];
}

function isSkippableSummary(summary: string) {
  const s = summary.toLowerCase();
  return (
    !summary.trim() ||
    s.includes("lunch") ||
    summary.includes("试课") ||
    s.includes("holiday") ||
    s.includes("closed") ||
    s.includes("regents") ||
    s.includes("veterans")
  );
}

function parseUntilUtc(rrule: string): Date | null {
  const match = /UNTIL=(\d{8}T\d{6})Z?/.exec(rrule);
  if (!match) return null;
  const raw = match[1]!;
  const y = Number(raw.slice(0, 4));
  const mo = Number(raw.slice(4, 6));
  const d = Number(raw.slice(6, 8));
  const h = Number(raw.slice(9, 11));
  const mi = Number(raw.slice(11, 13));
  const s = Number(raw.slice(13, 15));
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

function parseIcsDateTime(value: string): { utc: boolean; date: Date } | null {
  // 20240928T111500Z or 20240810T160000
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6]);
  const utc = Boolean(m[7]);
  if (utc) {
    return { utc: true, date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)) };
  }
  // Floating: treat as America/New_York wall time by constructing a UTC instant
  // via formatter round-trip is hard; store wall clock directly from components.
  return {
    utc: false,
    date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)),
  };
}

function formatNyTime(dt: { utc: boolean; date: Date }): string {
  if (!dt.utc) {
    const h = dt.date.getUTCHours();
    const mi = dt.date.getUTCMinutes();
    const s = dt.date.getUTCSeconds();
    return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(dt.date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}:${get("second")}`;
}

function durationMinutesBetween(
  start: { utc: boolean; date: Date },
  end: { utc: boolean; date: Date },
) {
  const ms = end.date.getTime() - start.date.getTime();
  const mins = Math.round(ms / 60000);
  if (mins <= 0 || mins > 240) return 45;
  return mins;
}

function personKey(firstName: string, lastName: string | null) {
  return `${firstName} ${lastName ?? ""}`.trim().toLowerCase();
}

/** Strip trailing instrument labels so "Adryan-小提琴" matches DB "Adryan". */
function teacherLookupKey(firstName: string, lastName: string | null) {
  return personKey(firstName, lastName)
    .replace(
      /[-–—\s]*(小提琴|钢琴|吉他|古筝|架子鼓|声乐|大提琴|鼓|画画|美术|piano|violin|guitar|cello|drums?|guzheng|zither|voice|singing|art)\s*$/iu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function classGroupKey(cls: {
  teacherKey: string;
  subject: string;
  lessonType: LessonType;
  durationMinutes: number;
}) {
  return `${cls.teacherKey}|${cls.subject}|${cls.lessonType}|${cls.durationMinutes}`;
}

function preferGradeLevel(
  current: GradeLevelOption | undefined,
  next: GradeLevelOption,
): GradeLevelOption {
  if (!current || current === DEFAULT_GRADE_LEVEL) return next;
  return current;
}

type ConsolidatedScheduleSlot = {
  /** Set when the ICS series maps to exactly one student; otherwise null (shared/group). */
  studentKey: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ConsolidatedClass = {
  teacherKey: string;
  subject: string;
  lessonType: LessonType;
  durationMinutes: number;
  /** studentKey -> grade_level */
  students: Map<string, GradeLevelOption>;
  /**
   * Unique meeting slots for the class.
   * Key is `${studentKey ?? "shared"}|${dow}|${start}|${end}` so two private
   * students at the same clock time keep separate rows.
   */
  schedules: Map<string, ConsolidatedScheduleSlot>;
};

function consolidateClasses(
  seriesClasses: Preview["classes"],
): ConsolidatedClass[] {
  const groups = new Map<string, ConsolidatedClass>();

  for (const cls of seriesClasses) {
    const key = classGroupKey(cls);
    let group = groups.get(key);
    if (!group) {
      group = {
        teacherKey: cls.teacherKey,
        subject: cls.subject,
        lessonType: cls.lessonType,
        durationMinutes: cls.durationMinutes,
        students: new Map(),
        schedules: new Map(),
      };
      groups.set(key, group);
    }

    const grade = cls.gradeLevel || DEFAULT_GRADE_LEVEL;
    for (const studentKey of cls.studentKeys) {
      group.students.set(
        studentKey,
        preferGradeLevel(group.students.get(studentKey), grade),
      );
    }

    // Private 1:1: attach the sole student. Multi-student series (siblings/group)
    // keep a shared unassigned slot so we do not invent a false pairing.
    const soleStudentKey =
      cls.studentKeys.length === 1 ? cls.studentKeys[0]! : null;

    for (const dayOfWeek of cls.daysOfWeek) {
      const ownerKey = soleStudentKey ?? "shared";
      const scheduleKey = `${ownerKey}|${dayOfWeek}|${cls.startTime}|${cls.endTime}`;
      if (!group.schedules.has(scheduleKey)) {
        group.schedules.set(scheduleKey, {
          studentKey: soleStudentKey,
          dayOfWeek,
          startTime: cls.startTime,
          endTime: cls.endTime,
        });
      }
    }
  }

  return [...groups.values()].sort((a, b) =>
    classGroupKey(a).localeCompare(classGroupKey(b)),
  );
}

function normalizeScheduleTime(time: string | null | undefined) {
  if (!time) return "";
  return time.slice(0, 8);
}

function parseAllIcs(dir: string): { series: ParsedSeries[]; skipped: Map<string, number> } {
  const skipped = new Map<string, number>();
  const bump = (reason: string) =>
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1);

  const series: ParsedSeries[] = [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".ics"));
  const now = new Date();

  for (const file of files) {
    const path = join(dir, file);
    const raw = unfoldIcs(readFileSync(path, "utf8"));
    const calMatch = /X-WR-CALNAME:(.+)/.exec(raw);
    const calendarName = (calMatch?.[1] ?? file).trim();

    // Skip personal holiday-heavy primary inbox-style calendar if mostly non-lessons
    if (calendarName === "theonemusic99@gmail.com") {
      bump("skipped_primary_calendar");
      continue;
    }

    const blocks = raw.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
    if (blocks.length === 0) {
      bump("empty_calendar");
      continue;
    }

    for (const full of blocks) {
      const block = full.replace(/^BEGIN:VEVENT/, "").replace(/END:VEVENT$/, "");
      const summary = getProp(block, "SUMMARY") ?? "";
      const rrule = getProp(block, "RRULE");
      const dtstartRaw = getProp(block, "DTSTART");
      const dtendRaw = getProp(block, "DTEND");

      if (!rrule) {
        bump("no_rrule");
        continue;
      }
      if (isSkippableSummary(summary)) {
        bump("skippable_summary");
        continue;
      }
      if (!dtstartRaw || !dtendRaw || !dtstartRaw.includes("T")) {
        bump("not_timed");
        continue;
      }

      const until = parseUntilUtc(rrule);
      if (until && until < now) {
        bump("ended_rrule");
        continue;
      }

      const start = parseIcsDateTime(dtstartRaw);
      const end = parseIcsDateTime(dtendRaw);
      if (!start || !end) {
        bump("bad_datetime");
        continue;
      }

      const bydayMatch = /BYDAY=([A-Z,]+)/.exec(rrule);
      const daysOfWeek = (bydayMatch?.[1] ?? "")
        .split(",")
        .map((d) => BYDAY_TO_DOW[d])
        .filter((d): d is number => d !== undefined);
      if (daysOfWeek.length === 0) {
        bump("no_byday");
        continue;
      }

      const studentNames = parseStudentNames(summary);
      if (studentNames.length === 0) {
        bump("no_student_name");
        continue;
      }

      const subject = inferSubject(calendarName, summary);
      const gradeLevel = parseGradeLevelFromSummary(summary);
      const lessonType: LessonType = /小组/.test(summary) ? "group" : "private";

      series.push({
        calendarName,
        teacherName: stripPhoneAndLabels(calendarName),
        summaryRaw: summary,
        studentNames,
        subject,
        gradeLevel,
        lessonType,
        durationMinutes: durationMinutesBetween(start, end),
        daysOfWeek,
        startTime: formatNyTime(start),
        endTime: formatNyTime(end),
        rrule,
        sourceFile: file,
      });
    }
  }

  return { series, skipped };
}

function buildPreview(series: ParsedSeries[], skipped: Map<string, number>): Preview {
  const teacherMap = new Map<
    string,
    { key: string; firstName: string; lastName: string | null }
  >();
  const studentMap = new Map<
    string,
    { key: string; firstName: string; lastName: string | null }
  >();
  const classes: Preview["classes"] = [];

  for (const item of series) {
    const teacherParts = splitPersonName(item.teacherName);
    const teacherKey = personKey(teacherParts.firstName, teacherParts.lastName);
    if (!teacherMap.has(teacherKey)) {
      teacherMap.set(teacherKey, {
        key: teacherKey,
        firstName: teacherParts.firstName,
        lastName: teacherParts.lastName,
      });
    }

    const studentKeys: string[] = [];
    for (const name of item.studentNames) {
      const parts = splitPersonName(name);
      const key = personKey(parts.firstName, parts.lastName);
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          key,
          firstName: parts.firstName,
          lastName: parts.lastName,
        });
      }
      studentKeys.push(key);
    }

    classes.push({
      teacherKey,
      studentKeys,
      subject: item.subject,
      gradeLevel: item.gradeLevel,
      lessonType: item.lessonType,
      durationMinutes: item.durationMinutes,
      daysOfWeek: item.daysOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      summaryRaw: item.summaryRaw,
    });
  }

  return {
    teachers: [...teacherMap.values()].sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    students: [...studentMap.values()].sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    classes,
    skipped: [...skipped.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}

async function deleteInBatches(
  label: string,
  run: () => Promise<{ error: { message: string } | null }>,
) {
  const { error } = await run();
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function wipeBrooklyn(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
) {
  console.log("Wiping Brooklyn campus data (location_id=1)…");

  const { data: classRows, error: classErr } = await supabase
    .from("classes")
    .select("id")
    .eq("location_id", BROOKLYN_LOCATION_ID);
  if (classErr) throw new Error(classErr.message);
  const classIds = (classRows ?? []).map((r) => r.id);

  const { data: studentRows, error: studentErr } = await supabase
    .from("students")
    .select("id")
    .eq("location_id", BROOKLYN_LOCATION_ID);
  if (studentErr) throw new Error(studentErr.message);
  const studentIds = (studentRows ?? []).map((r) => r.id);

  const { data: teacherRows, error: teacherErr } = await supabase
    .from("teachers")
    .select("id")
    .eq("location_id", BROOKLYN_LOCATION_ID);
  if (teacherErr) throw new Error(teacherErr.message);
  const teacherIds = (teacherRows ?? []).map((r) => r.id);

  console.log(
    `  Found ${classIds.length} classes, ${studentIds.length} students, ${teacherIds.length} teachers`,
  );

  // Unlink member accounts / leads first
  if (studentIds.length > 0) {
    await deleteInBatches("unlink member_accounts.student_id", () =>
      supabase
        .from("member_accounts")
        .update({ student_id: null })
        .in("student_id", studentIds),
    );
    await deleteInBatches("unlink leads.student_id", () =>
      supabase.from("leads").update({ student_id: null }).in("student_id", studentIds),
    );
    await deleteInBatches("unlink lead_children.student_id", () =>
      supabase
        .from("lead_children")
        .update({ student_id: null })
        .in("student_id", studentIds),
    );
  }
  if (teacherIds.length > 0) {
    await deleteInBatches("unlink member_accounts.teacher_id", () =>
      supabase
        .from("member_accounts")
        .update({ teacher_id: null })
        .in("teacher_id", teacherIds),
    );
  }

  if (classIds.length > 0) {
    const { data: scheduleRows, error: schedErr } = await supabase
      .from("class_schedules")
      .select("id")
      .in("class_id", classIds);
    if (schedErr) throw new Error(schedErr.message);
    const scheduleIds = (scheduleRows ?? []).map((r) => r.id);

    if (scheduleIds.length > 0) {
      await deleteInBatches("class_schedule_exceptions", () =>
        supabase
          .from("class_schedule_exceptions")
          .delete()
          .in("schedule_id", scheduleIds),
      );
      await deleteInBatches("class_attendance(sched)", () =>
        supabase
          .from("class_attendance")
          .delete()
          .in("class_schedule_id", scheduleIds),
      );
      await deleteInBatches("class_makeup_sessions(sched)", () =>
        supabase
          .from("class_makeup_sessions")
          .delete()
          .in("class_schedule_id", scheduleIds),
      );
      await deleteInBatches("class_session_records(sched)", () =>
        supabase
          .from("class_session_records")
          .delete()
          .in("class_schedule_id", scheduleIds),
      );
      await deleteInBatches("student_class_history(sched)", () =>
        supabase
          .from("student_class_history")
          .delete()
          .in("class_schedule_id", scheduleIds),
      );
      await deleteInBatches("class_schedules", () =>
        supabase.from("class_schedules").delete().in("id", scheduleIds),
      );
    }

    const classChildTables = [
      "enrollments",
      "class_attendance",
      "class_credit_grants",
      "class_credit_transfers",
      "class_credit_writeoffs",
      "class_makeup_sessions",
      "class_payments",
      "class_price_promotions",
      "class_session_records",
      "student_class_balances",
      "student_class_history",
      "teacher_class_pay_rates",
      "teacher_paycheck_lines",
    ] as const;

    for (const table of classChildTables) {
      if (table === "enrollments") {
        await deleteInBatches("enrollments(class)", () =>
          supabase.from("enrollments").delete().in("class id", classIds),
        );
      } else if (table === "class_credit_transfers") {
        await deleteInBatches("class_credit_transfers", () =>
          supabase.from("class_credit_transfers").delete().in("class_id", classIds),
        );
      } else {
        await deleteInBatches(table, () =>
          // @ts-expect-error dynamic table
          supabase.from(table).delete().in("class_id", classIds),
        );
      }
    }

    await deleteInBatches("classes", () =>
      supabase.from("classes").delete().in("id", classIds),
    );
  }

  if (studentIds.length > 0) {
    await deleteInBatches("enrollments(student)", () =>
      supabase.from("enrollments").delete().in("student id", studentIds),
    );
    await deleteInBatches("addresses", () =>
      supabase.from("addresses").delete().in("student", studentIds),
    );
    await deleteInBatches("class_attendance(student)", () =>
      supabase.from("class_attendance").delete().in("student_id", studentIds),
    );
    await deleteInBatches("class_credit_grants(student)", () =>
      supabase.from("class_credit_grants").delete().in("student_id", studentIds),
    );
    await deleteInBatches("class_credit_writeoffs(student)", () =>
      supabase
        .from("class_credit_writeoffs")
        .delete()
        .in("student_id", studentIds),
    );
    await deleteInBatches("class_makeup_sessions(student)", () =>
      supabase
        .from("class_makeup_sessions")
        .delete()
        .in("student_id", studentIds),
    );
    await deleteInBatches("class_payments(student)", () =>
      supabase.from("class_payments").delete().in("student_id", studentIds),
    );
    await deleteInBatches("class_session_records(student)", () =>
      supabase
        .from("class_session_records")
        .delete()
        .in("student_id", studentIds),
    );
    await deleteInBatches("student_class_balances(student)", () =>
      supabase
        .from("student_class_balances")
        .delete()
        .in("student_id", studentIds),
    );
    await deleteInBatches("student_class_history(student)", () =>
      supabase
        .from("student_class_history")
        .delete()
        .in("student_id", studentIds),
    );
    await deleteInBatches("student_purchases", () =>
      supabase.from("student_purchases").delete().in("student_id", studentIds),
    );
    await deleteInBatches("class_credit_transfers from", () =>
      supabase
        .from("class_credit_transfers")
        .delete()
        .in("from_student_id", studentIds),
    );
    await deleteInBatches("class_credit_transfers to", () =>
      supabase
        .from("class_credit_transfers")
        .delete()
        .in("to_student_id", studentIds),
    );
    await deleteInBatches("students", () =>
      supabase.from("students").delete().in("id", studentIds),
    );
  }

  if (teacherIds.length > 0) {
    // paycheck lines already cleared via class; clear paychecks
    const { data: paychecks, error: payErr } = await supabase
      .from("teacher_paychecks")
      .select("id")
      .in("teacher_id", teacherIds);
    if (payErr) throw new Error(payErr.message);
    const paycheckIds = (paychecks ?? []).map((p) => p.id);
    if (paycheckIds.length > 0) {
      await deleteInBatches("teacher_paycheck_lines(paycheck)", () =>
        supabase
          .from("teacher_paycheck_lines")
          .delete()
          .in("paycheck_id", paycheckIds),
      );
      await deleteInBatches("teacher_paychecks", () =>
        supabase.from("teacher_paychecks").delete().in("id", paycheckIds),
      );
    }
    await deleteInBatches("teacher_class_pay_rates(teacher)", () =>
      supabase
        .from("teacher_class_pay_rates")
        .delete()
        .in("teacher_id", teacherIds),
    );
    await deleteInBatches("teachers", () =>
      supabase.from("teachers").delete().in("id", teacherIds),
    );
  }

  console.log("Brooklyn wipe complete.");
}

async function applyImport(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  preview: Preview,
) {
  await wipeBrooklyn(supabase);

  console.log("Inserting teachers…");
  const teacherInserts = preview.teachers.map((t) => ({
    first_name: t.firstName,
    last_name: t.lastName,
    location_id: BROOKLYN_LOCATION_ID,
    is_active: true,
  }));

  const { data: insertedTeachers, error: teacherInsErr } = await supabase
    .from("teachers")
    .insert(teacherInserts as Database["public"]["Tables"]["teachers"]["Insert"][])
    .select("id, first_name, last_name");
  if (teacherInsErr) throw new Error(teacherInsErr.message);

  const teacherIdByKey = new Map<string, number>();
  for (const row of insertedTeachers ?? []) {
    const r = row as {
      id: number;
      first_name: string;
      last_name: string | null;
    };
    teacherIdByKey.set(personKey(r.first_name, r.last_name), r.id);
  }

  console.log("Inserting students…");
  type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
  const studentInserts: StudentInsert[] = preview.students.map((s) => ({
    "first name": s.firstName,
    "last name": s.lastName,
    location_id: BROOKLYN_LOCATION_ID,
    is_active: true,
  }));

  // Insert in chunks of 100; map IDs by insert order within each chunk
  const studentIdByKey = new Map<string, number>();
  for (let i = 0; i < studentInserts.length; i += 100) {
    const chunk = studentInserts.slice(i, i + 100);
    const keys = preview.students.slice(i, i + 100).map((s) => s.key);
    const { data, error } = await supabase
      .from("students")
      .insert(chunk)
      .select("id");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length !== keys.length) {
      throw new Error(
        `Student insert mismatch: inserted ${rows.length}, expected ${keys.length}`,
      );
    }
    for (let j = 0; j < rows.length; j++) {
      studentIdByKey.set(keys[j]!, rows[j]!.id);
    }
  }

  console.log("Inserting classes, enrollments, schedules…");
  const consolidated = consolidateClasses(preview.classes);
  let classCount = 0;
  let enrollmentCount = 0;
  let scheduleCount = 0;

  for (const cls of consolidated) {
    const teacherId = teacherIdByKey.get(cls.teacherKey);
    if (!teacherId) {
      console.warn(`  skip class, missing teacher ${cls.teacherKey}`);
      continue;
    }

    const studentEntries = [...cls.students.entries()]
      .map(([key, gradeLevel]) => {
        const studentId = studentIdByKey.get(key);
        if (typeof studentId !== "number") return null;
        return { studentId, gradeLevel };
      })
      .filter(
        (row): row is { studentId: number; gradeLevel: GradeLevelOption } =>
          row != null,
      );

    if (studentEntries.length === 0) {
      console.warn(
        `  skip class, no students for ${cls.subject} / ${cls.teacherKey}`,
      );
      continue;
    }

    const { data: classRow, error: classInsErr } = await supabase
      .from("classes")
      .insert({
        subject: cls.subject,
        teacher_id: teacherId,
        duration_minutes: cls.durationMinutes,
        lesson_type: cls.lessonType,
        class_track: inferClassTrackFromSubject(cls.subject),
        location_id: BROOKLYN_LOCATION_ID,
        is_active: true,
      })
      .select("id")
      .single();
    if (classInsErr) throw new Error(classInsErr.message);
    const classId = classRow.id;
    classCount += 1;

    const enrollmentRows = studentEntries.map(({ studentId, gradeLevel }) => ({
      "class id": classId,
      "student id": studentId,
      is_active: true,
      grade_level: gradeLevel || DEFAULT_GRADE_LEVEL,
    }));
    const { error: enrErr } = await supabase
      .from("enrollments")
      .insert(enrollmentRows);
    if (enrErr) throw new Error(enrErr.message);
    enrollmentCount += enrollmentRows.length;

    const scheduleRows = [...cls.schedules.values()].map((slot) => ({
      class_id: classId,
      student_id: slot.studentKey
        ? (studentIdByKey.get(slot.studentKey) ?? null)
        : null,
      is_recurring: true,
      schedule_day_of_week: slot.dayOfWeek,
      schedule_date: null,
      schedule_start_time: slot.startTime,
      schedule_end_time: slot.endTime,
    }));
    if (scheduleRows.length > 0) {
      const { error: schedInsErr } = await supabase
        .from("class_schedules")
        .insert(scheduleRows);
      if (schedInsErr) throw new Error(schedInsErr.message);
      scheduleCount += scheduleRows.length;
    }
  }

  console.log(
    `Inserted: ${classCount} classes (from ${preview.classes.length} ICS series), ${enrollmentCount} enrollments, ${scheduleCount} schedules`,
  );
}

async function verify(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
) {
  const counts = async (table: string, locationCol = "location_id") => {
    const { count: b, error: e1 } = await supabase
      // @ts-expect-error dynamic
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(locationCol, 1);
    if (e1) throw new Error(e1.message);
    const { count: s, error: e2 } = await supabase
      // @ts-expect-error dynamic
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(locationCol, 2);
    if (e2) throw new Error(e2.message);
    return { brooklyn: b ?? 0, si: s ?? 0 };
  };

  const teachers = await counts("teachers");
  const students = await counts("students");
  const classes = await counts("classes");

  const { count: schedules, error: schedErr } = await supabase
    .from("class_schedules")
    .select("id, classes!inner(location_id)", { count: "exact", head: true })
    .eq("classes.location_id", 1);
  if (schedErr) throw new Error(schedErr.message);

  console.log("\nVerification:");
  console.log(`  teachers  Brooklyn=${teachers.brooklyn}  SI=${teachers.si}`);
  console.log(`  students  Brooklyn=${students.brooklyn}  SI=${students.si}`);
  console.log(`  classes   Brooklyn=${classes.brooklyn}  SI=${classes.si}`);
  console.log(`  schedules Brooklyn≈${schedules ?? 0}`);

  const { data: sample } = await supabase
    .from("class_schedules")
    .select(
      "schedule_day_of_week, schedule_start_time, schedule_end_time, classes!inner(subject, location_id)",
    )
    .eq("classes.location_id", 1)
    .eq("is_recurring", true)
    .limit(8);

  console.log("  Sample schedules:");
  for (const row of sample ?? []) {
    const subject = Array.isArray(row.classes)
      ? row.classes[0]?.subject
      : (row.classes as { subject?: string } | null)?.subject;
    console.log(
      `    dow=${row.schedule_day_of_week} ${row.schedule_start_time}-${row.schedule_end_time} ${subject ?? ""}`,
    );
  }
}

async function backfillGrades(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  preview: Preview,
) {
  console.log("Loading Brooklyn teachers, students, enrollments…");

  const [
    { data: teachers, error: teacherErr },
    { data: students, error: studentErr },
    { data: classes, error: classErr },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("location_id", BROOKLYN_LOCATION_ID),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("location_id", BROOKLYN_LOCATION_ID),
    supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        teacher_id,
        enrollments ( id, "student id", grade_level ),
        class_schedules ( schedule_day_of_week, schedule_start_time )
      `,
      )
      .eq("location_id", BROOKLYN_LOCATION_ID),
  ]);

  if (teacherErr) throw new Error(teacherErr.message);
  if (studentErr) throw new Error(studentErr.message);
  if (classErr) throw new Error(classErr.message);

  const teacherIdByKey = new Map<string, number>();
  for (const t of teachers ?? []) {
    teacherIdByKey.set(personKey(t.first_name, t.last_name), t.id);
  }

  const studentIdByKey = new Map<string, number>();
  for (const s of students ?? []) {
    const row = s as {
      id: number;
      "first name": string;
      "last name": string | null;
    };
    studentIdByKey.set(personKey(row["first name"], row["last name"]), row.id);
  }

  type EnrollmentRow = {
    id: number;
    "student id": number | null;
    grade_level: string | null;
  };

  type ClassRow = {
    id: number;
    subject: string;
    teacher_id: number | null;
    enrollments: EnrollmentRow | EnrollmentRow[] | null;
    class_schedules:
      | { schedule_day_of_week: number | null; schedule_start_time: string | null }
      | { schedule_day_of_week: number | null; schedule_start_time: string | null }[]
      | null;
  };

  const classRows = (classes ?? []) as ClassRow[];

  let updated = 0;
  let matched = 0;
  let unmatched = 0;
  const tierCounts = new Map<string, number>();

  for (const cls of preview.classes) {
    const teacherId = teacherIdByKey.get(cls.teacherKey);
    if (!teacherId) {
      unmatched += 1;
      continue;
    }

    const studentIds = new Set(
      cls.studentKeys
        .map((k) => studentIdByKey.get(k))
        .filter((id): id is number => typeof id === "number"),
    );
    if (studentIds.size === 0) {
      unmatched += 1;
      continue;
    }

    const candidates = classRows.filter((row) => {
      if (row.teacher_id !== teacherId) return false;
      if (row.subject !== cls.subject) return false;
      const enrollments = Array.isArray(row.enrollments)
        ? row.enrollments
        : row.enrollments
          ? [row.enrollments]
          : [];
      return enrollments.some(
        (e) => e["student id"] != null && studentIds.has(e["student id"]),
      );
    });

    let matches = candidates;
    if (matches.length > 1) {
      const scheduleFiltered = matches.filter((row) => {
        const schedules = Array.isArray(row.class_schedules)
          ? row.class_schedules
          : row.class_schedules
            ? [row.class_schedules]
            : [];
        return schedules.some(
          (s) =>
            s.schedule_day_of_week != null &&
            cls.daysOfWeek.includes(s.schedule_day_of_week) &&
            (s.schedule_start_time ?? "").startsWith(cls.startTime.slice(0, 5)),
        );
      });
      if (scheduleFiltered.length > 0) {
        matches = scheduleFiltered;
      }
    }

    if (matches.length === 0) {
      unmatched += 1;
      continue;
    }

    matched += 1;
    const grade = cls.gradeLevel || DEFAULT_GRADE_LEVEL;
    tierCounts.set(grade, (tierCounts.get(grade) ?? 0) + 1);

    for (const row of matches) {
      const enrollments = Array.isArray(row.enrollments)
        ? row.enrollments
        : row.enrollments
          ? [row.enrollments]
          : [];
      for (const enrollment of enrollments) {
        if (
          enrollment["student id"] == null ||
          !studentIds.has(enrollment["student id"])
        ) {
          continue;
        }
        if (enrollment.grade_level === grade) continue;

        const { error } = await supabase
          .from("enrollments")
          .update({ grade_level: grade })
          .eq("id", enrollment.id);
        if (error) throw new Error(error.message);
        enrollment.grade_level = grade;
        updated += 1;
      }
    }
  }

  // Default any remaining Brooklyn enrollments without a grade.
  const { data: nullGradeRows, error: nullErr } = await supabase
    .from("enrollments")
    .select('id, classes!inner(location_id)')
    .is("grade_level", null)
    .eq("classes.location_id", BROOKLYN_LOCATION_ID);

  if (nullErr) throw new Error(nullErr.message);

  const nullIds = (nullGradeRows ?? []).map((r) => r.id);
  let defaulted = 0;
  for (let i = 0; i < nullIds.length; i += 100) {
    const chunk = nullIds.slice(i, i + 100);
    const { error } = await supabase
      .from("enrollments")
      .update({ grade_level: DEFAULT_GRADE_LEVEL })
      .in("id", chunk);
    if (error) throw new Error(error.message);
    defaulted += chunk.length;
  }

  console.log(`Backfill grades:`);
  console.log(`  preview classes matched: ${matched}`);
  console.log(`  unmatched preview classes: ${unmatched}`);
  console.log(`  enrollments updated from ICS: ${updated}`);
  console.log(`  remaining null grades set to ${DEFAULT_GRADE_LEVEL}: ${defaulted}`);
  console.log(`  tier distribution (matched preview):`);
  for (const [tier, count] of [...tierCounts.entries()].sort()) {
    console.log(`    ${tier}: ${count}`);
  }
}

/**
 * Attach class_schedules.student_id for Brooklyn using ICS series ownership.
 * Only updates when a slot maps cleanly to one enrolled student.
 * Does not touch Staten Island. Does not invent schedule rows.
 */
async function backfillScheduleStudents(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  preview: Preview,
) {
  console.log("Loading Brooklyn teachers, students, classes, schedules…");

  const [
    { data: teachers, error: teacherErr },
    { data: students, error: studentErr },
    { data: classes, error: classErr },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("location_id", BROOKLYN_LOCATION_ID),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("location_id", BROOKLYN_LOCATION_ID),
    supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        teacher_id,
        lesson_type,
        duration_minutes,
        enrollments ( "student id" ),
        class_schedules (
          id,
          student_id,
          schedule_day_of_week,
          schedule_start_time,
          schedule_end_time
        )
      `,
      )
      .eq("location_id", BROOKLYN_LOCATION_ID),
  ]);

  if (teacherErr) throw new Error(teacherErr.message);
  if (studentErr) throw new Error(studentErr.message);
  if (classErr) throw new Error(classErr.message);

  const teacherIdByKey = new Map<string, number>();
  for (const t of teachers ?? []) {
    const key = personKey(t.first_name, t.last_name);
    teacherIdByKey.set(key, t.id);
    const normalized = teacherLookupKey(t.first_name, t.last_name);
    if (normalized && !teacherIdByKey.has(normalized)) {
      teacherIdByKey.set(normalized, t.id);
    }
  }

  const studentIdByKey = new Map<string, number>();
  for (const s of students ?? []) {
    const row = s as {
      id: number;
      "first name": string;
      "last name": string | null;
    };
    studentIdByKey.set(personKey(row["first name"], row["last name"]), row.id);
  }

  type ScheduleRow = {
    id: number;
    student_id: number | null;
    schedule_day_of_week: number | null;
    schedule_start_time: string;
    schedule_end_time: string;
  };

  type ClassRow = {
    id: number;
    subject: string;
    teacher_id: number | null;
    lesson_type: string | null;
    duration_minutes: number | null;
    enrollments:
      | { "student id": number | null }
      | { "student id": number | null }[]
      | null;
    class_schedules: ScheduleRow | ScheduleRow[] | null;
  };

  const classRows = (classes ?? []) as ClassRow[];

  // Mutable working copy of schedules so we don't double-assign within this run.
  const schedulesByClass = new Map<number, ScheduleRow[]>();
  for (const row of classRows) {
    const schedules = Array.isArray(row.class_schedules)
      ? row.class_schedules.map((s) => ({ ...s }))
      : row.class_schedules
        ? [{ ...row.class_schedules }]
        : [];
    schedulesByClass.set(row.id, schedules);
  }

  const consolidated = consolidateClasses(preview.classes);

  let updated = 0;
  let skippedAmbiguous = 0;
  let skippedMissing = 0;
  let skippedAlready = 0;
  let classesMatched = 0;
  let classesUnmatched = 0;

  for (const cls of consolidated) {
    const teacherId =
      teacherIdByKey.get(cls.teacherKey) ??
      teacherIdByKey.get(teacherLookupKey(cls.teacherKey, null));
    if (!teacherId) {
      classesUnmatched += 1;
      continue;
    }

    const matches = classRows.filter(
      (row) =>
        row.teacher_id === teacherId &&
        row.subject === cls.subject &&
        row.lesson_type === cls.lessonType &&
        row.duration_minutes === cls.durationMinutes,
    );

    if (matches.length !== 1) {
      classesUnmatched += 1;
      continue;
    }

    classesMatched += 1;
    const classRow = matches[0]!;
    const enrolledIds = new Set(
      (Array.isArray(classRow.enrollments)
        ? classRow.enrollments
        : classRow.enrollments
          ? [classRow.enrollments]
          : []
      )
        .map((e) => e["student id"])
        .filter((id): id is number => typeof id === "number"),
    );

    const schedules = schedulesByClass.get(classRow.id) ?? [];

    for (const slot of cls.schedules.values()) {
      if (!slot.studentKey) {
        skippedAmbiguous += 1;
        continue;
      }

      const studentId = studentIdByKey.get(slot.studentKey);
      if (typeof studentId !== "number" || !enrolledIds.has(studentId)) {
        skippedMissing += 1;
        continue;
      }

      const start = normalizeScheduleTime(slot.startTime);
      const end = normalizeScheduleTime(slot.endTime);

      const already = schedules.find(
        (s) =>
          s.student_id === studentId &&
          s.schedule_day_of_week === slot.dayOfWeek &&
          normalizeScheduleTime(s.schedule_start_time) === start &&
          normalizeScheduleTime(s.schedule_end_time) === end,
      );
      if (already) {
        skippedAlready += 1;
        continue;
      }

      const candidates = schedules.filter(
        (s) =>
          s.student_id == null &&
          s.schedule_day_of_week === slot.dayOfWeek &&
          normalizeScheduleTime(s.schedule_start_time) === start &&
          normalizeScheduleTime(s.schedule_end_time) === end,
      );

      if (candidates.length !== 1) {
        if (candidates.length === 0) skippedMissing += 1;
        else skippedAmbiguous += 1;
        continue;
      }

      const target = candidates[0]!;
      const { error } = await supabase
        .from("class_schedules")
        .update({ student_id: studentId })
        .eq("id", target.id)
        .eq("class_id", classRow.id)
        .is("student_id", null);
      if (error) throw new Error(error.message);

      target.student_id = studentId;
      updated += 1;
    }
  }

  // Safe fallback: exactly one enrolled student and all remaining schedules unassigned.
  let singleStudentAssigned = 0;
  for (const classRow of classRows) {
    const enrolledIds = [
      ...new Set(
        (Array.isArray(classRow.enrollments)
          ? classRow.enrollments
          : classRow.enrollments
            ? [classRow.enrollments]
            : []
        )
          .map((e) => e["student id"])
          .filter((id): id is number => typeof id === "number"),
      ),
    ];
    if (enrolledIds.length !== 1) continue;

    const studentId = enrolledIds[0]!;
    const schedules = schedulesByClass.get(classRow.id) ?? [];
    const unassigned = schedules.filter((s) => s.student_id == null);
    if (unassigned.length === 0) continue;
    if (schedules.some((s) => s.student_id != null && s.student_id !== studentId)) {
      continue;
    }

    for (const target of unassigned) {
      const { error } = await supabase
        .from("class_schedules")
        .update({ student_id: studentId })
        .eq("id", target.id)
        .eq("class_id", classRow.id)
        .is("student_id", null);
      if (error) throw new Error(error.message);
      target.student_id = studentId;
      singleStudentAssigned += 1;
    }
  }

  const stillUnassigned = [...schedulesByClass.values()].reduce(
    (sum, rows) => sum + rows.filter((s) => s.student_id == null).length,
    0,
  );

  console.log("Backfill schedule students (Brooklyn only):");
  console.log(`  consolidated classes matched: ${classesMatched}`);
  console.log(`  consolidated classes unmatched: ${classesUnmatched}`);
  console.log(`  schedules linked from ICS: ${updated}`);
  console.log(`  schedules linked via single-enrollment fallback: ${singleStudentAssigned}`);
  console.log(`  skipped (already linked): ${skippedAlready}`);
  console.log(`  skipped (missing slot/student): ${skippedMissing}`);
  console.log(`  skipped (ambiguous/shared): ${skippedAmbiguous}`);
  console.log(`  schedules still unassigned: ${stillUnassigned}`);
}

async function main() {
  console.log(`ICS dir: ${ICS_DIR}`);
  if (BACKFILL_GRADES) {
    console.log("Mode: BACKFILL GRADES (no wipe)");
  } else if (BACKFILL_SCHEDULE_STUDENTS) {
    console.log("Mode: BACKFILL SCHEDULE STUDENTS (no wipe)");
  } else {
    console.log(APPLY ? "Mode: APPLY (wipe + import)" : "Mode: DRY-RUN preview");
  }

  const { series, skipped } = parseAllIcs(ICS_DIR);
  const preview = buildPreview(series, skipped);

  const gradeDist = new Map<string, number>();
  for (const cls of preview.classes) {
    gradeDist.set(cls.gradeLevel, (gradeDist.get(cls.gradeLevel) ?? 0) + 1);
  }

  const consolidated = consolidateClasses(preview.classes);
  const consolidatedEnrollmentCount = consolidated.reduce(
    (sum, cls) => sum + cls.students.size,
    0,
  );
  const consolidatedScheduleCount = consolidated.reduce(
    (sum, cls) => sum + cls.schedules.size,
    0,
  );
  const linkedScheduleCount = consolidated.reduce(
    (sum, cls) =>
      sum + [...cls.schedules.values()].filter((s) => s.studentKey).length,
    0,
  );

  console.log("\nPreview summary:");
  console.log(`  teachers: ${preview.teachers.length}`);
  console.log(`  students: ${preview.students.length}`);
  console.log(`  ICS series: ${preview.classes.length}`);
  console.log(
    `  consolidated classes: ${consolidated.length} (one per teacher+subject+lesson_type+duration)`,
  );
  console.log(`  enrollments (after consolidate): ${consolidatedEnrollmentCount}`);
  console.log(`  schedules (after consolidate): ${consolidatedScheduleCount}`);
  console.log(`  schedules with sole student: ${linkedScheduleCount}`);
  console.log("  grade tiers (from SUMMARY series):");
  for (const [tier, count] of [...gradeDist.entries()].sort()) {
    console.log(`    ${tier}: ${count}`);
  }
  console.log("  skipped:");
  for (const s of preview.skipped) {
    console.log(`    ${s.reason}: ${s.count}`);
  }
  console.log("\n  Sample consolidated classes:");
  for (const cls of consolidated.slice(0, 12)) {
    console.log(
      `    [${cls.subject} ${cls.lessonType} ${cls.durationMinutes}m] ${cls.teacherKey} → ${cls.students.size} students, ${cls.schedules.size} schedule slots`,
    );
  }

  if (BACKFILL_GRADES) {
    const supabase = createSupabaseServiceClient();
    await backfillGrades(supabase, preview);
    console.log("\nDone.");
    return;
  }

  if (BACKFILL_SCHEDULE_STUDENTS) {
    const supabase = createSupabaseServiceClient();
    await backfillScheduleStudents(supabase, preview);
    console.log("\nDone.");
    return;
  }

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to wipe Brooklyn and import.");
    console.log("Or use --backfill-grades to set enrollments.grade_level from ICS.");
    console.log(
      "Or use --backfill-schedule-students to link class_schedules.student_id from ICS.",
    );
    return;
  }

  const supabase = createSupabaseServiceClient();
  await applyImport(supabase, preview);
  await verify(supabase);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
