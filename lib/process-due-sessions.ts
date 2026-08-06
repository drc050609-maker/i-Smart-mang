import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPastScheduleOccurrences,
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
const IN_FILTER_CHUNK = 200;
/** Keep background catch-up small so navigations stay responsive. */
const MAX_SESSIONS_PER_RUN = 75;
/** Only backfill recent sessions in the dashboard background job. */
const AUTO_PROCESS_LOOKBACK_DAYS = 14;
/** Skip re-running if we already ran recently in this server instance. */
const THROTTLE_MS = 15 * 60 * 1000;

let lastProcessAttemptAt = 0;

async function fetchInChunks<T>(
  ids: number[],
  fetchChunk: (
    chunk: number[],
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += IN_FILTER_CHUNK) {
    const chunk = ids.slice(index, index + IN_FILTER_CHUNK);
    const { data, error } = await fetchChunk(chunk);
    if (error) {
      return { data: rows, error: error.message };
    }
    rows.push(...(data ?? []));
  }
  return { data: rows, error: null };
}

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

export async function processDueClassSessionsIfNeeded(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  locationId?: number | null,
) {
  const now = Date.now();
  if (now - lastProcessAttemptAt < THROTTLE_MS) {
    return 0;
  }
  lastProcessAttemptAt = now;

  // Brooklyn was reset to a clean credit/history slate — do not backfill past
  // sessions (which would re-inflate used credits / classes taken).
  let lookbackDays = AUTO_PROCESS_LOOKBACK_DAYS;
  if (locationId != null) {
    const { data: campus } = await supabase
      .from("locations")
      .select("slug")
      .eq("id", locationId)
      .maybeSingle();
    if (campus?.slug === "brooklyn") {
      lookbackDays = 0;
    }
  }

  return processDueClassSessions(supabase, userId, {
    locationId: locationId ?? null,
    lookbackDays,
    maxSessions: MAX_SESSIONS_PER_RUN,
  });
}

export async function processDueClassSessions(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  options?: {
    locationId?: number | null;
    lookbackDays?: number;
    maxSessions?: number;
  },
) {
  const now = new Date();
  const lookbackDays = options?.lookbackDays ?? AUTO_PROCESS_LOOKBACK_DAYS;
  const maxSessions = options?.maxSessions ?? MAX_SESSIONS_PER_RUN;
  const locationId = options?.locationId ?? null;
  const lookbackDate = new Date(now);
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
  const lookbackIso = lookbackDate.toISOString().slice(0, 10);

  let campusClassIds: number[] | null = null;
  if (locationId != null) {
    const { data: campusClasses, error: campusClassesError } = await supabase
      .from("classes")
      .select("id")
      .eq("location_id", locationId);

    if (campusClassesError) {
      throw new Error(campusClassesError.message);
    }

    campusClassIds = (campusClasses ?? []).map((row) => row.id);
    if (campusClassIds.length === 0) {
      return 0;
    }
  }

  let schedules: ScheduleForOccurrences[] = [];
  let enrollments: EnrollmentRow[] = [];

  if (campusClassIds != null) {
    const [schedulesResult, enrollmentsResult] = await Promise.all([
      fetchInChunks<ScheduleForOccurrences>(campusClassIds, (chunk) =>
        supabase
          .from("class_schedules")
          .select(
            "id, class_id, is_recurring, schedule_day_of_week, schedule_date, schedule_start_time, schedule_end_time",
          )
          .not("schedule_start_time", "is", null)
          .not("schedule_end_time", "is", null)
          .in("class_id", chunk),
      ),
      fetchInChunks<EnrollmentRow>(campusClassIds, (chunk) =>
        supabase
          .from("enrollments")
          .select('"class id", "student id", is_active')
          .eq("is_active", true)
          .not("student id", "is", null)
          .in("class id", chunk),
      ),
    ]);

    if (schedulesResult.error) {
      throw new Error(schedulesResult.error);
    }
    if (enrollmentsResult.error) {
      throw new Error(enrollmentsResult.error);
    }

    schedules = schedulesResult.data;
    enrollments = enrollmentsResult.data;
  } else {
    const [
      { data: allSchedules, error: schedulesError },
      { data: allEnrollments, error: enrollmentsError },
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
    ]);

    if (schedulesError) {
      throw new Error(schedulesError.message);
    }
    if (enrollmentsError) {
      throw new Error(enrollmentsError.message);
    }

    schedules = (allSchedules as ScheduleForOccurrences[] | null) ?? [];
    enrollments = (allEnrollments as EnrollmentRow[] | null) ?? [];
  }

  const { data: existingRecords, error: recordsError } = await supabase
    .from("class_session_records")
    .select("student_id, class_id, class_schedule_id, session_date")
    .gte("session_date", lookbackIso);

  if (recordsError) {
    throw new Error(recordsError.message);
  }

  const studentsByClass = new Map<number, number[]>();

  for (const enrollment of enrollments) {
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

  for (const schedule of schedules) {
    if (pendingSessions.length >= maxSessions) {
      break;
    }

    const studentIds = studentsByClass.get(schedule.class_id) ?? [];
    if (studentIds.length === 0) continue;

    const occurrences = getPastScheduleOccurrences(
      schedule,
      now,
      lookbackDays,
    );

    for (const occurrence of occurrences) {
      if (pendingSessions.length >= maxSessions) {
        break;
      }

      for (const studentId of studentIds) {
        if (pendingSessions.length >= maxSessions) {
          break;
        }

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
