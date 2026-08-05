"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

import { fetchScheduleCalendarEventsAction } from "@/app/(dashboard)/schedule/actions";
import { useLanguage } from "@/components/language-provider";
import { formatTime12Hour } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import {
  addDays,
  buildWeekEventInstances,
  filterEventsByTeachers,
  formatDateYMD,
  formatDayTitle,
  getWeekDays,
  startOfWeek,
  timeToMinutes,
  type ScheduleEvent,
  type ScheduleEventInstance,
  type ScheduleException,
  type ScheduleStudent,
  type ScheduleTeacher,
} from "@/lib/schedule-calendar";
import {
  formatStudentName,
  formatTeacherName,
  sortStudents,
  sortTeachers,
} from "@/lib/person-name";

function parseDateYMD(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  date.setHours(0, 0, 0, 0);
  return date;
}

function resolveInstanceStudents(
  instance: ScheduleEventInstance,
  students: ScheduleStudent[],
) {
  const studentById = new Map(students.map((student) => [student.id, student]));
  const slotStudents = sortStudents(instance.students);
  if (slotStudents.length > 0) {
    return slotStudents;
  }

  if (instance.schedule_student_id != null) {
    return [];
  }

  return sortStudents(
    instance.student_ids
      .map((id) => studentById.get(id))
      .filter((student): student is ScheduleStudent => student !== undefined),
  );
}

export function ScheduleTeacherDayDialog({
  open,
  onClose,
  teachers,
  students,
  events,
  exceptions,
  initialTeacherId,
  initialDate,
  scheduleRevision = 0,
}: {
  open: boolean;
  onClose: () => void;
  teachers: ScheduleTeacher[];
  students: ScheduleStudent[];
  events: ScheduleEvent[];
  exceptions: ScheduleException[];
  initialTeacherId: number | null;
  initialDate: Date;
  /** Bump after calendar mutations so this table refetches fresh data. */
  scheduleRevision?: number;
}) {
  const { language, t } = useLanguage();
  const sortedTeachers = useMemo(() => sortTeachers(teachers), [teachers]);

  const [teacherId, setTeacherId] = useState<number | "">("");
  const [dateYmd, setDateYmd] = useState(() => formatDateYMD(initialDate));
  const [localEvents, setLocalEvents] = useState<ScheduleEvent[] | null>(null);
  const [localExceptions, setLocalExceptions] = useState<
    ScheduleException[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaultTeacherId =
      initialTeacherId ??
      sortedTeachers[0]?.id ??
      null;
    setTeacherId(defaultTeacherId ?? "");
    setDateYmd(formatDateYMD(initialDate));
  }, [open, initialTeacherId, initialDate, sortedTeachers]);

  useEffect(() => {
    if (!open || teacherId === "") {
      setLocalEvents(null);
      setLocalExceptions(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestTeacherId = teacherId;
    setLoading(true);
    setError(null);

    void fetchScheduleCalendarEventsAction([requestTeacherId])
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.error) {
          setError(result.error);
          setLocalEvents(null);
          setLocalExceptions(null);
          return;
        }

        setLocalEvents(result.events);
        setLocalExceptions(result.exceptions);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, teacherId, scheduleRevision]);

  const sourceEvents = localEvents ?? events;
  const sourceExceptions = localExceptions ?? exceptions;

  const dayInstances = useMemo(() => {
    if (teacherId === "") {
      return [] as ScheduleEventInstance[];
    }

    const focus = parseDateYMD(dateYmd);
    const weekDays = getWeekDays(startOfWeek(focus));
    const teacherEvents = filterEventsByTeachers(sourceEvents, [teacherId]);

    return buildWeekEventInstances(teacherEvents, sourceExceptions, weekDays)
      .filter((instance) => instance.displayDate === dateYmd)
      .sort(
        (a, b) =>
          timeToMinutes(a.display_start_time) -
          timeToMinutes(b.display_start_time),
      );
  }, [teacherId, dateYmd, sourceEvents, sourceExceptions]);

  const selectedTeacher =
    teacherId === ""
      ? null
      : (sortedTeachers.find((teacher) => teacher.id === teacherId) ?? null);

  function shiftDate(days: number) {
    setDateYmd(formatDateYMD(addDays(parseDateYMD(dateYmd), days)));
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
          <DialogPanel className="relative w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("common.teacherDayList")}
                </DialogTitle>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("common.teacherDayListHelp")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
              >
                {t("common.close")}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("common.teacher")}
                </span>
                <select
                  value={teacherId === "" ? "" : String(teacherId)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTeacherId(value === "" ? "" : Number(value));
                  }}
                  className="rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 shadow-xs inset-ring inset-ring-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:focus:outline-indigo-500"
                >
                  <option value="">{t("common.selectTeacherFirst")}</option>
                  {sortedTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {formatTeacherName(teacher)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("common.date")}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => shiftDate(-1)}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={t("common.previousDay")}
                  >
                    <ChevronLeftIcon className="size-5" />
                  </button>
                  <input
                    type="date"
                    value={dateYmd}
                    onChange={(event) => setDateYmd(event.target.value)}
                    className="rounded-md bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-xs inset-ring inset-ring-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:focus:outline-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => shiftDate(1)}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={t("common.nextDay")}
                  >
                    <ChevronRightIcon className="size-5" />
                  </button>
                </div>
              </label>
            </div>

            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
              {selectedTeacher
                ? `${formatTeacherName(selectedTeacher)} · ${formatDayTitle(parseDateYMD(dateYmd), language)}`
                : formatDayTitle(parseDateYMD(dateYmd), language)}
            </p>

            {error ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {t("common.error.loadFailed", {
                  entity: t("nav.schedule"),
                  message: error,
                })}
              </p>
            ) : null}

            {loading ? (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t("common.loading")}
              </p>
            ) : teacherId === "" ? (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t("common.selectTeacherFirst")}
              </p>
            ) : dayInstances.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t("common.noClassesScheduled", {
                  name: selectedTeacher
                    ? formatTeacherName(selectedTeacher)
                    : t("common.teacher"),
                })}
              </p>
            ) : (
              <div className="mt-4 flow-root">
                <div className="-mx-4 overflow-x-auto sm:-mx-0">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                        >
                          {t("common.time")}
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                        >
                          {t("common.student")}
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                        >
                          {t("common.subject")}
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                        >
                          {t("common.room")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                      {dayInstances.map((instance) => {
                        const instanceStudents = resolveInstanceStudents(
                          instance,
                          students,
                        );
                        const timeLabel = `${formatTime12Hour(instance.display_start_time)} – ${formatTime12Hour(instance.display_end_time)}`;

                        return (
                          <tr key={instance.instanceKey}>
                            <td className="py-3 pr-3 pl-4 text-sm whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                              <div>{timeLabel}</div>
                              {instance.hasException ? (
                                <div className="text-xs text-amber-600 dark:text-amber-400">
                                  {t("common.rescheduledThisWeek")}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                              {instanceStudents.length === 0 ? (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {t("common.noStudentsEnrolled")}
                                </span>
                              ) : (
                                <ul className="space-y-0.5">
                                  {instanceStudents.map((student) => (
                                    <li key={student.id}>
                                      <Link
                                        href={`/students/${student.id}`}
                                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                      >
                                        {formatStudentName(student)}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                              <Link
                                href={`/classes/${instance.classId}`}
                                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                {formatClassSubject(instance.subject, language)}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {instance.room_number ?? t("common.notAvailable")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
