import type { SupabaseClient } from "@supabase/supabase-js";

import { monthDateRange } from "@/lib/statements";
import type { Database } from "@/types/database.types";

export type TeacherPaycheckClassLine = {
  classId: number;
  subject: string;
  sessionCount: number;
};

export type TeacherPaycheckPeriod = {
  year: number;
  month: number;
};

export type SavedTeacherPaycheckLine = {
  classId: number;
  subject: string;
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

export type TeacherClassPayRates = Record<number, number>;

type SessionRecordRow = {
  class_id: number;
  class_schedule_id: number | null;
  session_date: string;
};

function sessionOccurrenceKey(record: SessionRecordRow) {
  return `${record.class_id}:${record.class_schedule_id ?? "none"}:${record.session_date}`;
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
        .select("id, subject")
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

  const classRows = classes ?? [];
  const classIds = classRows.map((row) => row.id);

  const sessionCountsByPeriod = new Map<string, Map<number, number>>();

  await Promise.all(
    periods.map(async (period) => {
      const key = `${period.year}-${period.month}`;
      const counts = new Map<number, number>();
      sessionCountsByPeriod.set(key, counts);

      if (classIds.length === 0) {
        return;
      }

      const { start, end } = monthDateRange(period.year, period.month);
      const { data: records, error } = await supabase
        .from("class_session_records")
        .select("class_id, class_schedule_id, session_date")
        .in("class_id", classIds)
        .gte("session_date", start)
        .lte("session_date", end)
        .in("status", ["used", "absent"]);

      if (error) {
        throw new Error(`Could not load class sessions: ${error.message}`);
      }

      const seen = new Set<string>();
      for (const record of records ?? []) {
        const occurrenceKey = sessionOccurrenceKey(record);
        if (seen.has(occurrenceKey)) {
          continue;
        }

        seen.add(occurrenceKey);
        counts.set(record.class_id, (counts.get(record.class_id) ?? 0) + 1);
      }
    }),
  );

  const paycheckByPeriod = new Map<string, SavedTeacherPaycheck>();

  for (const paycheck of paychecks ?? []) {
    const key = `${paycheck.year}-${paycheck.month}`;
    const lines = (paycheck.teacher_paycheck_lines ?? []).map((line) => {
      const classEmbed = Array.isArray(line.classes) ? line.classes[0] : line.classes;

      return {
        classId: line.class_id,
        subject: classEmbed?.subject ?? `Class ${line.class_id}`,
        sessionCount: line.session_count,
        rateCents: line.rate_cents,
        lineTotalCents: line.line_total_cents,
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
      lines,
    });
  }

  return periods.map((period) => {
    const key = `${period.year}-${period.month}`;
    const counts = sessionCountsByPeriod.get(key) ?? new Map<number, number>();
    const savedPaycheck = paycheckByPeriod.get(key) ?? null;

    const classLines: TeacherPaycheckClassLine[] = classRows.map((classRow) => ({
      classId: classRow.id,
      subject: classRow.subject,
      sessionCount: counts.get(classRow.id) ?? 0,
    }));

    if (savedPaycheck) {
      for (const line of savedPaycheck.lines) {
        if (!classLines.some((classLine) => classLine.classId === line.classId)) {
          classLines.push({
            classId: line.classId,
            subject: line.subject,
            sessionCount: line.sessionCount,
          });
        }
      }
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
      const classId = line.class_id;
      if (classId in rates) {
        continue;
      }

      rates[classId] = line.rate_cents;
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
      rates[row.class_id] = row.rate_cents;
    }

    return rates;
  }

  const { data, error } = await supabase
    .from("teacher_class_pay_rates")
    .select("class_id, rate_cents")
    .eq("teacher_id", teacherId);

  if (!error) {
    const rates: TeacherClassPayRates = {};

    for (const row of data ?? []) {
      rates[row.class_id] = row.rate_cents;
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

export function payRatesToInputValues(
  payRates: TeacherClassPayRates,
): Record<number, string> {
  const values: Record<number, string> = {};

  for (const [classId, rateCents] of Object.entries(payRates)) {
    if (rateCents > 0) {
      values[Number(classId)] = (rateCents / 100).toString();
    }
  }

  return values;
}
