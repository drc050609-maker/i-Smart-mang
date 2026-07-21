"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { findTodayScheduleId } from "@/lib/class-session-credits";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

type ScheduleRow = {
  id: number;
  class_id: number;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
};

function parseSessionDate(value: FormDataEntryValue | null) {
  const sessionDate = value?.toString().trim();
  if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return null;
  }
  return sessionDate;
}

function revalidateClassSessionPaths(studentId: number, classId: number) {
  revalidatePath("/schedule");
  revalidatePath("/payments");
  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/classes/${classId}`);
}

async function getAuthenticatedSupabase() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." as const };
  }

  return { supabase, userId: user.id };
}

async function validateStudentClassEnrollment(
  supabase: ReturnType<typeof createClient>,
  studentId: number,
  classId: number,
) {
  const [{ data: student }, { data: classRow }, { data: enrollment }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, is_active")
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("classes")
        .select("id, is_active")
        .eq("id", classId)
        .maybeSingle(),
      supabase
        .from("enrollments")
        .select("id, is_active")
        .eq("student id", studentId)
        .eq("class id", classId)
        .maybeSingle(),
    ]);

  if (!student?.is_active) {
    return { error: "Student not found or inactive." };
  }

  if (!classRow?.is_active) {
    return { error: "Class not found or inactive." };
  }

  if (!enrollment?.is_active) {
    return { error: "Student is not actively enrolled in this class." };
  }

  return { ok: true as const };
}

async function resolveScheduleId(
  supabase: ReturnType<typeof createClient>,
  classId: number,
  sessionDate: string,
  scheduleIdValue: FormDataEntryValue | null,
) {
  const parsedScheduleId = Number(scheduleIdValue);
  if (Number.isInteger(parsedScheduleId) && parsedScheduleId > 0) {
    return parsedScheduleId;
  }

  const { data: schedules } = await supabase
    .from("class_schedules")
    .select(
      "id, class_id, is_recurring, schedule_day_of_week, schedule_date, schedule_start_time, schedule_end_time",
    )
    .eq("class_id", classId);

  return findTodayScheduleId(
    (schedules as ScheduleRow[] | null) ?? [],
    classId,
    sessionDate,
  );
}

export async function manualDeductClassSession(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const sessionDate = parseSessionDate(formData.get("sessionDate"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!sessionDate) {
    return { error: "Enter a valid session date." };
  }

  const auth = await getAuthenticatedSupabase();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const validation = await validateStudentClassEnrollment(
    auth.supabase,
    studentId,
    classId,
  );

  if ("error" in validation) {
    return validation;
  }

  const scheduleId = await resolveScheduleId(
    auth.supabase,
    classId,
    sessionDate,
    formData.get("scheduleId"),
  );

  const { data: recordId, error } = await auth.supabase.rpc(
    "record_class_session",
    {
      p_student_id: studentId,
      p_class_id: classId,
      p_class_schedule_id: scheduleId,
      p_session_date: sessionDate,
      p_status: "used",
      p_source: "manual",
      p_created_by: auth.userId,
    },
  );

  if (error) {
    return { error: error.message };
  }

  if (recordId === null) {
    return { error: "This session was already recorded for that date." };
  }

  revalidateClassSessionPaths(studentId, classId);
  return { success: true };
}

export async function markClassSessionAbsent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const sessionDate = parseSessionDate(formData.get("sessionDate"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!sessionDate) {
    return { error: "Enter a valid session date." };
  }

  const auth = await getAuthenticatedSupabase();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const validation = await validateStudentClassEnrollment(
    auth.supabase,
    studentId,
    classId,
  );

  if ("error" in validation) {
    return validation;
  }

  const scheduleId = await resolveScheduleId(
    auth.supabase,
    classId,
    sessionDate,
    formData.get("scheduleId"),
  );

  const { data: recordId, error } = await auth.supabase.rpc(
    "record_class_session",
    {
      p_student_id: studentId,
      p_class_id: classId,
      p_class_schedule_id: scheduleId,
      p_session_date: sessionDate,
      p_status: "absent",
      p_source: "manual",
      p_created_by: auth.userId,
    },
  );

  if (error) {
    return { error: error.message };
  }

  if (recordId === null) {
    return { error: "This session was already recorded for that date." };
  }

  revalidateClassSessionPaths(studentId, classId);
  return { success: true };
}
