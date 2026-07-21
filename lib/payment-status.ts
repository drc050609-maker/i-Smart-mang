import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import type { Database } from "@/types/database.types";

export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const PAYMENT_STATUSES = [
  "completed",
  "refunded",
  "exchanged",
] as const satisfies readonly PaymentStatus[];

const PAYMENT_STATUS_LABEL_KEYS = {
  completed: "enum.paymentStatus.completed",
  refunded: "enum.paymentStatus.refunded",
  exchanged: "enum.paymentStatus.exchanged",
} as const;

export const PAYMENT_STATUS_OPTIONS: {
  value: PaymentStatus;
  label: string;
}[] = [
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "exchanged", label: "Exchanged" },
];

export function formatPaymentStatus(
  status: PaymentStatus | null | undefined,
  language: AppLanguage = "en",
) {
  if (!status) return translate(language, "common.notAvailable");
  if (PAYMENT_STATUSES.includes(status as (typeof PAYMENT_STATUSES)[number])) {
    return translate(
      language,
      PAYMENT_STATUS_LABEL_KEYS[status as (typeof PAYMENT_STATUSES)[number]],
    );
  }
  return status;
}

export function paymentStatusBadgeClass(status: PaymentStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30";
    case "refunded":
      return "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30";
    case "exchanged":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30";
  }
}

export function parsePaymentStatus(value: FormDataEntryValue | null) {
  const status = value?.toString().trim();
  if (!status) return null;
  if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) return undefined;
  return status as PaymentStatus;
}
