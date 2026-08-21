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

export type DayPeriod = "AM" | "PM";

export type TimeSlotParts = {
  hour12: number;
  minute: number;
  period: DayPeriod;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function hours24ToParts(hours24: number, minute: number): TimeSlotParts {
  const period: DayPeriod = hours24 >= 12 ? "PM" : "AM";
  const hour12 = hours24 % 12 || 12;
  return { hour12, minute, period };
}

/** Split a 24-hour `HH:MM` / `HH:MM:SS` (or typed 12-hour) value into 12-hour parts. */
export function timeInputToParts(
  time: string | null | undefined,
): TimeSlotParts | null {
  const parsed = parseTypedTime(time);
  if (!parsed) {
    return null;
  }

  return hours24ToParts(Number(parsed.slice(0, 2)), Number(parsed.slice(3, 5)));
}

export function partsToTimeInputValue(parts: TimeSlotParts): string {
  const hour24 =
    parts.period === "AM"
      ? parts.hour12 === 12
        ? 0
        : parts.hour12
      : parts.hour12 === 12
        ? 12
        : parts.hour12 + 12;
  return `${pad2(hour24)}:${pad2(parts.minute)}`;
}

/** Current local clock time as `HH:MM`, minutes rounded to `roundTo` (default 5). */
export function currentLocalTimeInputValue(
  now = new Date(),
  roundTo = 5,
): string {
  let hours = now.getHours();
  let minutes = now.getMinutes();

  if (roundTo > 1) {
    const rounded = Math.round(minutes / roundTo) * roundTo;
    if (rounded === 60) {
      minutes = 0;
      hours = (hours + 1) % 24;
    } else {
      minutes = rounded;
    }
  }

  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function currentLocalTimeParts(
  now = new Date(),
  roundTo = 5,
): TimeSlotParts {
  return timeInputToParts(currentLocalTimeInputValue(now, roundTo))!;
}

function formatHms(hours: number, minutes: number, seconds: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isValidHms(hours: number, minutes: number, seconds: number) {
  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    Number.isInteger(seconds) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59 &&
    seconds >= 0 &&
    seconds <= 59
  );
}

function fromAmpm(
  hours: number,
  minutes: number,
  seconds: number,
  periodRaw: string,
) {
  const period = periodRaw.replace(/\./g, "").toLowerCase();
  const isPm = period.startsWith("p");
  if (
    !Number.isInteger(hours) ||
    hours < 0 ||
    !isValidHms(Math.min(hours, 23), minutes, seconds)
  ) {
    return null;
  }
  if (hours > 12) {
    if (!isPm || hours > 23) {
      return null;
    }
    return formatHms(hours, minutes, seconds);
  }
  if (hours === 0 && isPm) {
    return null;
  }
  let resolved = hours;
  if (!isPm) {
    resolved = hours === 12 ? 0 : hours;
  } else {
    resolved = hours === 12 ? 12 : hours + 12;
  }
  return formatHms(resolved, minutes, seconds);
}

/** Parse typed 12-hour (3:30 PM) or 24-hour (15:30) times to HH:MM:SS. */
export function parseTypedTime(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const compact = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\.(\d)/g, "$1:$2");
  if (!compact) {
    return null;
  }

  const periodPattern = "(a\\.?m?\\.?|p\\.?m?\\.?)";

  const ampmMatch = new RegExp(
    `^(\\d{1,2})(?::(\\d{2})(?::(\\d{2}))?)?\\s*${periodPattern}$`,
    "i",
  ).exec(compact);
  if (ampmMatch) {
    return fromAmpm(
      Number(ampmMatch[1]),
      Number(ampmMatch[2] ?? "0"),
      Number(ampmMatch[3] ?? "0"),
      ampmMatch[4]!,
    );
  }

  const compactAmpm = new RegExp(
    `^(\\d{1,2})(\\d{2})\\s*${periodPattern}$`,
    "i",
  ).exec(compact);
  if (compactAmpm) {
    return fromAmpm(
      Number(compactAmpm[1]),
      Number(compactAmpm[2]),
      0,
      compactAmpm[3]!,
    );
  }

  const h24Match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(compact);
  if (h24Match) {
    const hours = Number(h24Match[1]);
    const minutes = Number(h24Match[2]);
    const seconds = Number(h24Match[3] ?? "0");
    if (!isValidHms(hours, minutes, seconds)) {
      return null;
    }
    return formatHms(hours, minutes, seconds);
  }

  const h24Compact = /^(\d{2})(\d{2})$/.exec(compact);
  if (!h24Compact) {
    return null;
  }

  const hours = Number(h24Compact[1]);
  const minutes = Number(h24Compact[2]);
  if (!isValidHms(hours, minutes, 0)) {
    return null;
  }
  return formatHms(hours, minutes, 0);
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
