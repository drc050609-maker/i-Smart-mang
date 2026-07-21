"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { deactivateClassesWithNoActiveEnrollments } from "@/lib/class-active";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { DEFAULT_STARTING_CLASS_CREDITS } from "@/lib/class-session-credits";
import { addMinutesToScheduleTime } from "@/lib/class-schedule";
import { parseLessonType, type LessonType } from "@/lib/class-lesson-type";
import { parseClassTrack, type ClassTrack } from "@/lib/class-track";
export type ActionState = {
  error?: string;
  success?: boolean;
};

export type CreateClassState = ActionState;
export type UpdateClassState = ActionState;
export type AddClassStudentsState = ActionState;
export type UpdateClassScheduleState = ActionState;

function revalidateClass(classId: number) {
  revalidatePath("/classes");
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/schedule");
  revalidatePath("/tutors", "layout");
}

function revalidateClassStudents(classId: number) {
  revalidateClass(classId);
  revalidatePath("/students", "layout");
}

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

function parseOptionalId(value: FormDataEntryValue | null) {
  if (!value || value.toString().trim() === "") {
    return null;
  }

  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return undefined;
  }

  return id;
}

function parseDurationMinutes(value: FormDataEntryValue | null) {
  if (!value || value.toString().trim() === "") {
    return null;
  }

  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes <= 0) {
    return undefined;
  }

  return minutes;
}

function parseClassFields(formData: FormData) {
  return {
    subject: formData.get("subject")?.toString().trim(),
    teacherId: parseOptionalId(formData.get("teacherId")),
    roomId: parseOptionalId(formData.get("roomId")),
    durationMinutes: parseDurationMinutes(formData.get("durationMinutes")),
    lessonType: parseLessonType(formData.get("lessonType")),
    classTrack: parseClassTrack(formData.get("classTrack")),
  };
}

function validateClassFields(fields: ReturnType<typeof parseClassFields>) {
  if (!fields.subject) {
    return { error: "Subject is required." };
  }

  if (fields.lessonType === undefined) {
    return { error: "Lesson type is required." };
  }

  if (fields.lessonType === null) {
    return { error: "Invalid lesson type." };
  }

  if (fields.classTrack === undefined) {
    return { error: "Class track is required." };
  }

  if (fields.classTrack === null) {
    return { error: "Invalid class track." };
  }

  if (fields.teacherId === undefined) {
    return { error: "Invalid teacher." };
  }

  if (fields.roomId === undefined) {
    return { error: "Invalid room." };
  }

  if (fields.durationMinutes === undefined) {
    return { error: "Duration must be a whole number of minutes." };
  }

  return null;
}

export async function createClass(
  _prevState: CreateClassState,
  formData: FormData,
): Promise<CreateClassState> {
  const fields = parseClassFields(formData);
  const validationError = validateClassFields(fields);

  if (validationError) {
    return validationError;
  }

  const staff = await requireStaff();
  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const locationId = await getActiveCampusLocationId(
    client.supabase,
    staff,
  );
  if (!locationId) {
    return { error: "Campus location could not be resolved." };
  }

  const { error: classError } = await client.supabase.from("classes").insert({
    subject: fields.subject!,
    teacher_id: fields.teacherId,
    room_id: fields.roomId,
    duration_minutes: fields.durationMinutes,
    lesson_type: fields.lessonType as LessonType,
    class_track: fields.classTrack as ClassTrack,
    location_id: locationId,
  });

  if (classError) {
    return { error: classError.message };
  }

  revalidatePath("/classes");
  revalidatePath("/tutors", "layout");
  return { success: true };
}

export async function updateClass(
  _prevState: UpdateClassState,
  formData: FormData,
): Promise<UpdateClassState> {
  const classId = Number(formData.get("classId"));
  const fields = parseClassFields(formData);
  const validationError = validateClassFields(fields);

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (validationError) {
    return validationError;
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: classError } = await client.supabase
    .from("classes")
    .update({
      subject: fields.subject!,
      teacher_id: fields.teacherId,
      room_id: fields.roomId,
      duration_minutes: fields.durationMinutes,
      lesson_type: fields.lessonType as LessonType,
      class_track: fields.classTrack as ClassTrack,
    })
    .eq("id", classId);

  if (classError) {
    return { error: classError.message };
  }

  revalidateClass(classId);
  return { success: true };
}

function parseDayOfWeek(value: FormDataEntryValue | null) {
  if (value === null || value.toString().trim() === "") {
    return null;
  }

  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return undefined;
  }

  return day;
}

function parseScheduleDate(value: FormDataEntryValue | null) {
  if (!value || value.toString().trim() === "") {
    return null;
  }

  const date = value.toString().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return undefined;
  }

  return date;
}

