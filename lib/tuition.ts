import type { LessonType } from "@/lib/class-lesson-type";
import { TRIAL_CLASS_PRICE_USD } from "@/lib/trial-class";
import type { AppLanguage } from "@/lib/language";

export const PACKAGE_20_COUNT = 20;
export const PACKAGE_20_DISCOUNT = 0.05;
export const PACKAGE_50_COUNT = 50;
export const PACKAGE_50_DISCOUNT = 0.1;

const BASE_RATE_PER_MINUTE = 2.25;

const LESSON_TYPE_MULTIPLIER: Record<LessonType, number> = {
  private: 1.4,
  group: 1,
  trial: 0.5,
};

export function estimatePerClassTuition(
  durationMinutes: number | null,
  lessonType: LessonType | string | null,
) {
  const minutes = durationMinutes && durationMinutes > 0 ? durationMinutes : 45;
  const multiplier =
    lessonType && lessonType in LESSON_TYPE_MULTIPLIER
      ? LESSON_TYPE_MULTIPLIER[lessonType as LessonType]
      : LESSON_TYPE_MULTIPLIER.group;
  const raw = minutes * BASE_RATE_PER_MINUTE * multiplier;

  return Math.round(raw / 5) * 5;
}

export function packageTuition(
  perClass: number,
  classCount: number,
  discountRate: number,
) {
  return perClass * classCount * (1 - discountRate);
}

export function formatTuition(amount: number, language: AppLanguage = "en") {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return amount.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatDiscountRate(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export type TuitionPricing = {
  perClass: number;
  package20: number | null;
  package50: number | null;
};

export type StoredClassPricing = {
  single_price_cents: number | null;
  package_20_price_cents: number | null;
  package_50_price_cents: number | null;
};

export function isTrialLesson(lessonType: LessonType | string | null) {
  return lessonType === "trial";
}

export function buildTuitionPricing(
  durationMinutes: number | null,
  lessonType: LessonType | string | null,
  stored?: StoredClassPricing | null,
): TuitionPricing {
  if (isTrialLesson(lessonType)) {
    return {
      perClass:
        stored?.single_price_cents != null
          ? stored.single_price_cents / 100
          : TRIAL_CLASS_PRICE_USD,
      package20: null,
      package50: null,
    };
  }

  if (
    stored?.single_price_cents != null &&
    stored.single_price_cents > 0
  ) {
    return {
      perClass: stored.single_price_cents / 100,
      package20:
        stored.package_20_price_cents != null
          ? stored.package_20_price_cents / 100
          : null,
      package50:
        stored.package_50_price_cents != null
          ? stored.package_50_price_cents / 100
          : null,
    };
  }

  const perClass = estimatePerClassTuition(durationMinutes, lessonType);

  return {
    perClass,
    package20: packageTuition(perClass, PACKAGE_20_COUNT, PACKAGE_20_DISCOUNT),
    package50: packageTuition(perClass, PACKAGE_50_COUNT, PACKAGE_50_DISCOUNT),
  };
}
