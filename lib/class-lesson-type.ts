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
