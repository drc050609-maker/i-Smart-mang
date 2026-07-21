import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { DeleteStudentButton } from "@/components/delete-student-button";
import { EditStudentDobDialog } from "@/components/edit-student-dob-dialog";
import { StudentAddressesSection } from "@/components/student-addresses-section";
import { AddStudentAddressDialog } from "@/components/add-student-address-dialog";
import { AddStudentClassesDialog } from "@/components/add-student-classes-dialog";
import { DetailActiveToggle } from "@/components/detail-active-toggle";
import type { ClassOption } from "@/components/class-multi-combobox";
import type { StudentOption } from "@/components/student-combobox";
import { StudentClassCreditsSection } from "@/components/student-class-credits-section";
import { StudentAttendanceHistorySection } from "@/components/student-attendance-history-section";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";
import { sortClassesBySubject } from "@/lib/class-list";
import { formatClassSubject } from "@/lib/class-subject";
import {
  getStudentTotalClassesTaken,
  loadStudentClassHistory,
  summarizeStudentClassesTaken,
} from "@/lib/student-attendance-history";
import { compareStudentNames } from "@/lib/person-name";
import {
  buildStudentClassCreditRows,
  findTodayScheduleId,
  formatSessionDate,
  type StudentClassBalance,
} from "@/lib/class-session-credits";

import type { Database } from "@/types/database.types";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Address = Database["public"]["Tables"]["addresses"]["Row"];

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type RoomEmbed = {
  room_number: string;
};

type ClassEmbed = {
  id: number;
  subject: string;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
};

type EnrollmentEmbed = {
  id: number;
  is_active: boolean | null;
  created_date: string | null;
  classes: ClassEmbed | ClassEmbed[] | null;
};

