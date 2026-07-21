import { cookies } from "next/headers";

import { AddStudentDialog } from "@/components/add-student-dialog";
import { StudentsListTable } from "@/components/students-list-table";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { studentsOutOfClassCredits } from "@/lib/class-session-credits";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";

export default async function StudentsPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.students"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const [
    { data: students, error },
    { data: enrollments, error: enrollmentsError },
    { data: balances, error: balancesError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select('id, "first name", "last name", dob, is_active')
      .eq("location_id", locationId),
    supabase
      .from("enrollments")
      .select(
        '"student id", "class id", is_active, classes!inner ( is_active, location_id )',
      )
      .eq("classes.location_id", locationId)
      .not("student id", "is", null),
    supabase
      .from("student_class_balances")
      .select(
        "student_id, class_id, sessions_total, sessions_remaining, sessions_used, absence_count, classes!inner ( location_id )",
      )
      .eq("classes.location_id", locationId),
  ]);

  const loadError =
    error?.message ?? enrollmentsError?.message ?? balancesError?.message ?? null;

  type EnrollmentRow = {
    "student id": number | null;
    "class id": number;
    is_active: boolean | null;
    classes: { is_active: boolean } | { is_active: boolean }[] | null;
  };

  function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    return Array.isArray(value) ? (value[0] ?? null) : value;
  }

  const outOfCreditsStudentIds = studentsOutOfClassCredits(
    ((enrollments as EnrollmentRow[] | null) ?? [])
      .filter(
        (enrollment): enrollment is EnrollmentRow & { "student id": number } =>
          enrollment["student id"] !== null,
      )
      .map((enrollment) => ({
        studentId: enrollment["student id"],
        classId: enrollment["class id"],
        enrollmentActive: enrollment.is_active !== false,
        classActive: firstOrNull(enrollment.classes)?.is_active ?? false,
      })),
    balances ?? [],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.students")}
        </h1>
        <AddStudentDialog />
      </div>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.students"), message: loadError })}
        </p>
      ) : null}

      {!loadError && (!students || students.length === 0) ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.empty.runSeed", { entity: t("nav.students").toLowerCase() })}
        </p>
      ) : null}

      {students && students.length > 0 ? (
        <StudentsListTable
          students={students}
          outOfCreditsStudentIds={[...outOfCreditsStudentIds]}
        />
      ) : null}
    </div>
  );
}
