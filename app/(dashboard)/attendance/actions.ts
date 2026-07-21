"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { parseAttendanceStatus, type AttendanceStatus } from "@/lib/attendance";
import { formatSessionDate } from "@/lib/class-session-credits";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type MarkAllPresentState = ActionState & {
  markedCount?: number;
  skippedCount?: number;
};

type AttendanceSlot = {
  studentId: number;
  classId: number;
  scheduleId: number;
  status: AttendanceStatus | null;
};

function parseSessionDate(value: FormDataEntryValue | null) {
  const sessionDate = value?.toString().trim();
  if (!sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return null;
  }
  return sessionDate;
}

function revalidateAttendancePaths(studentId: number, classId: number) {
  revalidatePath("/attendance");
  revalidatePath("/schedule");
  revalidatePath(`/students/${studentId}`);
  revalidatePath(`/classes/${classId}`);
}

function scheduleMatchesDate(
  schedule: {
    is_recurring: boolean;
    schedule_day_of_week: number | null;
    schedule_date: string | null;
  },
  dateStr: string,
) {
  const date = new Date(`${dateStr}T00:00:00`);

  if (schedule.is_recurring && schedule.schedule_day_of_week !== null) {
    return date.getDay() === schedule.schedule_day_of_week;
  }

  if (!schedule.is_recurring && schedule.schedule_date) {
    return schedule.schedule_date.slice(0, 10) === dateStr;
  }

  return false;
}

async function loadAttendanceSlotsForDate(
  supabase: ReturnType<typeof createClient>,
  sessionDate: string,
  filterStudentId?: number,
) {
  const [
    { data: schedules, error: schedulesError },
    { data: enrollments, error: enrollmentsError },
    { data: attendance, error: attendanceError },
  ] = await Promise.all([
    supabase
      .from("class_schedules")
      .select(
        "id, class_id, is_recurring, schedule_day_of_week, schedule_date, classes ( id, is_active )",
      ),
    supabase
      .from("enrollments")
      .select('"class id", "student id", is_active')
      .eq("is_active", true)
      .not("student id", "is", null),
    supabase
      .from("class_attendance")
      .select("student_id, class_id, class_schedule_id, status")
      .eq("session_date", sessionDate),
  ]);

  if (schedulesError) throw new Error(schedulesError.message);
  if (enrollmentsError) throw new Error(enrollmentsError.message);
  if (attendanceError) throw new Error(attendanceError.message);

  type ScheduleRow = {
    id: number;
    class_id: number;
    is_recurring: boolean;
    schedule_day_of_week: number | null;
    schedule_date: string | null;
    classes:
      | { id: number; is_active: boolean }
      | { id: number; is_active: boolean }[]
      | null;
  };

  type EnrollmentRow = {
    "class id": number;
    "student id": number | null;
  };

  type AttendanceRow = {
    student_id: number;
    class_id: number;
    class_schedule_id: number | null;
    status: AttendanceStatus;
  };

  const attendanceKey = (
    studentId: number,
    classId: number,
    scheduleId: number,
  ) => `${studentId}:${classId}:${scheduleId}`;

  const statusByKey = new Map<string, AttendanceStatus>();
  for (const row of (attendance as AttendanceRow[] | null) ?? []) {
    if (row.class_schedule_id === null) continue;
    statusByKey.set(
      attendanceKey(row.student_id, row.class_id, row.class_schedule_id),
      row.status,
    );
  }

  const enrollmentsByClass = new Map<number, number[]>();
  for (const enrollment of (enrollments as EnrollmentRow[] | null) ?? []) {
    const classId = enrollment["class id"];
    const studentId = enrollment["student id"];
    if (studentId === null) continue;
    if (filterStudentId !== undefined && studentId !== filterStudentId) continue;
    const list = enrollmentsByClass.get(classId) ?? [];
    list.push(studentId);
    enrollmentsByClass.set(classId, list);
  }

  const slots: AttendanceSlot[] = [];

  for (const schedule of (schedules as ScheduleRow[] | null) ?? []) {
    if (!scheduleMatchesDate(schedule, sessionDate)) continue;

    const classEmbed = Array.isArray(schedule.classes)
      ? schedule.classes[0]
      : schedule.classes;
    if (!classEmbed?.is_active) continue;

    const studentIds = enrollmentsByClass.get(schedule.class_id) ?? [];
    for (const studentId of studentIds) {
      slots.push({
        studentId,
        classId: schedule.class_id,
        scheduleId: schedule.id,
        status:
          statusByKey.get(
            attendanceKey(studentId, schedule.class_id, schedule.id),
          ) ?? null,
      });
    }
  }

  return slots;
}

