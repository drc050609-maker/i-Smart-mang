import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { DeleteClassButton } from "@/components/delete-class-button";
import { EditClassDialog } from "@/components/edit-class-dialog";
import { ClassSchedulesSection } from "@/components/class-schedules-section";
import { AddClassStudentsDialog } from "@/components/add-class-students-dialog";
import { RemoveClassStudentButton } from "@/components/remove-class-student-button";
import { ClassSessionActionButtons } from "@/components/class-session-action-buttons";
import { DetailActiveToggle } from "@/components/detail-active-toggle";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";
import {
  emptyBalance,
  findTodayScheduleId,
  formatSessionDate,
  type StudentClassBalance,
} from "@/lib/class-session-credits";

import type { TeacherOption } from "@/components/teacher-combobox";
import type { RoomOption } from "@/components/add-class-dialog";
import type { StudentOption } from "@/components/student-multi-combobox";
import type { ClassScheduleRow } from "@/lib/class-schedule";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import { formatClassSubject } from "@/lib/class-subject";
import { formatClassTrack, type ClassTrack } from "@/lib/class-track";
import {
  compareStudentNames,
  formatStudentName,
  sortStudents,
  sortTeachers,
} from "@/lib/person-name";

import type { Database } from "@/types/database.types";

type ClassRow = Database["public"]["Tables"]["classes"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type RoomEmbed = {
  room_number: string;
  class_size: number;
};

type StudentEmbed = Pick<
  Student,
  "id" | "first name" | "last name" | "dob" | "is_active"
>;

type EnrollmentEmbed = {
  id: number;
  is_active: boolean | null;
  students: StudentEmbed | StudentEmbed[] | null;
};

type ClassScheduleEmbed = {
  id: number;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
};

type ClassDetail = Pick<
  ClassRow,
  | "id"
  | "subject"
  | "duration_minutes"
  | "teacher_id"
  | "room_id"
  | "lesson_type"
  | "class_track"
  | "is_active"
> & {
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
  class_schedules: ClassScheduleEmbed | ClassScheduleEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function listOrEmpty<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatTeacherName(teacher: TeacherEmbed | null) {
  if (!teacher) return "—";
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

function studentFromEnrollment(
  enrollment: EnrollmentEmbed,
): StudentEmbed | null {
  return firstOrNull(enrollment.students);
}

function sortEnrollmentsForDisplay(enrollments: EnrollmentEmbed[]) {
  return [...enrollments].sort((a, b) => {
    const studentA = studentFromEnrollment(a);
    const studentB = studentFromEnrollment(b);
    if (!studentA || !studentB) return 0;

    const aInactive = !studentA.is_active;
    const bInactive = !studentB.is_active;
    if (aInactive !== bInactive) {
      return aInactive ? 1 : -1;
    }

    return compareStudentNames(studentA, studentB);
  });
}

function isEnrollmentActive(enrollment: EnrollmentEmbed) {
  const student = studentFromEnrollment(enrollment);
  if (!student?.is_active) return false;
  return enrollment.is_active !== false;
}

function formatEnrollmentStatus(
  enrollment: EnrollmentEmbed,
  t: ReturnType<typeof createTranslator>,
) {
  const student = studentFromEnrollment(enrollment);
  if (!student?.is_active || !enrollment.is_active) {
    return t("common.inactive");
  }
  return t("common.active");
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const { id } = await params;
  const classId = Number(id);

  if (!Number.isInteger(classId) || classId <= 0) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { data: classRow, error: classError },
    { data: teachers },
    { data: rooms },
    { data: allStudents },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(
        `
      id,
      subject,
      duration_minutes,
      teacher_id,
      room_id,
      lesson_type,
      class_track,
      is_active,
      teachers!classes_teacher_id_fkey ( first_name, last_name ),
      rooms ( room_number, class_size ),
      class_schedules (
        id,
        is_recurring,
        schedule_day_of_week,
        schedule_date,
        schedule_start_time,
        schedule_end_time
      )
    `,
      )
      .eq("id", classId)
      .maybeSingle(),
    supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .order("first_name"),
    supabase
      .from("rooms")
      .select("id, room_number, class_size")
      .order("room_number"),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true)
      .order("id"),
  ]);

  if (classError) {
    throw new Error(`Could not load class: ${classError.message}`);
  }

  if (!classRow) {
    notFound();
  }

  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select(
      `
      id,
      is_active,
      students ( id, "first name", "last name", dob, is_active )
    `,
    )
    .eq("class id", classId)
    .order("id");

  const { data: balances, error: balancesError } = await supabase
    .from("student_class_balances")
    .select(
      "student_id, class_id, sessions_total, sessions_remaining, sessions_used, absence_count",
    )
    .eq("class_id", classId);

  const detail = classRow as ClassDetail;
  const teacher = firstOrNull(detail.teachers);
  const room = firstOrNull(detail.rooms);
  const teacherOptions = sortTeachers((teachers as TeacherOption[] | null) ?? []);
  const roomOptions = (rooms as RoomOption[] | null) ?? [];
  const enrollmentRows = sortEnrollmentsForDisplay(
    (enrollments as EnrollmentEmbed[] | null) ?? [],
  );
  const enrolledStudentIds = new Set(
    enrollmentRows
      .map((enrollment) => studentFromEnrollment(enrollment)?.id)
      .filter((id): id is number => typeof id === "number"),
  );
  const availableStudents = sortStudents(
    ((allStudents as StudentOption[] | null) ?? []).filter(
      (student) => !enrolledStudentIds.has(student.id),
    ),
  );
  const activeCount = enrollmentRows.filter(isEnrollmentActive).length;
  const schedules: ClassScheduleRow[] = listOrEmpty(detail.class_schedules);
  const todayScheduleId = findTodayScheduleId(
    schedules.map((schedule) => ({ ...schedule, class_id: classId })),
    classId,
    formatSessionDate(new Date()),
  );
  const balanceByStudent = new Map(
    ((balances as StudentClassBalance[] | null) ?? []).map((balance) => [
      balance.student_id,
      balance,
    ]),
  );

  function balanceForStudent(studentId: number) {
    return balanceByStudent.get(studentId) ?? emptyBalance(studentId, classId);
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/classes"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("common.backToClasses")}
        </Link>
      </div>

      <div className="border-b border-gray-200 pb-5 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatClassSubject(detail.subject, staff.preferred_language)}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <EditClassDialog
              classData={{
                id: detail.id,
                subject: detail.subject,
                teacher_id: detail.teacher_id,
                room_id: detail.room_id,
                duration_minutes: detail.duration_minutes,
                lesson_type: detail.lesson_type as LessonType | null,
                class_track: detail.class_track as ClassTrack | null,
              }}
              teachers={teacherOptions}
              rooms={roomOptions}
            />
            <DeleteClassButton
              classId={classId}
              classSubject={formatClassSubject(detail.subject, staff.preferred_language)}
            />
          </div>
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.teacher")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {formatTeacherName(teacher)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.room")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {room?.room_number ?? t("common.notAvailable")}
              {room ? (
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  {t("common.capacity", { count: room.class_size })}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.duration")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {formatDuration(detail.duration_minutes, t)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.track")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {formatClassTrack(detail.class_track as ClassTrack | null, staff.preferred_language)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.lessonType")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {formatLessonType(detail.lesson_type as LessonType | null, staff.preferred_language)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.status")}
            </dt>
            <dd className="mt-1">
              <DetailActiveToggle
                entityType="class"
                entityId={classId}
                isActive={detail.is_active}
                label={t("common.toggleActiveStatus", {
                  name: formatClassSubject(detail.subject, staff.preferred_language),
                })}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.classId")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {detail.id}
            </dd>
          </div>
        </dl>
      </div>

      <ClassSchedulesSection
        classId={classId}
        durationMinutes={detail.duration_minutes}
        schedules={schedules}
      />

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("nav.students")}
            </h2>
            {!enrollmentError && enrollmentRows.length > 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("common.activeEnrolledSummary", {
                  active: activeCount,
                  enrolled: enrollmentRows.length,
                })}
              </p>
            ) : null}
          </div>
          <AddClassStudentsDialog
            classId={classId}
            students={availableStudents}
          />
        </div>

        {enrollmentError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("nav.students"), message: enrollmentError.message })}
          </p>
        ) : balancesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("common.classCredits"), message: balancesError.message })}
          </p>
        ) : enrollmentRows.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noStudentsEnrolledInClass")}
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
                        {t("common.name")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.dateOfBirth")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.remaining")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.used")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.absences")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.status")}
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
                    {enrollmentRows.map((enrollment) => {
                      const student = studentFromEnrollment(enrollment);
                      if (!student) return null;

                      const status = formatEnrollmentStatus(enrollment, t);
                      const isInactive = !isEnrollmentActive(enrollment);
                      const balance = balanceForStudent(student.id);

                      return (
                        <tr
                          key={enrollment.id}
                          className={isInactive ? "opacity-60" : undefined}
                        >
                          <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                            <Link
                              href={`/students/${student.id}`}
                              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              {formatStudentName(student)}
                            </Link>
                          </td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {formatDob(student.dob, staff.preferred_language)}
                          </td>
                          <td className="px-3 py-4 text-right text-sm font-medium whitespace-nowrap text-indigo-700 dark:text-indigo-300">
                            {balance.sessions_remaining}
                            <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                              {t("common.of")} {balance.sessions_total}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {balance.sessions_used}
                          </td>
                          <td className="px-3 py-4 text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {balance.absence_count}
                          </td>
                          <td className="px-3 py-4 text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            <span
                              className={
                                isInactive
                                  ? "text-gray-500 dark:text-gray-400"
                                  : "text-green-700 dark:text-green-400"
                              }
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                            <div className="flex flex-col items-end gap-2">
                              <ClassSessionActionButtons
                                studentId={student.id}
                                classId={classId}
                                scheduleId={todayScheduleId}
                                compact
                              />
                              <RemoveClassStudentButton
                                classId={classId}
                                enrollmentId={enrollment.id}
                                studentName={formatStudentName(student)}
                              />
                            </div>
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
    </div>
  );
}
