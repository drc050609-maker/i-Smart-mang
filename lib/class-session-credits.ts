import type { ClassScheduleFields } from "@/lib/class-schedule";

export const SESSION_LOOKBACK_DAYS = 90;
export const DEFAULT_STARTING_CLASS_CREDITS = 10;

export function parseStartingClassCredits(value: FormDataEntryValue | null) {
  const raw = value?.toString().trim();
  if (!raw) {
    return DEFAULT_STARTING_CLASS_CREDITS;
  }

  const count = Number(raw);
  if (!Number.isInteger(count) || count < 0 || count > 500) {
    return null;
  }

  return count;
}

export type SessionRecordStatus = "used" | "absent";
export type SessionRecordSource = "automatic" | "manual";

export type StudentClassBalance = {
  student_id: number;
  class_id: number;
  sessions_total: number;
  sessions_remaining: number;
  sessions_used: number;
  absence_count: number;
};

export type SessionOccurrence = {
  scheduleId: number;
  classId: number;
  sessionDate: string;
  endAt: Date;
};

export type ScheduleForOccurrences = ClassScheduleFields & {
  id: number;
  class_id: number;
};

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatSessionDate(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function combineDateAndTime(date: Date, time: string) {
  const [hoursStr, minutesStr] = time.slice(0, 5).split(":");
  const combined = new Date(date);
  combined.setHours(Number(hoursStr), Number(minutesStr), 0, 0);
  return combined;
}

export function sessionOccurrenceKey(
  studentId: number,
  classId: number,
  scheduleId: number | null,
  sessionDate: string,
) {
  return `${studentId}:${classId}:${scheduleId ?? "none"}:${sessionDate}`;
}

export function getPastScheduleOccurrences(
  schedule: ScheduleForOccurrences,
  now: Date,
  lookbackDays = SESSION_LOOKBACK_DAYS,
): SessionOccurrence[] {
  if (!schedule.schedule_start_time || !schedule.schedule_end_time) {
    return [];
  }

  const lookbackStart = new Date(now);
  lookbackStart.setHours(0, 0, 0, 0);
  lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);

  const occurrences: SessionOccurrence[] = [];

  if (schedule.is_recurring && schedule.schedule_day_of_week !== null) {
    const cursor = new Date(lookbackStart);

    while (cursor <= now) {
      if (cursor.getDay() === schedule.schedule_day_of_week) {
        const endAt = combineDateAndTime(cursor, schedule.schedule_end_time);

        if (endAt < now) {
          occurrences.push({
            scheduleId: schedule.id,
            classId: schedule.class_id,
            sessionDate: formatSessionDate(cursor),
            endAt,
          });
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return occurrences;
  }

  if (!schedule.is_recurring && schedule.schedule_date) {
    const sessionDay = new Date(`${schedule.schedule_date}T00:00:00`);
    const endAt = combineDateAndTime(sessionDay, schedule.schedule_end_time);

    if (endAt >= lookbackStart && endAt < now) {
      occurrences.push({
        scheduleId: schedule.id,
        classId: schedule.class_id,
        sessionDate: schedule.schedule_date.slice(0, 10),
        endAt,
      });
    }
  }

  return occurrences;
}

export function emptyBalance(
  studentId: number,
  classId: number,
): StudentClassBalance {
  return {
    student_id: studentId,
    class_id: classId,
    sessions_total: 0,
    sessions_remaining: 0,
    sessions_used: 0,
    absence_count: 0,
  };
}

export function balanceMapKey(studentId: number, classId: number) {
  return `${studentId}:${classId}`;
}

/** Active enrollments where every enrolled class has zero sessions remaining. */
export function studentsOutOfClassCredits(
  enrollments: Array<{
    studentId: number;
    classId: number;
    enrollmentActive: boolean;
    classActive: boolean;
  }>,
  balances: StudentClassBalance[],
): Set<number> {
  const balanceByKey = new Map(
    balances.map((balance) => [
      balanceMapKey(balance.student_id, balance.class_id),
      balance.sessions_remaining,
    ]),
  );

  const enrollmentsByStudent = new Map<
    number,
    Array<{ classId: number; enrollmentActive: boolean; classActive: boolean }>
  >();

  for (const enrollment of enrollments) {
    const existing = enrollmentsByStudent.get(enrollment.studentId) ?? [];
    existing.push({
      classId: enrollment.classId,
      enrollmentActive: enrollment.enrollmentActive,
      classActive: enrollment.classActive,
    });
    enrollmentsByStudent.set(enrollment.studentId, existing);
  }

  const outOfCredits = new Set<number>();

  for (const [studentId, studentEnrollments] of enrollmentsByStudent) {
    const activeEnrollments = studentEnrollments.filter(
      (enrollment) => enrollment.enrollmentActive && enrollment.classActive,
    );

    if (activeEnrollments.length === 0) {
      continue;
    }

    const allDepleted = activeEnrollments.every((enrollment) => {
      const remaining =
        balanceByKey.get(balanceMapKey(studentId, enrollment.classId)) ?? 0;
      return remaining <= 0;
    });

    if (allDepleted) {
      outOfCredits.add(studentId);
    }
  }

  return outOfCredits;
}

export function findTodayScheduleId(
  schedules: ScheduleForOccurrences[],
  classId: number,
  today = formatSessionDate(new Date()),
) {
  const todayDate = new Date(`${today}T00:00:00`);
  const dayOfWeek = todayDate.getDay();

  for (const schedule of schedules) {
    if (schedule.class_id !== classId) continue;
    if (!schedule.schedule_start_time || !schedule.schedule_end_time) continue;

    if (schedule.is_recurring && schedule.schedule_day_of_week === dayOfWeek) {
      return schedule.id;
    }

    if (
      !schedule.is_recurring &&
      schedule.schedule_date?.slice(0, 10) === today
    ) {
      return schedule.id;
    }
  }

  return null;
}

export type StudentClassCreditRow = {
  classId: number;
  subject: string;
  scheduleId: number | null;
  balance: StudentClassBalance;
};

export function buildStudentClassCreditRows(
  enrollments: Array<{ classId: number; subject: string }>,
  balances: StudentClassBalance[],
  scheduleIdByClass: Map<number, number | null>,
  studentId: number,
): StudentClassCreditRow[] {
  const balanceByClass = new Map(
    balances.map((balance) => [balance.class_id, balance]),
  );

  return enrollments.map((enrollment) => ({
    classId: enrollment.classId,
    subject: enrollment.subject,
    scheduleId: scheduleIdByClass.get(enrollment.classId) ?? null,
    balance:
      balanceByClass.get(enrollment.classId) ??
      emptyBalance(studentId, enrollment.classId),
  }));
}
