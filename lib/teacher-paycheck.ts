import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_GRADE_LEVEL,
  GRADE_LEVEL_OPTIONS,
  paycheckGroupKey,
  resolveGradeTier,
  type GradeLevelOption,
} from "@/lib/class-subject";
import { monthDateRange } from "@/lib/statements";
import type { Database } from "@/types/database.types";

export type TeacherPaycheckClassLine = {
  /** subject|gradeTier — stable UI / rate key */
  groupKey: string;
  subject: string;
  gradeTier: GradeLevelOption;
  /** All class ids that contribute enrollments to this subject+level */
  classIds: number[];
  /** Representative class id used when recording an aggregated paycheck line */
  classId: number;
  sessionCount: number;
};

export type TeacherPaycheckPeriod = {
  year: number;
  month: number;
};

export type SavedTeacherPaycheckLine = {
  groupKey: string;
  classId: number;
  classIds: number[];
  subject: string;
  gradeTier: GradeLevelOption;
  sessionCount: number;
  rateCents: number;
  lineTotalCents: number;
};

export type SavedTeacherPaycheck = {
  id: number;
  totalSessions: number;
  totalAmountCents: number;
  effectiveAmountCents: number;
  statementEntryId: number | null;
  createdAt: string;
  lines: SavedTeacherPaycheckLine[];
};

export type TeacherPaycheckPeriodData = TeacherPaycheckPeriod & {
  classLines: TeacherPaycheckClassLine[];
  savedPaycheck: SavedTeacherPaycheck | null;
};

/** Rates keyed by paycheck groupKey (subject|gradeTier). */
export type TeacherGroupPayRates = Record<string, number>;

/** Legacy/DB rates keyed by classId|gradeTier. */
export type TeacherClassPayRates = Record<string, number>;

type SessionRecordRow = {
  class_id: number;
  student_id: number;
  class_schedule_id: number | null;
  session_date: string;
};

type ClassMeta = {
  id: number;
  subject: string;
  lessonType: string | null;
  /** student_id → grade tier */
  studentGrades: Map<number, GradeLevelOption>;
  majorityGrade: GradeLevelOption;
};

function classRateKey(classId: number, gradeTier: GradeLevelOption) {
  return `${classId}|${gradeTier}`;
}

function sessionOccurrenceKey(
  record: SessionRecordRow,
  lessonType: string | null,
) {
  const schedulePart = record.class_schedule_id ?? "none";
  if (lessonType === "group") {
    return `group:${record.class_id}:${schedulePart}:${record.session_date}`;
  }
  return `private:${record.class_id}:${record.student_id}:${schedulePart}:${record.session_date}`;
}

function gradeTierSortIndex(tier: GradeLevelOption) {
  const index = GRADE_LEVEL_OPTIONS.indexOf(tier);
  return index === -1 ? GRADE_LEVEL_OPTIONS.length : index;
}

function sortPaycheckLines<
  T extends { subject: string; gradeTier: GradeLevelOption },
>(lines: T[]): T[] {
  return [...lines].sort((a, b) => {
    const subjectCmp = a.subject.localeCompare(b.subject);
    if (subjectCmp !== 0) return subjectCmp;
    return gradeTierSortIndex(a.gradeTier) - gradeTierSortIndex(b.gradeTier);
  });
}

function majorityGradeFromMap(
  studentGrades: Map<number, GradeLevelOption>,
): GradeLevelOption {
  if (studentGrades.size === 0) return DEFAULT_GRADE_LEVEL;

  const counts = new Map<GradeLevelOption, number>();
  for (const tier of studentGrades.values()) {
    counts.set(tier, (counts.get(tier) ?? 0) + 1);
  }

  let best: GradeLevelOption = DEFAULT_GRADE_LEVEL;
  let bestCount = -1;
  for (const [tier, count] of counts) {
    if (count > bestCount) {
      best = tier;
      bestCount = count;
    }
  }
  return best;
}

export function paycheckPeriodKey(year: number, month: number) {
  return `${year}-${month}`;
}

