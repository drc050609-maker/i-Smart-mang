import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";

export const LESSON_TYPES = ["private", "group", "trial"] as const;

export type LessonType = (typeof LESSON_TYPES)[number];

const LESSON_TYPE_LABEL_KEYS = {
  private: "enum.lessonType.private",
  group: "enum.lessonType.group",
  trial: "enum.lessonType.trial",
} as const;

export const LESSON_TYPE_OPTIONS: {
  value: LessonType;
  label: string;
}[] = [
  { value: "private", label: "Private lesson" },
  { value: "group", label: "Group lesson" },
  { value: "trial", label: "Trial lesson" },
];

export function getLessonTypeOptions(language: AppLanguage = "en") {
  return LESSON_TYPES.map((value) => ({
    value,
    label: formatLessonType(value, language),
  }));
}

export function formatLessonType(
  lessonType: LessonType | null | undefined,
  language: AppLanguage = "en",
) {
  if (!lessonType) return translate(language, "common.notAvailable");
  if (LESSON_TYPES.includes(lessonType)) {
    return translate(language, LESSON_TYPE_LABEL_KEYS[lessonType]);
  }
  return lessonType;
}

export function parseLessonType(value: FormDataEntryValue | null) {
  const lessonType = value?.toString().trim();
  if (!lessonType) {
    return undefined;
  }

  if (!LESSON_TYPES.includes(lessonType as LessonType)) {
    return null;
  }

  return lessonType as LessonType;
}

export const TRIAL_FORMATS = ["private", "group"] as const;

export type TrialFormat = (typeof TRIAL_FORMATS)[number];

const TRIAL_FORMAT_LABEL_KEYS = {
  private: "trial.oneToOne",
  group: "trial.groupClass",
} as const;

export function parseTrialFormat(value: FormDataEntryValue | null) {
  const trialFormat = value?.toString().trim().toLowerCase();
  if (!trialFormat) {
    return undefined;
  }

  if (!TRIAL_FORMATS.includes(trialFormat as TrialFormat)) {
    return null;
  }

  return trialFormat as TrialFormat;
}

export function formatTrialFormat(
  trialFormat: string | null | undefined,
  language: AppLanguage = "en",
) {
  if (!trialFormat) return null;
  if (TRIAL_FORMATS.includes(trialFormat as TrialFormat)) {
    return translate(language, TRIAL_FORMAT_LABEL_KEYS[trialFormat as TrialFormat]);
  }
  return trialFormat;
}

/** Trial stays "trial"; append 1-to-1 / group when that discriminator is set. */
export function formatLessonTypeWithFormat(
  lessonType: LessonType | string | null | undefined,
  trialFormat: string | null | undefined,
  language: AppLanguage = "en",
) {
  const base = formatLessonType(
    (lessonType as LessonType | null | undefined) ?? null,
    language,
  );
  if (lessonType !== "trial") return base;
  const formatLabel = formatTrialFormat(trialFormat, language);
  if (!formatLabel) return base;
  return `${base} · ${formatLabel}`;
}

/** Trial bookings stay on the schedule; they are hidden from the class catalog. */
export function isCatalogTrialClass(row: {
  lesson_type?: string | null;
  subject?: string | null;
}) {
  if (row.lesson_type === "trial") {
    return true;
  }

  const subject = row.subject?.trim().toLowerCase() ?? "";
  if (!subject) {
    return false;
  }

  return (
    subject === "trial" ||
    subject.includes("trial") ||
    subject.includes("试课")
  );
}