async function markSlotsPresent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionDate: string,
  slots: AttendanceSlot[],
) {
  let markedCount = 0;
  let skippedCount = 0;
  const touched = new Set<string>();

  for (const slot of slots) {
    if (slot.status !== null) {
      skippedCount += 1;
      continue;
    }

    const { error } = await supabase.rpc("record_class_attendance", {
      p_student_id: slot.studentId,
      p_class_id: slot.classId,
      p_class_schedule_id: slot.scheduleId,
      p_session_date: sessionDate,
      p_status: "present",
      p_notes: undefined,
      p_created_by: userId,
    });

    if (error) {
      return { error: error.message };
    }

    markedCount += 1;
    touched.add(`${slot.studentId}:${slot.classId}`);
  }

  for (const key of touched) {
    const [studentId, classId] = key.split(":").map(Number);
    revalidateAttendancePaths(studentId, classId);
  }

  if (touched.size === 0) {
    revalidatePath("/attendance");
  }

  return { markedCount, skippedCount };
}

export async function markAttendance(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const classId = Number(formData.get("classId"));
  const scheduleId = Number(formData.get("scheduleId"));
  const sessionDate =
    parseSessionDate(formData.get("sessionDate")) ?? formatSessionDate(new Date());
  const status = parseAttendanceStatus(formData.get("status"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  if (!status) {
    return { error: "Select a valid attendance status." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const scheduleIdValue =
    Number.isInteger(scheduleId) && scheduleId > 0 ? scheduleId : null;

  const { error } = await supabase.rpc("record_class_attendance", {
    p_student_id: studentId,
    p_class_id: classId,
    p_class_schedule_id: scheduleIdValue,
    p_session_date: sessionDate,
    p_status: status,
    p_notes: formData.get("notes")?.toString().trim() || undefined,
    p_created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateAttendancePaths(studentId, classId);
  return { success: true };
}

export async function markAllAttendancePresent(
  _prevState: MarkAllPresentState,
  formData: FormData,
): Promise<MarkAllPresentState> {
  const sessionDate =
    parseSessionDate(formData.get("sessionDate")) ?? formatSessionDate(new Date());

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  try {
    const slots = await loadAttendanceSlotsForDate(supabase, sessionDate);
    const result = await markSlotsPresent(supabase, user.id, sessionDate, slots);

    if ("error" in result && result.error) {
      return { error: result.error };
    }

    return {
      success: true,
      markedCount: result.markedCount,
      skippedCount: result.skippedCount,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not mark attendance.",
    };
  }
}

export async function markStudentAllPresent(
  _prevState: MarkAllPresentState,
  formData: FormData,
): Promise<MarkAllPresentState> {
  const studentId = Number(formData.get("studentId"));
  const sessionDate =
    parseSessionDate(formData.get("sessionDate")) ?? formatSessionDate(new Date());

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  try {
    const slots = await loadAttendanceSlotsForDate(
      supabase,
      sessionDate,
      studentId,
    );
    const result = await markSlotsPresent(supabase, user.id, sessionDate, slots);

    if ("error" in result && result.error) {
      return { error: result.error };
    }

    return {
      success: true,
      markedCount: result.markedCount,
      skippedCount: result.skippedCount,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not mark attendance.",
    };
  }
}
