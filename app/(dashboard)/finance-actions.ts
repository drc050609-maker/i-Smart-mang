"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getCurrentStaff } from "@/lib/auth";
import { parseDollarsToCents, type FinancialSourceKind } from "@/lib/money";
import { revalidateStatementMonthPaths } from "@/lib/statements";
import { createClient } from "@/utils/supabase/server";

export type MoneyActionState = {
  error?: string;
  success?: boolean;
  adjustmentId?: number;
};

function revalidateMoneyPaths() {
  const now = new Date();
  revalidatePath("/payments");
  revalidatePath("/payments/purchases");
  revalidatePath("/purchases");
  revalidatePath("/statements");
  revalidatePath("/tuitions");
  revalidatePath("/settings");
  revalidatePath("/tutors", "layout");
  for (const path of revalidateStatementMonthPaths(
    now.getFullYear(),
    now.getMonth() + 1,
  )) {
    revalidatePath(path);
  }
}

async function correctSource(
  sourceKind: FinancialSourceKind,
  sourceId: number,
  amountValue: FormDataEntryValue | null,
  reasonValue: FormDataEntryValue | null,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  if (!Number.isInteger(sourceId) || sourceId <= 0) {
    return { error: "Invalid record." };
  }

  const parsed = parseDollarsToCents(amountValue, {
    allowZero: sourceKind === "teacher_paycheck",
  });
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const reason = reasonValue?.toString().trim() ?? "";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc("correct_money_source", {
    p_source_kind: sourceKind,
    p_source_id: sourceId,
    p_corrected_amount_cents: parsed.cents,
    p_reason: reason,
    p_field_name: "amount_cents",
  });

  if (error) {
    return { error: error.message };
  }

  revalidateMoneyPaths();
  return { success: true, adjustmentId: data as number };
}

export async function correctClassPaymentAmount(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  return correctSource(
    "class_payment",
    Number(formData.get("paymentId")),
    formData.get("amount"),
    formData.get("reason"),
  );
}

export async function correctStudentPurchaseAmount(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  return correctSource(
    "student_purchase",
    Number(formData.get("purchaseId")),
    formData.get("amount"),
    formData.get("reason"),
  );
}

export async function correctTeacherPaycheckAmount(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  return correctSource(
    "teacher_paycheck",
    Number(formData.get("paycheckId")),
    formData.get("amount"),
    formData.get("reason"),
  );
}

export async function correctManualStatementEntryAmount(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  return correctSource(
    "statement_entry",
    Number(formData.get("entryId")),
    formData.get("amount"),
    formData.get("reason"),
  );
}

