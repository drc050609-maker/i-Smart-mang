import {
  buildScheduleEvents,
  type ScheduleEvent,
  type ScheduleException,
  type ScheduleStudent,
} from "@/lib/schedule-calendar";
import { formatTeacherName } from "@/lib/person-name";
import type { createClient } from "@/utils/supabase/server";

type ScheduleQueryClient = ReturnType<typeof createClient>;

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
  is_active?: boolean | null;
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
  lesson_type: string | null;
  trial_format: string | null;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
};

type ScheduleStudentEmbed = {
  id: number;
  "first name": string;
  "last name": string | null;
  notes: string | null;
  dob: string | null;
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
  students: ScheduleStudentEmbed | ScheduleStudentEmbed[] | null;
  classes: ClassEmbed | ClassEmbed[] | null;
};

type EnrollmentStudentEmbed = {
  id: number;
  "first name": string;
  "last name": string | null;
  notes: string | null;
  dob: string | null;
};

type EnrollmentRow = {
  "class id": number;
  "student id": number | null;
  students: EnrollmentStudentEmbed | EnrollmentStudentEmbed[] | null;
};

const PAGE_SIZE = 1000;
const IN_FILTER_CHUNK = 200;
/** Keep one-off makeups/trials in the calendar without loading years of history. */
const ONE_OFF_PAST_DAYS = 56;
const ONE_OFF_FUTURE_DAYS = 112;

function ymdWithOffset(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Recurring rows plus one-offs in a nearby date window. */
export function recurringOrNearbyOneOffOrFilter(now = new Date()) {
  const from = ymdWithOffset(now, -ONE_OFF_PAST_DAYS);
  const to = ymdWithOffset(now, ONE_OFF_FUTURE_DAYS);
  return `is_recurring.eq.true,and(is_recurring.eq.false,schedule_date.gte.${from},schedule_date.lte.${to})`;
}

/** Recurring rows for that weekday, plus one-offs on that exact date. */
export function occurringOnDateOrFilter(ymd: string) {
  const weekday = new Date(`${ymd}T12:00:00`).getDay();
  return `and(is_recurring.eq.true,schedule_day_of_week.eq.${weekday}),and(is_recurring.eq.false,schedule_date.eq.${ymd})`;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      return { data: rows, error: error.message };
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return { data: rows, error: null };
}

async function fetchExceptionsForScheduleIds(
  supabase: ScheduleQueryClient,
  scheduleIds: number[],
): Promise<{ data: ScheduleException[]; error: string | null }> {
  if (scheduleIds.length === 0) {
    return { data: [], error: null };
  }

  const chunks: number[][] = [];
  for (let index = 0; index < scheduleIds.length; index += IN_FILTER_CHUNK) {
    chunks.push(scheduleIds.slice(index, index + IN_FILTER_CHUNK));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
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
        )
        .in("schedule_id", chunk),
    ),
  );

  const rows: ScheduleException[] = [];
  for (const result of results) {
    if (result.error) {
      return { data: rows, error: result.error.message };
    }
    rows.push(...((result.data as ScheduleException[] | null) ?? []));
  }

  return { data: rows, error: null };
}

async function fetchEnrollmentsForClassIds(
  supabase: ScheduleQueryClient,
  locationId: number,
  classIds: number[],
): Promise<{ data: EnrollmentRow[]; error: string | null }> {
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  const chunks: number[][] = [];
  for (let index = 0; index < classIds.length; index += IN_FILTER_CHUNK) {
    chunks.push(classIds.slice(index, index + IN_FILTER_CHUNK));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      fetchAllRows<EnrollmentRow>((from, to) =>
        supabase
          .from("enrollments")
          .select(
            `
          "class id",
          "student id",
          students ( id, "first name", "last name", notes, dob ),
          classes!inner ( location_id )
        `,
          )
          .eq("classes.location_id", locationId)
          .in("class id", chunk)
          .not("student id", "is", null)
          .range(from, to),
      ),
    ),
  );

  const rows: EnrollmentRow[] = [];
  for (const result of results) {
    if (result.error) {
      return { data: rows, error: result.error };
    }
    rows.push(...result.data);
  }

  return { data: rows, error: null };
}

