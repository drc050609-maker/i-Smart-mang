"use server";

import { revalidatePath } from "next/cache";

import { addMinutesToScheduleTime } from "@/lib/class-schedule";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ScheduleActionState = {
  error?: string;
  success?: boolean;
};

function getServiceClient() {
  try {
    return { supabase: createSupabaseServiceClient() };
  } catch {
    return {
      error:
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }
}

function parseDate(value: FormDataEntryValue | null) {
  const date = value?.toString().trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return undefined;
  }
  return date;
}

function parseScheduleTime(value: FormDataEntryValue | null) {
  if (!value || value.toString().trim() === "") {
    return undefined;
  }

  const time = value.toString().trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return undefined;
  }

  return time.length === 5 ? `${time}:00` : time;
}

function parseDayOfWeek(value: FormDataEntryValue | null) {
  if (value === null || value.toString().trim() === "") {
    return undefined;
  }

  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return undefined;
  }

  return day;
}

function revalidateSchedule(classId: number) {
  revalidatePath("/schedule");
  revalidatePath("/classes");
  revalidatePath(`/classes/${classId}`);
}

export async function rescheduleFromCalendar(
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const scheduleId = Number(formData.get("scheduleId"));
  const classId = Number(formData.get("classId"));
  const scope = formData.get("scope")?.toString();
  const occurrenceDate = parseDate(formData.get("occurrenceDate"));
  const newDate = parseDate(formData.get("newDate"));
  const newStartTime = parseScheduleTime(formData.get("newStartTime"));
  const newDayOfWeek = parseDayOfWeek(formData.get("newDayOfWeek"));

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return { error: "Invalid schedule." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!newDate || !newStartTime) {
    return { error: "Invalid new time." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: scheduleRow, error: scheduleError } = await client.supabase
    .from("class_schedules")
    .select("id, class_id, is_recurring, schedule_start_time, schedule_end_time")
    .eq("id", scheduleId)
    .eq("class_id", classId)
    .maybeSingle();

  if (scheduleError) {
    return { error: scheduleError.message };
  }

  if (!scheduleRow) {
    return { error: "Schedule not found." };
  }

  const { data: classRow, error: classError } = await client.supabase
    .from("classes")
    .select("duration_minutes")
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    return { error: classError.message };
  }

  if (!classRow) {
    return { error: "Class not found." };
  }

  const durationMinutes =
    timeToMinutes(scheduleRow.schedule_end_time) -
    timeToMinutes(scheduleRow.schedule_start_time);

  const computedEnd =
    classRow.duration_minutes && classRow.duration_minutes > 0
      ? addMinutesToScheduleTime(newStartTime, classRow.duration_minutes)
      : addMinutesToScheduleTime(newStartTime, durationMinutes);

  const newEndTime =
    parseScheduleTime(formData.get("newEndTime")) ?? computedEnd;

  if (!newEndTime || newEndTime <= newStartTime) {
    return { error: "End time must be after start time." };
  }

  if (!scheduleRow.is_recurring) {
    const { error: updateError } = await client.supabase
      .from("class_schedules")
      .update({
        schedule_date: newDate,
        schedule_start_time: newStartTime,
        schedule_end_time: newEndTime,
      })
      .eq("id", scheduleId)
      .eq("class_id", classId);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidateSchedule(classId);
    return { success: true };
  }

  if (scope === "occurrence") {
    if (!occurrenceDate) {
      return { error: "Missing occurrence date." };
    }

    const { error: upsertError } = await client.supabase
      .from("class_schedule_exceptions")
      .upsert(
        {
          schedule_id: scheduleId,
          original_date: occurrenceDate,
          override_date: newDate,
          schedule_start_time: newStartTime,
          schedule_end_time: newEndTime,
          is_cancelled: false,
        },
        { onConflict: "schedule_id,original_date" },
      );

    if (upsertError) {
      return { error: upsertError.message };
    }

    revalidateSchedule(classId);
    return { success: true };
  }

  if (scope !== "series") {
    return { error: "Select whether to change this occurrence or all future." };
  }

  if (newDayOfWeek === undefined) {
    return { error: "Invalid day of week." };
  }

  const { error: updateError } = await client.supabase
    .from("class_schedules")
    .update({
      schedule_day_of_week: newDayOfWeek,
      schedule_start_time: newStartTime,
      schedule_end_time: newEndTime,
    })
    .eq("id", scheduleId)
    .eq("class_id", classId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateSchedule(classId);
  return { success: true };
}

function timeToMinutes(time: string) {
  const [hoursStr, minutesStr] = time.slice(0, 5).split(":");
  return Number(hoursStr) * 60 + Number(minutesStr);
}
