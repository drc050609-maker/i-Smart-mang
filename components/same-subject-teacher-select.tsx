"use client";

import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import {
  SelectChevron,
  selectFieldClassName,
} from "@/components/select-chevron";
import { classHref } from "@/lib/return-to";
import {
  compareTeacherNames,
  formatTeacherName,
  type TeacherNameFields,
} from "@/lib/person-name";

export type SameSubjectClassOption = {
  id: number;
  teacher: TeacherNameFields | null;
};

function teacherKey(teacher: TeacherNameFields | null) {
  if (!teacher) return "";
  return `${teacher.first_name.trim().toLowerCase()}|${(teacher.last_name ?? "").trim().toLowerCase()}`;
}

export function SameSubjectTeacherSelect({
  currentClassId,
  options,
  returnTo,
}: {
  currentClassId: number;
  options: SameSubjectClassOption[];
  returnTo?: string | null;
}) {
  const router = useRouter();
  const { t } = useLanguage();

  const current =
    options.find((option) => option.id === currentClassId) ?? options[0];
  const currentTeacherKey = teacherKey(current?.teacher ?? null);

  const teachersByKey = new Map<string, TeacherNameFields | null>();
  for (const option of options) {
    const key = teacherKey(option.teacher);
    if (!teachersByKey.has(key)) {
      teachersByKey.set(key, option.teacher);
    }
  }

  const sortedTeachers = [...teachersByKey.entries()].sort((a, b) => {
    if (!a[1] && !b[1]) return 0;
    if (!a[1]) return 1;
    if (!b[1]) return -1;
    return compareTeacherNames(a[1], b[1]);
  });

  if (sortedTeachers.length <= 1) {
    return (
      <span>
        {current?.teacher
          ? formatTeacherName(current.teacher)
          : t("common.noTeacherAssigned")}
      </span>
    );
  }

  function navigateToTeacher(nextKey: string) {
    if (nextKey === currentTeacherKey) return;
    const nextId = options.find(
      (option) => teacherKey(option.teacher) === nextKey,
    )?.id;
    if (nextId == null || nextId === currentClassId) return;
    router.push(classHref(nextId, returnTo));
  }

  return (
    <div className="relative min-w-[10rem] max-w-xs">
      <select
        id="same-subject-teacher"
        value={currentTeacherKey}
        aria-label={t("common.selectTeacherForSubject")}
        onChange={(event) => navigateToTeacher(event.target.value)}
        className={selectFieldClassName}
      >
        {sortedTeachers.map(([key, teacher]) => (
          <option key={key || "none"} value={key}>
            {teacher
              ? formatTeacherName(teacher)
              : t("common.noTeacherAssigned")}
          </option>
        ))}
      </select>
      <SelectChevron />
    </div>
  );
}
