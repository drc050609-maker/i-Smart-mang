import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { EditTeacherDialog } from "@/components/edit-teacher-dialog";
import { DeleteTeacherButton } from "@/components/delete-teacher-button";
import { EditTeacherClassesDialog } from "@/components/edit-teacher-classes-dialog";
import { EditEnrollmentGradeDialog } from "@/components/edit-enrollment-grade-dialog";
import type { RoomOption } from "@/components/add-class-dialog";
import { TeacherPaycheckSection } from "@/components/teacher-paycheck-section";
import { TeacherResumeSection } from "@/components/teacher-resume-section";
import { FrontDeskHoursSection } from "@/components/front-desk-hours-section";
import { LinkFrontDeskAccountSection } from "@/components/link-front-desk-account-section";
import { UnassignTeacherClassButton } from "@/components/unassign-teacher-class-button";
import { TeacherStatusSelect } from "@/components/teacher-status-select";
import {
  classPayRatesToGroupRates,
  listTeacherPaycheckPeriodOptions,
  loadTeacherClassPayRates,
  loadTeacherPaycheckPeriods,
  type TeacherGroupPayRates,
  type TeacherPaycheckPeriodData,
} from "@/lib/teacher-paycheck";
import {
  formatClassSubject,
  groupByClassSubject,
  listKnownClassSubjects,
} from "@/lib/class-subject";
import { isCatalogTrialClass } from "@/lib/class-lesson-type";
import {
  balanceMapKey,
  type StudentClassBalance,
} from "@/lib/class-session-credits";
import { classHref } from "@/lib/return-to";
import { listPriceSheetSubjects } from "@/lib/tuition-price-sheet";
import { compareStudentNames, formatStudentName } from "@/lib/person-name";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { formatCentsAsCurrency } from "@/lib/money";
import { isFrontDesk } from "@/lib/staff-position";
import { teacherStatusFromRow } from "@/lib/teacher-status";
import { TEACHER_RESUME_BUCKET } from "@/lib/teacher-resume";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/utils/supabase/server";

import type { Database } from "@/types/database.types";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];

type RoomEmbed = {
  room_number: string;
};

type ClassEmbed = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
  lesson_type?: string | null;
};

type StudentEmbed = {
  id: number;
  "first name": string;
  "last name": string | null;
  is_active: boolean | null;
};