function parseScheduleTime(value: FormDataEntryValue | null) {
  if (!value || value.toString().trim() === "") {
    return null;
  }

  const time = value.toString().trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return undefined;
  }

  return time.length === 5 ? `${time}:00` : time;
}

function parseClassScheduleFields(formData: FormData) {
  const isRecurring = formData.get("isRecurring") === "true";
  const scheduleDayOfWeek = parseDayOfWeek(formData.get("scheduleDayOfWeek"));
  const scheduleDate = parseScheduleDate(formData.get("scheduleDate"));
  const scheduleStartTime = parseScheduleTime(formData.get("scheduleStartTime"));
  const scheduleEndTime = parseScheduleTime(formData.get("scheduleEndTime"));

  return {
    isRecurring,
    scheduleDayOfWeek,
    scheduleDate,
    scheduleStartTime,
    scheduleEndTime,
  };
}

function validateClassScheduleFields(
  fields: ReturnType<typeof parseClassScheduleFields>,
  durationMinutes: number | null,
) {
  if (fields.scheduleDayOfWeek === undefined) {
    return { error: "Invalid day of week." };
  }

  if (fields.scheduleDate === undefined) {
    return { error: "Invalid meeting date." };
  }

  if (fields.scheduleStartTime === undefined) {
    return { error: "Invalid start time." };
  }

  if (!fields.scheduleStartTime) {
    return { error: "Start time is required." };
  }

  const usesClassDuration =
    durationMinutes !== null &&
    Number.isInteger(durationMinutes) &&
    durationMinutes > 0;

  if (usesClassDuration) {
    const computedEnd = addMinutesToScheduleTime(
      fields.scheduleStartTime,
      durationMinutes,
    );

    if (!computedEnd) {
      return {
        error:
          "This class duration extends past midnight. Choose an earlier start time.",
      };
    }
  } else {
    if (fields.scheduleEndTime === undefined) {
      return { error: "Invalid end time." };
    }

    if (!fields.scheduleEndTime) {
      return { error: "Start and end times are required." };
    }

    if (fields.scheduleStartTime >= fields.scheduleEndTime) {
      return { error: "End time must be after start time." };
    }
  }

  if (fields.isRecurring) {
    if (fields.scheduleDayOfWeek === null) {
      return { error: "Select a day of the week for repeating classes." };
    }
    return null;
  }

  if (!fields.scheduleDate) {
    return { error: "Select a date for one-time classes." };
  }

  return null;
}

function resolveScheduleEndTime(
  fields: ReturnType<typeof parseClassScheduleFields>,
  durationMinutes: number | null,
) {
  const usesClassDuration =
    durationMinutes !== null &&
    Number.isInteger(durationMinutes) &&
    durationMinutes > 0 &&
    fields.scheduleStartTime;

  if (usesClassDuration) {
    return addMinutesToScheduleTime(fields.scheduleStartTime!, durationMinutes);
  }

  return fields.scheduleEndTime ?? null;
}

async function saveClassSchedule(
  classId: number,
  scheduleId: number | null,
  formData: FormData,
): Promise<UpdateClassScheduleState> {
  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: classRow, error: classLookupError } = await client.supabase
    .from("classes")
    .select("duration_minutes")
    .eq("id", classId)
    .maybeSingle();

  if (classLookupError) {
    return { error: classLookupError.message };
  }

  if (!classRow) {
    return { error: "Class not found." };
  }

  const fields = parseClassScheduleFields(formData);
  const validationError = validateClassScheduleFields(
    fields,
    classRow.duration_minutes,
  );

  if (validationError) {
    return validationError;
  }

  const scheduleEndTime = resolveScheduleEndTime(
    fields,
    classRow.duration_minutes,
  );

  if (!scheduleEndTime) {
    return { error: "End time is required." };
  }

  const schedulePayload = {
    is_recurring: fields.isRecurring,
    schedule_day_of_week: fields.isRecurring ? fields.scheduleDayOfWeek : null,
    schedule_date: fields.isRecurring ? null : fields.scheduleDate,
    schedule_start_time: fields.scheduleStartTime!,
    schedule_end_time: scheduleEndTime,
  };

  if (scheduleId === null) {
    const { error: insertError } = await client.supabase
      .from("class_schedules")
      .insert({
        class_id: classId,
        ...schedulePayload,
      });

    if (insertError) {
      return { error: insertError.message };
    }
  } else {
    const { error: updateError } = await client.supabase
      .from("class_schedules")
      .update(schedulePayload)
      .eq("id", scheduleId)
      .eq("class_id", classId);

    if (updateError) {
      return { error: updateError.message };
    }
  }

  revalidateClass(classId);
  return { success: true };
}

export async function addClassSchedule(
  _prevState: UpdateClassScheduleState,
  formData: FormData,
): Promise<UpdateClassScheduleState> {
  const classId = Number(formData.get("classId"));

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  return saveClassSchedule(classId, null, formData);
}