export async function fetchTeacherScheduleCounts(
  supabase: ScheduleQueryClient,
  locationId: number,
): Promise<{ data: Map<number, number>; error: string | null }> {
  const { data, error } = await fetchAllRows<{
    teacher_id: number | null;
    class_schedules: { count: number }[] | { count: number } | null;
  }>((from, to) =>
    supabase
      .from("classes")
      .select("teacher_id, class_schedules(count)")
      .eq("location_id", locationId)
      .not("teacher_id", "is", null)
      .range(from, to),
  );

  if (error) {
    return { data: new Map(), error };
  }

  const counts = new Map<number, number>();
  for (const row of data) {
    if (row.teacher_id == null) continue;
    const countEmbed = firstOrNull(row.class_schedules);
    const count = countEmbed?.count ?? 0;
    counts.set(row.teacher_id, (counts.get(row.teacher_id) ?? 0) + count);
  }

  return { data: counts, error: null };
}

export async function loadScheduleCalendarEvents(
  supabase: ScheduleQueryClient,
  locationId: number,
  teacherIds: number[] | null,
): Promise<{
  events: ScheduleEvent[];
  exceptions: ScheduleException[];
  error: string | null;
}> {
  const { data: scheduleRows, error: schedulesError } = await fetchAllRows<ScheduleRow>(
    (from, to) => {
      let scheduleQuery = supabase
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
      students ( id, "first name", "last name", notes, dob ),
      classes!inner (
        id,
        subject,
        teacher_id,
        is_active,
        class_track,
        lesson_type,
        trial_format,
        location_id,
        teachers!classes_teacher_id_fkey ( first_name, last_name, is_active ),
        rooms ( room_number )
      )
    `,
        )
        .eq("classes.location_id", locationId)
        .or(recurringOrNearbyOneOffOrFilter())
        .order("schedule_start_time");

      if (teacherIds != null && teacherIds.length > 0) {
        scheduleQuery = scheduleQuery.in("classes.teacher_id", teacherIds);
      }

      return scheduleQuery.range(from, to);
    },
  );

  if (schedulesError) {
    return { events: [], exceptions: [], error: schedulesError };
  }

  const scheduleIds = scheduleRows.map((row) => row.id);
  const classIdsNeedingRoster = [
    ...new Set(
      scheduleRows
        .filter((row) => {
          if (row.student_id == null) return true;
          const classRow = firstOrNull(row.classes);
          return classRow?.lesson_type === "group";
        })
        .map((row) => row.class_id),
    ),
  ];

  const [
    { data: exceptionRows, error: exceptionsError },
    { data: enrollments, error: enrollmentsError },
  ] = await Promise.all([
    fetchExceptionsForScheduleIds(supabase, scheduleIds),
    fetchEnrollmentsForClassIds(supabase, locationId, classIdsNeedingRoster),
  ]);

  const error = exceptionsError ?? enrollmentsError ?? null;

  const enrollmentsByClass = new Map<number, ScheduleStudent[]>();
  for (const enrollment of enrollments) {
    const classId = enrollment["class id"];
    const student = firstOrNull(enrollment.students);
    if (!student) continue;

    const existing = enrollmentsByClass.get(classId) ?? [];
    if (existing.some((enrolled) => enrolled.id === student.id)) continue;

    existing.push({
      id: student.id,
      "first name": student["first name"],
      "last name": student["last name"],
      notes: student.notes,
      dob: student.dob,
    });
    enrollmentsByClass.set(classId, existing);
  }

  const events = buildScheduleEvents(
    scheduleRows.map((scheduleRow) => {
      const classRow = firstOrNull(scheduleRow.classes);
      const scheduleStudent = firstOrNull(scheduleRow.students);

      return {
        id: scheduleRow.id,
        class_id: scheduleRow.class_id,
        student_id: scheduleRow.student_id,
        schedule_student: scheduleStudent
          ? {
              id: scheduleStudent.id,
              "first name": scheduleStudent["first name"],
              "last name": scheduleStudent["last name"],
              notes: scheduleStudent.notes,
              dob: scheduleStudent.dob,
            }
          : null,
        is_recurring: scheduleRow.is_recurring,
        schedule_day_of_week: scheduleRow.schedule_day_of_week,
        schedule_date: scheduleRow.schedule_date,
        schedule_start_time: scheduleRow.schedule_start_time,
        schedule_end_time: scheduleRow.schedule_end_time,
        is_makeup: Boolean(scheduleRow.is_makeup),
        classes: classRow
          ? {
              id: classRow.id,
              subject: classRow.subject,
              teacher_id: classRow.teacher_id,
              is_active: classRow.is_active,
              class_track: classRow.class_track,
              lesson_type: classRow.lesson_type,
              trial_format: classRow.trial_format,
              teachers: firstOrNull(classRow.teachers),
              rooms: firstOrNull(classRow.rooms),
            }
          : null,
      };
    }),
    enrollmentsByClass,
    formatTeacherName,
  );

  return { events, exceptions: exceptionRows, error };
}

