export type ReusableClassRow = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  lesson_type: string | null;
};

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function lessonTypeKey(value: string | null | undefined) {
  const key = normalizeKey(value);
  return key || "private";
}

/**
 * Find an existing class for the same teacher + instrument (and lesson type).
 * Prefers a matching duration when one exists; otherwise reuses any class for
 * that instrument so different-length slots do not require duplicate classes.
 */
export function pickReusableClass<T extends ReusableClassRow>(
  classes: T[],
  options: {
    subject: string;
    lessonType?: string | null;
    durationMinutes?: number | null;
  },
): T | undefined {
  const subjectKey = normalizeKey(options.subject);
  if (!subjectKey) {
    return undefined;
  }

  const sameSubject = classes.filter(
    (row) => normalizeKey(row.subject) === subjectKey,
  );
  if (sameSubject.length === 0) {
    return undefined;
  }

  const requestedLessonType = options.lessonType
    ? lessonTypeKey(options.lessonType)
    : null;

  let candidates: T[];
  if (requestedLessonType) {
    candidates = sameSubject.filter(
      (row) => lessonTypeKey(row.lesson_type) === requestedLessonType,
    );
    if (candidates.length === 0) {
      return undefined;
    }
  } else {
    const privateClasses = sameSubject.filter(
      (row) => lessonTypeKey(row.lesson_type) === "private",
    );
    candidates = privateClasses.length > 0 ? privateClasses : sameSubject;
  }

  if (
    options.durationMinutes != null &&
    Number.isInteger(options.durationMinutes) &&
    options.durationMinutes > 0
  ) {
    const durationMatch = candidates.find(
      (row) => row.duration_minutes === options.durationMinutes,
    );
    if (durationMatch) {
      return durationMatch;
    }
  }

  return candidates[0];
}