type EnrollmentRow = {
  id: number;
  grade_level: string | null;
  is_active: boolean | null;
  "class id": number | null;
  students: StudentEmbed | StudentEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select(
      "id, first_name, last_name, dob, phone_number, is_active, status, location_id, resume_path, resume_file_name, position, hourly_rate_cents",
    )
    .eq("id", teacherId)
    .maybeSingle();

  if (teacherError) {
    throw new Error(`Could not load teacher: ${teacherError.message}`);
  }

  if (!teacher) {
    notFound();
  }

  let resumeUrl: string | null = null;
  if (teacher.resume_path) {
    try {
      const service = createSupabaseServiceClient();
      const { data: signed, error: signedError } = await service.storage
        .from(TEACHER_RESUME_BUCKET)
        .createSignedUrl(teacher.resume_path, 60 * 60);
      if (!signedError && signed?.signedUrl) {
        resumeUrl = signed.signedUrl;
      }
    } catch (error) {
      console.error("Could not create resume signed URL:", error);
    }
  }

  const locationId = teacher.location_id;
  const frontDesk = isFrontDesk(teacher.position);

  let hourLogs: {
    id: number;
    work_date: string;
    clock_in: string;
    clock_out: string;
    hours: number;
    rate_cents: number;
    notes: string | null;
  }[] = [];
  let recordedPaychecks: {
    id: number;
    year: number;
    month: number;
    total_minutes: number;
    total_amount_cents: number;
    created_at: string;
  }[] = [];
  let linkedLogin: {
    id: string;
    email: string;
    full_name: string | null;
  } | null = null;
  let linkableLogins: {
    id: string;
    email: string;
    full_name: string | null;
  }[] = [];

  if (frontDesk) {
    const canManageFrontDeskLinks =
      staff.role === "admin" || staff.role === "manager";

    let unlinkedQuery = supabase
      .from("staff_accounts")
      .select("id, email, full_name")
      .eq("role", "front_desk")
      .is("teacher_id", null)
      .eq("is_active", true)
      .order("full_name");

    if (staff.role === "manager") {
      unlinkedQuery = unlinkedQuery.eq("location", staff.location);
    }

    const [{ data: logs }, { data: paychecks }, { data: linked }, { data: unlinked }] =
      await Promise.all([
        supabase
          .from("front_desk_hour_logs")
          .select("id, work_date, clock_in, clock_out, hours, rate_cents, notes")
          .eq("teacher_id", teacherId)
          .order("work_date", { ascending: false }),
        supabase
          .from("front_desk_paychecks")
          .select("id, year, month, total_minutes, total_amount_cents, created_at")
          .eq("teacher_id", teacherId)
          .order("year", { ascending: false })
          .order("month", { ascending: false }),
        supabase
          .from("staff_accounts")
          .select("id, email, full_name")
          .eq("teacher_id", teacherId)
          .eq("role", "front_desk")
          .maybeSingle(),
        canManageFrontDeskLinks
          ? unlinkedQuery
          : Promise.resolve({
              data: [] as {
                id: string;
                email: string;
                full_name: string | null;
              }[],
            }),
      ]);

    hourLogs = (logs ?? []).map((log) => ({
      ...log,
      hours: Number(log.hours),
    }));
    recordedPaychecks = paychecks ?? [];
    linkedLogin = linked ?? null;
    linkableLogins = unlinked ?? [];
  }

  const [
    { data: classTeacherLinks },
    { data: ownedClassRows },
    { data: campusClassSubjects },
    { data: rooms },
  ] = await Promise.all([
    frontDesk
      ? Promise.resolve({ data: [] as { class_id: number }[] })
      : supabase
          .from("class_teachers")
          .select("class_id")
          .eq("teacher_id", teacherId),
    frontDesk
      ? Promise.resolve({ data: [] as { id: number }[] })
      : supabase.from("classes").select("id").eq("teacher_id", teacherId),
    locationId && !frontDesk
      ? supabase.from("classes").select("subject").eq("location_id", locationId)
      : Promise.resolve({ data: [] as { subject: string }[] }),
    locationId && !frontDesk
      ? supabase
          .from("rooms")
          .select("id, room_number")
          .eq("location_id", locationId)
          .order("room_number")
      : Promise.resolve({ data: [] as RoomOption[] }),
  ]);

  const linkedClassIds = [
    ...new Set([
      ...((classTeacherLinks as { class_id: number }[] | null) ?? []).map(
        (row) => row.class_id,
      ),
      ...((ownedClassRows as { id: number }[] | null) ?? []).map(
        (row) => row.id,
      ),
    ]),
  ];

  let classes: ClassEmbed[] | null = null;
  let classesError: { message: string } | null = null;
  if (linkedClassIds.length > 0) {
    const result = await supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        duration_minutes,
        lesson_type,
        rooms ( room_number )
      `,
      )
      .in("id", linkedClassIds)
      .order("id");
    classes = result.data as ClassEmbed[] | null;
    classesError = result.error;
  }

  const classRows = (classes as ClassEmbed[] | null) ?? [];
  const catalogClassRows = classRows.filter((row) => !isCatalogTrialClass(row));
  const subjectGroups = groupByClassSubject(catalogClassRows).map((group) => {
    const classIds = group.items.map((row) => row.id).sort((a, b) => a - b);
    const rooms = [
      ...new Set(
        group.items
          .map((row) => firstOrNull(row.rooms)?.room_number?.trim())
          .filter((room): room is string => Boolean(room)),
      ),
    ];
    const durations = [
      ...new Set(
        group.items
          .map((row) => row.duration_minutes)
          .filter((minutes): minutes is number => minutes != null && minutes > 0),
      ),
    ].sort((a, b) => a - b);

    return {
      subject: group.subject,
      classIds,
      representativeId: classIds[0]!,
      rooms,
      durations,
    };
  });
  const subjectByClassId = new Map(
    classRows.map((row) => [row.id, row.subject]),
  );

  let enrollmentRows: EnrollmentRow[] = [];
  let enrollmentsError: { message: string } | null = null;
  let balances: StudentClassBalance[] = [];
  let balancesError: { message: string } | null = null;
  if (classRows.length > 0) {
    const classIds = classRows.map((row) => row.id);
    const [{ data: enrollments, error }, balancesResult] = await Promise.all([
      supabase
        .from("enrollments")
        .select(
          'id, grade_level, is_active, "class id", students ( id, "first name", "last name", is_active )',
        )
        .in("class id", classIds)
        .order("id"),
      supabase
        .from("student_class_balances")
        .select(
          "student_id, class_id, sessions_total, sessions_remaining, sessions_used, absence_count",
        )
        .in("class_id", classIds),
    ]);
    enrollmentsError = error;
    enrollmentRows = (enrollments as EnrollmentRow[] | null) ?? [];
    balancesError = balancesResult.error;
    balances = (balancesResult.data as StudentClassBalance[] | null) ?? [];
  }

  const studentEnrollments = (() => {
    const balanceByKey = new Map(
      balances.map((balance) => [
        balanceMapKey(balance.student_id, balance.class_id),
        balance,
      ]),
    );

    const mapped = enrollmentRows
      .map((enrollment) => {
        const student = firstOrNull(enrollment.students);
        const classId = enrollment["class id"];
        if (!student || classId == null) return null;
        const balance = balanceByKey.get(
          balanceMapKey(student.id, classId),
        );
        return {
          enrollmentId: enrollment.id,
          gradeLevel: enrollment.grade_level,
          isActive: enrollment.is_active !== false && student.is_active !== false,
          subject: subjectByClassId.get(classId) ?? `Class ${classId}`,
          remaining: balance?.sessions_remaining ?? 0,
          total: balance?.sessions_total ?? 0,
          student,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const uniqueByStudentSubject = new Map<string, (typeof mapped)[number]>();
    for (const row of mapped) {
      const key = `${row.student.id}|${row.subject.trim().toLowerCase()}`;
      const existing = uniqueByStudentSubject.get(key);
      if (!existing) {
        uniqueByStudentSubject.set(key, row);
        continue;
      }

      const preferred =
        row.isActive && !existing.isActive ? row : existing;
      uniqueByStudentSubject.set(key, {
        ...preferred,
        remaining: existing.remaining + row.remaining,
        total: existing.total + row.total,
      });
    }

    return [...uniqueByStudentSubject.values()].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const nameCmp = compareStudentNames(a.student, b.student);
      if (nameCmp !== 0) return nameCmp;
      return a.subject.localeCompare(b.subject);
    });
  })();
  const subjectOptions = listKnownClassSubjects([
    ...listPriceSheetSubjects(),
    ...((campusClassSubjects as { subject: string }[] | null)?.map(
      (row) => row.subject,
    ) ?? []),
  ]);
  const roomOptions = (rooms as RoomOption[] | null) ?? [];

  let paycheckPeriods: TeacherPaycheckPeriodData[] = [];
  let defaultPayRates: TeacherGroupPayRates = {};
  if (!frontDesk) {
    try {
      const { data: savedPaycheckPeriods } = await supabase
        .from("teacher_paychecks")
        .select("year, month")
        .eq("teacher_id", teacherId);

      const [periods, classPayRates] = await Promise.all([
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
      paycheckPeriods = periods;
      const allClassLines = periods.flatMap((period) => period.classLines);
      defaultPayRates = classPayRatesToGroupRates(allClassLines, classPayRates);
    } catch (error) {
      console.error("Could not load teacher paycheck data:", error);
    }
  }
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
          <div className="flex flex-wrap items-center gap-3">
            <EditTeacherDialog teacher={teacher} />
            <DeleteTeacherButton
              teacherId={teacherId}
              teacherName={formatTeacherName(teacher)}
            />
          </div>
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {frontDesk ? (
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("common.hourlyRate")}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {teacher.hourly_rate_cents != null
                  ? formatCentsAsCurrency(
                      teacher.hourly_rate_cents,
                      staff.preferred_language,
                    )
                  : t("common.notAvailable")}
              </dd>
            </div>
          ) : null}
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
              <TeacherStatusSelect
                teacherId={teacherId}
                status={teacherStatusFromRow(teacher)}
                label={t("common.changeTeacherStatus", {
                  name: formatTeacherName(teacher),
                })}
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

      <TeacherResumeSection
        teacherId={teacherId}
        resumeFileName={teacher.resume_file_name}
        resumeUrl={resumeUrl}
      />

      {frontDesk ? (
        <>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {t("common.frontDeskNoClasses")}
          </p>
          {(staff.role === "admin" || staff.role === "manager") ? (
            <LinkFrontDeskAccountSection
              teacherId={teacherId}
              linkedAccount={linkedLogin}
              availableAccounts={linkableLogins}
            />
          ) : null}
          <FrontDeskHoursSection
            teacherId={teacherId}
            teacherName={formatTeacherName(teacher)}
            hourlyRateCents={teacher.hourly_rate_cents}
            logs={hourLogs}
            recordedPaychecks={recordedPaychecks}
          />
        </>
      ) : (
      <>
      <section className="mt-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.classes")}
          </h2>
          <EditTeacherClassesDialog
            teacherId={teacherId}
            subjects={subjectOptions}
            rooms={roomOptions}
          />
        </div>

        {classesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("common.classes"), message: classesError.message })}
          </p>
        ) : subjectGroups.length === 0 ? (
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
                    {subjectGroups.map((group) => (
                      <tr key={group.subject}>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                          <Link
                            href={classHref(
                              group.representativeId,
                              `/tutors/${teacherId}`,
                            )}
                            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {formatClassSubject(
                              group.subject,
                              staff.preferred_language,
                            )}
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {group.rooms.length > 0
                            ? group.rooms.join(", ")
                            : t("common.notAvailable")}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {group.durations.length > 0
                            ? group.durations
                                .map((minutes) => formatDuration(minutes, t))
                                .join(", ")
                            : t("common.notAvailable")}
                        </td>
                        <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap text-gray-500 sm:pr-0 dark:text-gray-400">
                          {group.classIds.length === 1
                            ? group.representativeId
                            : t("common.notAvailable")}
                        </td>
                        <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                          <UnassignTeacherClassButton
                            teacherId={teacherId}
                            classIds={group.classIds}
                            classSubject={group.subject}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("nav.students")}
        </h2>

        {enrollmentsError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("nav.students"), message: enrollmentsError.message })}
          </p>
        ) : balancesError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {t("common.error.loadFailed", { entity: t("common.classCredits"), message: balancesError.message })}
          </p>
        ) : studentEnrollments.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noStudentsYet")}
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
                        {t("common.student")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.subject")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.gradeLevel")}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.remaining")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {studentEnrollments.map((row) => (
                      <tr
                        key={row.enrollmentId}
                        className={row.isActive ? undefined : "opacity-60"}
                      >
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                          <Link
                            href={`/students/${row.student.id}`}
                            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {formatStudentName(row.student)}
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {formatClassSubject(row.subject, staff.preferred_language)}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-3">
                            <span>{row.gradeLevel?.trim() || "—"}</span>
                            <EditEnrollmentGradeDialog
                              enrollmentId={row.enrollmentId}
                              studentId={row.student.id}
                              subjectLabel={formatClassSubject(
                                row.subject,
                                staff.preferred_language,
                              )}
                              gradeLevel={row.gradeLevel}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right text-sm font-medium whitespace-nowrap text-indigo-700 dark:text-indigo-300">
                          {row.remaining}
                          <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                            {t("common.of")} {row.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      <TeacherPaycheckSection
        teacherId={teacherId}
        teacherName={formatTeacherName(teacher)}
        periods={paycheckPeriods}
        defaultPayRates={defaultPayRates}
      />
      </>
      )}
    </div>
  );
}
