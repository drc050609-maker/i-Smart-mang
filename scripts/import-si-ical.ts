/**
 * Import Staten Island schedules (and missing students/teachers/trials) from
 * Google Calendar .ics export. Does NOT wipe existing SI spreadsheet data.
 *
 * Usage:
 *   npm run import:si-ical
 *   npm run import:si-ical -- --apply
 *
 * Trials (试课 / trial) become lesson_type=trial classes + enrollments so they
 * show under Leads → Trials.
 *
 * Recurring RRULE series → weekly class_schedules.
 * One-off events → dated (non-recurring) class_schedules on that day.
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

const SI_LOCATION_ID = 2;
const APPLY = process.argv.includes("--apply");
const ICS_DIR =
  process.env.ICS_DIR?.trim() ||
  join(process.cwd(), "scripts/data/si-ical");

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

type ParsedEvent = {
  calendarName: string;
  teacherRaw: string;
  summaryRaw: string;
  studentNames: string[];
  subject: string;
  gradeLevel: GradeLevelOption;
  lessonType: LessonType;
  durationMinutes: number;
  /** Weekly days when recurring; empty for one-off. */
  daysOfWeek: number[];
  /** ISO date YYYY-MM-DD for one-off (and DTSTART date for recurring). */
  scheduleDate: string | null;
  isRecurring: boolean;
  startTime: string;
  endTime: string;
  sourceFile: string;
};

function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function getProp(block: string, prop: string): string | null {
  const match = new RegExp(`(?:^|\\n)${prop}(?:;[^:\\n]*)?:(.+)`).exec(block);
  if (!match) return null;
  return match[1]!
    .trim()
    .replace(/\\,/g, ",")
    .replace(/\\n/g, " ")
    .replace(/\\\\/g, "\\");
}

