import {
  formatTime12Hour,
  hasClassSchedule,
  type ClassScheduleFields,
} from "@/lib/class-schedule";
import { timeToMinutes } from "@/lib/schedule-calendar";

export type LiveClassItem = {
  classId: number;
  scheduleId: number;
  subject: string;
  teacherName: string | null;
  roomNumber: string | null;
  startTime: string;
  endTime: string;
  timeLabel: string;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isScheduledOnDay(schedule: ClassScheduleFields, now: Date) {
  if (schedule.is_recurring) {
    return schedule.schedule_day_of_week === now.getDay();
  }

  if (!schedule.schedule_date) {
    return false;
  }

  return schedule.schedule_date.slice(0, 10) === toDateKey(now);
}

export function isScheduleActiveNow(
  schedule: ClassScheduleFields,
  now: Date = new Date(),
) {
  if (!hasClassSchedule(schedule) || !isScheduledOnDay(schedule, now)) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(schedule.schedule_start_time!);
  const endMinutes = timeToMinutes(schedule.schedule_end_time!);

  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

export function isScheduleUpcomingToday(
  schedule: ClassScheduleFields,
  now: Date = new Date(),
) {
  if (!hasClassSchedule(schedule) || !isScheduledOnDay(schedule, now)) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(schedule.schedule_start_time!) > nowMinutes;
}

type ScheduleClassRow = ClassScheduleFields & {
  id: number;
  class_id: number;
  classes: {
    id: number;
    subject: string;
    is_active: boolean;
    teachers: { first_name: string; last_name: string | null } | null;
    rooms: { room_number: string } | null;
  } | null;
};

function toLiveClassItem<T extends ScheduleClassRow>(
  row: T,
  formatTeacherName: (teacher: {
    first_name: string;
    last_name: string | null;
  }) => string,
): LiveClassItem {
  const classRow = row.classes!;
  const startTime = row.schedule_start_time!;
  const endTime = row.schedule_end_time!;
  const teacher = classRow.teachers;

  return {
    classId: classRow.id,
    scheduleId: row.id,
    subject: classRow.subject,
    teacherName: teacher ? formatTeacherName(teacher) : null,
    roomNumber: classRow.rooms?.room_number ?? null,
    startTime,
    endTime,
    timeLabel: `${formatTime12Hour(startTime)} – ${formatTime12Hour(endTime)}`,
  };
}

export function buildLiveClassItems<T extends ScheduleClassRow>(
  scheduleRows: T[],
  formatTeacherName: (teacher: {
    first_name: string;
    last_name: string | null;
  }) => string,
  now: Date = new Date(),
): LiveClassItem[] {
  return scheduleRows
    .filter((row) => row.classes?.is_active && isScheduleActiveNow(row, now))
    .map((row) => toLiveClassItem(row, formatTeacherName))
    .sort((a, b) => timeToMinutes(a.endTime) - timeToMinutes(b.endTime));
}

export function buildUpcomingTodayClassItems<T extends ScheduleClassRow>(
  scheduleRows: T[],
  formatTeacherName: (teacher: {
    first_name: string;
    last_name: string | null;
  }) => string,
  now: Date = new Date(),
  limit = 8,
): LiveClassItem[] {
  return scheduleRows
    .filter((row) => row.classes?.is_active && isScheduleUpcomingToday(row, now))
    .map((row) => toLiveClassItem(row, formatTeacherName))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    .slice(0, limit);
}