export function previousCalendarMonth(referenceDate = new Date()): TeacherPaycheckPeriod {
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

export function currentCalendarMonth(referenceDate = new Date()): TeacherPaycheckPeriod {
  return {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth() + 1,
  };
}

export function teacherPaycheckPeriods(referenceDate = new Date()): TeacherPaycheckPeriod[] {
  return listTeacherPaycheckPeriodOptions(referenceDate);
}

export function listTeacherPaycheckPeriodOptions(
  referenceDate = new Date(),
  extraPeriods: TeacherPaycheckPeriod[] = [],
  lookbackMonths = 12,
): TeacherPaycheckPeriod[] {
  const seen = new Set<string>();
  const result: TeacherPaycheckPeriod[] = [];

  for (let offset = 0; offset < lookbackMonths; offset += 1) {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - offset,
      1,
    );
    const period = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
    const key = paycheckPeriodKey(period.year, period.month);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(period);
  }

  for (const period of extraPeriods) {
    const key = paycheckPeriodKey(period.year, period.month);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(period);
  }

  return result.sort((periodA, periodB) => {
    if (periodA.year !== periodB.year) {
      return periodB.year - periodA.year;
    }

    return periodB.month - periodA.month;
  });
}

function buildGroupLines(
  classMetas: ClassMeta[],
  sessionCountsByGroup: Map<string, number>,
): TeacherPaycheckClassLine[] {
  const groups = new Map<
    string,
    {
      subject: string;
      gradeTier: GradeLevelOption;
      classIds: number[];
      sessionCount: number;
    }
  >();

  for (const meta of classMetas) {
    const tiers = new Set<GradeLevelOption>(meta.studentGrades.values());
    if (tiers.size === 0) {
      tiers.add(DEFAULT_GRADE_LEVEL);
    }

    for (const gradeTier of tiers) {
      const key = paycheckGroupKey(meta.subject, gradeTier);
      const existing = groups.get(key);
      if (existing) {
        if (!existing.classIds.includes(meta.id)) {
          existing.classIds.push(meta.id);
        }
      } else {
        groups.set(key, {
          subject: meta.subject,
          gradeTier,
          classIds: [meta.id],
          sessionCount: 0,
        });
      }
    }
  }

  for (const [groupKey, count] of sessionCountsByGroup) {
    const existing = groups.get(groupKey);
    if (existing) {
      existing.sessionCount = count;
    }
  }

  const lines: TeacherPaycheckClassLine[] = [...groups.entries()].map(
    ([groupKey, group]) => ({
      groupKey,
      subject: group.subject,
      gradeTier: group.gradeTier,
      classIds: group.classIds,
      classId: group.classIds[0]!,
      sessionCount: group.sessionCount,
    }),
  );

  return sortPaycheckLines(lines);
}

function groupSavedPaycheckLines(
  rawLines: Array<{
    class_id: number;
    grade_tier: GradeLevelOption;
    session_count: number;
    rate_cents: number;
    line_total_cents: number;
    subject: string;
  }>,
): SavedTeacherPaycheckLine[] {
  const groups = new Map<
    string,
    {
      subject: string;
      gradeTier: GradeLevelOption;
      classIds: number[];
      sessionCount: number;
      rateCents: number;
      lineTotalCents: number;
    }
  >();

  for (const line of rawLines) {
    const key = paycheckGroupKey(line.subject, line.grade_tier);
    const existing = groups.get(key);

    if (existing) {
      existing.classIds.push(line.class_id);
      existing.sessionCount += line.session_count;
      existing.lineTotalCents += line.line_total_cents;
      if (existing.rateCents <= 0 && line.rate_cents > 0) {
        existing.rateCents = line.rate_cents;
      }
    } else {
      groups.set(key, {
        subject: line.subject,
        gradeTier: line.grade_tier,
        classIds: [line.class_id],
        sessionCount: line.session_count,
        rateCents: line.rate_cents,
        lineTotalCents: line.line_total_cents,
      });
    }
  }

  const lines: SavedTeacherPaycheckLine[] = [...groups.entries()].map(
    ([groupKey, group]) => ({
      groupKey,
      classId: group.classIds[0]!,
      classIds: group.classIds,
      subject: group.subject,
      gradeTier: group.gradeTier,
      sessionCount: group.sessionCount,
      rateCents: group.rateCents,
      lineTotalCents: group.lineTotalCents,
    }),
  );

  return sortPaycheckLines(lines);
}

