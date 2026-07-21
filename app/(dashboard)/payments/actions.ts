"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { dollarsToCents } from "@/lib/money";
import {
  parsePaymentPlan,
  sessionCountForPlan,
} from "@/lib/payment-plan";
import { parsePaymentStatus } from "@/lib/payment-status";
import { buildTuitionPricing } from "@/lib/tuition";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type RecordPaymentState = ActionState & {
  paymentId?: number;
};

export async function recordClassPayment(
  _prevState: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const plan = parsePaymentPlan(formData.get("paymentPlan"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Select a student to pay for." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Select a class to pay for." };
  }

  if (!plan) {
    return { error: "Select a valid payment option." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to record a payment." };
  }

  const [{ data: student, error: studentError }, { data: classRow, error: classError }] =
    await Promise.all([
      supabase
        .from("students")
        .select('id, "first name", "last name", is_active')
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("classes")
        .select(
          "id, subject, duration_minutes, lesson_type, is_active, single_price_cents, package_20_price_cents, package_50_price_cents",
        )
        .eq("id", classId)
        .maybeSingle(),
    ]);

  if (studentError) {
    return { error: studentError.message };
  }

  if (!student) {
    return { error: "Student not found." };
  }

  if (!student.is_active) {
    return { error: "Cannot pay for an inactive student." };
  }

  if (classError) {
    return { error: classError.message };
  }

  if (!classRow) {
    return { error: "Class not found." };
  }

  if (!classRow.is_active) {
    return { error: "Cannot pay for an inactive class." };
  }

  const pricing = buildTuitionPricing(
    classRow.duration_minutes,
    classRow.lesson_type,
    {
      single_price_cents: classRow.single_price_cents,
      package_20_price_cents: classRow.package_20_price_cents,
      package_50_price_cents: classRow.package_50_price_cents,
    },
  );

  const amount =
    plan === "single"
      ? pricing.perClass
      : plan === "package_20"
        ? pricing.package20
        : pricing.package50;

  if (amount === null || amount <= 0) {
    return { error: "This payment option is not available for this class." };
  }

  const { data: payment, error: paymentError } = await supabase.rpc(
    "record_class_payment",
    {
      p_student_id: studentId,
      p_class_id: classId,
      p_payment_plan: plan,
      p_amount_cents: dollarsToCents(amount),
      p_session_count: sessionCountForPlan(plan),
      p_created_by: user.id,
    },
  );

  if (paymentError) {
    return { error: paymentError.message };
  }

  const paidAt = new Date();
  revalidatePath("/payments");
  revalidatePath(`/students/${studentId}`);
  revalidatePath(
    `/statements/${paidAt.getFullYear()}/${paidAt.getMonth() + 1}`,
  );
  revalidatePath("/statements");

  return {
    success: true,
    paymentId: payment as number,
  };
}

export async function updateClassPaymentStatus(
  _prevState: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  const paymentId = Number(formData.get("paymentId"));
  const status = parsePaymentStatus(formData.get("status"));

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { error: "Invalid payment." };
  }

  if (!status || status === "completed") {
    return { error: "Select refunded or exchanged." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const exchangedForPaymentId = Number(formData.get("exchangedForPaymentId"));
  const exchangedForPaymentValue =
    status === "exchanged" &&
    Number.isInteger(exchangedForPaymentId) &&
    exchangedForPaymentId > 0
      ? exchangedForPaymentId
      : null;

  const credits = Number(formData.get("credits"));
  const creditsValue =
    Number.isInteger(credits) && credits > 0 ? credits : undefined;

  const toStudentId = Number(formData.get("toStudentId"));
  const toStudentValue =
    status === "exchanged" &&
    Number.isInteger(toStudentId) &&
    toStudentId > 0
      ? toStudentId
      : undefined;

  const { error } = await supabase.rpc("update_payment_status", {
    p_payment_id: paymentId,
    p_status: status,
    p_exchanged_for_payment_id: exchangedForPaymentValue ?? undefined,
    p_notes: formData.get("notes")?.toString().trim() || undefined,
    p_changed_by: user.id,
    p_credits: creditsValue,
    p_to_student_id: toStudentValue,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/payments");
  revalidatePath("/students", "layout");

  return { success: true, paymentId };
}
