import type { ClassScheduleFields } from "@/lib/class-schedule";
import { hasClassSchedule } from "@/lib/class-schedule";
import type { ClassTrack } from "@/lib/class-track";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import { appLanguageLocale } from "@/lib/language";

export const HOUR_HEIGHT_PX = 64;
export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;

export type ScheduleEvent = {
  scheduleId: number;
  classId: number;
  subject: string;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
  teacher_id: number | null;
  teacher_name: string | null;
  room_number: string | null;
  is_active: boolean;
  class_track: ClassTrack | string | null;
  student_ids: number[];
};

export type ScheduleException = {
  id: number;
  schedule_id: number;
  original_date: string;
  override_date: string;
  schedule_start_time: string;
  schedule_end_time: string;
  is_cancelled: boolean;
};

export type ScheduleEventInstance = ScheduleEvent & {
  instanceKey: string;
  occurrenceDate: string;
  displayDate: string;
  displayDayIndex: number;
  display_start_time: string;
  display_end_time: string;
  hasException: boolean;
};

export type ScheduleTeacher = {
  id: number;
  first_name: string;
  last_name: string | null;
  class_count: number;
};

export type ScheduleStudent = {
  id: number;
  "first name": string;
  "last name": string | null;
};

export function timeToMinutes(time: string) {
  const [hoursStr, minutesStr] = time.slice(0, 5).split(":");
  return Number(hoursStr) * 60 + Number(minutesStr);
}

export function minutesToTimeString(totalMinutes: number) {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function snapMinutes(minutes: number, snap = 15) {
  return Math.round(minutes / snap) * snap;
}

export function formatDateYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ymdToDayIndex(weekDays: Date[], ymd: string) {
  return weekDays.findIndex((day) => formatDateYMD(day) === ymd);
}

function makeScheduleEventInstance(
  event: ScheduleEvent,
  occurrenceDate: string,
  displayDate: string,
  displayDayIndex: number,
  startTime: string,
  endTime: string,
  hasException: boolean,
): ScheduleEventInstance {
  return {
    ...event,
    instanceKey: `${event.scheduleId}:${occurrenceDate}`,
    occurrenceDate,
    displayDate,
    displayDayIndex,
    display_start_time: startTime,
    display_end_time: endTime,
    hasException,
  };
}

export function buildWeekEventInstances(
  events: ScheduleEvent[],
  exceptions: ScheduleException[],
  weekDays: Date[],
): ScheduleEventInstance[] {
  const exceptionByKey = new Map(
    exceptions.map((exception) => [
      `${exception.schedule_id}:${exception.original_date}`,
      exception,
    ]),
  );
  const weekDateSet = new Set(weekDays.map(formatDateYMD));
  const instances: ScheduleEventInstance[] = [];
  const movedExceptionKeys = new Set<string>();

  for (const event of events) {
    if (event.is_recurring) {
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        if (event.schedule_day_of_week !== dayIndex) {
          continue;
        }

        const occurrenceDate = formatDateYMD(weekDays[dayIndex]!);
        const exception = exceptionByKey.get(
          `${event.scheduleId}:${occurrenceDate}`,
        );

        if (exception?.is_cancelled) {
          continue;
        }

        if (exception && exception.override_date !== occurrenceDate) {
          movedExceptionKeys.add(
            `${event.scheduleId}:${exception.original_date}:${exception.override_date}`,
          );
          continue;
        }

        instances.push(
          makeScheduleEventInstance(
            event,
            occurrenceDate,
            occurrenceDate,
            dayIndex,
            exception?.schedule_start_time ?? event.schedule_start_time,
            exception?.schedule_end_time ?? event.schedule_end_time,
            Boolean(exception),
          ),
        );
      }
    } else if (event.schedule_date && weekDateSet.has(event.schedule_date)) {
      const dayIndex = ymdToDayIndex(weekDays, event.schedule_date);
      if (dayIndex >= 0) {
        instances.push(
          makeScheduleEventInstance(
            event,
            event.schedule_date,
            event.schedule_date,
            dayIndex,
            event.schedule_start_time,
            event.schedule_end_time,
            false,
          ),
        );
      }
    }
  }

  for (const exception of exceptions) {
    if (exception.is_cancelled) {
      continue;
    }

    if (!weekDateSet.has(exception.override_date)) {
      continue;
    }

    if (exception.override_date === exception.original_date) {
      continue;
    }

    const movedKey = `${exception.schedule_id}:${exception.original_date}:${exception.override_date}`;
    if (!movedExceptionKeys.has(movedKey)) {
      continue;
    }

    const event = events.find(
      (candidate) => candidate.scheduleId === exception.schedule_id,
    );
    if (!event) {
      continue;
    }

    const dayIndex = ymdToDayIndex(weekDays, exception.override_date);
    if (dayIndex < 0) {
      continue;
    }

    instances.push(
      makeScheduleEventInstance(
        event,
        exception.original_date,
        exception.override_date,
        dayIndex,
        exception.schedule_start_time,
        exception.schedule_end_time,
        true,
      ),
    );
  }

  return instances;
}

