import { cookies } from "next/headers";

import {
  AttendanceSection,
  type AttendanceClassGroup,
  type AttendanceClassSession,
  type AttendanceStudentDay,
  type AttendanceStudentRow,
} from "@/components/attendance-section";
import type { AttendanceStatus } from "@/lib/attendance";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { formatSessionDate } from "@/lib/class-session-credits";
import { createTranslator } from "@/lib/i18n";
import { compareStudentNames, formatTeacherName } from "@/lib/person-name";
import { createClient } from "@/utils/supabase/server";

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type LocationEmbed = {
  name: string;
};

type ClassEmbed = {
  id: number;
  subject: string;
  is_active: boolean;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  locations: LocationEmbed | LocationEmbed[] | null;
};

type ScheduleRow = {
  id: number;
  class_id: number;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
  classes: ClassEmbed | ClassEmbed[] | null;
};

type EnrollmentRow = {
  "class id": number;
  "student id": number | null;
  is_active: boolean | null;
};

type StudentRow = {
  id: number;
  "first name": string;
  "last name": string | null;
};

type AttendanceRow = {
  student_id: number;
  class_id: number;
  class_schedule_id: number | null;
  session_date: string;
  status: AttendanceStatus;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function scheduleMatchesDate(schedule: ScheduleRow, dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);

  if (schedule.is_recurring && schedule.schedule_day_of_week !== null) {
    return date.getDay() === schedule.schedule_day_of_week;
  }

  if (!schedule.is_recurring && schedule.schedule_date) {
    return schedule.schedule_date.slice(0, 10) === dateStr;
  }

  return false;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; student?: string }>;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const { date: dateParam, student: studentParam } = await searchParams;
  const sessionDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : formatSessionDate(new Date());
  const initialStudentId = Number(studentParam);
  const parsedStudentId =
    Number.isInteger(initialStudentId) && initialStudentId > 0
      ? initialStudentId
      : undefined;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.attendance"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const [
    { data: schedules, error: schedulesError },
    { data: enrollments, error: enrollmentsError },
    { data: students, error: studentsError },
    { data: attendance, error: attendanceError },
  ] = await Promise.all([
    supabase
      .from("class_schedules")
      .select(
        `
        id,
        class_id,
        is_recurring,
        schedule_day_of_week,
        schedule_date,
        schedule_start_time,
        schedule_end_time,
        classes!inner (
          id,
          subject,
          is_active,
          location_id,
          teachers!classes_teacher_id_fkey ( first_name, last_name ),
          locations ( name )
        )
      `,
      )
      .eq("classes.location_id", locationId)
      .order("schedule_start_time"),
    supabase
      .from("enrollments")
      .select('"class id", "student id", is_active, classes!inner ( location_id )')
      .eq("is_active", true)
      .eq("classes.location_id", locationId)
      .not("student id", "is", null),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true)
      .eq("location_id", locationId),
    supabase
      .from("class_attendance")
      .select(
        "student_id, class_id, class_schedule_id, session_date, status, classes!inner ( location_id )",
      )
      .eq("session_date", sessionDate)
      .eq("classes.location_id", locationId),
  ]);

  const error =
    schedulesError?.message ??
    enrollmentsError?.message ??
    studentsError?.message ??
    attendanceError?.message ??
    null;

  const studentById = new Map(
    ((students as StudentRow[] | null) ?? []).map((student) => [student.id, student]),
  );

  const classesByStudent = new Map<number, Set<number>>();
  const enrollmentsByClass = new Map<number, number[]>();
  for (const enrollment of (enrollments as EnrollmentRow[] | null) ?? []) {
    const classId = enrollment["class id"];
    const studentId = enrollment["student id"];
    if (studentId === null) continue;
    const classIds = classesByStudent.get(studentId) ?? new Set<number>();
    classIds.add(classId);
    classesByStudent.set(studentId, classIds);
    const studentIds = enrollmentsByClass.get(classId) ?? [];
    studentIds.push(studentId);
    enrollmentsByClass.set(classId, studentIds);
  }

  const attendanceKey = (
    studentId: number,
    classId: number,
    scheduleId: number,
  ) => `${studentId}:${classId}:${scheduleId}`;

  const attendanceByKey = new Map<string, AttendanceStatus>();
  for (const row of (attendance as AttendanceRow[] | null) ?? []) {
    if (row.class_schedule_id === null) continue;
    attendanceByKey.set(
      attendanceKey(row.student_id, row.class_id, row.class_schedule_id),
      row.status,
    );
  }

  const sessionsForDate = ((schedules as ScheduleRow[] | null) ?? [])
    .filter((schedule) => scheduleMatchesDate(schedule, sessionDate))
    .map((schedule) => {
      const classRow = firstOrNull(schedule.classes);
      if (!classRow?.is_active) return null;

      const teacher = firstOrNull(classRow.teachers);
      const location = firstOrNull(classRow.locations);

      return {
        scheduleId: schedule.id,
        classId: classRow.id,
        classSubject: classRow.subject,
        teacherName: teacher ? formatTeacherName(teacher) : null,
        locationName: location?.name ?? null,
        startTime: schedule.schedule_start_time,
        endTime: schedule.schedule_end_time,
      };
    })
    .filter((session): session is NonNullable<typeof session> => session !== null);

  const classGroups: AttendanceClassGroup[] = sessionsForDate
    .map((session) => {
      const studentIds = enrollmentsByClass.get(session.classId) ?? [];
      const students: AttendanceStudentRow[] = studentIds
        .map((studentId) => {
          const student = studentById.get(studentId);
          if (!student) return null;

          return {
            studentId,
            firstName: student["first name"],
            lastName: student["last name"],
            status:
              attendanceByKey.get(
                attendanceKey(studentId, session.classId, session.scheduleId),
              ) ?? null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) =>
          compareStudentNames(
            { "first name": a.firstName, "last name": a.lastName },
            { "first name": b.firstName, "last name": b.lastName },
          ),
        );

      return { ...session, students };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const studentDaysMap = new Map<number, AttendanceStudentDay>();

  for (const [studentId, classIds] of classesByStudent) {
    const student = studentById.get(studentId);
    if (!student) continue;

    const sessions: AttendanceClassSession[] = [];

    for (const session of sessionsForDate) {
      if (!classIds.has(session.classId)) continue;

      sessions.push({
        ...session,
        status:
          attendanceByKey.get(
            attendanceKey(studentId, session.classId, session.scheduleId),
          ) ?? null,
      });
    }

    if (sessions.length === 0) continue;

    sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

    studentDaysMap.set(studentId, {
      studentId,
      firstName: student["first name"],
      lastName: student["last name"],
      sessions,
    });
  }

  const studentDays = [...studentDaysMap.values()].sort((a, b) =>
    compareStudentNames(
      { "first name": a.firstName, "last name": a.lastName },
      { "first name": b.firstName, "last name": b.lastName },
    ),
  );

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.attendance")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.attendanceSubtitle")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.attendance"), message: error })}
        </p>
      ) : (
        <AttendanceSection
          sessionDate={sessionDate}
          classGroups={classGroups}
          studentDays={studentDays}
          initialStudentId={parsedStudentId}
        />
      )}

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        {t("common.attendanceFooter")}
      </p>
    </div>
  );
}
