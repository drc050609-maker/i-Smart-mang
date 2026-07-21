import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { EditTeacherDialog } from "@/components/edit-teacher-dialog";
import {
  EditTeacherClassesDialog,
  type TeacherClassOption,
} from "@/components/edit-teacher-classes-dialog";
import { TeacherPaycheckSection } from "@/components/teacher-paycheck-section";
import { UnassignTeacherClassButton } from "@/components/unassign-teacher-class-button";
import { DetailActiveToggle } from "@/components/detail-active-toggle";
import {
  listTeacherPaycheckPeriodOptions,
  loadTeacherClassPayRates,
  loadTeacherPaycheckPeriods,
} from "@/lib/teacher-paycheck";
import { formatClassSubject } from "@/lib/class-subject";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";

import type { Database } from "@/types/database.types";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];

type TeacherEmbed = {
  id: number;
  first_name: string;
  last_name: string | null;
};

type ClassListRow = {
  id: number;
  subject: string;
  teacher_id: number | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
};

type RoomEmbed = {
  room_number: string;
};

type ClassEmbed = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatTeacherEmbedName(teacher: TeacherEmbed | null) {
  if (!teacher) return null;
  const last = teacher.last_name;
  return last ? `${teacher.first_name} ${last}` : teacher.first_name;
}

function formatTeacherName(teacher: Pick<Teacher, "first_name" | "last_name">) {
  const last = teacher.last_name;
  return last ? `${teacher.first_name} ${last}` : teacher.first_name;
}

function formatDob(dob: string | null, language: import("@/lib/language").AppLanguage) {
  if (!dob) return "—";
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Date(`${dob}T00:00:00`).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(
  minutes: number | null,
  t: ReturnType<typeof createTranslator>,
) {
  if (!minutes) return t("common.notAvailable");
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? t("common.hour") : t("common.hours", { count: hours });
  }
  return t("common.minutes", { count: minutes });
}

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const { id } = await params;
  const teacherId = Number(id);

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { data: teacher, error: teacherError },
    { data: classes, error: classesError },
    { data: allClasses, error: allClassesError },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, first_name, last_name, dob, phone_number, is_active")
      .eq("id", teacherId)
      .maybeSingle(),
    supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        duration_minutes,
        rooms ( room_number )
      `,
      )
      .eq("teacher_id", teacherId)
      .order("id"),
    supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        teacher_id,
        rooms ( room_number ),
        teachers!classes_teacher_id_fkey ( id, first_name, last_name )
      `,
      )
      .order("subject"),
  ]);

  if (teacherError) {
    throw new Error(`Could not load tutor: ${teacherError.message}`);
  }

  if (!teacher) {
    notFound();
  }

  const classRows = (classes as ClassEmbed[] | null) ?? [];
  const classOptions: TeacherClassOption[] = ((allClasses as ClassListRow[] | null) ?? []).map(
    (classRow) => {
      const room = firstOrNull(classRow.rooms);
      const teacherEmbed = firstOrNull(classRow.teachers);

      return {
        id: classRow.id,
        subject: classRow.subject,
        teacher_id: classRow.teacher_id,
        room_number: room?.room_number ?? null,
        current_teacher_name: formatTeacherEmbedName(teacherEmbed),
      };
    },
  );
  const assignedClassIds = classRows.map((classRow) => classRow.id);

  const { data: savedPaycheckPeriods } = await supabase
    .from("teacher_paychecks")
    .select("year, month")
    .eq("teacher_id", teacherId);

  const [paycheckPeriods, defaultPayRates] = await Promise.all([
    loadTeacherPaycheckPeriods(
      supabase,
      teacherId,
      listTeacherPaycheckPeriodOptions(
        new Date(),
        (savedPaycheckPeriods ?? []).map((row) => ({
          year: row.year,
          month: row.month,
        })),
      ),
    ),
    loadTeacherClassPayRates(supabase, teacherId),
  ]);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/tutors"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("common.backToTutors")}
        </Link>
      </div>

      <div className="border-b border-gray-200 pb-5 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatTeacherName(teacher)}
          </h1>
          <EditTeacherDialog teacher={teacher} />
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.dateOfBirth")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {formatDob(teacher.dob, staff.preferred_language)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.phone")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {teacher.phone_number ?? t("common.notAvailable")}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.status")}
            </dt>
            <dd className="mt-1">
              <DetailActiveToggle
                entityType="teacher"
                entityId={teacherId}
                isActive={teacher.is_active}
                label={t("common.toggleActiveStatus", { name: formatTeacherName(teacher) })}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.tutorId")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {teacher.id}
            </dd>
          </div>
        </dl>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.classes")}
          </h2>
          <EditTeacherClassesDialog
            teacherId={teacherId}
            classes={classOptions}
            assignedClassIds={assignedClassIds}
          />
        </div>

        {allClassesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("nav.classes"), message: allClassesError.message })}
          </p>
        ) : null}

        {classesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("common.classes"), message: classesError.message })}
          </p>
        ) : classRows.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noClassesYet")}
          </p>
        ) : (
          <div className="mt-4 flow-root">
            <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                      >
                        {t("common.subject")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.room")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.duration")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.id")}
                      </th>
                      <th
                        scope="col"
                        className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                      >
                        {t("common.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {classRows.map((classRow) => {
                      const room = firstOrNull(classRow.rooms);

                      return (
                        <tr key={classRow.id}>
                          <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                            <Link
                              href={`/classes/${classRow.id}`}
                              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              {formatClassSubject(classRow.subject, staff.preferred_language)}
                            </Link>
                          </td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {room?.room_number ?? t("common.notAvailable")}
                          </td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {formatDuration(classRow.duration_minutes, t)}
                          </td>
                          <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap text-gray-500 sm:pr-0 dark:text-gray-400">
                            {classRow.id}
                          </td>
                          <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                            <UnassignTeacherClassButton
                              teacherId={teacherId}
                              classId={classRow.id}
                              classSubject={classRow.subject}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <TeacherPaycheckSection
        teacherId={teacherId}
        periods={paycheckPeriods}
        defaultPayRates={defaultPayRates}
      />
    </div>
  );
}