export function startOfWeek(date: Date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function formatWeekRange(
  weekStart: Date,
  language: AppLanguage = "en",
) {
  const locale = appLanguageLocale(language);
  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.toLocaleDateString(locale, { month: "short" });
  const endMonth = weekEnd.toLocaleDateString(locale, { month: "short" });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const year = weekEnd.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

const WEEKDAY_KEYS: TranslationKey[] = [
  "enum.weekday.sunday",
  "enum.weekday.monday",
  "enum.weekday.tuesday",
  "enum.weekday.wednesday",
  "enum.weekday.thursday",
  "enum.weekday.friday",
  "enum.weekday.saturday",
];

export function formatDayHeader(
  date: Date,
  today: Date,
  language: AppLanguage = "en",
) {
  const isToday = isSameCalendarDay(date, today);
  const weekdayKey = WEEKDAY_KEYS[date.getDay()];

  return {
    weekday: weekdayKey
      ? translate(language, weekdayKey)
      : date.toLocaleDateString(appLanguageLocale(language), {
          weekday: "short",
        }),
    day: date.getDate(),
    isToday,
  };
}

export function formatHourLabel(hour: number, language: AppLanguage = "en") {
  if (language === "zh") {
    return `${hour}:00`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${period}`;
}

export function eventShowsOnDay(
  event: ScheduleEvent,
  dayIndex: number,
  weekDays: Date[],
) {
  if (event.is_recurring) {
    return event.schedule_day_of_week === dayIndex;
  }

  if (!event.schedule_date) {
    return false;
  }

  const eventDate = new Date(`${event.schedule_date}T00:00:00`);
  return isSameCalendarDay(eventDate, weekDays[dayIndex]!);
}

export function computeHourRange(
  events: Array<
    Pick<ScheduleEvent, "schedule_start_time" | "schedule_end_time">
  >,
) {
  if (events.length === 0) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  let minMinutes = Infinity;
  let maxMinutes = -Infinity;

  for (const event of events) {
    minMinutes = Math.min(minMinutes, timeToMinutes(event.schedule_start_time));
    maxMinutes = Math.max(maxMinutes, timeToMinutes(event.schedule_end_time));
  }

  const startHour = Math.max(0, Math.floor(minMinutes / 60) - 1);
  const endHour = Math.min(24, Math.ceil(maxMinutes / 60) + 1);

  return {
    startHour,
    endHour: Math.max(startHour + 2, endHour),
  };
}

export function getEventPosition(
  event: Pick<ScheduleEvent, "schedule_start_time" | "schedule_end_time">,
  startHour: number,
  hourHeight = HOUR_HEIGHT_PX,
) {
  const startMinutes = timeToMinutes(event.schedule_start_time);
  const endMinutes = timeToMinutes(event.schedule_end_time);
  const gridStartMinutes = startHour * 60;
  const top = ((startMinutes - gridStartMinutes) / 60) * hourHeight;
  const height = ((endMinutes - startMinutes) / 60) * hourHeight;

  return {
    top,
    height: Math.max(height, 28),
  };
}

export function getInstancePosition(
  instance: Pick<
    ScheduleEventInstance,
    "display_start_time" | "display_end_time"
  >,
  startHour: number,
  hourHeight = HOUR_HEIGHT_PX,
) {
  return getEventPosition(
    {
      schedule_start_time: instance.display_start_time,
      schedule_end_time: instance.display_end_time,
    },
    startHour,
    hourHeight,
  );
}

export function buildScheduleEvents(
  scheduleRows: Array<
    ClassScheduleFields & {
      id: number;
      class_id: number;
      classes: {
        id: number;
        subject: string;
        teacher_id: number | null;
        is_active: boolean;
        class_track: string | null;
        teachers: { first_name: string; last_name: string | null } | null;
        rooms: { room_number: string } | null;
      } | null;
    }
  >,
  enrollmentsByClass: Map<number, number[]>,
  formatTeacherName: (teacher: {
    first_name: string;
    last_name: string | null;
  }) => string,
): ScheduleEvent[] {
  return scheduleRows
    .filter((scheduleRow) => hasClassSchedule(scheduleRow) && scheduleRow.classes)
    .map((scheduleRow) => {
      const classRow = scheduleRow.classes!;

      return {
        scheduleId: scheduleRow.id,
        classId: classRow.id,
        subject: classRow.subject,
        is_recurring: scheduleRow.is_recurring,
        schedule_day_of_week: scheduleRow.schedule_day_of_week,
        schedule_date: scheduleRow.schedule_date,
        schedule_start_time: scheduleRow.schedule_start_time!,
        schedule_end_time: scheduleRow.schedule_end_time!,
        teacher_id: classRow.teacher_id,
        teacher_name: classRow.teachers
          ? formatTeacherName(classRow.teachers)
          : null,
        room_number: classRow.rooms?.room_number ?? null,
        is_active: classRow.is_active,
        class_track: classRow.class_track,
        student_ids: enrollmentsByClass.get(classRow.id) ?? [],
      };
    });
}

export function filterEventsByTeachers(
  events: ScheduleEvent[],
  teacherIds: number[],
) {
  if (teacherIds.length === 0) {
    return events;
  }

  const selectedIds = new Set(teacherIds);
  return events.filter(
    (event) => event.teacher_id !== null && selectedIds.has(event.teacher_id),
  );
}

export function filterEventsByStudent(
  events: ScheduleEvent[],
  studentId: number | null,
) {
  if (studentId === null) {
    return events;
  }

  return events.filter((event) => event.student_ids.includes(studentId));
}

export function countEventsByTeacher(events: ScheduleEvent[]) {
  const counts = new Map<number, number>();

  for (const event of events) {
    if (event.teacher_id === null) {
      continue;
    }

    counts.set(event.teacher_id, (counts.get(event.teacher_id) ?? 0) + 1);
  }

  return counts;
}

export type EventColorSet = {
  bg: string;
  border: string;
  text: string;
  dot: string;
};

/** Distinct palette — each teacher is assigned one color by id. */
export const TEACHER_EVENT_COLORS: EventColorSet[] = [
  {
    bg: "bg-blue-100 dark:bg-blue-950/80",
    border: "border-blue-400 dark:border-blue-500",
    text: "text-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
  },
  {
    bg: "bg-violet-100 dark:bg-violet-950/80",
    border: "border-violet-400 dark:border-violet-500",
    text: "text-violet-900 dark:text-violet-100",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-950/80",
    border: "border-rose-400 dark:border-rose-500",
    text: "text-rose-900 dark:text-rose-100",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-950/80",
    border: "border-amber-400 dark:border-amber-500",
    text: "text-amber-900 dark:text-amber-100",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-950/80",
    border: "border-emerald-400 dark:border-emerald-500",
    text: "text-emerald-900 dark:text-emerald-100",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-cyan-100 dark:bg-cyan-950/80",
    border: "border-cyan-400 dark:border-cyan-500",
    text: "text-cyan-900 dark:text-cyan-100",
    dot: "bg-cyan-500",
  },
  {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-950/80",
    border: "border-fuchsia-400 dark:border-fuchsia-500",
    text: "text-fuchsia-900 dark:text-fuchsia-100",
    dot: "bg-fuchsia-500",
  },
  {
    bg: "bg-orange-100 dark:bg-orange-950/80",
    border: "border-orange-400 dark:border-orange-500",
    text: "text-orange-900 dark:text-orange-100",
    dot: "bg-orange-500",
  },
  {
    bg: "bg-teal-100 dark:bg-teal-950/80",
    border: "border-teal-400 dark:border-teal-500",
    text: "text-teal-900 dark:text-teal-100",
    dot: "bg-teal-500",
  },
  {
    bg: "bg-indigo-100 dark:bg-indigo-950/80",
    border: "border-indigo-400 dark:border-indigo-500",
    text: "text-indigo-900 dark:text-indigo-100",
    dot: "bg-indigo-500",
  },
  {
    bg: "bg-lime-100 dark:bg-lime-950/80",
    border: "border-lime-400 dark:border-lime-500",
    text: "text-lime-900 dark:text-lime-100",
    dot: "bg-lime-500",
  },
  {
    bg: "bg-sky-100 dark:bg-sky-950/80",
    border: "border-sky-400 dark:border-sky-500",
    text: "text-sky-900 dark:text-sky-100",
    dot: "bg-sky-500",
  },
];

export const UNASSIGNED_TEACHER_COLORS: EventColorSet = {
  bg: "bg-gray-100 dark:bg-gray-800/80",
  border: "border-gray-400 dark:border-gray-500",
  text: "text-gray-900 dark:text-gray-100",
  dot: "bg-gray-500",
};

export function getTeacherEventColors(teacherId: number | null): EventColorSet {
  if (teacherId === null) {
    return UNASSIGNED_TEACHER_COLORS;
  }

  const index = Math.abs(teacherId) % TEACHER_EVENT_COLORS.length;
  return TEACHER_EVENT_COLORS[index]!;
}

export const TRACK_EVENT_COLORS: Record<string, EventColorSet> = {
  instrumental: {
    bg: "bg-blue-100 dark:bg-blue-950/80",
    border: "border-blue-400 dark:border-blue-500",
    text: "text-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
  },
  vocal: {
    bg: "bg-violet-100 dark:bg-violet-950/80",
    border: "border-violet-400 dark:border-violet-500",
    text: "text-violet-900 dark:text-violet-100",
    dot: "bg-violet-500",
  },
  composition: {
    bg: "bg-amber-100 dark:bg-amber-950/80",
    border: "border-amber-400 dark:border-amber-500",
    text: "text-amber-900 dark:text-amber-100",
    dot: "bg-amber-500",
  },
  dance: {
    bg: "bg-pink-100 dark:bg-pink-950/80",
    border: "border-pink-400 dark:border-pink-500",
    text: "text-pink-900 dark:text-pink-100",
    dot: "bg-pink-500",
  },
  music_education: {
    bg: "bg-emerald-100 dark:bg-emerald-950/80",
    border: "border-emerald-400 dark:border-emerald-500",
    text: "text-emerald-900 dark:text-emerald-100",
    dot: "bg-emerald-500",
  },
  other: {
    bg: "bg-gray-100 dark:bg-gray-800/80",
    border: "border-gray-400 dark:border-gray-500",
    text: "text-gray-900 dark:text-gray-100",
    dot: "bg-gray-500",
  },
};

export function getTrackEventColors(track: string | null) {
  return TRACK_EVENT_COLORS[track ?? "other"] ?? TRACK_EVENT_COLORS.other;
}
