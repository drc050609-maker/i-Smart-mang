"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { parseDollarsToCents } from "@/lib/money";
import { createClient } from "@/utils/supabase/server";

export type PurchaseActionState = {
  error?: string;
  success?: boolean;
  purchaseId?: number;
};

export async function recordStudentPurchase(
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const studentId = Number(formData.get("studentId"));
  const description = formData.get("description")?.toString().trim() ?? "";
  const parsedAmount = parseDollarsToCents(formData.get("amount"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Select a student." };
  }

  if (!description) {
    return { error: "Describe what they are paying for." };
  }

  if (!parsedAmount.ok) {
    return { error: parsedAmount.error };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to record a purchase." };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select('id, "first name", "last name", is_active')
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    return { error: studentError.message };
  }

  if (!student) {
    return { error: "Student not found." };
  }

  if (!student.is_active) {
    return { error: "Cannot record a purchase for an inactive student." };
  }

  const { data: purchaseId, error: purchaseError } = await supabase.rpc(
    "record_student_purchase",
    {
      p_student_id: studentId,
      p_description: description,
      p_amount_cents: parsedAmount.cents,
      p_created_by: user.id,
    },
  );

  if (purchaseError) {
    return { error: purchaseError.message };
  }

  const purchasedAt = new Date();
  revalidatePath("/purchases");
  revalidatePath(
    `/statements/${purchasedAt.getFullYear()}/${purchasedAt.getMonth() + 1}`,
  );
  revalidatePath("/statements");

  return {
    success: true,
    purchaseId: purchaseId as number,
  };
}
