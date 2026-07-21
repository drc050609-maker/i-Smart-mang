import { cookies } from "next/headers";

import { AddTeacherDialog } from "@/components/add-teacher-dialog";
import { TutorsListTable } from "@/components/tutors-list-table";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";

type ClassEmbed = {
  id: number;
  subject: string;
};

type TeacherWithClasses = {
  id: number;
  first_name: string;
  last_name: string | null;
  dob: string | null;
  is_active: boolean;
  classes: ClassEmbed | ClassEmbed[] | null;
};

function asClassList(classes: ClassEmbed | ClassEmbed[] | null | undefined) {
  if (!classes) return [];
  return Array.isArray(classes) ? classes : [classes];
}

export default async function TutorsPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.tutors"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select(
      `
      id,
      first_name,
      last_name,
      dob,
      is_active,
      classes!classes_teacher_id_fkey ( id, subject )
    `,
    )
    .eq("location_id", locationId);

  const tutorRows =
    (teachers as TeacherWithClasses[] | null)?.map((teacher) => ({
      id: teacher.id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      dob: teacher.dob,
      is_active: teacher.is_active,
      classes: asClassList(teacher.classes).sort((a, b) =>
        a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }),
      ),
    })) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.tutors")}
        </h1>
        <AddTeacherDialog />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", {
            entity: t("nav.tutors"),
            message: error.message,
          })}
        </p>
      ) : null}

      {!error && tutorRows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.empty.runSeed", { entity: t("nav.tutors").toLowerCase() })}
        </p>
      ) : null}

      {tutorRows.length > 0 ? <TutorsListTable tutors={tutorRows} /> : null}
    </div>
  );
}
