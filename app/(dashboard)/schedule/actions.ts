"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireStaff } from "@/lib/auth";
import { isFrontDeskStaffRole } from "@/lib/staff-role";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { addMinutesToScheduleTime } from "@/lib/class-schedule";
import { DEFAULT_STARTING_CLASS_CREDITS } from "@/lib/class-session-credits";
import { inferClassTrackFromSubject } from "@/lib/class-track";
import { loadScheduleCalendarEvents } from "@/lib/schedule-load";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/utils/supabase/server";
import type { ScheduleEvent, ScheduleException } from "@/lib/schedule-calendar";

export type ScheduleActionState = {
  error?: string;
  success?: boolean;
};

export type ScheduleCalendarEventsResult = {
  events: ScheduleEvent[];
  exceptions: ScheduleException[];
  error?: string;
};

export type TeacherScheduleClassOption = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  lesson_type: string | null;
};

export type TeacherScheduleOptionsResult = {
  classes: TeacherScheduleClassOption[];
  teacherStudentIds: number[];
  subjects: string[];
  error?: string;
};

export async function fetchScheduleCalendarEventsAction(
  teacherIds: number[],
): Promise<ScheduleCalendarEventsResult> {
  const staff = await requireStaff();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return {
      events: [],
      exceptions: [],
      error: "Campus location could not be resolved.",
    };
  }

  const result = await loadScheduleCalendarEvents(
    supabase,
    locationId,
    teacherIds.length > 0 ? teacherIds : null,
  );

  return {
    events: result.events,
    exceptions: result.exceptions,
    error: result.error ?? undefined,
  };
}