export async function updateClassSchedule(
  _prevState: UpdateClassScheduleState,
  formData: FormData,
): Promise<UpdateClassScheduleState> {
  const classId = Number(formData.get("classId"));
  const scheduleId = Number(formData.get("scheduleId"));

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return { error: "Invalid schedule." };
  }

  return saveClassSchedule(classId, scheduleId, formData);
}

export async function deleteClassSchedule(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const classId = Number(formData.get("classId"));
  const scheduleId = Number(formData.get("scheduleId"));

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return { error: "Invalid schedule." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: deleteError } = await client.supabase
    .from("class_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("class_id", classId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidateClass(classId);
  return { success: true };
}

function parseStudentIds(formData: FormData) {
  return formData
    .getAll("studentIds")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export async function addClassStudents(
  _prevState: AddClassStudentsState,
  formData: FormData,
): Promise<AddClassStudentsState> {
  const classId = Number(formData.get("classId"));
  const studentIds = parseStudentIds(formData);

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (studentIds.length === 0) {
    return { error: "Select at least one student." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: existingEnrollments, error: existingError } =
    await client.supabase
      .from("enrollments")
      .select('"student id"')
      .eq("class id", classId)
      .in("student id", studentIds);

  if (existingError) {
    return { error: existingError.message };
  }

  const enrolledIds = new Set(
    (existingEnrollments ?? [])
      .map((row) => row["student id"])
      .filter((id): id is number => typeof id === "number"),
  );
  const newStudentIds = studentIds.filter((id) => !enrolledIds.has(id));

  if (newStudentIds.length === 0) {
    return { error: "All selected students are already enrolled in this class." };
  }

  const { data: studentRows, error: studentsError } = await client.supabase
    .from("students")
    .select("id, starting_class_credits")
    .in("id", newStudentIds);

  if (studentsError) {
    return { error: studentsError.message };
  }

  const creditsByStudent = new Map(
    (studentRows ?? []).map((row) => [
      row.id,
      row.starting_class_credits ?? DEFAULT_STARTING_CLASS_CREDITS,
    ]),
  );

  const today = new Date().toISOString().slice(0, 10);
  const { error: enrollmentError } = await client.supabase
    .from("enrollments")
    .insert(
      newStudentIds.map((studentId) => ({
        "class id": classId,
        "student id": studentId,
        created_date: today,
        is_active: true,
        updated_date: today,
      })),
    );

  if (enrollmentError) {
    return { error: enrollmentError.message };
  }

  for (const studentId of newStudentIds) {
    const creditCount =
      creditsByStudent.get(studentId) ?? DEFAULT_STARTING_CLASS_CREDITS;

    if (creditCount <= 0) {
      continue;
    }

    const { error: creditsError } = await client.supabase.rpc(
      "add_student_class_credits",
      {
        p_student_id: studentId,
        p_class_id: classId,
        p_count: creditCount,
      },
    );

    if (creditsError) {
      return { error: creditsError.message };
    }
  }

  revalidateClassStudents(classId);
  return { success: true };
}

export async function removeClassStudent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const classId = Number(formData.get("classId"));
  const enrollmentId = Number(formData.get("enrollmentId"));

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return { error: "Invalid enrollment." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: enrollmentError } = await client.supabase
    .from("enrollments")
    .delete()
    .eq("id", enrollmentId)
    .eq("class id", classId);

  if (enrollmentError) {
    return { error: enrollmentError.message };
  }

  const syncError = await deactivateClassesWithNoActiveEnrollments(
    client.supabase,
    [classId],
  );

  if (syncError) {
    return { error: syncError };
  }

  revalidateClassStudents(classId);
  return { success: true };
}

export async function deleteClass(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const classId = Number(formData.get("classId"));

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: enrollmentError } = await client.supabase
    .from("enrollments")
    .delete()
    .eq("class id", classId);

  if (enrollmentError) {
    return { error: enrollmentError.message };
  }

  const { error: classError } = await client.supabase
    .from("classes")
    .delete()
    .eq("id", classId);

  if (classError) {
    return { error: classError.message };
  }

  revalidatePath("/classes");
  revalidatePath("/tutors", "layout");
  revalidatePath("/students", "layout");
  redirect("/classes");
}

export async function updateClassActive(
  formData: FormData,
): Promise<ActionState> {
  const classId = Number(formData.get("classId"));
  const isActive = formData.get("isActive") === "true";

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: classError } = await client.supabase
    .from("classes")
    .update({ is_active: isActive })
    .eq("id", classId);

  if (classError) {
    return { error: classError.message };
  }

  revalidateClass(classId);
  revalidatePath("/students", "layout");
  revalidatePath("/tutors", "layout");
  return { success: true };
}
