"use client";

import { useEffect, useState, useTransition } from "react";

import { updateTeacherStatus } from "@/app/(dashboard)/tutors/actions";
import { useLanguage } from "@/components/language-provider";
import {
  SelectChevron,
  selectFieldClassName,
} from "@/components/select-chevron";
import {
  TEACHER_STATUSES,
  teacherStatusLabelKey,
  type TeacherStatus,
} from "@/lib/teacher-status";

export function TeacherStatusSelect({
  teacherId,
  status,
  label,
}: {
  teacherId: number;
  status: TeacherStatus;
  label: string;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState<TeacherStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(status);
  }, [status]);

  function handleChange(nextStatus: TeacherStatus) {
    const previous = value;
    setValue(nextStatus);
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("teacherId", String(teacherId));
      formData.set("status", nextStatus);
      const result = await updateTeacherStatus(formData);
      if (result.error) {
        setValue(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex max-w-56 flex-col gap-1">
      <div className="relative">
        <select
          value={value}
          disabled={pending}
          aria-label={label}
          onChange={(event) =>
            handleChange(event.target.value as TeacherStatus)
          }
          className={selectFieldClassName}
        >
          {TEACHER_STATUSES.map((option) => (
            <option key={option} value={option}>
              {t(teacherStatusLabelKey(option))}
            </option>
          ))}
        </select>
        <SelectChevron />
      </div>
      {pending ? (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t("common.saving")}
        </span>
      ) : null}
      {error ? (
        <span className="text-left text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
