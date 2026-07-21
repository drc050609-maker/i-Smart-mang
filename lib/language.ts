export const APP_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number]["value"];

export const DEFAULT_APP_LANGUAGE: AppLanguage = "en";

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === "en" || value === "zh";
}

export function parseAppLanguage(value: FormDataEntryValue | null): AppLanguage | null {
  const language = value?.toString().trim();
  return isAppLanguage(language) ? language : null;
}

export function appLanguageLabel(language: AppLanguage) {
  return APP_LANGUAGES.find((option) => option.value === language)?.label ?? language;
}

export function appLanguageLocale(language: AppLanguage) {
  return language === "zh" ? "zh-CN" : "en-US";
}
