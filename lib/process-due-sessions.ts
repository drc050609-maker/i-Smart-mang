import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPastScheduleOccurrences,
  SESSION_LOOKBACK_DAYS,
  type ScheduleForOccurrences,
} from "@/lib/class-session-credits";
import type { Database } from "@/types/database.types";

type EnrollmentRow = {
  "class id": number;
  "student id": number | null;
  is_active: boolean | null;
};

type ExistingRecordRow = {
  student_id: number;
  class_id: number;
  class_schedule_id: number | null;
  session_date: string;
};

function recordKey(
  studentId: number,
  classId: number,
  scheduleId: number | null,
  sessionDate: string,
) {
  return `${studentId}:${classId}:${scheduleId ?? "none"}:${sessionDate.slice(0, 10)}`;
}

const RPC_BATCH_SIZE = 25;

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  handler: (item: T) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await Promise.all(batch.map((item) => handler(item)));
  }
}

type PendingSession = {
  key: string;
  studentId: number;
  classId: number;
  scheduleId: number;
  sessionDate: string;
};

export async function processDueClassSessions(
  supabase: SupabaseClient<Database>,
  userId: string | null,
) {
  const now = new Date();
  const lookbackDate = new Date(now);
  lookbackDate.setDate(lookbackDate.getDate() - SESSION_LOOKBACK_DAYS);
  const lookbackIso = lookbackDate.toISOString().slice(0, 10);

  const [
    { data: schedules, error: schedulesError },
    { data: enrollments, error: enrollmentsError },
    { data: existingRecords, error: recordsError },
  ] = await Promise.all([
    supabase
      .from("class_schedules")
      .select(
        "id, class_id, is_recurring, schedule_day_of_week, schedule_date, schedule_start_time, schedule_end_time",
      )
      .not("schedule_start_time", "is", null)
      .not("schedule_end_time", "is", null),
    supabase
      .from("enrollments")
      .select('"class id", "student id", is_active')
      .eq("is_active", true)
      .not("student id", "is", null),
    supabase
      .from("class_session_records")
      .select("student_id, class_id, class_schedule_id, session_date")
      .gte("session_date", lookbackIso),
  ]);

  if (schedulesError) {
    throw new Error(schedulesError.message);
  }

  if (enrollmentsError) {
    throw new Error(enrollmentsError.message);
  }

  if (recordsError) {
    throw new Error(recordsError.message);
  }

  const studentsByClass = new Map<number, number[]>();

  for (const enrollment of (enrollments as EnrollmentRow[] | null) ?? []) {
    const classId = enrollment["class id"];
    const studentId = enrollment["student id"];

    if (studentId === null) continue;

    const existing = studentsByClass.get(classId) ?? [];
    existing.push(studentId);
    studentsByClass.set(classId, existing);
  }

  const existingKeys = new Set(
    ((existingRecords as ExistingRecordRow[] | null) ?? []).map((record) =>
      recordKey(
        record.student_id,
        record.class_id,
        record.class_schedule_id,
        record.session_date,
      ),
    ),
  );

  let processedCount = 0;
  const pendingSessions: PendingSession[] = [];

  for (const schedule of (schedules as ScheduleForOccurrences[] | null) ?? []) {
    const studentIds = studentsByClass.get(schedule.class_id) ?? [];
    if (studentIds.length === 0) continue;

    const occurrences = getPastScheduleOccurrences(schedule, now);

    for (const occurrence of occurrences) {
      for (const studentId of studentIds) {
        const key = recordKey(
          studentId,
          occurrence.classId,
          occurrence.scheduleId,
          occurrence.sessionDate,
        );

        if (existingKeys.has(key)) {
          continue;
        }

        pendingSessions.push({
          key,
          studentId,
          classId: occurrence.classId,
          scheduleId: occurrence.scheduleId,
          sessionDate: occurrence.sessionDate,
        });
      }
    }
  }

  await runInBatches(pendingSessions, RPC_BATCH_SIZE, async (session) => {
    if (existingKeys.has(session.key)) {
      return;
    }

    const { data: recordId, error } = await supabase.rpc("record_class_session", {
      p_student_id: session.studentId,
      p_class_id: session.classId,
      p_class_schedule_id: session.scheduleId,
      p_session_date: session.sessionDate,
      p_status: "used",
      p_source: "automatic",
      p_created_by: userId ?? undefined,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (recordId !== null) {
      existingKeys.add(session.key);
      processedCount += 1;
    }
  });

  return processedCount;
}
