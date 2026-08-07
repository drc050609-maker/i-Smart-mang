"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { parseDollarsToCents } from "@/lib/money";
import {
  defaultEntryDateForMonth,
  isValidStatementMonth,
  parseStatementEntryType,
  revalidateStatementMonthPaths,
  statementMonthHref,
} from "@/lib/statements";
import { createClient } from "@/utils/supabase/server";

export type StatementActionState = {
  error?: string;
  success?: boolean;
  href?: string;
};

export async function addStatementPeriod(
  _prevState: StatementActionState,
  formData: FormData,
): Promise<StatementActionState> {
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Enter a valid year." };
  }

  if (!isValidStatementMonth(month)) {
    return { error: "Select a month." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to add a statement." };
  }

  const { error } = await supabase.from("statement_periods").upsert(
    {
      year,
      month,
      created_by: user.id,
    },
    { onConflict: "year,month", ignoreDuplicates: true },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/statements");

  return {
    success: true,
    href: statementMonthHref(year, month),
  };
}

export type RecurringStatementEntryRow = {
  id: number;
  entry_type: "income" | "expense";
  amount_cents: number;
  description: string;
  day_of_month: number;
  is_active: boolean;
};

export async function addRecurringStatementEntry(
  _prevState: StatementActionState,
  formData: FormData,
): Promise<StatementActionState> {
  const entryType = parseStatementEntryType(formData.get("entryType"));
  const parsedAmount = parseDollarsToCents(formData.get("amount"));
  const description = formData.get("description")?.toString().trim() ?? "";
  const dayOfMonth = Number(formData.get("dayOfMonth"));

  if (!entryType) {
    return { error: "Select income or expense." };
  }

  if (!parsedAmount.ok) {
    return { error: parsedAmount.error };
  }

  if (!description) {
    return { error: "Describe what this recurring entry is for." };
  }

  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
    return { error: "Day of month must be between 1 and 28." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.from("recurring_statement_entries").insert({
    entry_type: entryType,
    amount_cents: parsedAmount.cents,
    description,
    day_of_month: dayOfMonth,
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  const now = new Date();
  await supabase.rpc("apply_recurring_statement_entries", {
    p_year: now.getFullYear(),
    p_month: now.getMonth() + 1,
    p_created_by: user.id,
  });

  revalidatePath("/statements");
  revalidatePath(
    `/statements/${now.getFullYear()}/${now.getMonth() + 1}`,
  );

  return { success: true };
}

export async function toggleRecurringStatementEntry(
  id: number,
  isActive: boolean,
): Promise<StatementActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid recurring entry." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("recurring_statement_entries")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/statements");

  return { success: true };
}

export async function deleteRecurringStatementEntry(
  id: number,
): Promise<StatementActionState> {
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid recurring entry." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("recurring_statement_entries")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/statements");

  return { success: true };
}

export async function syncRecurringStatementEntries(
  year: number,
  month: number,
): Promise<void> {
  if (!isValidStatementMonth(month)) {
    return;
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.rpc("apply_recurring_statement_entries", {
    p_year: year,
    p_month: month,
    p_created_by: user?.id,
  });
}

export async function addStatementEntry(
  _prevState: StatementActionState,
  formData: FormData,
): Promise<StatementActionState> {
  const entryType = parseStatementEntryType(formData.get("entryType"));
  const parsedAmount = parseDollarsToCents(formData.get("amount"));
  const description = formData.get("description")?.toString().trim() ?? "";
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  if (!entryType) {
    return { error: "Select income or expense." };
  }

  if (!parsedAmount.ok) {
    return { error: parsedAmount.error };
  }

  if (!description) {
    return { error: "Describe what this entry is for." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Invalid statement year." };
  }

  if (!isValidStatementMonth(month)) {
    return { error: "Invalid statement month." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to add a statement entry." };
  }

  const { error } = await supabase.from("statement_entries").insert({
    entry_type: entryType,
    amount_cents: parsedAmount.cents,
    description,
    entry_date: defaultEntryDateForMonth(year, month),
    created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  for (const path of revalidateStatementMonthPaths(year, month)) {
    revalidatePath(path);
  }

  return { success: true };
}

export async function deleteStatementEntry(
  _prevState: StatementActionState,
  formData: FormData,
): Promise<StatementActionState> {
  const entryId = Number(formData.get("entryId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  if (!Number.isInteger(entryId) || entryId <= 0) {
    return { error: "Invalid statement entry." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete a statement entry." };
  }

  const { data: entry, error: loadError } = await supabase
    .from("statement_entries")
    .select("id, teacher_paycheck_id, front_desk_paycheck_id")
    .eq("id", entryId)
    .maybeSingle();

  if (loadError) {
    return { error: loadError.message };
  }

  if (!entry) {
    return { error: "Statement entry not found." };
  }

  let teacherId: number | null = null;
  if (entry.teacher_paycheck_id != null) {
    const { data: paycheck } = await supabase
      .from("teacher_paychecks")
      .select("teacher_id")
      .eq("id", entry.teacher_paycheck_id)
      .maybeSingle();
    teacherId = paycheck?.teacher_id ?? null;
  } else if (entry.front_desk_paycheck_id != null) {
    const { data: paycheck } = await supabase
      .from("front_desk_paychecks")
      .select("teacher_id")
      .eq("id", entry.front_desk_paycheck_id)
      .maybeSingle();
    teacherId = paycheck?.teacher_id ?? null;
  }

  const { error } = await supabase.rpc("delete_statement_entry", {
    p_entry_id: entryId,
  });

  if (error) {
    return { error: error.message };
  }

  if (
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100 &&
    isValidStatementMonth(month)
  ) {
    for (const path of revalidateStatementMonthPaths(year, month)) {
      revalidatePath(path);
    }
  } else {
    revalidatePath("/statements");
  }

  if (teacherId != null) {
    revalidatePath(`/tutors/${teacherId}`);
    revalidatePath("/my-hours");
  }

  return { success: true };
}
