export function normalizeScheduleTime(value: string) {
  const trimmed = value.trim();
  if (trimmed.length >= 8) {
    return trimmed.slice(0, 8);
  }
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

export function normalizeSubjectKey(value: string) {
  return value.trim().toLowerCase();
}

export type CalendarSlotMatchInput = {
  isRecurring: boolean;
  dayOfWeek: number | null;
  scheduleDate: string;
  startTime: string;
};

export type CalendarSlotRow = {
  class_id: number;
  student_id: number | null;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  subject: string;
  lesson_type: string | null;
};

function lessonTypeKey(value: string | null | undefined) {
  const key = value?.trim().toLowerCase() ?? "";
  return key || "private";
}

/** True when both rows are the same weekday/date and start time. */
export function slotMatchesOccurrence(
  slot: CalendarSlotRow,
  target: CalendarSlotMatchInput,
) {
  if (
    normalizeScheduleTime(slot.schedule_start_time) !==
    normalizeScheduleTime(target.startTime)
  ) {
    return false;
  }

  if (target.isRecurring) {
    return slot.is_recurring && slot.schedule_day_of_week === target.dayOfWeek;
  }

  const slotDate = slot.schedule_date?.slice(0, 10) ?? null;
  return !slot.is_recurring && slotDate === target.scheduleDate;
}

function isGroupLikeSlot(slot: CalendarSlotRow) {
  return lessonTypeKey(slot.lesson_type) === "group" || slot.student_id == null;
}

/**
 * Find a calendar slot the new student should join instead of creating
 * another overlapping column.
 *
 * Prefers a group/shared slot for the same instrument. When `classId` is
 * set, only that class is considered.
 */
export function findExistingSlotToJoin(
  slots: CalendarSlotRow[],
  target: CalendarSlotMatchInput & {
    subject: string;
    classId?: number | null;
  },
): CalendarSlotRow | undefined {
  const matchingTime = slots.filter((slot) =>
    slotMatchesOccurrence(slot, target),
  );

  if (target.classId) {
    return matchingTime.find((slot) => slot.class_id === target.classId);
  }

  const subjectKey = normalizeSubjectKey(target.subject);
  if (!subjectKey) {
    return undefined;
  }

  const sameSubject = matchingTime.filter(
    (slot) => normalizeSubjectKey(slot.subject) === subjectKey,
  );
  if (sameSubject.length === 0) {
    return undefined;
  }

  return sameSubject.find(isGroupLikeSlot) ?? sameSubject[0];
}

export function slotShowsFullRoster(slot: CalendarSlotRow) {
  return isGroupLikeSlot(slot);
}