function parseClassMetas(
  classes: Array<{
    id: number;
    subject: string;
    lesson_type: string | null;
    enrollments:
      | { "student id": number | null; grade_level: string | null }
      | { "student id": number | null; grade_level: string | null }[]
      | null;
  }>,
): ClassMeta[] {
  return classes.map((row) => {
    const enrollments = Array.isArray(row.enrollments)
      ? row.enrollments
      : row.enrollments
        ? [row.enrollments]
        : [];

    const studentGrades = new Map<number, GradeLevelOption>();
    for (const enrollment of enrollments) {
      const studentId = enrollment["student id"];
      if (studentId == null) continue;
      studentGrades.set(studentId, resolveGradeTier(enrollment.grade_level));
    }

    return {
      id: row.id,
      subject: row.subject,
      lessonType: row.lesson_type,
      studentGrades,
      majorityGrade: majorityGradeFromMap(studentGrades),
    };
  });
}

export async function loadTeacherPaycheckPeriods(
  supabase: SupabaseClient<Database>,
  teacherId: number,
  periods: TeacherPaycheckPeriod[],
): Promise<TeacherPaycheckPeriodData[]> {
  if (periods.length === 0) {
    return [];
  }

  const [{ data: classes, error: classesError }, { data: paychecks, error: paychecksError }] =
    await Promise.all([
      supabase
        .from("classes")
        .select('id, subject, lesson_type, enrollments ( "student id", grade_level )')
        .eq("teacher_id", teacherId)
        .order("subject"),
      supabase
        .from("teacher_paychecks")
        .select(
          `
          id,
          year,
          month,
          total_sessions,
          total_amount_cents,
          effective_amount_cents,
          statement_entry_id,
          created_at,
          teacher_paycheck_lines (
            class_id,
            grade_tier,
            session_count,
            rate_cents,
            line_total_cents,
            classes ( subject )
          )
        `,
        )
        .eq("teacher_id", teacherId),
    ]);

  if (classesError) {
    throw new Error(`Could not load teacher classes: ${classesError.message}`);
  }

  if (paychecksError) {
    throw new Error(`Could not load teacher paychecks: ${paychecksError.message}`);
  }

  const classMetas = parseClassMetas(classes ?? []);
  const classMetaById = new Map(classMetas.map((meta) => [meta.id, meta]));
  const classIds = classMetas.map((meta) => meta.id);

  const sessionCountsByPeriod = new Map<string, Map<string, number>>();

  await Promise.all(
    periods.map(async (period) => {
      const key = `${period.year}-${period.month}`;
      const counts = new Map<string, number>();
      sessionCountsByPeriod.set(key, counts);

      if (classIds.length === 0) {
        return;
      }

      const { start, end } = monthDateRange(period.year, period.month);
      const { data: records, error } = await supabase
        .from("class_session_records")
        .select("class_id, student_id, class_schedule_id, session_date")
        .in("class_id", classIds)
        .gte("session_date", start)
        .lte("session_date", end)
        .in("status", ["used", "absent"]);

      if (error) {
        throw new Error(`Could not load class sessions: ${error.message}`);
      }

      const seen = new Set<string>();
      for (const record of records ?? []) {
        const meta = classMetaById.get(record.class_id);
        if (!meta) continue;

        const occurrenceKey = sessionOccurrenceKey(record, meta.lessonType);
        if (seen.has(occurrenceKey)) {
          continue;
        }
        seen.add(occurrenceKey);

        const gradeTier =
          meta.lessonType === "group"
            ? meta.majorityGrade
            : (meta.studentGrades.get(record.student_id) ?? meta.majorityGrade);

        const groupKey = paycheckGroupKey(meta.subject, gradeTier);
        counts.set(groupKey, (counts.get(groupKey) ?? 0) + 1);
      }
    }),
  );

  const paycheckByPeriod = new Map<string, SavedTeacherPaycheck>();

  for (const paycheck of paychecks ?? []) {
    const key = `${paycheck.year}-${paycheck.month}`;
    const rawLines = (paycheck.teacher_paycheck_lines ?? []).map((line) => {
      const classEmbed = Array.isArray(line.classes) ? line.classes[0] : line.classes;
      const known = classMetaById.get(line.class_id);
      const gradeTier = resolveGradeTier(
        (line as { grade_tier?: string | null }).grade_tier,
      );

      return {
        class_id: line.class_id,
        grade_tier: gradeTier,
        session_count: line.session_count,
        rate_cents: line.rate_cents,
        line_total_cents: line.line_total_cents,
        subject: known?.subject ?? classEmbed?.subject ?? `Class ${line.class_id}`,
      };
    });

    paycheckByPeriod.set(key, {
      id: paycheck.id,
      totalSessions: paycheck.total_sessions,
      totalAmountCents: paycheck.total_amount_cents,
      effectiveAmountCents:
        (paycheck as { effective_amount_cents?: number }).effective_amount_cents ??
        paycheck.total_amount_cents,
      statementEntryId: paycheck.statement_entry_id,
      createdAt: paycheck.created_at,
      lines: groupSavedPaycheckLines(rawLines),
    });
  }

  return periods.map((period) => {
    const key = `${period.year}-${period.month}`;
    const counts = sessionCountsByPeriod.get(key) ?? new Map<string, number>();
    const savedPaycheck = paycheckByPeriod.get(key) ?? null;

    let classLines = buildGroupLines(classMetas, counts);

    if (savedPaycheck) {
      for (const line of savedPaycheck.lines) {
        if (!classLines.some((classLine) => classLine.groupKey === line.groupKey)) {
          classLines.push({
            groupKey: line.groupKey,
            subject: line.subject,
            gradeTier: line.gradeTier,
            classIds: line.classIds,
            classId: line.classId,
            sessionCount: line.sessionCount,
          });
        }
      }
      classLines = sortPaycheckLines(classLines);
    }

    return {
      year: period.year,
      month: period.month,
      classLines,
      savedPaycheck,
    };
  });
}

