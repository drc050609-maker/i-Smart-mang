/** Trial class duration — paid trial is $25; $0 is the current promo. */
export const TRIAL_CLASS_PRICE_USD = 25;
export const TRIAL_FEE_PROMO_USD = 0;
export const TRIAL_FEE_OPTIONS_USD = [TRIAL_CLASS_PRICE_USD, TRIAL_FEE_PROMO_USD] as const;
export const TRIAL_CLASS_DURATION_MINUTES = 45;
export const TRIAL_TEACHER_PAY_USD = 15;

export type TrialFeeUsd = (typeof TRIAL_FEE_OPTIONS_USD)[number];

export function parseTrialFeeUsd(
  value: FormDataEntryValue | string | null | undefined,
): TrialFeeUsd | null | undefined {
  const raw = value?.toString().trim();
  if (!raw) {
    return undefined;
  }

  const amount = Number(raw);
  if (amount === TRIAL_CLASS_PRICE_USD || amount === TRIAL_FEE_PROMO_USD) {
    return amount;
  }

  return null;
}

/** Subjects families can book for a one-time trial lesson. */
export const TRIAL_CLASS_SUBJECTS = [
  "Singing / Voice",
  "Dance — Hip Hop",
  "Violin I",
  "Drums & Percussion",
  "Piano",
  "Guitar",
  "Cello",
  "Flute",
  "Ballet Fundamentals",
  "Jazz Ensemble",
  "Choir",
  "Music Theory",
  "Musical Theater",
  "Saxophone",
  "Ukulele",
  "Trumpet",
  "Clarinet",
  "Songwriting Lab",
  "Tap Dance",
  "World Rhythms & Dance",
] as const;

export type TrialClassSubject = (typeof TRIAL_CLASS_SUBJECTS)[number];

export type TrialTeacherOption = {
  id: number;
  first_name: string;
  last_name: string | null;
};

export type CampusTrialPricing = {
  trial_price_cents: number;
  trial_teacher_pay_cents: number;
};

export function formatTrialPrice(priceUsd: number = TRIAL_CLASS_PRICE_USD) {
  return `$${priceUsd}`;
}

export function formatTrialPriceFromCents(cents: number) {
  return formatTrialPrice(cents / 100);
}

export function resolveTrialPriceUsd(pricing?: CampusTrialPricing | null) {
  if (pricing?.trial_price_cents != null && pricing.trial_price_cents > 0) {
    return pricing.trial_price_cents / 100;
  }
  return TRIAL_CLASS_PRICE_USD;
}

export function resolveTrialTeacherPayUsd(pricing?: CampusTrialPricing | null) {
  if (
    pricing?.trial_teacher_pay_cents != null &&
    pricing.trial_teacher_pay_cents >= 0
  ) {
    return pricing.trial_teacher_pay_cents / 100;
  }
  return TRIAL_TEACHER_PAY_USD;
}
