import { cookies } from "next/headers";

import {
  AttendanceSection,
  type AttendanceClassGroup,
  type AttendanceMakeupInfo,
  type AttendanceStudentRow,
  type AttendanceTeacherOption,
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
  teacher_id: number | null;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  locations: LocationEmbed | LocationEmbed[] | null;
};

type ScheduleRow = {
  id: number;
  class_id: number;
  student_id: number | null;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
  is_makeup?: boolean | null;
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
  searchParams: Promise<{ date?: string; teacher?: string }>;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const { date: dateParam, teacher: teacherParam } = await searchParams;
  const sessionDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : formatSessionDate(new Date());

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
        student_id,
        is_recurring,
        schedule_day_of_week,
        schedule_date,
        schedule_start_time,
        schedule_end_time,
        is_makeup,
        classes!inner (
          id,
          subject,
          is_active,
          location_id,
          teacher_id,
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

  const enrollmentsByClass = new Map<number, number[]>();
  for (const enrollment of (enrollments as EnrollmentRow[] | null) ?? []) {
    const classId = enrollment["class id"];
    const studentId = enrollment["student id"];
    if (studentId === null) continue;
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

  function studentsForSchedule(schedule: {
    classId: number;
    scheduleStudentId: number | null;
    isMakeup?: boolean;
  }) {
    const enrolledIds = enrollmentsByClass.get(schedule.classId) ?? [];

    const studentIds =
      schedule.isMakeup && schedule.scheduleStudentId != null
        ? [schedule.scheduleStudentId]
        : schedule.scheduleStudentId != null
          ? enrolledIds.includes(schedule.scheduleStudentId)
            ? [schedule.scheduleStudentId]
            : studentById.has(schedule.scheduleStudentId)
              ? [schedule.scheduleStudentId]
              : []
          : enrolledIds;

    return studentIds
      .map((studentId) => {
        const student = studentById.get(studentId);
        if (!student) return null;

        return {
          studentId,
          firstName: student["first name"],
          lastName: student["last name"],
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) =>
        compareStudentNames(
          { "first name": a.firstName, "last name": a.lastName },
          { "first name": b.firstName, "last name": b.lastName },
        ),
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
        scheduleStudentId: schedule.student_id,
        classSubject: classRow.subject,
        teacherId: classRow.teacher_id,
        teacherName: teacher ? formatTeacherName(teacher) : null,
        locationName: location?.name ?? null,
        startTime: schedule.schedule_start_time,
        endTime: schedule.schedule_end_time,
        isMakeup: Boolean(schedule.is_makeup),
      };
    })
    .filter((session): session is NonNullable<typeof session> => session !== null);

  const classIds = [...new Set(sessionsForDate.map((session) => session.classId))];
  const rosterStudentIds = [
    ...new Set(
      sessionsForDate.flatMap((session) =>
        studentsForSchedule(session).map((student) => student.studentId),
      ),
    ),
  ];

  const [{ data: balances }, { data: makeupRows }] = await Promise.all([
    classIds.length === 0 || rosterStudentIds.length === 0
      ? Promise.resolve({ data: [] as Array<{
          student_id: number;
          class_id: number;
          sessions_total: number;
          sessions_remaining: number;
        }> })
      : supabase
          .from("student_class_balances")
          .select("student_id, class_id, sessions_total, sessions_remaining")
          .in("student_id", rosterStudentIds)
          .in("class_id", classIds),
    rosterStudentIds.length === 0
      ? Promise.resolve({ data: [] as Array<{
          id: number;
          student_id: number;
          class_id: number;
          makeup_schedule_id: number | null;
          original_schedule_id: number | null;
          original_session_date: string | null;
          session_date: string;
          session_start_time: string | null;
          session_end_time: string | null;
          credits_applied: boolean;
        }> })
      : supabase
          .from("class_makeup_sessions")
          .select(
            "id, student_id, class_id, makeup_schedule_id, original_schedule_id, original_session_date, session_date, session_start_time, session_end_time, credits_applied",
          )
          .in("student_id", rosterStudentIds),
  ]);

  const creditKey = (studentId: number, classId: number) =>
    `${studentId}:${classId}`;
  const creditsByKey = new Map<
    string,
    { sessionsTotal: number; sessionsRemaining: number }
  >();
  for (const row of balances ?? []) {
    creditsByKey.set(creditKey(row.student_id, row.class_id), {
      sessionsTotal: row.sessions_total,
      sessionsRemaining: row.sessions_remaining,
    });
  }

  function toMakeupInfo(row: {
    id: number;
    makeup_schedule_id: number | null;
    original_schedule_id: number | null;
    original_session_date: string | null;
    session_date: string;
    session_start_time: string | null;
    session_end_time: string | null;
    credits_applied: boolean;
  }): AttendanceMakeupInfo {
    return {
      id: row.id,
      makeupDate: row.session_date.slice(0, 10),
      startTime: row.session_start_time ?? "17:00:00",
      endTime: row.session_end_time ?? "17:45:00",
      creditsApplied: row.credits_applied,
      originalScheduleId: row.original_schedule_id,
      originalSessionDate: row.original_session_date,
      makeupScheduleId: row.makeup_schedule_id,
    };
  }

  const makeupByOriginal = new Map<string, AttendanceMakeupInfo>();
  const makeupBySchedule = new Map<string, AttendanceMakeupInfo>();
  for (const row of makeupRows ?? []) {
    const info = toMakeupInfo(row);
    if (row.original_schedule_id != null && row.original_session_date) {
      makeupByOriginal.set(
        `${row.student_id}:${row.class_id}:${row.original_schedule_id}:${row.original_session_date.slice(0, 10)}`,
        info,
      );
    }
    if (row.makeup_schedule_id != null) {
      makeupBySchedule.set(
        `${row.student_id}:${row.class_id}:${row.makeup_schedule_id}`,
        info,
      );
    }
  }

  function makeupFor(studentId: number, classId: number, scheduleId: number, isMakeup: boolean) {
    if (isMakeup) {
      return makeupBySchedule.get(`${studentId}:${classId}:${scheduleId}`) ?? null;
    }
    return (
      makeupByOriginal.get(
        `${studentId}:${classId}:${scheduleId}:${sessionDate}`,
      ) ?? null
    );
  }

  function creditsFor(studentId: number, classId: number) {
    return (
      creditsByKey.get(creditKey(studentId, classId)) ?? {
        sessionsTotal: 0,
        sessionsRemaining: 0,
      }
    );
  }

  const teachersMap = new Map<number, AttendanceTeacherOption>();
  for (const session of sessionsForDate) {
    if (session.teacherId == null || !session.teacherName) continue;
    if (!teachersMap.has(session.teacherId)) {
      teachersMap.set(session.teacherId, {
        id: session.teacherId,
        name: session.teacherName,
      });
    }
  }
  const teachers = [...teachersMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const parsedTeacherId = Number(teacherParam);
  const selectedTeacherId =
    Number.isInteger(parsedTeacherId) &&
    parsedTeacherId > 0 &&
    teachersMap.has(parsedTeacherId)
      ? parsedTeacherId
      : undefined;

  const visibleSessions =
    selectedTeacherId == null
      ? sessionsForDate
      : sessionsForDate.filter((session) => session.teacherId === selectedTeacherId);

  const classGroups: AttendanceClassGroup[] = visibleSessions
    .map((session) => {
      const students: AttendanceStudentRow[] = studentsForSchedule(session).map(
        (student) => {
          const credits = creditsFor(student.studentId, session.classId);
          return {
            ...student,
            status:
              attendanceByKey.get(
                attendanceKey(
                  student.studentId,
                  session.classId,
                  session.scheduleId,
                ),
              ) ?? null,
            sessionsTotal: credits.sessionsTotal,
            sessionsRemaining: credits.sessionsRemaining,
            makeup: makeupFor(
              student.studentId,
              session.classId,
              session.scheduleId,
              session.isMakeup,
            ),
            isMakeupSlot: session.isMakeup,
          };
        },
      );

      if (students.length === 0) return null;

      return {
        scheduleId: session.scheduleId,
        classId: session.classId,
        classSubject: session.classSubject,
        teacherId: session.teacherId,
        teacherName: session.teacherName,
        locationName: session.locationName,
        startTime: session.startTime,
        endTime: session.endTime,
        isMakeup: session.isMakeup,
        students,
      };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
          teachers={teachers}
          selectedTeacherId={selectedTeacherId}
        />
      )}

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        {t("common.attendanceFooter")}
      </p>
    </div>
  );
}