type StudentDetail = Student & {
  enrollments: EnrollmentEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatStudentName(student: Pick<Student, "first name" | "last name">) {
  const first = student["first name"];
  const last = student["last name"];
  return last ? `${first} ${last}` : first;
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

function formatTeacherName(teacher: TeacherEmbed | null) {
  if (!teacher) return "—";
  const last = teacher.last_name;
  return last ? `${teacher.first_name} ${last}` : teacher.first_name;
}

function classFromEnrollment(enrollment: EnrollmentEmbed): ClassEmbed | null {
  return firstOrNull(enrollment.classes);
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      'id, "first name", "last name", dob, experience, is_active, location_id, starting_class_credits',
    )
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    throw new Error(`Could not load student: ${studentError.message}`);
  }

  if (!student) {
    notFound();
  }

  const [
    { data: addresses, error: addressError },
    { data: enrollments, error: enrollmentError },
    { data: allClasses, error: allClassesError },
    { data: balances, error: balancesError },
    { data: classSchedules, error: schedulesError },
    { data: allStudents, error: allStudentsError },
  ] = await Promise.all([
    supabase
      .from("addresses")
      .select('id, "street 1", "street 2", city, state, "zip code"')
      .eq("student", studentId)
      .order("id"),
    supabase
      .from("enrollments")
      .select(
        `
        id,
        is_active,
        created_date,
        classes (
          id,
          subject,
          teachers!classes_teacher_id_fkey ( first_name, last_name ),
          rooms ( room_number )
        )
      `,
      )
      .eq("student id", studentId),
    supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        teachers!classes_teacher_id_fkey ( first_name, last_name )
      `,
      )
      .eq("is_active", true),
    supabase
      .from("student_class_balances")
      .select(
        "student_id, class_id, sessions_total, sessions_remaining, sessions_used, absence_count",
      )
      .eq("student_id", studentId),
    supabase
      .from("class_schedules")
      .select(
        "id, class_id, is_recurring, schedule_day_of_week, schedule_date, schedule_start_time, schedule_end_time",
      ),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true),
  ]);

  const { rows: attendanceHistoryRows, error: attendanceHistoryError } =
    await loadStudentClassHistory(supabase, studentId);

  const balanceRows = (balances as StudentClassBalance[] | null) ?? [];
  const sessionsUsedFromBalances = balanceRows.reduce(
    (total, balance) => total + balance.sessions_used,
    0,
  );
  const totalClassesTaken = getStudentTotalClassesTaken(
    attendanceHistoryRows,
    sessionsUsedFromBalances,
  );
  const classesTakenByClass = summarizeStudentClassesTaken(attendanceHistoryRows);

  const detail: StudentDetail = {
    ...student,
    enrollments: (enrollments as EnrollmentEmbed[] | null) ?? null,
  };
  const addressRows = (addresses as Address[] | null) ?? [];
  const enrollmentRows = [...((enrollments as EnrollmentEmbed[] | null) ?? [])].sort(
    (a, b) => {
      const classA = classFromEnrollment(a);
      const classB = classFromEnrollment(b);
      if (!classA || !classB) return 0;
      return classA.subject.localeCompare(classB.subject, undefined, {
        sensitivity: "base",
      });
    },
  );
  const enrolledClassIds = new Set(
    enrollmentRows
      .map((enrollment) => classFromEnrollment(enrollment)?.id)
      .filter((id): id is number => typeof id === "number"),
  );
  type ClassRow = {
    id: number;
    subject: string;
    teachers: TeacherEmbed | TeacherEmbed[] | null;
  };
  const availableClasses: ClassOption[] = sortClassesBySubject(
    ((allClasses as ClassRow[] | null) ?? [])
      .filter((classRow) => !enrolledClassIds.has(classRow.id))
      .map((classRow) => ({
        id: classRow.id,
        subject: classRow.subject,
        teacher: firstOrNull(classRow.teachers),
      })),
  );

  const today = formatSessionDate(new Date());
  const scheduleIdByClass = new Map<number, number | null>();

  for (const classId of enrolledClassIds) {
    scheduleIdByClass.set(
      classId,
      findTodayScheduleId(
        (classSchedules as Parameters<typeof findTodayScheduleId>[0] | null) ??
          [],
        classId,
        today,
      ),
    );
  }

  const creditRows = buildStudentClassCreditRows(
    enrollmentRows
      .map((enrollment) => {
        const classRow = classFromEnrollment(enrollment);
        if (!classRow) return null;
        return { classId: classRow.id, subject: classRow.subject };
      })
      .filter((row): row is { classId: number; subject: string } => row !== null),
    balanceRows,
    scheduleIdByClass,
    studentId,
  );

  type StudentListRow = {
    id: number;
    "first name": string;
    "last name": string | null;
  };
  const studentOptions: StudentOption[] = [...((allStudents as StudentListRow[] | null) ?? [])]
    .sort(compareStudentNames)
    .map((row) => ({
      id: row.id,
      "first name": row["first name"],
      "last name": row["last name"],
    }));

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/students"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("common.backToStudents")}
        </Link>
      </div>

      <div className="border-b border-gray-200 pb-5 dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatStudentName(detail)}
          </h1>
          <DeleteStudentButton
            studentId={studentId}
            studentName={formatStudentName(detail)}
          />
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.dateOfBirth")}
            </dt>
            <dd className="mt-1 flex items-center gap-3 text-sm text-gray-900 dark:text-white">
              <span>{formatDob(detail.dob, staff.preferred_language)}</span>
              <EditStudentDobDialog studentId={studentId} dob={detail.dob} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.status")}
            </dt>
            <dd className="mt-1">
              <DetailActiveToggle
                entityType="student"
                entityId={studentId}
                isActive={detail.is_active}
                label={t("common.toggleActiveStatus", { name: formatStudentName(detail) })}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.totalClassesTaken")}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {totalClassesTaken}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("common.studentId")}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {detail.id}
            </dd>
          </div>
        </dl>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.address")}
          </h2>
          <AddStudentAddressDialog studentId={studentId} />
        </div>
        {addressError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("common.address"), message: addressError.message })}
          </p>
        ) : (
          <StudentAddressesSection
            studentId={studentId}
            addresses={addressRows}
          />
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.classes")}
          </h2>
          <AddStudentClassesDialog
            studentId={studentId}
            classes={availableClasses}
          />
        </div>

        {allClassesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("nav.classes"), message: allClassesError.message })}
          </p>
        ) : null}

        {enrollmentError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("common.classes"), message: enrollmentError.message })}
          </p>
        ) : enrollmentRows.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.notEnrolled")}
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
                        {t("common.teacher")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.room")}
                      </th>
                      <th
                        scope="col"
                        className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                      >
                        {t("common.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {enrollmentRows.map((enrollment) => {
                      const classRow = classFromEnrollment(enrollment);
                      if (!classRow) return null;

                      const teacher = firstOrNull(classRow.teachers);
                      const room = firstOrNull(classRow.rooms);

                      return (
                        <tr key={enrollment.id}>
                          <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                            <Link
                              href={`/classes/${classRow.id}`}
                              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              {formatClassSubject(classRow.subject, staff.preferred_language)}
                            </Link>
                          </td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {formatTeacherName(teacher)}
                          </td>
                          <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {room?.room_number ?? "—"}
                          </td>
                          <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                            <span
                              className={
                                enrollment.is_active
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-gray-500 dark:text-gray-400"
                              }
                            >
                              {enrollment.is_active ? t("common.active") : t("common.inactive")}
                            </span>
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

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("common.classCredits")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.enrollToTrack")}
        </p>

        {balancesError || schedulesError || allStudentsError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.classCredits"),
              message:
                balancesError?.message ??
                schedulesError?.message ??
                allStudentsError?.message ??
                "",
            })}
          </p>
        ) : (
          <StudentClassCreditsSection
            rows={creditRows}
            studentOptions={studentOptions}
          />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("common.classHistory")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.classHistoryHelp")}
        </p>

        {classesTakenByClass.length > 0 ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("common.allTimeByClass")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {classesTakenByClass.map((summary) => (
                <li key={summary.classId}>
                  <Link
                    href={`/classes/${summary.classId}`}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                  >
                    <span>
                      {formatClassSubject(summary.classSubject, staff.preferred_language)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {summary.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {attendanceHistoryError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", {
              entity: t("common.classHistory"),
              message: attendanceHistoryError,
            })}
          </p>
        ) : (
          <StudentAttendanceHistorySection rows={attendanceHistoryRows} />
        )}
      </section>
    </div>
  );
}
