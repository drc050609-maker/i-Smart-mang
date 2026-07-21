import { formatClassSchedules, type ClassScheduleFields } from "@/lib/class-schedule";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import { classSubjectSearchText, formatClassSubject } from "@/lib/class-subject";
import { formatClassTrack, type ClassTrack } from "@/lib/class-track";
import { formatTeacherName, type TeacherNameFields } from "@/lib/person-name";
import type { AppLanguage } from "@/lib/language";

export type ClassSearchRow = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  schedules: ClassScheduleFields[];
  lesson_type: string | null;
  class_track: string | null;
  is_active: boolean;
  teacher: TeacherNameFields | null;
  room_number: string | null;
};

export function sortClassesBySubject<T extends { subject: string }>(classes: T[]) {
  return [...classes].sort((a, b) =>
    a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }),
  );
}

export type ClassPickerOption = {
  id: number;
  subject: string;
  teacher: TeacherNameFields | null;
};

export function formatClassOptionLabel(
  classRow: ClassPickerOption,
  language: AppLanguage = "en",
) {
  const subject = formatClassSubject(classRow.subject, language);

  if (!classRow.teacher) {
    return subject;
  }

  return `${subject} · ${formatTeacherName(classRow.teacher)}`;
}

export function filterClassOptionsByQuery(
  classes: ClassPickerOption[],
  query: string,
  language: AppLanguage = "en",
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return classes;

  return classes.filter((classRow) =>
    formatClassOptionLabel(classRow, language)
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function classSearchText(classRow: ClassSearchRow, language: AppLanguage = "en") {
  const schedule = formatClassSchedules(classRow.schedules, { language });

  return [
    classSubjectSearchText(classRow.subject, language),
    classRow.teacher ? formatTeacherName(classRow.teacher) : "",
    classRow.room_number ? `room ${classRow.room_number}` : "",
    formatLessonType(classRow.lesson_type as LessonType | null, language),
    formatClassTrack(classRow.class_track as ClassTrack | null, language),
    schedule ?? "",
    classRow.duration_minutes ? `${classRow.duration_minutes} min` : "",
    String(classRow.id),
  ]
    .join(" ")
    .toLowerCase();
}

export function filterClassesByQuery(
  classes: ClassSearchRow[],
  query: string,
  language: AppLanguage = "en",
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return classes;

  return classes.filter((classRow) =>
    classSearchText(classRow, language).includes(normalizedQuery),
  );
}
