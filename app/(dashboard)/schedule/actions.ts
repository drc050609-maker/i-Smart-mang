"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireStaff } from "@/lib/auth";
import { isFrontDeskStaffRole } from "@/lib/staff-role";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { addMinutesToScheduleTime, minutesBetweenScheduleTimes, parseTypedTime } from "@/lib/class-schedule";
import { DEFAULT_STARTING_CLASS_CREDITS } from "@/lib/class-session-credits";
import { inferClassTrackFromSubject } from "@/lib/class-track";
import { parseLessonType } from "@/lib/class-lesson-type";
import { pickReusableClass } from "@/lib/find-reusable-class";
import { loadTeacherClassRows } from "@/lib/teacher-class-rows";
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

  return parseTypedTime(value.toString()) ?? undefined;
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

  const durationMinutes =
    minutesBetweenScheduleTimes(
      scheduleRow.schedule_start_time,
      scheduleRow.schedule_end_time,
    ) ?? 45;

  const computedEnd = addMinutesToScheduleTime(newStartTime, durationMinutes);

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

  const { data: classRow, error: classLookupError } = await client.supabase
    .from("classes")
    .select("id, lesson_type")
    .eq("id", classId)
    .maybeSingle();

  if (classLookupError) {
    return { error: classLookupError.message };
  }

  const isTrial = classRow?.lesson_type?.trim().toLowerCase() === "trial";

  if (isFrontDeskStaffRole(staff.role) && !isTrial) {
    return { error: "Front desk accounts cannot change the schedule." };
  }

  if (isTrial) {
    const { error: trialDeleteError } = await client.supabase.rpc(
      "delete_trial_class",
      { p_class_id: classId },
    );

    if (trialDeleteError) {
      return { error: trialDeleteError.message };
    }

    revalidateSchedule(classId);
    revalidatePath("/tuitions");
    revalidatePath("/payments");
    revalidatePath("/students", "layout");
    return { success: true };
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

function parseStudentIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("studentIds")
        .map((value) => Number(value))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
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
  const parsedLessonType = parseLessonType(formData.get("lessonType"));
  if (parsedLessonType === null) {
    return { error: "Select a private or group class." };
  }
  const lessonType = parsedLessonType ?? "private";
  if (lessonType === "trial") {
    return { error: "Select a private or group class." };
  }

  const studentId = parsePositiveId(formData.get("studentId"));
  const studentIds =
    lessonType === "group"
      ? parseStudentIds(formData)
      : studentId
        ? [studentId]
        : [];
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
  if (studentIds.length === 0) {
    return {
      error:
        lessonType === "group"
          ? "Select at least one student."
          : "Select a student.",
    };
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

  const [
    { data: teacher, error: teacherError },
    { data: studentRows, error: studentsError },
  ] = await Promise.all([
    client.supabase
      .from("teachers")
      .select("id, location_id")
      .eq("id", teacherId)
      .maybeSingle(),
    client.supabase
      .from("students")
      .select("id, location_id, starting_class_credits")
      .in("id", studentIds),
  ]);

  if (teacherError) {
    return { error: teacherError.message };
  }
  if (!teacher || teacher.location_id !== locationId) {
    return { error: "Teacher could not be found at this campus." };
  }
  if (studentsError) {
    return { error: studentsError.message };
  }

  const studentsById = new Map((studentRows ?? []).map((row) => [row.id, row]));
  if (studentsById.size !== studentIds.length) {
    return { error: "Student could not be found at this campus." };
  }
  for (const id of studentIds) {
    const student = studentsById.get(id);
    if (!student || student.location_id !== locationId) {
      return { error: "Student could not be found at this campus." };
    }
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

  if (durationMinutes == null || durationMinutes <= 0) {
    durationMinutes = 45;
  }

  if (resolvedClassId) {
    const match = teacherClasses.find((row) => row.id === resolvedClassId);
    if (!match) {
      return { error: "That class does not belong to this teacher." };
    }
  } else {
    if (!subject) {
      return { error: "Instrument is required." };
    }

    const existing = pickReusableClass(teacherClasses, {
      subject,
      lessonType,
      durationMinutes,
    });

    if (existing) {
      resolvedClassId = existing.id;
    } else {
      const { data: createdClass, error: createError } = await client.supabase
        .from("classes")
        .insert({
          subject,
          teacher_id: teacherId,
          duration_minutes: durationMinutes,
          lesson_type: lessonType,
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

  const targetClassId = resolvedClassId;

  const endTime = addMinutesToScheduleTime(startTime, durationMinutes);
  if (!endTime) {
    return {
      error:
        "This class duration extends past midnight. Choose an earlier start time.",
    };
  }

  const { data: existingEnrollments, error: enrollmentError } =
    await client.supabase
      .from("enrollments")
      .select('"student id"')
      .eq("class id", targetClassId)
      .in("student id", studentIds);

  if (enrollmentError) {
    return { error: enrollmentError.message };
  }

  const enrolledIds = new Set(
    (existingEnrollments ?? [])
      .map((row) => row["student id"])
      .filter((id): id is number => typeof id === "number"),
  );
  const newStudentIds = studentIds.filter((id) => !enrolledIds.has(id));

  if (newStudentIds.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const { error: insertEnrollmentError } = await client.supabase
      .from("enrollments")
      .insert(
        newStudentIds.map((id) => ({
          "class id": targetClassId,
          "student id": id,
          created_date: today,
          is_active: true,
          updated_date: today,
        })),
      );

    if (insertEnrollmentError) {
      return { error: insertEnrollmentError.message };
    }

    for (const id of newStudentIds) {
      const student = studentsById.get(id);
      const creditCount =
        student?.starting_class_credits ?? DEFAULT_STARTING_CLASS_CREDITS;
      if (creditCount <= 0) {
        continue;
      }

      const { error: creditsError } = await client.supabase.rpc(
        "add_student_class_credits",
        {
          p_student_id: id,
          p_class_id: targetClassId,
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
    class_id: targetClassId,
    student_id: lessonType === "group" ? null : studentIds[0],
    is_recurring: isRecurring,
    schedule_day_of_week: isRecurring ? dayOfWeek : null,
    schedule_date: isRecurring ? null : scheduleDate,
    schedule_start_time: startTime,
    schedule_end_time: endTime,
  });

  if (scheduleError) {
    return { error: scheduleError.message };
  }

  revalidateSchedule(targetClassId);
  revalidatePath("/students");
  for (const id of studentIds) {
    revalidatePath(`/students/${id}`);
  }
  revalidatePath(`/tutors/${teacherId}`);
  return { success: true };
}
