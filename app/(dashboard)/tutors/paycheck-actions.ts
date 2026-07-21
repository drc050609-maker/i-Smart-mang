"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { parseDollarsToCents } from "@/lib/money";
import { isValidStatementMonth, revalidateStatementMonthPaths } from "@/lib/statements";
import { createClient } from "@/utils/supabase/server";

export type PaycheckActionState = {
  error?: string;
  success?: boolean;
};

type PaycheckLineInput = {
  classId: number;
  sessionCount: number;
  rateCents: number;
};

function parsePaycheckLines(formData: FormData): PaycheckLineInput[] | null {
  const raw = formData.get("lines")?.toString().trim();
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const lines: PaycheckLineInput[] = [];

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const classId = Number((item as { classId?: unknown }).classId);
    const sessionCount = Number((item as { sessionCount?: unknown }).sessionCount);
    const rateRaw = (item as { rate?: unknown }).rate;
    const parsedRate = parseDollarsToCents(
      rateRaw == null ? "" : String(rateRaw),
      { allowZero: true, fieldLabel: "Rate" },
    );

    if (!Number.isInteger(classId) || classId <= 0) {
      return null;
    }

    if (!Number.isInteger(sessionCount) || sessionCount < 0) {
      return null;
    }

    if (!parsedRate.ok) {
      return null;
    }

    lines.push({
      classId,
      sessionCount,
      rateCents: parsedRate.cents,
    });
  }

  return lines;
}

export async function recordTeacherPaycheck(
  _prevState: PaycheckActionState,
  formData: FormData,
): Promise<PaycheckActionState> {
  const teacherId = Number(formData.get("teacherId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const lines = parsePaycheckLines(formData);

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Invalid paycheck year." };
  }

  if (!isValidStatementMonth(month)) {
    return { error: "Invalid paycheck month." };
  }

  if (!lines || lines.length === 0) {
    return { error: "Enter a pay rate for at least one class." };
  }

  const totalCents = lines.reduce(
    (sum, line) => sum + line.sessionCount * line.rateCents,
    0,
  );

  if (totalCents <= 0) {
    return { error: "Paycheck total must be greater than zero." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to record a paycheck." };
  }

  const { error } = await supabase.rpc("record_teacher_paycheck", {
    p_teacher_id: teacherId,
    p_year: year,
    p_month: month,
    p_lines: lines.map((line) => ({
      class_id: line.classId,
      session_count: line.sessionCount,
      rate_cents: line.rateCents,
    })),
    p_created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  await persistPaycheckLineRates(supabase, teacherId, user.id, lines);

  revalidatePath(`/tutors/${teacherId}`);

  for (const path of revalidateStatementMonthPaths(year, month)) {
    revalidatePath(path);
  }

  return { success: true };
}

export async function saveTeacherClassPayRate(
  teacherId: number,
  classId: number,
  rate: number,
): Promise<PaycheckActionState> {
  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!Number.isFinite(rate) || rate < 0) {
    return { error: "Enter a valid rate." };
  }

  const parsedRate = parseDollarsToCents(String(rate), {
    allowZero: true,
    fieldLabel: "Rate",
  });
  if (!parsedRate.ok) {
    return { error: parsedRate.error };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const rateCents = parsedRate.cents;

  const { error: rpcError } = await supabase.rpc("upsert_teacher_class_pay_rate", {
    p_teacher_id: teacherId,
    p_class_id: classId,
    p_rate_cents: rateCents,
    p_updated_by: user.id,
  });

  if (!rpcError) {
    return { success: true };
  }

  const { error } = await supabase.from("teacher_class_pay_rates").upsert(
    {
      teacher_id: teacherId,
      class_id: classId,
      rate_cents: rateCents,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "teacher_id,class_id" },
  );

  if (error) {
    if (
      rpcError.message.includes("schema cache") ||
      error.message.includes("schema cache")
    ) {
      return {
        error:
          "Pay rates are syncing — your rate will be saved when you record the paycheck.",
      };
    }

    return { error: error.message };
  }

  return { success: true };
}

async function persistPaycheckLineRates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: number,
  userId: string,
  lines: PaycheckLineInput[],
) {
  const rateLines = lines.filter((line) => line.rateCents > 0);

  if (rateLines.length === 0) {
    return;
  }

  await Promise.all(
    rateLines.map((line) =>
      supabase.rpc("upsert_teacher_class_pay_rate", {
        p_teacher_id: teacherId,
        p_class_id: line.classId,
        p_rate_cents: line.rateCents,
        p_updated_by: userId,
      }),
    ),
  );
}
