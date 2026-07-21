import { translate, type TranslationKey } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_KEYS: TranslationKey[] = [
  "enum.weekday.sunday",
  "enum.weekday.monday",
  "enum.weekday.tuesday",
  "enum.weekday.wednesday",
  "enum.weekday.thursday",
  "enum.weekday.friday",
  "enum.weekday.saturday",
];

export type ClassScheduleFields = {
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
};

export type ClassScheduleRow = ClassScheduleFields & {
  id: number;
};

export function hasClassSchedule(schedule: ClassScheduleFields) {
  return Boolean(schedule.schedule_start_time && schedule.schedule_end_time);
}

export function toTimeInputValue(time: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

export function toDateInputValue(date: string | null) {
  if (!date) return "";
  return date.slice(0, 10);
}

export function addMinutesToTimeInput(
  startTimeInput: string,
  durationMinutes: number,
): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(startTimeInput.trim());
  if (!match || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const totalMinutes = hours * 60 + minutes + durationMinutes;

  if (totalMinutes >= 24 * 60) {
    return null;
  }

  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

export function addMinutesToScheduleTime(
  startTime: string,
  durationMinutes: number,
): string | null {
  const result = addMinutesToTimeInput(startTime.slice(0, 5), durationMinutes);
  return result ? `${result}:00` : null;
}

export function formatTime12Hour(time: string) {
  const [hoursStr, minutesStr] = time.slice(0, 5).split(":");
  let hours = Number(hoursStr);
  const minutes = minutesStr;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function formatWeekday(
  dayOfWeek: number,
  language: AppLanguage = "en",
) {
  return (
    translate(language, WEEKDAY_KEYS[dayOfWeek] ?? "enum.schedule.unknownDay")
  );
}

export function formatScheduleDate(
  date: string,
  language: AppLanguage = "en",
) {
  const parsed = new Date(`${date}T00:00:00`);
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return parsed.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatClassSchedule(
  schedule: ClassScheduleFields,
  options?: { includeRecurrenceLabel?: boolean; language?: AppLanguage },
) {
  if (!hasClassSchedule(schedule)) {
    return null;
  }

  const language = options?.language ?? "en";
  const start = formatTime12Hour(schedule.schedule_start_time!);
  const end = formatTime12Hour(schedule.schedule_end_time!);
  const timeRange = `${start} – ${end}`;

  if (schedule.is_recurring && schedule.schedule_day_of_week !== null) {
    const day = formatWeekday(schedule.schedule_day_of_week, language);
    const label = options?.includeRecurrenceLabel
      ? translate(language, "enum.schedule.repeatsWeekly")
      : "";
    return `${day} ${timeRange}${label}`;
  }

  if (!schedule.is_recurring && schedule.schedule_date) {
    const label = options?.includeRecurrenceLabel
      ? translate(language, "enum.schedule.oneTime")
      : "";
    return `${formatScheduleDate(schedule.schedule_date, language)} ${timeRange}${label}`;
  }

  return timeRange;
}

export function formatClassScheduleWithSubject(
  subject: string,
  schedule: ClassScheduleFields,
  language: AppLanguage = "en",
) {
  const formatted = formatClassSchedule(schedule, { language });
  if (!formatted) return null;
  return `${subject} — ${formatted}`;
}

export function sortClassSchedules<T extends ClassScheduleFields>(schedules: T[]) {
  return [...schedules].sort((a, b) => {
    const dayA = a.is_recurring ? (a.schedule_day_of_week ?? 7) : 8;
    const dayB = b.is_recurring ? (b.schedule_day_of_week ?? 7) : 8;
    if (dayA !== dayB) {
      return dayA - dayB;
    }

    const startA = a.schedule_start_time ?? "";
    const startB = b.schedule_start_time ?? "";
    return startA.localeCompare(startB);
  });
}

export function formatClassSchedules(
  schedules: ClassScheduleFields[],
  options?: {
    includeRecurrenceLabel?: boolean;
    separator?: string;
    language?: AppLanguage;
  },
) {
  const formatted = sortClassSchedules(schedules)
    .map((schedule) => formatClassSchedule(schedule, options))
    .filter((value): value is string => Boolean(value));

  if (formatted.length === 0) {
    return null;
  }

  return formatted.join(options?.separator ?? "; ");
}
