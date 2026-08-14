import type { TranslationKey } from "@/lib/i18n";

export const RETURN_TO_PARAM = "from";

export function parseReturnTo(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  let path = value.trim();
  if (!path) {
    return null;
  }

  try {
    path = decodeURIComponent(path).trim();
  } catch {
    return null;
  }

  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return null;
  }

  if (
    path.includes("://") ||
    path.includes("\\") ||
    /[\u0000-\u001F]/.test(path)
  ) {
    return null;
  }

  return path;
}

export function parseReturnToFromSearchParams(
  searchParams: { [key: string]: string | string[] | undefined },
): string | null {
  const raw = searchParams[RETURN_TO_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return parseReturnTo(value);
}

export function withReturnTo(
  href: string,
  returnTo: string | null | undefined,
) {
  const safe = parseReturnTo(returnTo);
  if (!safe) {
    return href;
  }

  const url = new URL(href, "http://local.invalid");
  url.searchParams.set(RETURN_TO_PARAM, safe);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function classHref(classId: number, returnTo?: string | null) {
  return withReturnTo(`/classes/${classId}`, returnTo);
}

export function returnToBackKey(path: string): TranslationKey {
  if (/^\/tutors\/\d+/.test(path)) {
    return "common.backToTeacher";
  }
  if (path === "/tutors" || path.startsWith("/tutors?")) {
    return "common.backToTutors";
  }
  if (/^\/students\/\d+/.test(path)) {
    return "common.backToStudent";
  }
  if (path === "/students" || path.startsWith("/students?")) {
    return "common.backToStudents";
  }
  if (path === "/schedule" || path.startsWith("/schedule?")) {
    return "common.backToSchedule";
  }
  if (path === "/leads" || path.startsWith("/leads/") || path.startsWith("/leads?")) {
    return "common.backToLeads";
  }
  if (path === "/" || path.startsWith("/?")) {
    return "common.backToDashboard";
  }
  if (path === "/classes" || path.startsWith("/classes?")) {
    return "common.backToClasses";
  }
  return "common.back";
}