function isMissingSchemaCacheError(message: string) {
  return (
    message.includes("schema cache") ||
    message.includes("Could not find the table")
  );
}

async function loadTeacherClassPayRatesFromPaychecks(
  supabase: SupabaseClient<Database>,
  teacherId: number,
): Promise<TeacherClassPayRates> {
  const { data, error } = await supabase
    .from("teacher_paychecks")
    .select(
      `
      year,
      month,
      teacher_paycheck_lines (
        class_id,
        grade_tier,
        rate_cents
      )
    `,
    )
    .eq("teacher_id", teacherId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) {
    return {};
  }

  const rates: TeacherClassPayRates = {};

  for (const paycheck of data ?? []) {
    const lines = paycheck.teacher_paycheck_lines ?? [];

    for (const line of lines) {
      const tier = resolveGradeTier(
        (line as { grade_tier?: string | null }).grade_tier,
      );
      const key = classRateKey(line.class_id, tier);
      if (key in rates) {
        continue;
      }

      rates[key] = line.rate_cents;
    }
  }

  return rates;
}

export async function loadTeacherClassPayRates(
  supabase: SupabaseClient<Database>,
  teacherId: number,
): Promise<TeacherClassPayRates> {
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_teacher_class_pay_rates",
    { p_teacher_id: teacherId },
  );

  if (!rpcError) {
    const rates: TeacherClassPayRates = {};

    for (const row of rpcData ?? []) {
      const tier = resolveGradeTier(
        (row as { grade_tier?: string | null }).grade_tier,
      );
      rates[classRateKey(row.class_id, tier)] = row.rate_cents;
    }

    return rates;
  }

  const { data, error } = await supabase
    .from("teacher_class_pay_rates")
    .select("class_id, grade_tier, rate_cents")
    .eq("teacher_id", teacherId);

  if (!error) {
    const rates: TeacherClassPayRates = {};

    for (const row of data ?? []) {
      const tier = resolveGradeTier(
        (row as { grade_tier?: string | null }).grade_tier,
      );
      rates[classRateKey(row.class_id, tier)] = row.rate_cents;
    }

    return rates;
  }

  if (
    isMissingSchemaCacheError(rpcError.message) ||
    isMissingSchemaCacheError(error.message)
  ) {
    return loadTeacherClassPayRatesFromPaychecks(supabase, teacherId);
  }

  throw new Error(`Could not load tutor pay rates: ${error.message}`);
}

/** Collapse per-class DB rates onto subject+level group keys. */
export function classPayRatesToGroupRates(
  classLines: TeacherPaycheckClassLine[],
  classRates: TeacherClassPayRates,
): TeacherGroupPayRates {
  const rates: TeacherGroupPayRates = {};

  for (const line of classLines) {
    for (const classId of line.classIds) {
      const rate = classRates[classRateKey(classId, line.gradeTier)];
      if (rate != null && rate > 0) {
        rates[line.groupKey] = rate;
        break;
      }
    }
  }

  return rates;
}

export function payRatesToInputValues(
  payRates: TeacherGroupPayRates,
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [groupKey, rateCents] of Object.entries(payRates)) {
    if (rateCents > 0) {
      values[groupKey] = (rateCents / 100).toString();
    }
  }

  return values;
}
