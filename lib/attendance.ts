import { translate, type TranslationKey } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import type { Database } from "@/types/database.types";

export type AttendanceStatus =
  Database["public"]["Enums"]["attendance_status"];

export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "late",
  "excused",
] as const satisfies readonly AttendanceStatus[];

const ATTENDANCE_STATUS_LABEL_KEYS = {
  present: "enum.attendance.present",
  late: "enum.attendance.late",
  absent: "enum.attendance.absent",
  excused: "enum.attendance.excused",
} as const;

const ATTENDANCE_STATUS_DESCRIPTION_KEYS = {
  present: "enum.attendanceDescription.present",
  late: "enum.attendanceDescription.late",
  absent: "enum.attendanceDescription.absent",
  excused: "enum.attendanceDescription.excused",
} as const;

export function getAttendanceStatusOptions(language: AppLanguage = "en") {
  return ATTENDANCE_STATUSES.map((value) => ({
    value,
    label: formatAttendanceStatus(value, language),
    description: translate(
      language,
      ATTENDANCE_STATUS_DESCRIPTION_KEYS[value] as TranslationKey,
    ),
  }));
}

export const ATTENDANCE_STATUS_OPTIONS = getAttendanceStatusOptions();

export function formatAttendanceStatus(
  status: AttendanceStatus | null | undefined,
  language: AppLanguage = "en",
) {
  if (!status) return translate(language, "common.notAvailable");
  if (
    ATTENDANCE_STATUSES.includes(status as (typeof ATTENDANCE_STATUSES)[number])
  ) {
    return translate(
      language,
      ATTENDANCE_STATUS_LABEL_KEYS[
        status as (typeof ATTENDANCE_STATUSES)[number]
      ],
    );
  }
  return status;
}

export function attendanceStatusBadgeClass(status: AttendanceStatus) {
  switch (status) {
    case "present":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30";
    case "late":
      return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30";
    case "absent":
      return "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30";
    case "excused":
      return "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30";
  }
}

export function parseAttendanceStatus(value: FormDataEntryValue | null) {
  const status = value?.toString().trim();
  if (!status) return null;
  if (!ATTENDANCE_STATUSES.includes(status as AttendanceStatus)) return undefined;
  return status as AttendanceStatus;
}
