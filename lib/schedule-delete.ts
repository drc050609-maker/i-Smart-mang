import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type ServiceClient = SupabaseClient<Database>;

export type ScheduleDeleteScope = "occurrence" | "series";

type ScheduleSlotRow = {
  id: number;
  class_id: number;
  student_id: number | null;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
};

type ClassEmbed = {
  location_id: number | null;
  subject: string;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeTime(value: string) {
  return value.slice(0, 8);
}

function normalizeDate(value: string | null | undefined) {
  return value?.slice(0, 10) || null;
}

export function weekdayFromDateYmd(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.getDay();
}

function slotWeekday(row: ScheduleSlotRow, occurrenceDate?: string) {
  if (row.is_recurring && row.schedule_day_of_week != null) {
    return row.schedule_day_of_week;
  }
  if (row.schedule_date) {
    const date = normalizeDate(row.schedule_date);
    return date ? weekdayFromDateYmd(date) : null;
  }
  if (occurrenceDate) {
    const date = normalizeDate(occurrenceDate);
    return date ? weekdayFromDateYmd(date) : null;
  }
  return null;
}

/**
 * Staten Island imports created overlapping copies of the same lesson
 * (teacher-assigned class + unassigned bucket class, or recurring + dated
 * ical expansions). Deleting one row left the copy visible on the calendar.
 */
function isSameCalendarSlot(
  target: ScheduleSlotRow,
  candidate: ScheduleSlotRow,
  targetWeekday: number | null,
) {
  if (
    normalizeTime(candidate.schedule_start_time) !==
      normalizeTime(target.schedule_start_time) ||
    normalizeTime(candidate.schedule_end_time) !==
      normalizeTime(target.schedule_end_time)
  ) {
    return false;
  }

  if (target.student_id != null) {
    if (candidate.student_id !== target.student_id) return false;
  } else if (candidate.class_id !== target.class_id) {
    return false;
  }

  if (candidate.is_recurring) {
    return (
      targetWeekday != null && candidate.schedule_day_of_week === targetWeekday
    );
  }

  const candidateDate = normalizeDate(candidate.schedule_date);
  if (!candidateDate) {
    return false;
  }

  const candidateWeekday = weekdayFromDateYmd(candidateDate);
  return targetWeekday != null && candidateWeekday === targetWeekday;
}

async function cancelOccurrence(
  supabase: ServiceClient,
  schedule: ScheduleSlotRow,
  occurrenceDate: string,
) {
  const { error } = await supabase.from("class_schedule_exceptions").upsert(
    {
      schedule_id: schedule.id,
      original_date: occurrenceDate,
      override_date: occurrenceDate,
      schedule_start_time: normalizeTime(schedule.schedule_start_time),
      schedule_end_time: normalizeTime(schedule.schedule_end_time),
      is_cancelled: true,
    },
    { onConflict: "schedule_id,original_date" },
  );

  return error?.message ?? null;
}

async function deleteScheduleRows(supabase: ServiceClient, ids: number[]) {
  if (ids.length === 0) {
    return null;
  }

  const { error } = await supabase.from("class_schedules").delete().in("id", ids);

  return error?.message ?? null;
}

export async function deleteCalendarScheduleSlot(
  supabase: ServiceClient,
  options: {
    scheduleId: number;
    classId: number;
    scope: ScheduleDeleteScope;
    occurrenceDate?: string;
    locationId?: number | null;
  },
): Promise<{ error?: string; classIds?: number[] }> {
  const { data: scheduleRow, error: scheduleError } = await supabase
    .from("class_schedules")
    .select(
      `
      id,
      class_id,
      student_id,
      is_recurring,
      schedule_day_of_week,
      schedule_date,
      schedule_start_time,
      schedule_end_time,
      classes!inner ( location_id, subject )
    `,
    )
    .eq("id", options.scheduleId)
    .eq("class_id", options.classId)
    .maybeSingle();

  if (scheduleError) {
    return { error: scheduleError.message };
  }

  if (!scheduleRow) {
    return { error: "Schedule not found." };
  }

  const classRow = firstOrNull(
    scheduleRow.classes as ClassEmbed | ClassEmbed[] | null,
  );
  if (!classRow) {
    return { error: "Schedule not found." };
  }

  if (
    options.locationId != null &&
    classRow.location_id != null &&
    classRow.location_id !== options.locationId
  ) {
    return { error: "Schedule not found." };
  }

  const target: ScheduleSlotRow = {
    id: scheduleRow.id,
    class_id: scheduleRow.class_id,
    student_id: scheduleRow.student_id,
    is_recurring: scheduleRow.is_recurring,
    schedule_day_of_week: scheduleRow.schedule_day_of_week,
    schedule_date: scheduleRow.schedule_date,
    schedule_start_time: scheduleRow.schedule_start_time,
    schedule_end_time: scheduleRow.schedule_end_time,
  };

  const occurrenceDate =
    normalizeDate(options.occurrenceDate) ??
    normalizeDate(target.schedule_date) ??
    undefined;
  const targetWeekday = slotWeekday(target, occurrenceDate);

  let siblingQuery = supabase
    .from("class_schedules")
    .select(
      `
      id,
      class_id,
      student_id,
      is_recurring,
      schedule_day_of_week,
      schedule_date,
      schedule_start_time,
      schedule_end_time,
      classes!inner ( location_id, subject )
    `,
    )
    .eq("classes.subject", classRow.subject)
    .eq("schedule_start_time", normalizeTime(target.schedule_start_time))
    .eq("schedule_end_time", normalizeTime(target.schedule_end_time));

  if (classRow.location_id != null) {
    siblingQuery = siblingQuery.eq("classes.location_id", classRow.location_id);
  } else if (options.locationId != null) {
    siblingQuery = siblingQuery.eq("classes.location_id", options.locationId);
  }

  if (target.student_id != null) {
    siblingQuery = siblingQuery.eq("student_id", target.student_id);
  } else {
    siblingQuery = siblingQuery.eq("class_id", target.class_id);
  }

  const { data: siblingRows, error: siblingError } = await siblingQuery;
  if (siblingError) {
    return { error: siblingError.message };
  }

  const siblings = ((siblingRows ?? []) as Array<
    ScheduleSlotRow & { classes: ClassEmbed | ClassEmbed[] | null }
  >)
    .map((row) => ({
      id: row.id,
      class_id: row.class_id,
      student_id: row.student_id,
      is_recurring: row.is_recurring,
      schedule_day_of_week: row.schedule_day_of_week,
      schedule_date: row.schedule_date,
      schedule_start_time: row.schedule_start_time,
      schedule_end_time: row.schedule_end_time,
    }))
    .filter((row) => isSameCalendarSlot(target, row, targetWeekday));

  const matched = siblings.some((row) => row.id === target.id)
    ? siblings
    : [target, ...siblings];

  const removeEntireSeries =
    target.is_recurring && options.scope === "series";

  if (removeEntireSeries) {
    const idsToDelete = matched.map((row) => row.id);
    if (idsToDelete.length === 0) {
      return { error: "Schedule not found." };
    }
    const deleteError = await deleteScheduleRows(supabase, idsToDelete);
    if (deleteError) {
      return { error: deleteError };
    }
    return { classIds: [...new Set(matched.map((row) => row.class_id))] };
  }

  if (!occurrenceDate) {
    return { error: "Missing occurrence date." };
  }

  const oneOffIds = matched
    .filter(
      (row) =>
        !row.is_recurring && normalizeDate(row.schedule_date) === occurrenceDate,
    )
    .map((row) => row.id);
  const recurringRows = matched.filter((row) => row.is_recurring);

  const deleteError = await deleteScheduleRows(supabase, oneOffIds);
  if (deleteError) {
    return { error: deleteError };
  }

  for (const recurring of recurringRows) {
    const cancelError = await cancelOccurrence(
      supabase,
      recurring,
      occurrenceDate,
    );
    if (cancelError) {
      return { error: cancelError };
    }
  }

  if (oneOffIds.length === 0 && recurringRows.length === 0) {
    return { error: "Schedule not found." };
  }

  return { classIds: [...new Set(matched.map((row) => row.class_id))] };
}
