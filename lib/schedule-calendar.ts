import type { ClassScheduleFields } from "@/lib/class-schedule";
import { hasClassSchedule } from "@/lib/class-schedule";
import type { ClassTrack } from "@/lib/class-track";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import { appLanguageLocale } from "@/lib/language";
import { formatStudentName, sortStudents } from "@/lib/person-name";

export const HOUR_HEIGHT_PX = 96;
export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;
/** Schedule wall times and the current-time line use Eastern Time. */
export const SCHEDULE_TIME_ZONE = "America/New_York";

export function getEasternDateTimeParts(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SCHEDULE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((entry) => entry.type === type)?.value;
    return part == null ? Number.NaN : Number(part);
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour") % 24,
    minute: value("minute"),
  };
}

/** Calendar YMD for "today" in America/New_York. */
export function formatEasternDateYMD(date: Date = new Date()) {
  const { year, month, day } = getEasternDateTimeParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type ScheduleStudent = {
  id: number;
  "first name": string;
  "last name": string | null;
  notes?: string | null;
  dob?: string | null;
};

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
  lesson_type: string | null;
  trial_format: string | null;
  /** Student linked to this schedule slot (private lessons). Null for group/shared. */
  schedule_student_id: number | null;
  /**
   * Student ids used for filtering.
   * Slot student when set; otherwise enrolled roster (group/unassigned slots).
   */
  student_ids: number[];
  /**
   * Students shown on calendar blocks and related views.
   * Slot student when set; for group lessons, the class roster.
   */
  students: ScheduleStudent[];
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

export function isTrialLessonType(lessonType: string | null | undefined) {
  return lessonType === "trial";
}

/** Calendar label: every student name, comma-separated. */
export function formatScheduleEventStudentLabel(
  students: ScheduleStudent[],
  fallback: string,
) {
  const names = sortStudents(students).map(formatStudentName);
  if (names.length === 0) return fallback;
  return names.join(", ");
}

/**
 * Group classes with more than 3 students show the class name first on the
 * calendar; smaller groups keep student names as the title.
 */
export const LARGE_GROUP_STUDENT_THRESHOLD = 3;

export function isLargeGroupClassDisplay(
  lessonType: string | null | undefined,
  studentCount: number,
) {
  return (
    lessonType === "group" && studentCount > LARGE_GROUP_STUDENT_THRESHOLD
  );
}

/**
 * Students to display for a schedule event.
 * Prefers slot-linked students; for group/unassigned slots, the class roster
 * from `student_ids` resolved against `studentsById`.
 */
export function resolveScheduleEventStudents(
  event: Pick<
    ScheduleEvent,
    "students" | "student_ids" | "schedule_student_id"
  >,
  studentsById?: Map<number, ScheduleStudent>,
): ScheduleStudent[] {
  function withCampusNotes(student: ScheduleStudent): ScheduleStudent {
    const campus = studentsById?.get(student.id);
    if (!campus) return student;
    return {
      ...student,
      notes: campus.notes?.trim() ? campus.notes : student.notes,
      dob: student.dob ?? campus.dob ?? null,
    };
  }

  const slotStudents = sortStudents(event.students).map(withCampusNotes);
  if (slotStudents.length > 0) {
    return slotStudents;
  }

  if (event.schedule_student_id != null) {
    return [];
  }

  if (!studentsById || event.student_ids.length === 0) {
    return [];
  }

  return sortStudents(
    event.student_ids
      .map((id) => studentsById.get(id))
      .filter((student): student is ScheduleStudent => student !== undefined),
  );
}

/** Fallback title when a slot has no student: trial, group type, or subject. */
export function scheduleEventUnassignedLabel(
  lessonType: string | null | undefined,
  subjectLabel: string,
  labels: { trial: string; group: string },
) {
  if (isTrialLessonType(lessonType)) return labels.trial;
  if (lessonType === "group") return labels.group;
  return subjectLabel;
}

/** Append a short "trial" tag next to a student name for text-only surfaces. */
export function withTrialStudentLabel(
  name: string,
  lessonType: string | null | undefined,
  trialLabel: string,
) {
  if (!isTrialLessonType(lessonType)) return name;
  if (!name || name === trialLabel) return trialLabel;
  return `${name} ${trialLabel}`;
}

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

/** Convert JS `Date#getDay()` (0=Sun…6=Sat) to Monday-first column index (0=Mon…6=Sun). */
export function jsWeekdayToMondayIndex(jsWeekday: number) {
  return (jsWeekday + 6) % 7;
}

/** Convert Monday-first column index (0=Mon…6=Sun) to JS weekday (0=Sun…6=Sat). */
export function mondayIndexToJsWeekday(mondayIndex: number) {
  return (mondayIndex + 1) % 7;
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
  const eventByScheduleId = new Map(
    events.map((event) => [event.scheduleId, event]),
  );
  const weekDates = weekDays.map(formatDateYMD);
  const weekDateSet = new Set(weekDates);
  const instances: ScheduleEventInstance[] = [];
  const movedExceptionKeys = new Set<string>();

  for (const event of events) {
    if (event.is_recurring) {
      const jsWeekday = event.schedule_day_of_week;
      if (jsWeekday == null || jsWeekday < 0 || jsWeekday > 6) {
        continue;
      }

      const dayIndex = jsWeekdayToMondayIndex(jsWeekday);
      const occurrenceDate = weekDates[dayIndex]!;
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

    const event = eventByScheduleId.get(exception.schedule_id);
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

/** Bucket week instances into 7 day arrays (index = Monday–Sunday). */
export function groupInstancesByDay(
  instances: ScheduleEventInstance[],
): ScheduleEventInstance[][] {
  const byDay: ScheduleEventInstance[][] = Array.from({ length: 7 }, () => []);
  for (const instance of instances) {
    const day = byDay[instance.displayDayIndex];
    if (day) {
      day.push(instance);
    }
  }
  return byDay;
}

/** Start of the calendar week (Monday). */
export function startOfWeek(date: Date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const jsWeekday = weekStart.getDay();
  const daysSinceMonday = jsWeekdayToMondayIndex(jsWeekday);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
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

export function formatDayTitle(date: Date, language: AppLanguage = "en") {
  const locale = appLanguageLocale(language);
  return date.toLocaleDateString(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    return (
      event.schedule_day_of_week != null &&
      jsWeekdayToMondayIndex(event.schedule_day_of_week) === dayIndex
    );
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

export type ScheduleEventColumnLayout = {
  columnIndex: number;
  columnCount: number;
};

/**
 * Pack overlapping day events into cascade columns (later columns sit on top).
 */
export function layoutDayEventColumns(
  instances: Array<
    Pick<
      ScheduleEventInstance,
      "instanceKey" | "display_start_time" | "display_end_time"
    >
  >,
): Map<string, ScheduleEventColumnLayout> {
  const result = new Map<string, ScheduleEventColumnLayout>();
  if (instances.length === 0) {
    return result;
  }

  type Timed = {
    key: string;
    start: number;
    end: number;
  };

  const timed: Timed[] = instances
    .map((instance) => ({
      key: instance.instanceKey,
      start: timeToMinutes(instance.display_start_time),
      end: Math.max(
        timeToMinutes(instance.display_end_time),
        timeToMinutes(instance.display_start_time) + 1,
      ),
    }))
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.end !== b.end) return b.end - a.end;
      return a.key.localeCompare(b.key);
    });

  const clusters: Timed[][] = [];
  let currentCluster: Timed[] = [];
  let clusterEnd = -1;

  for (const item of timed) {
    if (currentCluster.length === 0 || item.start < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.end;
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const columnByKey = new Map<string, number>();

    for (const item of cluster) {
      let column = 0;
      while (column < columnEnds.length && columnEnds[column]! > item.start) {
        column += 1;
      }

      if (column === columnEnds.length) {
        columnEnds.push(item.end);
      } else {
        columnEnds[column] = item.end;
      }

      columnByKey.set(item.key, column);
    }

    const columnCount = Math.max(1, columnEnds.length);
    for (const item of cluster) {
      result.set(item.key, {
        columnIndex: columnByKey.get(item.key) ?? 0,
        columnCount,
      });
    }
  }

  return result;
}

const EVENT_EDGE_PX = 4;
const WEEK_COLUMN_GAP_PX = 2;
/** Small overlap so concurrent classes still layer without covering names. */
const DAY_COLUMN_OVERLAP_PX = 12;

/**
 * Week view: equal-width columns that fit the day.
 * Day view: separated columns with a slight cascade so names stay readable.
 */
export function getEventColumnStyle(
  layout: ScheduleEventColumnLayout,
  options: { separated?: boolean } = {},
) {
  if (layout.columnCount <= 1) {
    return {
      left: `${EVENT_EDGE_PX}px`,
      width: `calc(100% - ${EVENT_EDGE_PX * 2}px)`,
      zIndex: 10,
    };
  }

  const slotPercent = 100 / layout.columnCount;
  const leftPercent = slotPercent * layout.columnIndex;

  if (!options.separated) {
    return {
      left: `calc(${leftPercent}% + ${EVENT_EDGE_PX / 2}px)`,
      width: `calc(${slotPercent}% - ${EVENT_EDGE_PX}px - ${WEEK_COLUMN_GAP_PX}px)`,
      zIndex: 10,
    };
  }

  const isLast = layout.columnIndex === layout.columnCount - 1;
  return {
    left: `calc(${leftPercent}% + ${EVENT_EDGE_PX / 2}px)`,
    width: isLast
      ? `calc(${slotPercent}% - ${EVENT_EDGE_PX}px)`
      : `calc(${slotPercent}% - ${EVENT_EDGE_PX}px + ${DAY_COLUMN_OVERLAP_PX}px)`,
    zIndex: 10 + layout.columnIndex,
  };
}

/** Minimum width (px) for one event column so first/last name can stack. */
export const MIN_EVENT_COLUMN_WIDTH_PX = 128;

/** Floor width for a day column even with a single event. */
export const MIN_DAY_COLUMN_WIDTH_PX = 180;

export function maxLayoutColumnCount(
  layouts: Map<string, ScheduleEventColumnLayout>,
) {
  let max = 1;
  for (const layout of layouts.values()) {
    max = Math.max(max, layout.columnCount);
  }
  return max;
}

export function dayColumnWidthPx(maxConcurrentColumns: number) {
  return Math.max(
    MIN_DAY_COLUMN_WIDTH_PX,
    maxConcurrentColumns * MIN_EVENT_COLUMN_WIDTH_PX,
  );
}

export function buildScheduleEvents(
  scheduleRows: Array<
    ClassScheduleFields & {
      id: number;
      class_id: number;
      student_id?: number | null;
      schedule_student?: ScheduleStudent | null;
      classes: {
        id: number;
        subject: string;
        teacher_id: number | null;
        is_active: boolean;
        class_track: string | null;
        lesson_type?: string | null;
        trial_format?: string | null;
        teachers: { first_name: string; last_name: string | null; is_active?: boolean | null } | null;
        rooms: { room_number: string } | null;
      } | null;
    }
  >,
  enrollmentsByClass: Map<number, ScheduleStudent[]>,
  formatTeacherName: (teacher: {
    first_name: string;
    last_name: string | null;
  }) => string,
): ScheduleEvent[] {
  return scheduleRows
    .filter((scheduleRow) => hasClassSchedule(scheduleRow) && scheduleRow.classes)
    .map((scheduleRow) => {
      const classRow = scheduleRow.classes!;
      const enrolled = sortStudents(enrollmentsByClass.get(classRow.id) ?? []);
      const scheduleStudentId = scheduleRow.student_id ?? null;

      let students: ScheduleStudent[] = [];
      if (classRow.lesson_type === "group" && enrolled.length > 0) {
        students = enrolled;
      } else if (scheduleStudentId != null) {
        const fromEmbed = scheduleRow.schedule_student;
        if (fromEmbed && fromEmbed.id === scheduleStudentId) {
          students = [fromEmbed];
        } else {
          const fromRoster = enrolled.find(
            (student) => student.id === scheduleStudentId,
          );
          if (fromRoster) {
            students = [fromRoster];
          }
        }
      }

      const activeTeacher =
        classRow.teachers && classRow.teachers.is_active !== false
          ? classRow.teachers
          : null;

      return {
        scheduleId: scheduleRow.id,
        classId: classRow.id,
        subject: classRow.subject,
        is_recurring: scheduleRow.is_recurring,
        schedule_day_of_week: scheduleRow.schedule_day_of_week,
        schedule_date: scheduleRow.schedule_date,
        schedule_start_time: scheduleRow.schedule_start_time!,
        schedule_end_time: scheduleRow.schedule_end_time!,
        // Keep DB assignment when the teacher is inactive, but treat the slot
        // as unassigned in the calendar until they are reactivated.
        teacher_id: activeTeacher ? classRow.teacher_id : null,
        teacher_name: activeTeacher
          ? formatTeacherName(activeTeacher)
          : null,
        room_number: classRow.rooms?.room_number ?? null,
        is_active: classRow.is_active,
        class_track: classRow.class_track,
        lesson_type: classRow.lesson_type ?? null,
        trial_format: classRow.trial_format ?? null,
        schedule_student_id: scheduleStudentId,
        student_ids:
          (classRow.lesson_type === "group" && enrolled.length > 0) ||
          scheduleStudentId == null
            ? enrolled.map((student) => student.id)
            : [scheduleStudentId],
        students,
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
  {
    bg: "bg-pink-100 dark:bg-pink-950/80",
    border: "border-pink-400 dark:border-pink-500",
    text: "text-pink-900 dark:text-pink-100",
    dot: "bg-pink-500",
  },
  {
    bg: "bg-yellow-100 dark:bg-yellow-950/80",
    border: "border-yellow-400 dark:border-yellow-500",
    text: "text-yellow-900 dark:text-yellow-100",
    dot: "bg-yellow-500",
  },
  {
    bg: "bg-red-100 dark:bg-red-950/80",
    border: "border-red-400 dark:border-red-500",
    text: "text-red-900 dark:text-red-100",
    dot: "bg-red-500",
  },
  {
    bg: "bg-green-100 dark:bg-green-950/80",
    border: "border-green-400 dark:border-green-500",
    text: "text-green-900 dark:text-green-100",
    dot: "bg-green-500",
  },
  {
    bg: "bg-purple-100 dark:bg-purple-950/80",
    border: "border-purple-400 dark:border-purple-500",
    text: "text-purple-900 dark:text-purple-100",
    dot: "bg-purple-500",
  },
  {
    bg: "bg-stone-200 dark:bg-stone-800/80",
    border: "border-stone-400 dark:border-stone-500",
    text: "text-stone-900 dark:text-stone-100",
    dot: "bg-stone-500",
  },
  {
    bg: "bg-blue-200 dark:bg-blue-900/70",
    border: "border-blue-600 dark:border-blue-400",
    text: "text-blue-950 dark:text-blue-50",
    dot: "bg-blue-700",
  },
  {
    bg: "bg-rose-200 dark:bg-rose-900/70",
    border: "border-rose-600 dark:border-rose-400",
    text: "text-rose-950 dark:text-rose-50",
    dot: "bg-rose-700",
  },
  {
    bg: "bg-emerald-200 dark:bg-emerald-900/70",
    border: "border-emerald-600 dark:border-emerald-400",
    text: "text-emerald-950 dark:text-emerald-50",
    dot: "bg-emerald-700",
  },
  {
    bg: "bg-violet-200 dark:bg-violet-900/70",
    border: "border-violet-600 dark:border-violet-400",
    text: "text-violet-950 dark:text-violet-50",
    dot: "bg-violet-700",
  },
  {
    bg: "bg-orange-200 dark:bg-orange-900/70",
    border: "border-orange-600 dark:border-orange-400",
    text: "text-orange-950 dark:text-orange-50",
    dot: "bg-orange-700",
  },
  {
    bg: "bg-cyan-200 dark:bg-cyan-900/70",
    border: "border-cyan-600 dark:border-cyan-400",
    text: "text-cyan-950 dark:text-cyan-50",
    dot: "bg-cyan-700",
  },
  {
    bg: "bg-pink-200 dark:bg-pink-900/70",
    border: "border-pink-600 dark:border-pink-400",
    text: "text-pink-950 dark:text-pink-50",
    dot: "bg-pink-700",
  },
  {
    bg: "bg-amber-200 dark:bg-amber-900/70",
    border: "border-amber-600 dark:border-amber-400",
    text: "text-amber-950 dark:text-amber-50",
    dot: "bg-amber-700",
  },
  {
    bg: "bg-teal-200 dark:bg-teal-900/70",
    border: "border-teal-600 dark:border-teal-400",
    text: "text-teal-950 dark:text-teal-50",
    dot: "bg-teal-700",
  },
  {
    bg: "bg-indigo-200 dark:bg-indigo-900/70",
    border: "border-indigo-600 dark:border-indigo-400",
    text: "text-indigo-950 dark:text-indigo-50",
    dot: "bg-indigo-700",
  },
  {
    bg: "bg-lime-200 dark:bg-lime-900/70",
    border: "border-lime-600 dark:border-lime-400",
    text: "text-lime-950 dark:text-lime-50",
    dot: "bg-lime-700",
  },
  {
    bg: "bg-sky-200 dark:bg-sky-900/70",
    border: "border-sky-600 dark:border-sky-400",
    text: "text-sky-950 dark:text-sky-50",
    dot: "bg-sky-700",
  },
  {
    bg: "bg-fuchsia-200 dark:bg-fuchsia-900/70",
    border: "border-fuchsia-600 dark:border-fuchsia-400",
    text: "text-fuchsia-950 dark:text-fuchsia-50",
    dot: "bg-fuchsia-700",
  },
  {
    bg: "bg-red-200 dark:bg-red-900/70",
    border: "border-red-600 dark:border-red-400",
    text: "text-red-950 dark:text-red-50",
    dot: "bg-red-700",
  },
  {
    bg: "bg-green-200 dark:bg-green-900/70",
    border: "border-green-600 dark:border-green-400",
    text: "text-green-950 dark:text-green-50",
    dot: "bg-green-700",
  },
  {
    bg: "bg-purple-200 dark:bg-purple-900/70",
    border: "border-purple-600 dark:border-purple-400",
    text: "text-purple-950 dark:text-purple-50",
    dot: "bg-purple-700",
  },
  {
    bg: "bg-yellow-200 dark:bg-yellow-900/70",
    border: "border-yellow-600 dark:border-yellow-400",
    text: "text-yellow-950 dark:text-yellow-50",
    dot: "bg-yellow-600",
  },
];

export const UNASSIGNED_TEACHER_COLORS: EventColorSet = {
  bg: "bg-gray-100 dark:bg-gray-800/80",
  border: "border-gray-400 dark:border-gray-500",
  text: "text-gray-900 dark:text-gray-100",
  dot: "bg-gray-500",
};

/** Assign unique palette slots per campus teacher list (stable by id). */
export function buildTeacherEventColorLookup(
  teacherIds: Iterable<number | null | undefined>,
): Map<number, EventColorSet> {
  const uniqueSorted = [
    ...new Set(
      [...teacherIds].filter(
        (id): id is number => typeof id === "number" && Number.isInteger(id),
      ),
    ),
  ].sort((a, b) => a - b);

  const lookup = new Map<number, EventColorSet>();
  uniqueSorted.forEach((teacherId, index) => {
    lookup.set(
      teacherId,
      TEACHER_EVENT_COLORS[index % TEACHER_EVENT_COLORS.length]!,
    );
  });
  return lookup;
}

export function getTeacherEventColors(
  teacherId: number | null,
  colorByTeacherId?: Map<number, EventColorSet>,
): EventColorSet {
  if (teacherId === null) {
    return UNASSIGNED_TEACHER_COLORS;
  }

  const fromLookup = colorByTeacherId?.get(teacherId);
  if (fromLookup) {
    return fromLookup;
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
