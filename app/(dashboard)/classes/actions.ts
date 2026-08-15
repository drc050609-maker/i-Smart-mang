"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { deactivateClassesWithNoActiveEnrollments } from "@/lib/class-active";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { DEFAULT_STARTING_CLASS_CREDITS } from "@/lib/class-session-credits";
import { addMinutesToScheduleTime, parseTypedTime } from "@/lib/class-schedule";
import { parseLessonType, type LessonType } from "@/lib/class-lesson-type";
import { parseClassTrack, type ClassTrack } from "@/lib/class-track";
import { pickReusableClass } from "@/lib/find-reusable-class";
import { parseDollarsToCents } from "@/lib/money";
import { loadTeacherClassRows } from "@/lib/teacher-class-rows";
export type ActionState = {
  error?: string;
  success?: boolean;
  savedAt?: number;
};

function successState(): ActionState {
  return { success: true, savedAt: Date.now() };
}

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

function revalidateClassStudents(classId: number, studentIds: number[] = []) {
  revalidateClass(classId);
  revalidatePath("/students");
  revalidatePath("/students", "layout");
  for (const studentId of studentIds) {
    if (Number.isInteger(studentId) && studentId > 0) {
      revalidatePath(`/students/${studentId}`);
    }
  }
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

function parseTeacherIds(formData: FormData) {
  const fromMulti = formData
    .getAll("teacherIds")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (fromMulti.length > 0) {
    return [...new Set(fromMulti)];
  }

  const single = parseOptionalId(formData.get("teacherId"));
  if (single === undefined) {
    return undefined;
  }
  if (single === null) {
    return [] as number[];
  }
  return [single];
}

function parseClassFields(formData: FormData) {
  const teacherIds = parseTeacherIds(formData);
  return {
    subject: formData.get("subject")?.toString().trim(),
    teacherIds,
    teacherId:
      teacherIds === undefined
        ? undefined
        : teacherIds.length > 0
          ? teacherIds[0]
          : null,
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

  if (fields.teacherIds === undefined) {
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

async function assertTeachersAtLocation(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  teacherIds: number[],
  locationId: number,
) {
  if (teacherIds.length === 0) {
    return null;
  }

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select("id, location_id")
    .in("id", teacherIds);

  if (error) {
    return error.message;
  }

  const foundIds = new Set((teachers ?? []).map((teacher) => teacher.id));
  if (teacherIds.some((id) => !foundIds.has(id))) {
    return "One or more teachers could not be found.";
  }

  if (
    (teachers ?? []).some(
      (teacher) => teacher.location_id !== locationId,
    )
  ) {
    return "Teachers must belong to the same campus as the class.";
  }

  return null;
}

async function syncClassTeachers(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  classId: number,
  teacherIds: number[],
) {
  const { error: deleteError } = await supabase
    .from("class_teachers")
    .delete()
    .eq("class_id", classId);

  if (deleteError) {
    return deleteError.message;
  }

  if (teacherIds.length === 0) {
    return null;
  }

  const { error: insertError } = await supabase.from("class_teachers").insert(
    teacherIds.map((teacherId, index) => ({
      class_id: classId,
      teacher_id: teacherId,
      is_primary: index === 0,
    })),
  );

  if (insertError) {
    return insertError.message;
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

  const teacherLocationError = await assertTeachersAtLocation(
    client.supabase,
    fields.teacherIds ?? [],
    locationId,
  );
  if (teacherLocationError) {
    return { error: teacherLocationError };
  }

  if (fields.teacherId) {
    const { error: existingLookupError, classes: existingClasses } =
      await loadTeacherClassRows(
        client.supabase,
        fields.teacherId,
        locationId,
      );
    if (existingLookupError) {
      return { error: existingLookupError };
    }

    const existing = pickReusableClass(existingClasses, {
      subject: fields.subject!,
      lessonType: fields.lessonType,
      durationMinutes: fields.durationMinutes,
    });

    if (existing) {
      const syncExistingError = await syncClassTeachers(
        client.supabase,
        existing.id,
        fields.teacherIds ?? [],
      );
      if (syncExistingError) {
        return { error: syncExistingError };
      }

      revalidatePath("/classes");
      revalidatePath("/tutors", "layout");
      for (const teacherId of fields.teacherIds ?? []) {
        revalidatePath(`/tutors/${teacherId}`);
      }
      revalidatePath("/tuitions");
      return successState();
    }
  }

  const { data: createdClass, error: classError } = await client.supabase
    .from("classes")
    .insert({
      subject: fields.subject!,
      teacher_id: fields.teacherId,
      room_id: fields.roomId,
      duration_minutes: fields.durationMinutes,
      lesson_type: fields.lessonType as LessonType,
      class_track: fields.classTrack as ClassTrack,
      location_id: locationId,
    })
    .select("id")
    .single();

  if (classError) {
    return { error: classError.message };
  }

  const syncError = await syncClassTeachers(
    client.supabase,
    createdClass.id,
    fields.teacherIds ?? [],
  );
  if (syncError) {
    return { error: syncError };
  }

  revalidatePath("/classes");
  revalidatePath("/tutors", "layout");
  for (const teacherId of fields.teacherIds ?? []) {
    revalidatePath(`/tutors/${teacherId}`);
  }
  revalidatePath("/tuitions");
  return successState();
}

export async function createClassWithPricing(
  _prevState: CreateClassState,
  formData: FormData,
): Promise<CreateClassState> {
  const fields = parseClassFields(formData);
  const validationError = validateClassFields(fields);

  if (validationError) {
    return validationError;
  }

  const single = parseDollarsToCents(formData.get("singlePrice"), {
    fieldLabel: "Single class price",
  });
  if (!single.ok) {
    return { error: single.error };
  }

  const isTrial = fields.lessonType === "trial";
  let package20Cents: number | null = null;
  let package50Cents: number | null = null;

  if (!isTrial) {
    const package20Raw = formData.get("package20Price")?.toString().trim() ?? "";
    const package50Raw = formData.get("package50Price")?.toString().trim() ?? "";

    if (package20Raw) {
      const package20 = parseDollarsToCents(package20Raw, {
        fieldLabel: "20-class package price",
      });
      if (!package20.ok) {
        return { error: package20.error };
      }
      package20Cents = package20.cents;
    }

    if (package50Raw) {
      const package50 = parseDollarsToCents(package50Raw, {
        fieldLabel: "50-class package price",
      });
      if (!package50.ok) {
        return { error: package50.error };
      }
      package50Cents = package50.cents;
    }

    if ((package20Cents == null) !== (package50Cents == null)) {
      return {
        error: "Provide both package prices, or leave both empty.",
      };
    }
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

  const teacherLocationError = await assertTeachersAtLocation(
    client.supabase,
    fields.teacherIds ?? [],
    locationId,
  );
  if (teacherLocationError) {
    return { error: teacherLocationError };
  }

  const { data: createdClass, error: classError } = await client.supabase
    .from("classes")
    .insert({
      subject: fields.subject!,
      teacher_id: fields.teacherId,
      room_id: fields.roomId,
      duration_minutes: fields.durationMinutes,
      lesson_type: fields.lessonType as LessonType,
      class_track: fields.classTrack as ClassTrack,
      location_id: locationId,
      single_price_cents: single.cents,
      package_20_price_cents: isTrial ? null : package20Cents,
      package_50_price_cents: isTrial ? null : package50Cents,
    })
    .select("id")
    .single();

  if (classError) {
    return { error: classError.message };
  }

  const syncError = await syncClassTeachers(
    client.supabase,
    createdClass.id,
    fields.teacherIds ?? [],
  );
  if (syncError) {
    return { error: syncError };
  }

  revalidatePath("/classes");
  revalidatePath("/tutors", "layout");
  for (const teacherId of fields.teacherIds ?? []) {
    revalidatePath(`/tutors/${teacherId}`);
  }
  revalidatePath("/tuitions");
  return successState();
}

export async function updateClassSubject(
  _prevState: UpdateClassState,
  formData: FormData,
): Promise<UpdateClassState> {
  const classId = Number(formData.get("classId"));
  const subject = formData.get("subject")?.toString().trim();

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!subject) {
    return { error: "Course name is required." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: classError } = await client.supabase
    .from("classes")
    .update({ subject })
    .eq("id", classId);

  if (classError) {
    return { error: classError.message };
  }

  revalidateClass(classId);
  revalidatePath("/tuitions");
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

  const { data: existingClass, error: existingError } = await client.supabase
    .from("classes")
    .select("location_id")
    .eq("id", classId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (!existingClass) {
    return { error: "Class not found." };
  }

  if (existingClass.location_id == null) {
    return { error: "Class campus location could not be resolved." };
  }

  const teacherLocationError = await assertTeachersAtLocation(
    client.supabase,
    fields.teacherIds ?? [],
    existingClass.location_id,
  );
  if (teacherLocationError) {
    return { error: teacherLocationError };
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

  const syncError = await syncClassTeachers(
    client.supabase,
    classId,
    fields.teacherIds ?? [],
  );
  if (syncError) {
    return { error: syncError };
  }

  revalidateClass(classId);
  for (const teacherId of fields.teacherIds ?? []) {
    revalidatePath(`/tutors/${teacherId}`);
  }
  return successState();
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

  return parseTypedTime(value.toString()) ?? undefined;
}

function parseClassScheduleFields(formData: FormData) {
  const isRecurring = formData.get("isRecurring") === "true";
  const scheduleDayOfWeek = parseDayOfWeek(formData.get("scheduleDayOfWeek"));
  const scheduleDate = parseScheduleDate(formData.get("scheduleDate"));
  const scheduleStartTime = parseScheduleTime(formData.get("scheduleStartTime"));
  const scheduleEndTime = parseScheduleTime(formData.get("scheduleEndTime"));
  const durationMinutes = parseDurationMinutes(formData.get("durationMinutes"));
  const studentIdRaw = formData.get("studentId");
  const studentId =
    studentIdRaw === null || studentIdRaw.toString().trim() === ""
      ? null
      : parseOptionalId(studentIdRaw);

  return {
    isRecurring,
    scheduleDayOfWeek,
    scheduleDate,
    scheduleStartTime,
    scheduleEndTime,
    durationMinutes,
    studentId,
  };
}

function validateClassScheduleFields(
  fields: ReturnType<typeof parseClassScheduleFields>,
) {
  if (fields.studentId === undefined) {
    return { error: "Invalid student." };
  }

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

  if (fields.durationMinutes === undefined) {
    return { error: "Duration must be a whole number of minutes." };
  }

  const slotDuration = fields.durationMinutes;
  if (slotDuration !== null && slotDuration > 0) {
    const computedEnd = addMinutesToScheduleTime(
      fields.scheduleStartTime,
      slotDuration,
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
      return { error: "Duration or end time is required." };
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
) {
  if (
    fields.durationMinutes !== null &&
    fields.durationMinutes !== undefined &&
    Number.isInteger(fields.durationMinutes) &&
    fields.durationMinutes > 0 &&
    fields.scheduleStartTime
  ) {
    return addMinutesToScheduleTime(
      fields.scheduleStartTime,
      fields.durationMinutes,
    );
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
    .select("id")
    .eq("id", classId)
    .maybeSingle();

  if (classLookupError) {
    return { error: classLookupError.message };
  }

  if (!classRow) {
    return { error: "Class not found." };
  }

  const fields = parseClassScheduleFields(formData);
  const validationError = validateClassScheduleFields(fields);

  if (validationError) {
    return validationError;
  }

  if (typeof fields.studentId === "number") {
    const { data: enrollment, error: enrollmentError } = await client.supabase
      .from("enrollments")
      .select("id")
      .eq("class id", classId)
      .eq("student id", fields.studentId)
      .maybeSingle();

    if (enrollmentError) {
      return { error: enrollmentError.message };
    }

    if (!enrollment) {
      return { error: "Student is not enrolled in this class." };
    }
  }

  const scheduleEndTime = resolveScheduleEndTime(fields);

  if (!scheduleEndTime) {
    return { error: "End time is required." };
  }

  const schedulePayload = {
    is_recurring: fields.isRecurring,
    schedule_day_of_week: fields.isRecurring ? fields.scheduleDayOfWeek : null,
    schedule_date: fields.isRecurring ? null : fields.scheduleDate,
    schedule_start_time: fields.scheduleStartTime!,
    schedule_end_time: scheduleEndTime,
    student_id: fields.studentId,
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

  revalidateClassStudents(classId, newStudentIds);
  return { success: true };
}

export async function removeClassStudent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const classId = Number(formData.get("classId"));
  const enrollmentId = Number(formData.get("enrollmentId"));
  const studentIdValue = formData.get("studentId");
  const studentIdFromForm =
    studentIdValue == null || studentIdValue.toString().trim() === ""
      ? null
      : Number(studentIdValue);

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return { error: "Invalid enrollment." };
  }

  if (
    studentIdFromForm !== null &&
    (!Number.isInteger(studentIdFromForm) || studentIdFromForm <= 0)
  ) {
    return { error: "Invalid student." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: enrollment, error: enrollmentLookupError } =
    await client.supabase
      .from("enrollments")
      .select('"student id"')
      .eq("id", enrollmentId)
      .eq("class id", classId)
      .maybeSingle();

  if (enrollmentLookupError) {
    return { error: enrollmentLookupError.message };
  }

  if (!enrollment) {
    return { error: "Enrollment not found." };
  }

  const studentId =
    typeof enrollment["student id"] === "number"
      ? enrollment["student id"]
      : studentIdFromForm;

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

  revalidateClassStudents(
    classId,
    typeof studentId === "number" && studentId > 0 ? [studentId] : [],
  );
  return { success: true };
}

async function deleteClassById(classId: number): Promise<ActionState> {
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

  if (!classRow) {
    return { error: "Class not found." };
  }

  const isTrial =
    classRow.lesson_type?.trim().toLowerCase() === "trial";

  if (isTrial) {
    const { error: trialDeleteError } = await client.supabase.rpc(
      "delete_trial_class",
      { p_class_id: classId },
    );

    if (trialDeleteError) {
      return { error: trialDeleteError.message };
    }

    revalidatePath("/classes");
    revalidatePath("/tuitions");
    revalidatePath("/payments");
    revalidatePath("/schedule");
    revalidatePath("/tutors", "layout");
    revalidatePath("/students", "layout");
    return { success: true };
  } else {
    const { count: paymentCount, error: paymentCountError } =
      await client.supabase
        .from("class_payments")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId);

    if (paymentCountError) {
      return { error: paymentCountError.message };
    }

    if ((paymentCount ?? 0) > 0) {
      return {
        error:
          "This course has payment records and cannot be deleted. Clear or reassign those payments first.",
      };
    }
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
  revalidatePath("/tuitions");
  revalidatePath("/payments");
  revalidatePath("/schedule");
  revalidatePath("/tutors", "layout");
  revalidatePath("/students", "layout");
  return { success: true };
}

export async function deleteClass(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const classId = Number(formData.get("classId"));
  const result = await deleteClassById(classId);
  if (result.error) {
    return result;
  }

  redirect("/classes", RedirectType.replace);
}

/** Delete a course from the Tuitions page without leaving the page. */
export async function deleteTuitionCourse(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return deleteClassById(Number(formData.get("classId")));
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
