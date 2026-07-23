import {
  formatClassSchedules,
  type ClassScheduleFields,
} from "@/lib/class-schedule";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import { classSubjectSearchText, formatClassSubject } from "@/lib/class-subject";
import { formatClassTrack, type ClassTrack } from "@/lib/class-track";
import {
  compareTeacherNames,
  formatTeacherName,
  type TeacherNameFields,
} from "@/lib/person-name";
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

export function classSubjectKey(subject: string) {
  return subject.trim().toLowerCase();
}

export function sortClassesBySubject<T extends { subject: string }>(classes: T[]) {
  return [...classes].sort((a, b) =>
    a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }),
  );
}

export type SubjectClassGroup = {
  subjectKey: string;
  /** Canonical subject label from the first class in the group. */
  subject: string;
  classes: ClassSearchRow[];
  /** Distinct durations, ascending. */
  durations: number[];
  /** Distinct teachers, sorted by name. */
  teachers: TeacherNameFields[];
};

function teacherIdentityKey(teacher: TeacherNameFields) {
  return `${teacher.first_name.trim().toLowerCase()}|${(teacher.last_name ?? "").trim().toLowerCase()}`;
}

/** Group classes by normalized subject and aggregate durations and teachers. */
export function groupClassesBySubject(
  classes: ClassSearchRow[],
): SubjectClassGroup[] {
  const groups = new Map<string, SubjectClassGroup>();

  for (const classRow of classes) {
    const key = classSubjectKey(classRow.subject);
    let group = groups.get(key);
    if (!group) {
      group = {
        subjectKey: key,
        subject: classRow.subject.trim(),
        classes: [],
        durations: [],
        teachers: [],
      };
      groups.set(key, group);
    }
    group.classes.push(classRow);
  }

  for (const group of groups.values()) {
    const durationSet = new Set<number>();
    const teacherByKey = new Map<string, TeacherNameFields>();

    for (const classRow of group.classes) {
      if (classRow.duration_minutes != null && classRow.duration_minutes > 0) {
        durationSet.add(classRow.duration_minutes);
      }
      if (classRow.teacher) {
        teacherByKey.set(teacherIdentityKey(classRow.teacher), classRow.teacher);
      }
    }

    group.durations = [...durationSet].sort((a, b) => a - b);
    group.teachers = [...teacherByKey.values()].sort(compareTeacherNames);
  }

  return [...groups.values()];
}

export type ClassPickerOption = {
  id: number;
  subject: string;
  teacher: TeacherNameFields | null;
  lesson_type?: string | null;
  room_number?: string | null;
};

export function formatClassOptionLabel(
  classRow: ClassPickerOption,
  language: AppLanguage = "en",
) {
  const parts = [formatClassSubject(classRow.subject, language)];

  if (classRow.lesson_type) {
    parts.push(
      formatLessonType(classRow.lesson_type as LessonType | null, language),
    );
  }

  if (classRow.teacher) {
    parts.push(formatTeacherName(classRow.teacher));
  }

  if (classRow.room_number) {
    parts.push(
      language === "zh"
        ? `教室 ${classRow.room_number}`
        : `Room ${classRow.room_number}`,
    );
  }

  return parts.join(" · ");
}

function classOptionSearchText(
  classRow: ClassPickerOption,
  language: AppLanguage = "en",
) {
  return [
    formatClassOptionLabel(classRow, language),
    classSubjectSearchText(classRow.subject, language),
    classRow.room_number ? `room ${classRow.room_number}` : "",
    classRow.room_number ? `教室 ${classRow.room_number}` : "",
  ]
    .join(" ")
    .toLowerCase();
}

export function filterClassOptionsByQuery(
  classes: ClassPickerOption[],
  query: string,
  language: AppLanguage = "en",
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return classes;

  return classes.filter((classRow) =>
    classOptionSearchText(classRow, language).includes(normalizedQuery),
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
