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
  student_id?: number | null;
};

export function hasClassSchedule(schedule: ClassScheduleFields) {
  return Boolean(schedule.schedule_start_time && schedule.schedule_end_time);
}

export function toTimeInputValue(time: string | null) {
  if (!time) return "";
  return time.slice(0, 5);
}

function formatHms(hours: number, minutes: number, seconds: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Parse typed 12-hour (3:30 PM) or 24-hour (15:30) times to HH:MM:SS. */
export function parseTypedTime(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) {
    return null;
  }

  const ampmMatch =
    /^(\d{1,2})(?::(\d{2})(?::(\d{2}))?)?\s*(a\.?m\.?|p\.?m\.?)$/i.exec(
      compact,
    );
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2] ?? "0");
    const seconds = Number(ampmMatch[3] ?? "0");
    const period = ampmMatch[4]!.replace(/\./g, "").toLowerCase();
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds) ||
      hours < 0 ||
      hours > 12 ||
      minutes > 59 ||
      seconds > 59
    ) {
      return null;
    }
    if (hours === 0 && period === "pm") {
      return null;
    }
    if (period === "am") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
    return formatHms(hours, minutes, seconds);
  }

  const h24Match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(compact);
  if (!h24Match) {
    return null;
  }

  const hours = Number(h24Match[1]);
  const minutes = Number(h24Match[2]);
  const seconds = Number(h24Match[3] ?? "0");
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  return formatHms(hours, minutes, seconds);
}

/** Friendly 12-hour display for a stored or typed time, or empty if unparsed. */
export function formatTimeInputDisplay(time: string | null | undefined) {
  const parsed = parseTypedTime(time);
  if (!parsed) {
    return "";
  }
  return formatTime12Hour(parsed);
}

export function toDateInputValue(date: string | null) {
  if (!date) return "";
  return date.slice(0, 10);
}

export function addMinutesToTimeInput(
  startTimeInput: string,
  durationMinutes: number,
): string | null {
  const parsed = parseTypedTime(startTimeInput);
  if (!parsed || !Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  const hours = Number(parsed.slice(0, 2));
  const minutes = Number(parsed.slice(3, 5));
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
  const result = addMinutesToTimeInput(startTime, durationMinutes);
  return result ? `${result}:00` : null;
}

function timeToMinutes(time: string) {
  const [hoursStr, minutesStr] = time.slice(0, 5).split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

export function minutesBetweenScheduleTimes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
) {
  if (!startTime || !endTime) {
    return null;
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start == null || end == null || end <= start) {
    return null;
  }

  return end - start;
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