export async function updateRecurringEntryAmount(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  const id = Number(formData.get("entryId"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid recurring entry." };
  }

  const parsed = parseDollarsToCents(formData.get("amount"));
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const reason =
    formData.get("reason")?.toString().trim() || "Updated recurring amount";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.rpc("update_recurring_statement_entry_amount", {
    p_id: id,
    p_amount_cents: parsed.cents,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/statements");
  return { success: true };
}

export async function updateClassPricing(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  const classId = Number(formData.get("classId"));
  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  const single = parseDollarsToCents(formData.get("singlePrice"), {
    fieldLabel: "Single class price",
  });
  if (!single.ok) {
    return { error: single.error };
  }

  const isTrial = formData.get("isTrial")?.toString() === "true";
  let package20Cents: number | null = null;
  let package50Cents: number | null = null;

  if (!isTrial) {
    const package20 = parseDollarsToCents(formData.get("package20Price"), {
      fieldLabel: "20-class package price",
    });
    if (!package20.ok) {
      return { error: package20.error };
    }
    const package50 = parseDollarsToCents(formData.get("package50Price"), {
      fieldLabel: "50-class package price",
    });
    if (!package50.ok) {
      return { error: package50.error };
    }
    package20Cents = package20.cents;
    package50Cents = package50.cents;
  }

  const reason =
    formData.get("reason")?.toString().trim() || "Updated class pricing";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.rpc("update_class_pricing", {
    p_class_id: classId,
    p_single_price_cents: single.cents,
    p_package_20_price_cents: package20Cents ?? undefined,
    p_package_50_price_cents: package50Cents ?? undefined,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tuitions");
  revalidatePath("/payments");
  revalidatePath("/classes", "layout");
  return { success: true };
}

export async function clearClassPricing(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  const classId = Number(formData.get("classId"));
  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  const reason =
    formData.get("reason")?.toString().trim() || "Cleared class pricing";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.rpc("clear_class_pricing", {
    p_class_id: classId,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tuitions");
  revalidatePath("/payments");
  revalidatePath("/classes", "layout");
  return { success: true };
}

export async function clearClassPricingField(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  const classId = Number(formData.get("classId"));
  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  const field = formData.get("field")?.toString();
  if (field !== "single" && field !== "package20" && field !== "package50") {
    return { error: "Invalid pricing field." };
  }

  const reason =
    formData.get("reason")?.toString().trim() || "Cleared class pricing field";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.rpc("clear_class_pricing_field", {
    p_class_id: classId,
    p_field: field,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tuitions");
  revalidatePath("/payments");
  revalidatePath("/classes", "layout");
  return { success: true };
}

export async function updateCampusTrialPricing(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  const locationId = Number(formData.get("locationId"));
  if (!Number.isInteger(locationId) || locationId <= 0) {
    return { error: "Invalid campus." };
  }

  const trialPrice = parseDollarsToCents(formData.get("trialPrice"), {
    fieldLabel: "Trial price",
  });
  if (!trialPrice.ok) {
    return { error: trialPrice.error };
  }

  const trialPay = parseDollarsToCents(formData.get("trialTeacherPay"), {
    fieldLabel: "Trial teacher pay",
    allowZero: true,
  });
  if (!trialPay.ok) {
    return { error: trialPay.error };
  }

  const reason =
    formData.get("reason")?.toString().trim() || "Updated campus trial pricing";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.rpc("update_campus_trial_pricing", {
    p_location_id: locationId,
    p_trial_price_cents: trialPrice.cents,
    p_trial_teacher_pay_cents: trialPay.cents,
    p_reason: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/tuitions");
  revalidatePath("/trial");
  return { success: true };
}

function optionalDollarsToCents(
  value: FormDataEntryValue | null,
  fieldLabel: string,
): { ok: true; cents: number | null } | { ok: false; error: string } {
  const raw = value?.toString().trim() ?? "";
  if (!raw) {
    return { ok: true, cents: null };
  }
  return parseDollarsToCents(value, { fieldLabel });
}

export async function createClassPricePromotion(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  const classId = Number(formData.get("classId"));
  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Select a class." };
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) {
    return { error: "Enter a name for this special pack." };
  }

  const startDate = formData.get("startDate")?.toString().trim() ?? "";
  const endDate = formData.get("endDate")?.toString().trim() ?? "";
  if (!startDate || !endDate) {
    return { error: "Start and end dates are required." };
  }
  if (endDate < startDate) {
    return { error: "End date must be on or after the start date." };
  }

  const single = optionalDollarsToCents(
    formData.get("singlePrice"),
    "Single class price",
  );
  if (!single.ok) return { error: single.error };

  const package20 = optionalDollarsToCents(
    formData.get("package20Price"),
    "20-class package price",
  );
  if (!package20.ok) return { error: package20.error };

  const package50 = optionalDollarsToCents(
    formData.get("package50Price"),
    "50-class package price",
  );
  if (!package50.ok) return { error: package50.error };

  if (
    single.cents == null &&
    package20.cents == null &&
    package50.cents == null
  ) {
    return { error: "Enter at least one promotional price." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("class_price_promotions").insert({
    class_id: classId,
    name,
    single_price_cents: single.cents,
    package_20_price_cents: package20.cents,
    package_50_price_cents: package50.cents,
    start_date: startDate,
    end_date: endDate,
    is_active: true,
    created_by: staff.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tuitions");
  return { success: true };
}

export async function deactivateClassPricePromotion(
  _prev: MoneyActionState,
  formData: FormData,
): Promise<MoneyActionState> {
  const staff = await getCurrentStaff();
  if (!staff) {
    return { error: "You must be signed in." };
  }

  const promotionId = Number(formData.get("promotionId"));
  if (!Number.isInteger(promotionId) || promotionId <= 0) {
    return { error: "Invalid promotion." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("class_price_promotions")
    .update({ is_active: false })
    .eq("id", promotionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/tuitions");
  return { success: true };
}
