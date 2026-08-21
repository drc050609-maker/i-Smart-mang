"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireStaff } from "@/lib/auth";
import { dollarsToCents } from "@/lib/money";
import {
  parsePaymentPlan,
  sessionCountForPlan,
} from "@/lib/payment-plan";
import { parsePaymentStatus } from "@/lib/payment-status";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { resolveTuitionPricingForClass } from "@/lib/tuition-price-sheet";
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

  const pricing = resolveTuitionPricingForClass(
    {
      subject: classRow.subject,
      duration_minutes: classRow.duration_minutes,
      lesson_type: classRow.lesson_type,
    },
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

export async function updateClassPayment(
  _prevState: RecordPaymentState,
  formData: FormData,
): Promise<RecordPaymentState> {
  await requireStaff();

  const paymentId = Number(formData.get("paymentId"));
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const plan = parsePaymentPlan(formData.get("paymentPlan"));
  const notes = formData.get("notes")?.toString().trim() || null;
  const paidAtRaw = formData.get("paidAt")?.toString().trim() ?? "";
  const amountRaw = formData.get("amount")?.toString().trim() ?? "";
  const amount = amountRaw === "" ? NaN : Number(amountRaw);

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { error: "Invalid payment." };
  }
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Select a student." };
  }
  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Select a class." };
  }
  if (!plan) {
    return { error: "Select a valid payment option." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }

  const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;
  if (!paidAt || Number.isNaN(paidAt.getTime())) {
    return { error: "Enter a valid payment date." };
  }

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return { error: "Could not save this payment. Try again." };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("class_payments")
    .select(
      "id, student_id, class_id, payment_plan, session_count, amount_cents, status, notes, paid_at",
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentError) {
    return { error: paymentError.message };
  }
  if (!payment) {
    return { error: "Payment not found." };
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
        .select("id, subject, is_active")
        .eq("id", classId)
        .maybeSingle(),
    ]);

  if (studentError) return { error: studentError.message };
  if (!student) return { error: "Student not found." };
  if (classError) return { error: classError.message };
  if (!classRow) return { error: "Class not found." };

  const sessionCount = sessionCountForPlan(plan);
  const amountCents = dollarsToCents(amount);
  const studentOrClassChanged =
    payment.student_id !== studentId || payment.class_id !== classId;
  const sessionCountChanged = payment.session_count !== sessionCount;

  if (
    payment.status === "completed" &&
    (studentOrClassChanged || sessionCountChanged)
  ) {
    const { error: deductError } = await supabase.rpc("deduct_class_credits", {
      p_student_id: payment.student_id,
      p_class_id: payment.class_id,
      p_count: payment.session_count,
    });
    if (deductError) {
      return {
        error:
          deductError.message ||
          "Could not move class credits from the original student/class.",
      };
    }

    const { error: addError } = await supabase.rpc("add_student_class_credits", {
      p_student_id: studentId,
      p_class_id: classId,
      p_count: sessionCount,
    });
    if (addError) {
      await supabase.rpc("add_student_class_credits", {
        p_student_id: payment.student_id,
        p_class_id: payment.class_id,
        p_count: payment.session_count,
      });
      return { error: addError.message };
    }
  }

  const studentName = [student["first name"], student["last name"]]
    .filter(Boolean)
    .join(" ");

  const { error: updateError } = await supabase
    .from("class_payments")
    .update({
      student_id: studentId,
      class_id: classId,
      payment_plan: plan,
      session_count: sessionCount,
      amount_cents: amountCents,
      effective_amount_cents: amountCents,
      notes,
      paid_at: paidAt.toISOString(),
    })
    .eq("id", paymentId);

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase
    .from("statement_entries")
    .update({
      amount_cents: amountCents,
      description: `Payment from ${studentName} for ${classRow.subject}`,
      entry_date: paidAt.toISOString().slice(0, 10),
    })
    .eq("class_payment_id", paymentId)
    .is("corrects_entry_id", null);

  revalidatePath("/payments");
  revalidatePath(`/students/${payment.student_id}`);
  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/classes/${payment.class_id}`);
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/statements");

  return { success: true, paymentId };
}
