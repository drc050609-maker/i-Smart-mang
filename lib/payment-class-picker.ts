import { classSubjectKey } from "@/lib/class-list";
import {
  formatClassSchedule,
  hasClassSchedule,
  sortClassSchedules,
  type ClassScheduleFields,
} from "@/lib/class-schedule";
import { groupByClassSubject } from "@/lib/class-subject";
import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import {
  formatTeacherName,
  type TeacherNameFields,
} from "@/lib/person-name";

export const PAYMENT_CLASS_TYPES = ["trial", "private", "group"] as const;

export type PaymentClassType = (typeof PAYMENT_CLASS_TYPES)[number];

export type PaymentClassSchedule = ClassScheduleFields & {
  id?: number;
};

export type PaymentPickerClass = {
  id: number;
  subject: string;
  lesson_type: string | null;
  teacher: TeacherNameFields | null;
  schedules: PaymentClassSchedule[];
};

export type PaymentClassPickerValue = {
  subject: string;
  lessonType: PaymentClassType | "";
  timeKey: string;
};

export type PaymentClassTimeOption = {
  key: string;
  classId: number;
  label: string;
};

const PAYMENT_CLASS_TYPE_KEYS = {
  trial: "enum.paymentClassType.trial",
  private: "enum.paymentClassType.private",
  group: "enum.paymentClassType.group",
} as const;

export function asPaymentLessonType(
  value: string | null | undefined,
): PaymentClassType | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "trial" || normalized === "private" || normalized === "group") {
    return normalized;
  }
  return null;
}

export function formatPaymentClassType(
  lessonType: PaymentClassType,
  language: AppLanguage = "en",
) {
  return translate(language, PAYMENT_CLASS_TYPE_KEYS[lessonType]);
}

export function paymentClassSubjects(classes: PaymentPickerClass[]) {
  return groupByClassSubject(classes).map((group) => group.subject);
}

export function classesForPaymentSubject<T extends PaymentPickerClass>(
  classes: T[],
  subject: string,
) {
  const key = classSubjectKey(subject);
  if (!key) return [];
  return classes.filter((classRow) => classSubjectKey(classRow.subject) === key);
}

export function paymentClassTypesForSubject(
  classes: PaymentPickerClass[],
  subject: string,
): PaymentClassType[] {
  const found = new Set<PaymentClassType>();
  for (const classRow of classesForPaymentSubject(classes, subject)) {
    const lessonType = asPaymentLessonType(classRow.lesson_type);
    if (lessonType) {
      found.add(lessonType);
    }
  }
  return PAYMENT_CLASS_TYPES.filter((lessonType) => found.has(lessonType));
}

export function classesForPaymentSubjectAndType<T extends PaymentPickerClass>(
  classes: T[],
  subject: string,
  lessonType: PaymentClassType,
) {
  return classesForPaymentSubject(classes, subject).filter(
    (classRow) => asPaymentLessonType(classRow.lesson_type) === lessonType,
  );
}

function scheduleFingerprint(schedule: PaymentClassSchedule) {
  if (schedule.id != null) {
    return `id:${schedule.id}`;
  }

  return [
    schedule.is_recurring ? "r" : "o",
    schedule.schedule_day_of_week ?? "",
    schedule.schedule_date ?? "",
    schedule.schedule_start_time ?? "",
    schedule.schedule_end_time ?? "",
  ].join("|");
}

export function paymentClassTimeKey(
  classId: number,
  schedule: PaymentClassSchedule | null,
) {
  return `${classId}::${schedule ? scheduleFingerprint(schedule) : "none"}`;
}

export function classIdFromPaymentTimeKey(timeKey: string) {
  const classId = Number(timeKey.split("::")[0]);
  if (!Number.isInteger(classId) || classId <= 0) {
    return null;
  }
  return classId;
}

function teacherLabelKey(teacher: TeacherNameFields | null) {
  if (!teacher) return "";
  return `${teacher.first_name.trim().toLowerCase()}|${(teacher.last_name ?? "").trim().toLowerCase()}`;
}

function shouldIncludeTeacherInTimeLabel(classes: PaymentPickerClass[]) {
  const teachers = new Set(
    classes.map((classRow) => teacherLabelKey(classRow.teacher)).filter(Boolean),
  );
  return teachers.size > 1;
}

function formatTimeOptionLabel(
  classRow: PaymentPickerClass,
  schedule: PaymentClassSchedule | null,
  language: AppLanguage,
  includeTeacher: boolean,
) {
  const scheduleLabel = schedule
    ? formatClassSchedule(schedule, { language })
    : null;
  const base =
    scheduleLabel ?? translate(language, "common.noScheduledTime");
  if (!includeTeacher || !classRow.teacher) {
    return base;
  }
  return `${base} · ${formatTeacherName(classRow.teacher)}`;
}

export function paymentClassTimeOptions(
  classes: PaymentPickerClass[],
  subject: string,
  lessonType: PaymentClassType,
  language: AppLanguage = "en",
): PaymentClassTimeOption[] {
  const matching = classesForPaymentSubjectAndType(
    classes,
    subject,
    lessonType,
  );
  const includeTeacher = shouldIncludeTeacherInTimeLabel(matching);
  const options: PaymentClassTimeOption[] = [];

  for (const classRow of matching) {
    const scheduled = sortClassSchedules(
      classRow.schedules.filter(hasClassSchedule),
    );
    if (scheduled.length === 0) {
      options.push({
        key: paymentClassTimeKey(classRow.id, null),
        classId: classRow.id,
        label: formatTimeOptionLabel(classRow, null, language, includeTeacher),
      });
      continue;
    }

    for (const schedule of scheduled) {
      options.push({
        key: paymentClassTimeKey(classRow.id, schedule),
        classId: classRow.id,
        label: formatTimeOptionLabel(
          classRow,
          schedule,
          language,
          includeTeacher,
        ),
      });
    }
  }

  const labelCounts = new Map<string, number>();
  for (const option of options) {
    labelCounts.set(option.label, (labelCounts.get(option.label) ?? 0) + 1);
  }

  if (
    !includeTeacher &&
    [...labelCounts.values()].some((count) => count > 1)
  ) {
    return options.map((option) => {
      if ((labelCounts.get(option.label) ?? 0) < 2) {
        return option;
      }
      const classRow = matching.find((row) => row.id === option.classId);
      if (!classRow?.teacher) {
        return option;
      }
      return {
        ...option,
        label: `${option.label} · ${formatTeacherName(classRow.teacher)}`,
      };
    });
  }

  return options;
}

export function resolvePaymentClass<T extends PaymentPickerClass>(
  classes: T[],
  timeKey: string,
): T | null {
  const classId = classIdFromPaymentTimeKey(timeKey);
  if (classId == null) return null;
  return classes.find((classRow) => classRow.id === classId) ?? null;
}

export function paymentClassPickerValueFromClass(
  classRow: PaymentPickerClass | null | undefined,
  language: AppLanguage = "en",
): PaymentClassPickerValue {
  if (!classRow) {
    return { subject: "", lessonType: "", timeKey: "" };
  }

  const lessonType = asPaymentLessonType(classRow.lesson_type) ?? "";
  const timeOptions =
    lessonType === ""
      ? []
      : paymentClassTimeOptions(
          [classRow],
          classRow.subject,
          lessonType,
          language,
        );

  return {
    subject: classRow.subject,
    lessonType,
    timeKey: timeOptions[0]?.key ?? paymentClassTimeKey(classRow.id, null),
  };
}
