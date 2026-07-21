/** Trial class duration — price/pay may be overridden per campus in `locations`. */
export const TRIAL_CLASS_PRICE_USD = 25;
export const TRIAL_CLASS_DURATION_MINUTES = 45;
export const TRIAL_TEACHER_PAY_USD = 15;

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