function stripPhoneAndLabels(name: string) {
  return name
    .replace(/\d[\d\s\-().]{6,}\d/g, " ")
    .replace(/老师/g, " ")
    .replace(/[|/／]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitPersonName(raw: string): {
  firstName: string;
  lastName: string | null;
} {
  const cleaned = raw
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return { firstName: "Unknown", lastName: null };
  if (!/\s/.test(cleaned) && /[\u4e00-\u9fff]/.test(cleaned)) {
    return { firstName: cleaned, lastName: null };
  }
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function personKey(firstName: string, lastName: string | null) {
  return `${firstName} ${lastName ?? ""}`.trim().toLowerCase();
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/老师|女老师|男老师/g, " ")
    .replace(/[-–—_]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Map calendar display names → existing SI teacher keys. */
const TEACHER_ALIASES: Record<string, string> = {
  kiki: "kiki",
  "琪琪 kiki": "kiki",
  "琪琪": "kiki",
  richard: "richard",
  xu: "徐老师",
  "徐老师": "徐老师",
  david: "david",
  fifi: "fifi",
  "fifi女": "fifi",
  reynaldo: "reynaldo budhi",
  "reynaldo budhi": "reynaldo budhi",
  "刘宇": "liu",
  liu: "liu",
  dustin: "dustin",
  william: "william",
  jialin: "jialin",
  "jialin 小提琴女": "jialin",
  evie: "evie",
  ben: "ben",
  "ben杨恩浩": "ben",
  angela: "angela",
  "妤妤": "徐舒妤",
  "徐舒妤": "徐舒妤",
  "iris yu": "iris yu",
  kat: "kat",
  "kat 街舞 jazz": "kat",
};

function teacherAliasKey(calendarName: string) {
  const stripped = stripPhoneAndLabels(calendarName);
  const normalized = normalizeKey(stripped);
  if (TEACHER_ALIASES[normalized]) return TEACHER_ALIASES[normalized]!;
  // Try first token
  const first = normalized.split(" ")[0] ?? normalized;
  if (TEACHER_ALIASES[first]) return TEACHER_ALIASES[first]!;
  return normalized;
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
  if (/画画|美术|绘画|\bArt\b/i.test(hay)) return "Art";
  if (/中国舞|Chinese Dance/i.test(hay)) return "Chinese Dance";
  if (/街舞|Jazz|Hip\s*Hop/i.test(hay)) return "Jazz";
  if (/Zumba/i.test(hay)) return "Zumba";
  if (/模特|形体|Model/i.test(hay)) return "Model / Catwalk";
  if (/弹唱|Sing\s*&\s*Play/i.test(hay)) return "Sing & Play";
  if (/钢琴|Piano|智能钢琴/i.test(hay)) return "Piano";
  if (/画画|美术|绘画/.test(calendarName)) return "Art";
  if (/吉他/.test(calendarName)) return "Guitar";
  if (/小提琴/.test(calendarName)) return "Violin";
  if (/声乐/.test(calendarName)) return "Singing / Voice";
  if (/街舞|Jazz/.test(calendarName)) return "Jazz";
  if (/Zumba/.test(calendarName)) return "Zumba";
  if (/中国舞/.test(calendarName)) return "Chinese Dance";
  if (/钢琴/.test(calendarName)) return "Piano";
  return "Piano";
}

function cleanStudentToken(token: string) {
  return token
    .replace(
      /声乐|钢琴|吉他|小提琴|大提琴|古筝|架子鼓|画画|美术|绘画|试课|乐理|小组课?|老师转?|补课|加课|代课|请假|暑期班|成人|智能吉他弹唱过度|一对一|一对四|0基础|零基础|男孩|女孩|女生|男生/g,
      " ",
    )
    .replace(/\d+\s*岁/g, " ")
    .replace(/\d+\s*[-–—]\s*\d+\s*级/g, " ")
    .replace(/\b\d+[-–—]\d+\b/g, " ")
    .replace(/\b\d+\s*(year|yr|years?|old)\b/gi, " ")
    .replace(/[（(].*?[）)]/g, " ")
    .replace(/[\\/|／、,，;；]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NON_STUDENT_TOKENS = new Set(
  [
    "zumba",
    "jazz",
    "piano",
    "art",
    "lunch",
    "中国舞",
    "初级班",
    "中级班",
    "高级班",
    "绘画小组课",
    "美术小组课",
    "街舞",
  ].map((s) => s.toLowerCase()),
);

function parseStudentNames(summary: string): string[] {
  let body = summary.trim();
  const groupMatch = /[（(]([^）)]+)[）)]/.exec(body);
  if ((/小组/.test(body) || /；|;/.test(body)) && groupMatch) {
    const inner = groupMatch[1]!.replace(/\\/g, " ");
    return inner
      .split(/[、,，;/；]/)
      .map((part) => cleanStudentToken(part))
      .filter((name) => name.length >= 2 && !NON_STUDENT_TOKENS.has(name.toLowerCase()));
  }

  // Titles like 中国舞-初级班Miti ；Stephanie
  if (/；|;/.test(body) && !groupMatch) {
    const parts = body.split(/[；;]/).map((p) => cleanStudentToken(p));
    const names = parts.filter(
      (p) =>
        p.length >= 2 &&
        !/初级|中级|高级|课程/.test(p) &&
        !NON_STUDENT_TOKENS.has(p.toLowerCase()),
    );
    if (names.length > 0) return names;
  }

  const cleaned = cleanStudentToken(body);
  if (!cleaned || cleaned.length < 2) return [];
  if (/^(分钟|级)$/i.test(cleaned)) return [];
  if (NON_STUDENT_TOKENS.has(cleaned.toLowerCase())) return [];
  return [cleaned];
}

function isTrialSummary(summary: string) {
  return (
    summary.includes("试课") ||
    /\btrial\b/i.test(summary) ||
    /try\s*class/i.test(summary) ||
    /test\s*try/i.test(summary)
  );
}

function isSkippableSummary(summary: string) {
  const s = summary.toLowerCase();
  return (
    !summary.trim() ||
    s.includes("lunch") ||
    s.includes("holiday") ||
    s.includes("closed") ||
    s.includes("regents") ||
    s.includes("veterans") ||
    summary.includes("老师要离职")
  );
}

function parseIcsDateTime(value: string): { utc: boolean; date: Date } | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6]);
  const utc = Boolean(m[7]);
  if (utc) return { utc: true, date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)) };
  return { utc: false, date: new Date(Date.UTC(y, mo - 1, d, h, mi, s)) };
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
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}:${get("second")}`;
}

function formatNyDate(dt: { utc: boolean; date: Date }): string {
  if (!dt.utc) {
    const y = dt.date.getUTCFullYear();
    const mo = String(dt.date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.date.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt.date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function durationMinutesBetween(
  start: { utc: boolean; date: Date },
  end: { utc: boolean; date: Date },
) {
  const mins = Math.round((end.date.getTime() - start.date.getTime()) / 60000);
  if (mins <= 0 || mins > 240) return 45;
  return mins;
}

function parseAllIcs(dir: string): {
  events: ParsedEvent[];
  skipped: Map<string, number>;
} {
  const skipped = new Map<string, number>();
  const bump = (reason: string) =>
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1);
  const events: ParsedEvent[] = [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".ics"));

  for (const file of files) {
    const raw = unfoldIcs(readFileSync(join(dir, file), "utf8"));
    const calMatch = /X-WR-CALNAME:(.+)/.exec(raw);
    const calendarName = (calMatch?.[1] ?? file).trim();

    if (calendarName === "ismartmusic66@gmail.com") {
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

      if (isSkippableSummary(summary)) {
        bump("skippable_summary");
        continue;
      }
      if (!dtstartRaw || !dtendRaw || !dtstartRaw.includes("T")) {
        bump("not_timed");
        continue;
      }

      const start = parseIcsDateTime(dtstartRaw);
      const end = parseIcsDateTime(dtendRaw);
      if (!start || !end) {
        bump("bad_datetime");
        continue;
      }

      const trial = isTrialSummary(summary);
      const studentNames = parseStudentNames(summary);
      // Group lessons without named students (e.g. Zumba, 绘画小组课)
      const allowAnonymousGroup =
        !trial &&
        (/小组|Zumba|初级班|中级班|高级班/i.test(summary) ||
          /Zumba|中国舞|街舞|Jazz|绘画|美术/i.test(calendarName));

      if (studentNames.length === 0 && !allowAnonymousGroup) {
        bump(trial ? "trial_no_student_name" : "no_student_name");
        continue;
      }

      const subject = inferSubject(calendarName, summary);
      const gradeLevel = parseGradeLevelFromSummary(summary);
      let lessonType: LessonType = trial
        ? "trial"
        : /小组|一对四|Zumba|初级班|中级班|高级班/i.test(summary) ||
            /Zumba|中国舞|街舞|Jazz/i.test(calendarName)
          ? "group"
          : "private";

      const isRecurring = Boolean(rrule);
      let daysOfWeek: number[] = [];
      if (rrule) {
        const bydayMatch = /BYDAY=([A-Z,]+)/.exec(rrule);
        daysOfWeek = (bydayMatch?.[1] ?? "")
          .split(",")
          .map((d) => BYDAY_TO_DOW[d!])
          .filter((d): d is number => d !== undefined);
        if (daysOfWeek.length === 0) {
          // Fall back to DTSTART weekday
          daysOfWeek = [start.utc ? (() => {
            const parts = new Intl.DateTimeFormat("en-US", {
              timeZone: "America/New_York",
              weekday: "short",
            }).formatToParts(start.date);
            const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
            const map: Record<string, number> = {
              Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
            };
            return map[wd] ?? 1;
          })() : start.date.getUTCDay()];
        }
      }

      events.push({
        calendarName,
        teacherRaw: stripPhoneAndLabels(calendarName),
        summaryRaw: summary,
        studentNames,
        subject,
        gradeLevel,
        lessonType,
        durationMinutes: durationMinutesBetween(start, end),
        daysOfWeek,
        scheduleDate: isRecurring ? null : formatNyDate(start),
        isRecurring,
        startTime: formatNyTime(start),
        endTime: formatNyTime(end),
        sourceFile: file,
      });
    }
  }

  return { events, skipped };
}

type DbTeacher = { id: number; first_name: string; last_name: string | null };
type DbStudent = {
  id: number;
  "first name": string;
  "last name": string | null;
};
type DbClass = {
  id: number;
  subject: string;
  teacher_id: number | null;
  lesson_type: string | null;
  duration_minutes: number | null;
};

function buildTeacherLookup(teachers: DbTeacher[]) {
  const map = new Map<string, number>();
  for (const t of teachers) {
    const key = personKey(t.first_name, t.last_name);
    map.set(normalizeKey(key), t.id);
    map.set(normalizeKey(t.first_name), t.id);
  }
  return map;
}

function buildStudentLookup(students: DbStudent[]) {
  const map = new Map<string, number[]>();
  const add = (key: string, id: number) => {
    const k = normalizeKey(key);
    if (!k) return;
    const list = map.get(k) ?? [];
    if (!list.includes(id)) list.push(id);
    map.set(k, list);
  };
  for (const s of students) {
    const full = personKey(s["first name"], s["last name"]);
    add(full, s.id);
    add(s["first name"], s.id);
    // flipped "Last First"
    if (s["last name"]) add(`${s["last name"]} ${s["first name"]}`, s.id);
  }
  return map;
}

function resolveStudentId(
  lookup: Map<string, number[]>,
  rawName: string,
): number | null {
  const parsed = splitPersonName(rawName);
  const full = personKey(parsed.firstName, parsed.lastName);
  const candidates =
    lookup.get(normalizeKey(full)) ??
    lookup.get(normalizeKey(parsed.firstName)) ??
    [];
  if (candidates.length === 1) return candidates[0]!;
  if (candidates.length > 1) {
    // Prefer exact full-name match count 1 already handled; take first stable id
    return candidates[0]!;
  }
  return null;
}

async function main() {
  console.log(`SI iCal import (${APPLY ? "APPLY" : "dry-run"})`);
  console.log(`ICS_DIR=${ICS_DIR}`);

  const { events, skipped } = parseAllIcs(ICS_DIR);
  const regular = events.filter((e) => e.lessonType !== "trial");
  const trials = events.filter((e) => e.lessonType === "trial");
  const recurring = regular.filter((e) => e.isRecurring);
  const oneOff = regular.filter((e) => !e.isRecurring);

  console.log(`\nParsed events: ${events.length}`);
  console.log(`  regular recurring: ${recurring.length}`);
  console.log(`  regular one-off:   ${oneOff.length}`);
  console.log(`  trials:            ${trials.length}`);
  console.log("Skipped:");
  for (const [reason, count] of [...skipped.entries()].sort()) {
    console.log(`  ${reason}: ${count}`);
  }

  const teacherNames = [...new Set(events.map((e) => teacherAliasKey(e.calendarName)))];
  const studentNames = [
    ...new Set(events.flatMap((e) => e.studentNames.map((n) => normalizeKey(n)))),
  ];
  console.log(`\nUnique teachers (normalized): ${teacherNames.length}`);
  console.log(`Unique student name tokens: ${studentNames.length}`);

  if (!APPLY) {
    console.log("\nSample regular events:");
    for (const e of regular.slice(0, 8)) {
      console.log(
        `  [${e.isRecurring ? "R" : e.scheduleDate}] ${e.teacherRaw} | ${e.subject} | ${e.startTime}-${e.endTime} | ${e.studentNames.join(", ") || "(group)"} | ${e.summaryRaw.slice(0, 60)}`,
      );
    }
    console.log("\nSample trials:");
    for (const e of trials.slice(0, 8)) {
      console.log(
        `  [${e.scheduleDate ?? "R"}] ${e.teacherRaw} | ${e.subject} | ${e.studentNames.join(", ")} | ${e.summaryRaw.slice(0, 60)}`,
      );
    }
    console.log("\nDry-run only. Re-run with --apply to write Staten Island schedules.");
    return;
  }

  const supabase = createSupabaseServiceClient();

  const [
    { data: teachers, error: teacherErr },
    { data: students, error: studentErr },
    { data: classes, error: classErr },
    { data: enrollments, error: enrollErr },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("location_id", SI_LOCATION_ID),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("location_id", SI_LOCATION_ID),
    supabase
      .from("classes")
      .select("id, subject, teacher_id, lesson_type, duration_minutes")
      .eq("location_id", SI_LOCATION_ID),
    supabase
      .from("enrollments")
      .select('id, "class id", "student id", grade_level, is_active, classes!inner ( location_id )')
      .eq("classes.location_id", SI_LOCATION_ID),
  ]);

  if (teacherErr) throw new Error(teacherErr.message);
  if (studentErr) throw new Error(studentErr.message);
  if (classErr) throw new Error(classErr.message);
  if (enrollErr) throw new Error(enrollErr.message);

  let teacherList = (teachers ?? []) as DbTeacher[];
  let studentList = (students ?? []) as DbStudent[];
  let classList = (classes ?? []) as DbClass[];
  const enrollmentList = (enrollments ?? []) as {
    id: number;
    "class id": number;
    "student id": number | null;
    grade_level: string | null;
    is_active: boolean | null;
  }[];

  let teacherLookup = buildTeacherLookup(teacherList);
  let studentLookup = buildStudentLookup(studentList);

  const createdTeachers: string[] = [];
  const createdStudents: string[] = [];
  const createdClasses: string[] = [];
  let schedulesCreated = 0;
  let enrollmentsCreated = 0;
  let trialsCreated = 0;

  async function ensureTeacher(calendarName: string): Promise<number> {
    const alias = teacherAliasKey(calendarName);
    const existing = teacherLookup.get(alias) ?? teacherLookup.get(normalizeKey(alias));
    if (existing) return existing;

    const parsed = splitPersonName(stripPhoneAndLabels(calendarName));
    // Prefer alias as first name when single token
    const firstName =
      alias.includes(" ") || /[\u4e00-\u9fff]/.test(alias)
        ? splitPersonName(alias).firstName
        : parsed.firstName;
    const lastName =
      alias.includes(" ") ? splitPersonName(alias).lastName : parsed.lastName;

    const { data, error } = await supabase
      .from("teachers")
      .insert({
        first_name: firstName,
        last_name: lastName,
        location_id: SI_LOCATION_ID,
        is_active: true,
      })
      .select("id, first_name, last_name")
      .single();
    if (error) throw new Error(`Create teacher ${calendarName}: ${error.message}`);
    teacherList.push(data as DbTeacher);
    teacherLookup = buildTeacherLookup(teacherList);
    createdTeachers.push(personKey(data.first_name, data.last_name));
    return data.id;
  }

  async function ensureStudent(rawName: string): Promise<number> {
    const existing = resolveStudentId(studentLookup, rawName);
    if (existing) return existing;
    const parsed = splitPersonName(rawName);
    const { data, error } = await supabase
      .from("students")
      .insert({
        "first name": parsed.firstName,
        "last name": parsed.lastName,
        location_id: SI_LOCATION_ID,
        is_active: true,
      })
      .select('id, "first name", "last name"')
      .single();
    if (error) throw new Error(`Create student ${rawName}: ${error.message}`);
    const row = data as DbStudent;
    studentList.push(row);
    studentLookup = buildStudentLookup(studentList);
    createdStudents.push(personKey(row["first name"], row["last name"]));
    return row.id;
  }

  function findClass(opts: {
    teacherId: number;
    subject: string;
    lessonType: LessonType;
    durationMinutes: number;
  }): DbClass | null {
    const exact = classList.find(
      (c) =>
        c.teacher_id === opts.teacherId &&
        c.subject.toLowerCase() === opts.subject.toLowerCase() &&
        (c.lesson_type ?? "private") === opts.lessonType &&
        (opts.lessonType === "trial" ||
          c.duration_minutes == null ||
          c.duration_minutes === opts.durationMinutes),
    );
    if (exact) return exact;
    // Soft match: same teacher + subject + lesson type (ignore duration for regular)
    if (opts.lessonType !== "trial") {
      return (
        classList.find(
          (c) =>
            c.teacher_id === opts.teacherId &&
            c.subject.toLowerCase() === opts.subject.toLowerCase() &&
            (c.lesson_type ?? "private") === opts.lessonType,
        ) ?? null
      );
    }
    return null;
  }

  async function ensureClass(opts: {
    teacherId: number;
    subject: string;
    lessonType: LessonType;
    durationMinutes: number;
  }): Promise<number> {
    const existing = findClass(opts);
    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("classes")
      .insert({
        subject: opts.subject,
        teacher_id: opts.teacherId,
        location_id: SI_LOCATION_ID,
        lesson_type: opts.lessonType,
        duration_minutes: opts.durationMinutes,
        class_track: inferClassTrackFromSubject(opts.subject),
        is_active: true,
      })
      .select("id, subject, teacher_id, lesson_type, duration_minutes")
      .single();
    if (error) throw new Error(`Create class ${opts.subject}: ${error.message}`);
    classList.push(data as DbClass);
    createdClasses.push(
      `${opts.subject}/${opts.lessonType}/t${opts.teacherId}/${opts.durationMinutes}`,
    );

    await supabase.from("class_teachers").upsert(
      {
        class_id: data.id,
        teacher_id: opts.teacherId,
        is_primary: true,
      },
      { onConflict: "class_id,teacher_id" },
    );

    return data.id as number;
  }

  async function ensureEnrollment(
    classId: number,
    studentId: number,
    gradeLevel: GradeLevelOption,
  ) {
    const existing = enrollmentList.find(
      (e) => e["class id"] === classId && e["student id"] === studentId,
    );
    if (existing) return;
    const { error } = await supabase.from("enrollments").insert({
      "class id": classId,
      "student id": studentId,
      is_active: true,
      grade_level: gradeLevel,
    });
    if (error) throw new Error(`Enrollment: ${error.message}`);
    enrollmentList.push({
      id: -1,
      "class id": classId,
      "student id": studentId,
      grade_level: gradeLevel,
      is_active: true,
    });
    enrollmentsCreated += 1;
  }

  async function insertSchedule(row: {
    class_id: number;
    is_recurring: boolean;
    schedule_day_of_week: number | null;
    schedule_date: string | null;
    schedule_start_time: string;
    schedule_end_time: string;
    student_id: number | null;
  }) {
    const { error } = await supabase.from("class_schedules").insert(row);
    if (error) throw new Error(`Schedule: ${error.message}`);
    schedulesCreated += 1;
  }

  // Deduplicate recurring slots: teacher|subject|type|dur|student|dow|start|end
  const recurringSeen = new Set<string>();
  // Deduplicate one-offs similarly with date
  const oneOffSeen = new Set<string>();

  console.log("\nImporting regular events…");
  for (const event of regular) {
    const teacherId = await ensureTeacher(event.calendarName);
    const classId = await ensureClass({
      teacherId,
      subject: event.subject,
      lessonType: event.lessonType,
      durationMinutes: event.durationMinutes,
    });

    const studentIds: number[] = [];
    for (const name of event.studentNames) {
      const id = await ensureStudent(name);
      studentIds.push(id);
      await ensureEnrollment(classId, id, event.gradeLevel);
    }

    const soleStudentId = studentIds.length === 1 ? studentIds[0]! : null;

    if (event.isRecurring) {
      for (const dow of event.daysOfWeek) {
        const key = [
          classId,
          soleStudentId ?? "shared",
          dow,
          event.startTime,
          event.endTime,
        ].join("|");
        if (recurringSeen.has(key)) continue;
        recurringSeen.add(key);
        await insertSchedule({
          class_id: classId,
          is_recurring: true,
          schedule_day_of_week: dow,
          schedule_date: null,
          schedule_start_time: event.startTime,
          schedule_end_time: event.endTime,
          student_id: soleStudentId,
        });
      }
    } else if (event.scheduleDate) {
      const key = [
        classId,
        soleStudentId ?? "shared",
        event.scheduleDate,
        event.startTime,
        event.endTime,
      ].join("|");
      if (oneOffSeen.has(key)) continue;
      oneOffSeen.add(key);
      await insertSchedule({
        class_id: classId,
        is_recurring: false,
        schedule_day_of_week: null,
        schedule_date: event.scheduleDate,
        schedule_start_time: event.startTime,
        schedule_end_time: event.endTime,
        student_id: soleStudentId,
      });
    }
  }

  console.log("Importing trial events into Leads (trial classes)…");
  for (const event of trials) {
    const teacherId = await ensureTeacher(event.calendarName);
    const names =
      event.studentNames.length > 0 ? event.studentNames : ["Trial Student"];

    for (const name of names) {
      const studentId = await ensureStudent(name);
      // One trial class per student+teacher+subject+date+time so Leads lists them
      const { data: trialClass, error: trialClassErr } = await supabase
        .from("classes")
        .insert({
          subject: event.subject,
          teacher_id: teacherId,
          location_id: SI_LOCATION_ID,
          lesson_type: "trial",
          duration_minutes: event.durationMinutes || 45,
          class_track: inferClassTrackFromSubject(event.subject),
          is_active: true,
        })
        .select("id")
        .single();
      if (trialClassErr) {
        throw new Error(`Trial class: ${trialClassErr.message}`);
      }
      const classId = trialClass.id as number;
      createdClasses.push(`trial/${event.subject}/s${studentId}`);

      await supabase.from("class_teachers").upsert(
        { class_id: classId, teacher_id: teacherId, is_primary: true },
        { onConflict: "class_id,teacher_id" },
      );

      await ensureEnrollment(classId, studentId, event.gradeLevel);

      const scheduleDate =
        event.scheduleDate ??
        // Recurring trial → use a synthetic date from weekday? skip recurring trials as weekly one-off today
        new Date().toISOString().slice(0, 10);

      await insertSchedule({
        class_id: classId,
        is_recurring: false,
        schedule_day_of_week: null,
        schedule_date: scheduleDate,
        schedule_start_time: event.startTime,
        schedule_end_time: event.endTime,
        student_id: studentId,
      });
      trialsCreated += 1;
    }
  }

  console.log("\nDone.");
  console.log(`  teachers created: ${createdTeachers.length}`, createdTeachers.slice(0, 20));
  console.log(`  students created: ${createdStudents.length}`);
  console.log(`  classes created:  ${createdClasses.length}`);
  console.log(`  enrollments added: ${enrollmentsCreated}`);
  console.log(`  schedules created: ${schedulesCreated}`);
  console.log(`  trial bookings:    ${trialsCreated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
