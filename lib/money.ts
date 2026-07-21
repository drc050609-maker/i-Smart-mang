/**
 * Exact money parsing helpers.
 * Store and compute all amounts as integer cents.
 */

export const MAX_MONEY_CENTS = 2_147_483_647; // Postgres integer max

export type ParseMoneyResult =
  | { ok: true; cents: number }
  | { ok: false; error: string };

/**
 * Parse a dollar amount string into cents.
 * Accepts "12", "12.5", "12.50". Rejects more than 2 decimal places and negatives.
 */
export function parseDollarsToCents(
  value: FormDataEntryValue | string | null | undefined,
  {
    allowZero = false,
    fieldLabel = "Amount",
  }: {
    allowZero?: boolean;
    fieldLabel?: string;
  } = {},
): ParseMoneyResult {
  const raw = value?.toString().trim() ?? "";

  if (!raw) {
    return { ok: false, error: `${fieldLabel} is required.` };
  }

  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, error: `Enter a valid ${fieldLabel.toLowerCase()}.` };
  }

  if (raw.startsWith("-")) {
    return { ok: false, error: `${fieldLabel} cannot be negative.` };
  }

  const parts = raw.split(".");
  if (parts[1] && parts[1].length > 2) {
    return {
      ok: false,
      error: `${fieldLabel} can have at most two decimal places.`,
    };
  }

  const dollars = Number(raw);
  if (!Number.isFinite(dollars)) {
    return { ok: false, error: `Enter a valid ${fieldLabel.toLowerCase()}.` };
  }

  const cents = Math.round(dollars * 100);

  if (!Number.isSafeInteger(cents) || cents > MAX_MONEY_CENTS) {
    return { ok: false, error: `${fieldLabel} is too large.` };
  }

  if (cents < 0) {
    return { ok: false, error: `${fieldLabel} cannot be negative.` };
  }

  if (cents === 0 && !allowZero) {
    return { ok: false, error: `${fieldLabel} must be greater than zero.` };
  }

  return { ok: true, cents };
}

/** @deprecated Prefer parseDollarsToCents for new code. */
export function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

export function centsToDollarsInput(cents: number) {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function formatCentsAsCurrency(
  cents: number,
  language: "en" | "zh" = "en",
) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export type FinancialSourceKind =
  | "class_payment"
  | "student_purchase"
  | "teacher_paycheck"
  | "statement_entry"
  | "recurring_statement_entry"
  | "class_pricing"
  | "campus_pricing";

export type FinancialAdjustmentRow = {
  id: number;
  source_kind: FinancialSourceKind;
  source_id: number;
  field_name: string;
  original_amount_cents: number;
  adjustment_cents: number;
  corrected_amount_cents: number;
  reason: string;
  created_at: string;
  created_by: string | null;
};
