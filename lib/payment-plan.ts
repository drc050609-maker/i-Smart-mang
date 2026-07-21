import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import {
  buildTuitionPricing,
  isTrialLesson,
  PACKAGE_20_COUNT,
  PACKAGE_50_COUNT,
} from "@/lib/tuition";

export const PAYMENT_PLANS = ["single", "package_20", "package_50"] as const;

export type PaymentPlan = (typeof PAYMENT_PLANS)[number];

export function parsePaymentPlan(value: FormDataEntryValue | null) {
  const plan = value?.toString().trim();
  if (!plan || !PAYMENT_PLANS.includes(plan as PaymentPlan)) {
    return null;
  }
  return plan as PaymentPlan;
}

export function paymentPlanLabel(
  plan: PaymentPlan,
  language: AppLanguage = "en",
) {
  switch (plan) {
    case "single":
      return translate(language, "enum.paymentPlan.single");
    case "package_20":
      return translate(language, "enum.paymentPlan.package", {
        count: PACKAGE_20_COUNT,
      });
    case "package_50":
      return translate(language, "enum.paymentPlan.package", {
        count: PACKAGE_50_COUNT,
      });
  }
}

export function sessionCountForPlan(plan: PaymentPlan) {
  switch (plan) {
    case "single":
      return 1;
    case "package_20":
      return PACKAGE_20_COUNT;
    case "package_50":
      return PACKAGE_50_COUNT;
  }
}

export function amountForPlan(
  plan: PaymentPlan,
  durationMinutes: number | null,
  lessonType: string | null,
): number | null {
  const pricing = buildTuitionPricing(durationMinutes, lessonType);

  switch (plan) {
    case "single":
      return pricing.perClass;
    case "package_20":
      return pricing.package20;
    case "package_50":
      return pricing.package50;
  }
}

export function availablePaymentPlans(lessonType: string | null): PaymentPlan[] {
  if (isTrialLesson(lessonType)) {
    return ["single"];
  }
  return [...PAYMENT_PLANS];
}

export { dollarsToCents, parseDollarsToCents } from "@/lib/money";
