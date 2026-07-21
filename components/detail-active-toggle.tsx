"use client";

import { ActiveToggle } from "@/components/active-toggle";
import { updateClassActive } from "@/app/(dashboard)/classes/actions";
import { updateStudentActive } from "@/app/(dashboard)/students/actions";
import { updateTeacherActive } from "@/app/(dashboard)/tutors/actions";

type EntityType = "student" | "teacher" | "class";

export function DetailActiveToggle({
  entityType,
  entityId,
  isActive,
  label,
}: {
  entityType: EntityType;
  entityId: number;
  isActive: boolean;
  label: string;
}) {
  async function onToggle(nextActive: boolean) {
    const formData = new FormData();
    formData.set("isActive", String(nextActive));

    if (entityType === "student") {
      formData.set("studentId", String(entityId));
      return updateStudentActive(formData);
    }

    if (entityType === "teacher") {
      formData.set("teacherId", String(entityId));
      return updateTeacherActive(formData);
    }

    formData.set("classId", String(entityId));
    return updateClassActive(formData);
  }

  return (
    <ActiveToggle
      checked={isActive}
      label={label}
      onToggle={onToggle}
      align="start"
    />
  );
}
