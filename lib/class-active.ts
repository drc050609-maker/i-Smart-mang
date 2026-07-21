import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

type EnrollmentRow = {
  "class id": number;
  is_active: boolean | null;
  students: { is_active: boolean } | { is_active: boolean }[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isActiveEnrollment(enrollment: EnrollmentRow) {
  const student = firstOrNull(enrollment.students);
  if (!student?.is_active) return false;
  return enrollment.is_active !== false;
}

/** Marks classes inactive when they have no active student enrollments. */
export async function deactivateClassesWithNoActiveEnrollments(
  supabase: SupabaseClient<Database>,
  classIds: number[],
): Promise<string | null> {
  const uniqueClassIds = [
    ...new Set(classIds.filter((id) => Number.isInteger(id) && id > 0)),
  ];

  if (uniqueClassIds.length === 0) {
    return null;
  }

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("enrollments")
    .select('"class id", is_active, students ( is_active )')
    .in("class id", uniqueClassIds)
    .not("student id", "is", null);

  if (enrollmentsError) {
    return enrollmentsError.message;
  }

  const activeCountByClass = new Map<number, number>(
    uniqueClassIds.map((classId) => [classId, 0]),
  );

  for (const enrollment of (enrollments as EnrollmentRow[] | null) ?? []) {
    if (!isActiveEnrollment(enrollment)) {
      continue;
    }

    const classId = enrollment["class id"];
    activeCountByClass.set(classId, (activeCountByClass.get(classId) ?? 0) + 1);
  }

  const classIdsToDeactivate = uniqueClassIds.filter(
    (classId) => (activeCountByClass.get(classId) ?? 0) === 0,
  );

  if (classIdsToDeactivate.length === 0) {
    return null;
  }

  const { error: classError } = await supabase
    .from("classes")
    .update({ is_active: false })
    .in("id", classIdsToDeactivate);

  return classError?.message ?? null;
}