function getServiceClient() {
  try {
    return { supabase: createSupabaseServiceClient() };
  } catch {
    return {
      error:
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then Redeploy.",
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
  const staff = await requireStaff();
  if (isFrontDeskStaffRole(staff.role)) {
    return { error: "Front desk accounts cannot change the schedule." };
  }

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

export async function deleteFromCalendar(
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const staff = await requireStaff();
  if (isFrontDeskStaffRole(staff.role)) {
    return { error: "Front desk accounts cannot change the schedule." };
  }

  const scheduleId = Number(formData.get("scheduleId"));
  const classId = Number(formData.get("classId"));
  const scope = formData.get("scope")?.toString();
  const occurrenceDate = parseDate(formData.get("occurrenceDate"));
  const startTime = parseScheduleTime(formData.get("startTime"));
  const endTime = parseScheduleTime(formData.get("endTime"));

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return { error: "Invalid schedule." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: scheduleRow, error: scheduleError } = await client.supabase
    .from("class_schedules")
    .select("id, class_id, is_recurring")
    .eq("id", scheduleId)
    .eq("class_id", classId)
    .maybeSingle();

  if (scheduleError) {
    return { error: scheduleError.message };
  }

  if (!scheduleRow) {
    return { error: "Schedule not found." };
  }

  if (!scheduleRow.is_recurring || scope === "series") {
    const { error: deleteError } = await client.supabase
      .from("class_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("class_id", classId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    revalidateSchedule(classId);
    return { success: true };
  }

  if (scope !== "occurrence") {
    return { error: "Select whether to delete this occurrence or all." };
  }

  if (!occurrenceDate || !startTime || !endTime) {
    return { error: "Missing occurrence details." };
  }

  const { error: upsertError } = await client.supabase
    .from("class_schedule_exceptions")
    .upsert(
      {
        schedule_id: scheduleId,
        original_date: occurrenceDate,
        override_date: occurrenceDate,
        schedule_start_time: startTime,
        schedule_end_time: endTime,
        is_cancelled: true,
      },
      { onConflict: "schedule_id,original_date" },
    );

  if (upsertError) {
    return { error: upsertError.message };
  }

  revalidateSchedule(classId);
  return { success: true };
}

function parsePositiveId(value: FormDataEntryValue | null) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

function weekdayFromDateYmd(date: string) {
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

async function loadTeacherClassRows(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  teacherId: number,
  locationId: number,
) {
  const [{ data: linkedRows, error: linkedError }, { data: ownedRows, error: ownedError }] =
    await Promise.all([
      supabase
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", teacherId),
      supabase
        .from("classes")
        .select("id, subject, duration_minutes, lesson_type, teacher_id, location_id, is_active")
        .eq("teacher_id", teacherId)
        .eq("location_id", locationId)
        .eq("is_active", true),
    ]);

  if (linkedError) {
    return { error: linkedError.message, classes: [] as TeacherScheduleClassOption[] };
  }
  if (ownedError) {
    return { error: ownedError.message, classes: [] as TeacherScheduleClassOption[] };
  }

  const linkedIds = [
    ...new Set(
      (linkedRows ?? [])
        .map((row) => row.class_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];

  let linkedClasses: typeof ownedRows = [];
  if (linkedIds.length > 0) {
    const { data, error } = await supabase
      .from("classes")
      .select("id, subject, duration_minutes, lesson_type, teacher_id, location_id, is_active")
      .in("id", linkedIds)
      .eq("location_id", locationId)
      .eq("is_active", true);
    if (error) {
      return { error: error.message, classes: [] as TeacherScheduleClassOption[] };
    }
    linkedClasses = data ?? [];
  }

  const byId = new Map<number, TeacherScheduleClassOption>();
  for (const row of [...(ownedRows ?? []), ...(linkedClasses ?? [])]) {
    byId.set(row.id, {
      id: row.id,
      subject: row.subject,
      duration_minutes: row.duration_minutes,
      lesson_type: row.lesson_type,
    });
  }

  return {
    error: null as string | null,
    classes: [...byId.values()].sort((a, b) => a.subject.localeCompare(b.subject)),
  };
}

export async function fetchTeacherScheduleOptionsAction(
  teacherId: number,
): Promise<TeacherScheduleOptionsResult> {
  const empty: TeacherScheduleOptionsResult = {
    classes: [],
    teacherStudentIds: [],
    subjects: [],
  };

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return empty;
  }

  const staff = await requireStaff();
  const client = getServiceClient();
  if ("error" in client) {
    return { ...empty, error: client.error };
  }

  const locationId = await getActiveCampusLocationId(client.supabase, staff);
  if (!locationId) {
    return { ...empty, error: "Campus location could not be resolved." };
  }

  const { error: classError, classes } = await loadTeacherClassRows(
    client.supabase,
    teacherId,
    locationId,
  );
  if (classError) {
    return { ...empty, error: classError };
  }

  const classIds = classes.map((row) => row.id);
  let teacherStudentIds: number[] = [];
  if (classIds.length > 0) {
    const { data: enrollments, error: enrollmentError } = await client.supabase
      .from("enrollments")
      .select('"student id"')
      .in("class id", classIds)
      .not("student id", "is", null);

    if (enrollmentError) {
      return { ...empty, error: enrollmentError.message };
    }

    teacherStudentIds = [
      ...new Set(
        (enrollments ?? [])
          .map((row) => row["student id"])
          .filter((id): id is number => typeof id === "number"),
      ),
    ];
  }

  const { data: subjectRows, error: subjectError } = await client.supabase
    .from("classes")
    .select("subject")
    .eq("location_id", locationId);

  if (subjectError) {
    return { ...empty, error: subjectError.message };
  }

  const subjects = [
    ...new Set(
      (subjectRows ?? [])
        .map((row) => row.subject?.trim())
        .filter((subject): subject is string => Boolean(subject)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return { classes, teacherStudentIds, subjects };
}

export async function addStudentToCalendar(
  _prevState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const staff = await requireStaff();
  if (isFrontDeskStaffRole(staff.role)) {
    return { error: "Front desk accounts cannot change the schedule." };
  }

  const teacherId = parsePositiveId(formData.get("teacherId"));
  const studentId = parsePositiveId(formData.get("studentId"));
  const classIdValue = formData.get("classId")?.toString().trim() ?? "";
  const classId =
    classIdValue === "" || classIdValue === "new"
      ? null
      : parsePositiveId(classIdValue);
  const subject = formData.get("subject")?.toString().trim() ?? "";
  const durationRaw = formData.get("durationMinutes")?.toString().trim() ?? "";
  const parsedDuration = durationRaw === "" ? null : Number(durationRaw);
  const isRecurring = formData.get("isRecurring")?.toString() === "true";
  const scheduleDate = parseDate(formData.get("scheduleDate"));
  const startTime = parseScheduleTime(formData.get("startTime"));

  if (!teacherId) {
    return { error: "Select a teacher." };
  }
  if (!studentId) {
    return { error: "Select a student." };
  }
  if (classIdValue !== "" && classIdValue !== "new" && !classId) {
    return { error: "Invalid class." };
  }
  if (!scheduleDate) {
    return { error: "Select a date." };
  }
  if (!startTime) {
    return { error: "Start time is required." };
  }
  if (
    parsedDuration !== null &&
    (!Number.isInteger(parsedDuration) || parsedDuration <= 0)
  ) {
    return { error: "Duration must be a whole number of minutes." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const locationId = await getActiveCampusLocationId(client.supabase, staff);
  if (!locationId) {
    return { error: "Campus location could not be resolved." };
  }

  const [{ data: teacher, error: teacherError }, { data: student, error: studentError }] =
    await Promise.all([
      client.supabase
        .from("teachers")
        .select("id, location_id")
        .eq("id", teacherId)
        .maybeSingle(),
      client.supabase
        .from("students")
        .select("id, location_id, starting_class_credits")
        .eq("id", studentId)
        .maybeSingle(),
    ]);

  if (teacherError) {
    return { error: teacherError.message };
  }
  if (!teacher || teacher.location_id !== locationId) {
    return { error: "Teacher could not be found at this campus." };
  }
  if (studentError) {
    return { error: studentError.message };
  }
  if (!student || student.location_id !== locationId) {
    return { error: "Student could not be found at this campus." };
  }

  const { error: classLookupError, classes: teacherClasses } = await loadTeacherClassRows(
    client.supabase,
    teacherId,
    locationId,
  );
  if (classLookupError) {
    return { error: classLookupError };
  }

  let resolvedClassId = classId;
  let durationMinutes = parsedDuration;

  if (resolvedClassId) {
    const match = teacherClasses.find((row) => row.id === resolvedClassId);
    if (!match) {
      return { error: "That class does not belong to this teacher." };
    }
    if (durationMinutes == null && match.duration_minutes && match.duration_minutes > 0) {
      durationMinutes = match.duration_minutes;
    }
  } else {
    if (!subject) {
      return { error: "Subject is required for a new class." };
    }

    const existing = teacherClasses.find(
      (row) =>
        row.subject.trim().toLowerCase() === subject.toLowerCase() &&
        (durationMinutes == null ||
          row.duration_minutes == null ||
          row.duration_minutes === durationMinutes),
    );

    if (existing) {
      resolvedClassId = existing.id;
      if (
        durationMinutes == null &&
        existing.duration_minutes &&
        existing.duration_minutes > 0
      ) {
        durationMinutes = existing.duration_minutes;
      }
    } else {
      if (durationMinutes == null) {
        durationMinutes = 45;
      }

      const { data: createdClass, error: createError } = await client.supabase
        .from("classes")
        .insert({
          subject,
          teacher_id: teacherId,
          duration_minutes: durationMinutes,
          lesson_type: "private",
          class_track: inferClassTrackFromSubject(subject),
          location_id: locationId,
        })
        .select("id")
        .single();

      if (createError) {
        return { error: createError.message };
      }

      const { error: linkError } = await client.supabase.from("class_teachers").insert({
        class_id: createdClass.id,
        teacher_id: teacherId,
      });
      if (linkError) {
        return { error: linkError.message };
      }

      resolvedClassId = createdClass.id;
    }
  }

  if (!resolvedClassId) {
    return { error: "Class is required." };
  }

  if (durationMinutes == null || durationMinutes <= 0) {
    durationMinutes = 45;
  }

  const endTime = addMinutesToScheduleTime(startTime, durationMinutes);
  if (!endTime) {
    return {
      error:
        "This class duration extends past midnight. Choose an earlier start time.",
    };
  }

  const { data: enrollment, error: enrollmentError } = await client.supabase
    .from("enrollments")
    .select("id")
    .eq("class id", resolvedClassId)
    .eq("student id", studentId)
    .maybeSingle();

  if (enrollmentError) {
    return { error: enrollmentError.message };
  }

  if (!enrollment) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: insertEnrollmentError } = await client.supabase
      .from("enrollments")
      .insert({
        "class id": resolvedClassId,
        "student id": studentId,
        created_date: today,
        is_active: true,
        updated_date: today,
      });

    if (insertEnrollmentError) {
      return { error: insertEnrollmentError.message };
    }

    const creditCount = student.starting_class_credits ?? DEFAULT_STARTING_CLASS_CREDITS;
    if (creditCount > 0) {
      const { error: creditsError } = await client.supabase.rpc(
        "add_student_class_credits",
        {
          p_student_id: studentId,
          p_class_id: resolvedClassId,
          p_count: creditCount,
        },
      );
      if (creditsError) {
        return { error: creditsError.message };
      }
    }
  }

  const dayOfWeek = weekdayFromDateYmd(scheduleDate);
  if (isRecurring && dayOfWeek === null) {
    return { error: "Select a day of the week for repeating classes." };
  }

  const { error: scheduleError } = await client.supabase.from("class_schedules").insert({
    class_id: resolvedClassId,
    student_id: studentId,
    is_recurring: isRecurring,
    schedule_day_of_week: isRecurring ? dayOfWeek : null,
    schedule_date: isRecurring ? null : scheduleDate,
    schedule_start_time: startTime,
    schedule_end_time: endTime,
  });

  if (scheduleError) {
    return { error: scheduleError.message };
  }

  revalidateSchedule(resolvedClassId);
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/tutors/${teacherId}`);
  return { success: true };
}

function timeToMinutes(time: string) {
  const [hoursStr, minutesStr] = time.slice(0, 5).split(":");
  return Number(hoursStr) * 60 + Number(minutesStr);
}
