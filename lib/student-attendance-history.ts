import type { SupabaseClient } from "@supabase/supabase-js";

import type { AttendanceStatus } from "@/lib/attendance";
import type { AppLanguage } from "@/lib/language";
import { appLanguageLocale } from "@/lib/language";
import { formatTeacherName } from "@/lib/person-name";
import type { Database } from "@/types/database.types";

export type StudentClassHistoryType =
  Database["public"]["Enums"]["student_class_history_type"];

export type SessionRecordSource =
  Database["public"]["Enums"]["session_record_source"];

export type StudentAttendanceHistoryRow = {
  id: number;
  sessionDate: string;
  classId: number;
  classSubject: string;
  teacherName: string | null;
  startTime: string | null;
  endTime: string | null;
  historyType: StudentClassHistoryType;
  status: AttendanceStatus | null;
  creditsUsed: number;
  source: SessionRecordSource;
  notes: string | null;
};

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type ClassEmbed = {
  id: number;
  subject: string;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
};

type ScheduleEmbed = {
  schedule_start_time: string;
  schedule_end_time: string;
};

type ClassHistoryRow = {
  id: number;
  session_date: string;
  history_type: StudentClassHistoryType;
  attendance_status: AttendanceStatus | null;
  credits_used: number;
  source: SessionRecordSource;
  notes: string | null;
  class_id: number;
  classes: ClassEmbed | ClassEmbed[] | null;
  class_schedules: ScheduleEmbed | ScheduleEmbed[] | null;
};

type AttendanceFallbackRow = {
  id: number;
  session_date: string;
  status: AttendanceStatus;
  notes: string | null;
  class_id: number;
  classes: ClassEmbed | ClassEmbed[] | null;
  class_schedules: ScheduleEmbed | ScheduleEmbed[] | null;
};

const CLASS_HISTORY_SELECT = `
  id,
  session_date,
  history_type,
  attendance_status,
  credits_used,
  source,
  notes,
  class_id,
  classes (
    id,
    subject,
    teachers!classes_teacher_id_fkey ( first_name, last_name )
  ),
  class_schedules (
    schedule_start_time,
    schedule_end_time
  )
`;

const ATTENDANCE_FALLBACK_SELECT = `
  id,
  session_date,
  status,
  notes,
  class_id,
  classes (
    id,
    subject,
    teachers!classes_teacher_id_fkey ( first_name, last_name )
  ),
  class_schedules (
    schedule_start_time,
    schedule_end_time
  )
`;

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function buildStudentAttendanceHistoryRows(
  rows: ClassHistoryRow[] | null | undefined,
): StudentAttendanceHistoryRow[] {
  const history = (rows ?? [])
    .map((row) => {
      const classRow = firstOrNull(row.classes);
      if (!classRow) return null;

      const schedule = firstOrNull(row.class_schedules);
      const teacher = firstOrNull(classRow.teachers);

      return {
        id: row.id,
        sessionDate: row.session_date.slice(0, 10),
        classId: row.class_id,
        classSubject: classRow.subject,
        teacherName: teacher ? formatTeacherName(teacher) : null,
        startTime: schedule?.schedule_start_time ?? null,
        endTime: schedule?.schedule_end_time ?? null,
        historyType: row.history_type,
        status: row.attendance_status,
        creditsUsed: row.credits_used,
        source: row.source,
        notes: row.notes,
      };
    })
    .filter((row): row is StudentAttendanceHistoryRow => row !== null);

  history.sort((a, b) => {
    const dateCompare = b.sessionDate.localeCompare(a.sessionDate);
    if (dateCompare !== 0) return dateCompare;

    const timeA = a.startTime ?? "";
    const timeB = b.startTime ?? "";
    return timeB.localeCompare(timeA);
  });

  return history;
}

function isMissingHistoryTableError(message: string) {
  return (
    message.includes("student_class_history") ||
    message.includes("schema cache") ||
    message.includes("PGRST205")
  );
}

