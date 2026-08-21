import type { Database } from "@/types/database.types";
import type { TranslationKey } from "@/lib/i18n";

export type TeacherStatus = Database["public"]["Enums"]["teacher_status"];

export const TEACHER_STATUSES = [
  "active",
  "on_leave",
  "inactive",
] as const satisfies readonly TeacherStatus[];

export function isTeacherStatus(value: string): value is TeacherStatus {
  return (TEACHER_STATUSES as readonly string[]).includes(value);
}

export function teacherStatusFromRow(row: {
  status?: TeacherStatus | string | null;
  is_active: boolean;
}): TeacherStatus {
  if (row.status && isTeacherStatus(row.status)) return row.status;
  return row.is_active ? "active" : "inactive";
}

export function teacherStatusLabelKey(status: TeacherStatus): TranslationKey {
  switch (status) {
    case "on_leave":
      return "teacherStatus.onLeave";
    case "inactive":
      return "teacherStatus.inactive";
    default:
      return "teacherStatus.active";
  }
}

export function isTeacherAssignable(status: TeacherStatus) {
  return status === "active";
}

export function isTeacherOnRoster(status: TeacherStatus) {
  return status !== "inactive";
}
