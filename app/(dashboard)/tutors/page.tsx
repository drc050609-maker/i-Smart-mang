import { cookies } from "next/headers";

import { AddTeacherDialog } from "@/components/add-teacher-dialog";
import { TutorsListTable } from "@/components/tutors-list-table";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { uniqueClassesBySubject } from "@/lib/class-subject";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";
import type { TeacherStatus } from "@/lib/teacher-status";

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
  status: TeacherStatus;
  position: "teacher" | "front_desk";
  classes: ClassEmbed | ClassEmbed[] | null;
};

type ClassTeacherLink = {
  teacher_id: number;
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

  const [{ data: teachers, error }, { data: classTeacherLinks }] =
    await Promise.all([
      supabase
        .from("teachers")
        .select(
          `
      id,
      first_name,
      last_name,
      dob,
      is_active,
      status,
      position,
      classes!classes_teacher_id_fkey ( id, subject )
    `,
        )
        .eq("location_id", locationId),
      supabase
        .from("class_teachers")
        .select(
          `
      teacher_id,
      classes!inner ( id, subject, location_id )
    `,
        )
        .eq("classes.location_id", locationId),
    ]);

  const assignedClassesByTeacher = new Map<number, ClassEmbed[]>();
  for (const link of (classTeacherLinks as ClassTeacherLink[] | null) ?? []) {
    const classes = asClassList(link.classes);
    if (classes.length === 0) continue;
    const current = assignedClassesByTeacher.get(link.teacher_id) ?? [];
    assignedClassesByTeacher.set(link.teacher_id, [...current, ...classes]);
  }

  const tutorRows =
    (teachers as TeacherWithClasses[] | null)?.map((teacher) => {
      const fromPrimary = asClassList(teacher.classes);
      const fromJoin = assignedClassesByTeacher.get(teacher.id) ?? [];
      const mergedById = new Map<number, ClassEmbed>();
      for (const row of [...fromPrimary, ...fromJoin]) {
        mergedById.set(row.id, row);
      }

      return {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        dob: teacher.dob,
        is_active: teacher.is_active,
        status: teacher.status,
        position: teacher.position,
        classes: uniqueClassesBySubject([...mergedById.values()]).sort(
          (a, b) =>
            a.subject.localeCompare(b.subject, undefined, {
              sensitivity: "base",
            }),
        ),
      };
    }) ?? [];

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