function buildStudentAttendanceHistoryRowsFromAttendance(
  rows: AttendanceFallbackRow[] | null | undefined,
): StudentAttendanceHistoryRow[] {
  return buildStudentAttendanceHistoryRows(
    (rows ?? []).map((row) => ({
      id: row.id,
      session_date: row.session_date,
      history_type: "regular" as const,
      attendance_status: row.status,
      credits_used: row.status === "present" || row.status === "late" ? 1 : 0,
      source: "manual" as const,
      notes: row.notes,
      class_id: row.class_id,
      classes: row.classes,
      class_schedules: row.class_schedules,
    })),
  );
}

export async function loadStudentClassHistory(
  supabase: SupabaseClient<Database>,
  studentId: number,
) {
  const { data, error } = await supabase
    .from("student_class_history")
    .select(CLASS_HISTORY_SELECT)
    .eq("student_id", studentId)
    .order("session_date", { ascending: false });

  if (!error) {
    return {
      rows: buildStudentAttendanceHistoryRows(data as ClassHistoryRow[] | null),
      error: null as string | null,
    };
  }

  if (!isMissingHistoryTableError(error.message)) {
    return { rows: [], error: error.message };
  }

  const { data: attendance, error: attendanceError } = await supabase
    .from("class_attendance")
    .select(ATTENDANCE_FALLBACK_SELECT)
    .eq("student_id", studentId)
    .order("session_date", { ascending: false });

  if (attendanceError) {
    return { rows: [], error: attendanceError.message };
  }

  return {
    rows: buildStudentAttendanceHistoryRowsFromAttendance(
      attendance as AttendanceFallbackRow[] | null,
    ),
    error: null,
  };
}

export function groupStudentAttendanceByDate(rows: StudentAttendanceHistoryRow[]) {
  const byDate = new Map<string, StudentAttendanceHistoryRow[]>();

  for (const row of rows) {
    const sessions = byDate.get(row.sessionDate) ?? [];
    sessions.push(row);
    byDate.set(row.sessionDate, sessions);
  }

  for (const sessions of byDate.values()) {
    sessions.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }

  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  return { dates, byDate };
}

export function groupStudentAttendanceByClass(rows: StudentAttendanceHistoryRow[]) {
  const byClass = new Map<number, StudentAttendanceHistoryRow[]>();

  for (const row of rows) {
    const sessions = byClass.get(row.classId) ?? [];
    sessions.push(row);
    byClass.set(row.classId, sessions);
  }

  for (const sessions of byClass.values()) {
    sessions.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  }

  return byClass;
}

export function isClassSessionTaken(row: StudentAttendanceHistoryRow) {
  if (row.creditsUsed > 0) {
    return true;
  }

  return row.status === "present" || row.status === "late";
}

export function countStudentClassesTaken(rows: StudentAttendanceHistoryRow[]) {
  return rows.filter(isClassSessionTaken).length;
}

export type StudentClassesTakenSummary = {
  classId: number;
  classSubject: string;
  count: number;
};

export function summarizeStudentClassesTaken(
  rows: StudentAttendanceHistoryRow[],
): StudentClassesTakenSummary[] {
  const byClass = new Map<number, StudentClassesTakenSummary>();

  for (const row of rows) {
    if (!isClassSessionTaken(row)) {
      continue;
    }

    const existing = byClass.get(row.classId) ?? {
      classId: row.classId,
      classSubject: row.classSubject,
      count: 0,
    };
    existing.count += 1;
    byClass.set(row.classId, existing);
  }

  return [...byClass.values()].sort((summaryA, summaryB) => {
    if (summaryB.count !== summaryA.count) {
      return summaryB.count - summaryA.count;
    }

    return summaryA.classSubject.localeCompare(summaryB.classSubject, undefined, {
      sensitivity: "base",
    });
  });
}

export function getStudentTotalClassesTaken(
  historyRows: StudentAttendanceHistoryRow[],
  sessionsUsedFromBalances: number,
) {
  const fromHistory = countStudentClassesTaken(historyRows);
  return Math.max(fromHistory, sessionsUsedFromBalances);
}

export function formatAttendanceHistoryDate(
  dateStr: string,
  language: AppLanguage = "en",
) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(
    appLanguageLocale(language),
    {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

export function formatAttendanceHistoryDateShort(
  dateStr: string,
  language: AppLanguage = "en",
) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(
    appLanguageLocale(language),
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}
