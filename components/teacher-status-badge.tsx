"use client";

import { useLanguage } from "@/components/language-provider";
import {
  teacherStatusLabelKey,
  type TeacherStatus,
} from "@/lib/teacher-status";

export function TeacherStatusBadge({ status }: { status: TeacherStatus }) {
  const { t } = useLanguage();

  const colorClass =
    status === "active"
      ? "text-green-700 dark:text-green-400"
      : status === "on_leave"
        ? "text-amber-700 dark:text-amber-400"
        : "text-gray-500 dark:text-gray-400";

  return (
    <span className={colorClass}>{t(teacherStatusLabelKey(status))}</span>
  );
}
