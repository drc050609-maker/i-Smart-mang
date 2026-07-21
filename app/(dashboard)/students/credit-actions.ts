"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { formatSessionDate } from "@/lib/class-session-credits";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

function parsePositiveInt(value: FormDataEntryValue | null) {
  const count = Number(value);
  if (!Number.isInteger(count) || count <= 0) {
    return null;
  }
  return count;
}

function parseSessionDate(value: FormDataEntryValue | null) {
  const sessionDate = value?.toString().trim();
  if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return null;
  }
  return sessionDate;
}

function revalidateCreditPaths(studentId: number, classId: number) {
  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/payments");
  revalidatePath("/attendance");
}

async function getAuthClient() {
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

export async function grantClassCredits(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const credits = parsePositiveInt(formData.get("credits"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!credits) {
    return { error: "Enter a valid credit count." };
  }

  const auth = await getAuthClient();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { error } = await auth.supabase.rpc("grant_student_class_credits", {
    p_student_id: studentId,
    p_class_id: classId,
    p_credits: credits,
    p_reason: formData.get("reason")?.toString().trim() || undefined,
    p_created_by: auth.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateCreditPaths(studentId, classId);
  return { success: true };
}

export async function writeOffClassCredits(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const credits = parsePositiveInt(formData.get("credits"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!credits) {
    return { error: "Enter a valid credit count." };
  }

  const auth = await getAuthClient();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { error } = await auth.supabase.rpc("record_credit_writeoff", {
    p_student_id: studentId,
    p_class_id: classId,
    p_credits: credits,
    p_reason: formData.get("reason")?.toString().trim() || undefined,
    p_created_by: auth.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateCreditPaths(studentId, classId);
  return { success: true };
}

export async function recordMakeupSession(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const creditCost = parsePositiveInt(formData.get("creditCost"));
  const sessionDate =
    parseSessionDate(formData.get("sessionDate")) ?? formatSessionDate(new Date());
  const scheduleId = Number(formData.get("scheduleId"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (creditCost !== 1 && creditCost !== 2) {
    return { error: "Make-up sessions cost 1 or 2 credits." };
  }

  const auth = await getAuthClient();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const scheduleIdValue =
    Number.isInteger(scheduleId) && scheduleId > 0 ? scheduleId : null;

  const relatedAttendanceId = Number(formData.get("relatedAttendanceId"));
  const relatedAttendanceValue =
    Number.isInteger(relatedAttendanceId) && relatedAttendanceId > 0
      ? relatedAttendanceId
      : null;

  const { error } = await auth.supabase.rpc("record_makeup_session", {
    p_student_id: studentId,
    p_class_id: classId,
    p_class_schedule_id: scheduleIdValue,
    p_session_date: sessionDate,
    p_credit_cost: creditCost,
    p_related_attendance_id: relatedAttendanceValue,
    p_notes: formData.get("notes")?.toString().trim() || undefined,
    p_created_by: auth.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateCreditPaths(studentId, classId);
  return { success: true };
}

export async function transferStudentClassCredits(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fromStudentId = Number(formData.get("fromStudentId"));
  const classId = Number(formData.get("classId"));
  const transferType = formData.get("transferType")?.toString();
  const credits = parsePositiveInt(formData.get("credits"));
  const toStudentId = Number(formData.get("toStudentId"));

  if (!Number.isInteger(fromStudentId) || fromStudentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (transferType !== "exchange" && transferType !== "refund") {
    return { error: "Select exchange or refund." };
  }

  if (!credits) {
    return { error: "Enter a valid credit count." };
  }

  if (
    transferType === "exchange" &&
    (!Number.isInteger(toStudentId) || toStudentId <= 0)
  ) {
    return { error: "Select a student to transfer credits to." };
  }

  if (transferType === "exchange" && toStudentId === fromStudentId) {
    return { error: "Cannot transfer credits to the same student." };
  }

  const auth = await getAuthClient();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { error } = await auth.supabase.rpc("transfer_student_class_credits", {
    p_from_student_id: fromStudentId,
    p_to_student_id: transferType === "exchange" ? toStudentId : null,
    p_class_id: classId,
    p_credits: credits,
    p_transfer_type: transferType,
    p_reason: formData.get("reason")?.toString().trim() || undefined,
    p_created_by: auth.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateCreditPaths(fromStudentId, classId);
  if (transferType === "exchange") {
    revalidatePath(`/students/${toStudentId}`);
  }
  revalidatePath("/payments");

  return { success: true };
}
