import { cookies } from "next/headers";

import { ScheduleCalendar } from "@/components/schedule-calendar";
import {
  buildScheduleEvents,
  type ScheduleException,
  type ScheduleStudent,
  type ScheduleTeacher,
} from "@/lib/schedule-calendar";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import { formatTeacherName, sortTeachers } from "@/lib/person-name";
import { createClient } from "@/utils/supabase/server";

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
  teacher_id: number | null;
  is_active: boolean;
  class_track: string | null;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
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
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function SchedulePage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.schedule"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const [
    { data: scheduleRows, error: schedulesError },
    { data: exceptions, error: exceptionsError },
    { data: teachers, error: teachersError },
    { data: students, error: studentsError },
    { data: enrollments, error: enrollmentsError },
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
          teacher_id,
          is_active,
          class_track,
          location_id,
          teachers!classes_teacher_id_fkey ( first_name, last_name ),
          rooms ( room_number )
        )
      `,
      )
      .eq("classes.location_id", locationId)
      .order("schedule_start_time"),
    supabase
      .from("class_schedule_exceptions")
      .select(
        `
        id,
        schedule_id,
        original_date,
        override_date,
        schedule_start_time,
        schedule_end_time,
        is_cancelled
      `,
      ),
    supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .eq("location_id", locationId)
      .order("first_name"),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true)
      .eq("location_id", locationId)
      .order("first name"),
    supabase
      .from("enrollments")
      .select('"class id", "student id", classes!inner ( location_id )')
      .eq("classes.location_id", locationId)
      .not("student id", "is", null),
  ]);

  const error =
    schedulesError?.message ??
    exceptionsError?.message ??
    teachersError?.message ??
    studentsError?.message ??
    enrollmentsError?.message ??
    null;

  const enrollmentsByClass = new Map<number, number[]>();

  for (const enrollment of (enrollments as EnrollmentRow[] | null) ?? []) {
    const classId = enrollment["class id"];
    const studentId = enrollment["student id"];

    if (studentId === null) {
      continue;
    }

    const existing = enrollmentsByClass.get(classId) ?? [];
    existing.push(studentId);
    enrollmentsByClass.set(classId, existing);
  }

  const scheduleEvents = buildScheduleEvents(
    ((scheduleRows as ScheduleRow[] | null) ?? []).map((scheduleRow) => {
      const classRow = firstOrNull(scheduleRow.classes);

      return {
        id: scheduleRow.id,
        class_id: scheduleRow.class_id,
        is_recurring: scheduleRow.is_recurring,
        schedule_day_of_week: scheduleRow.schedule_day_of_week,
        schedule_date: scheduleRow.schedule_date,
        schedule_start_time: scheduleRow.schedule_start_time,
        schedule_end_time: scheduleRow.schedule_end_time,
        classes: classRow
          ? {
              id: classRow.id,
              subject: classRow.subject,
              teacher_id: classRow.teacher_id,
              is_active: classRow.is_active,
              class_track: classRow.class_track,
              teachers: firstOrNull(classRow.teachers),
              rooms: firstOrNull(classRow.rooms),
            }
          : null,
      };
    }),
    enrollmentsByClass,
    formatTeacherName,
  );

  const exceptionRows: ScheduleException[] =
    (exceptions as ScheduleException[] | null) ?? [];

  const teacherOptions: ScheduleTeacher[] = sortTeachers(
    ((teachers as ScheduleTeacher[] | null) ?? []).map((teacher) => ({
      ...teacher,
      class_count: 0,
    })),
  );

  const studentOptions: ScheduleStudent[] =
    (students as ScheduleStudent[] | null) ?? [];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.schedule")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.scheduleSubtitle")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.schedule"), message: error })}
        </p>
      ) : (
        <ScheduleCalendar
          events={scheduleEvents}
          exceptions={exceptionRows}
          teachers={teacherOptions}
          students={studentOptions}
        />
      )}
    </div>
  );
}
