"use client";

import Link from "next/link";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import { ActiveStatusBadge } from "@/components/active-status-badge";
import { useLanguage } from "@/components/language-provider";
import { formatTime12Hour, formatScheduleDate } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import { formatClassTrack, type ClassTrack } from "@/lib/class-track";
import type {
  ScheduleEventInstance,
  ScheduleStudent,
} from "@/lib/schedule-calendar";
import { formatStudentName, sortStudents } from "@/lib/person-name";

export function ScheduleClassDetailDialog({
  instance,
  students,
  onClose,
}: {
  instance: ScheduleEventInstance | null;
  students: ScheduleStudent[];
  onClose: () => void;
}) {
  const { t, language } = useLanguage();

  if (!instance) {
    return null;
  }

  const timeLabel = `${formatTime12Hour(instance.display_start_time)} – ${formatTime12Hour(instance.display_end_time)}`;
  const studentById = new Map(students.map((student) => [student.id, student]));
  const enrolledStudents = sortStudents(
    instance.student_ids
      .map((id) => studentById.get(id))
      .filter((student): student is ScheduleStudent => student !== undefined),
  );

  return (
    <Dialog open onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
          <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatClassSubject(instance.subject, language)}
                </DialogTitle>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <ActiveStatusBadge isActive={instance.is_active} />
                </p>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("common.when")}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {formatScheduleDate(instance.displayDate, language)}
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    · {timeLabel}
                  </span>
                  {instance.hasException ? (
                    <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                      {t("common.rescheduledThisWeek")}
                    </span>
                  ) : null}
                  {instance.is_recurring ? (
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      {t("common.repeatsWeekly")}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("common.teacher")}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {instance.teacher_name ?? t("common.notAvailable")}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("common.room")}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {instance.room_number
                    ? `${t("common.room")} ${instance.room_number}`
                    : t("common.notAvailable")}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("common.track")}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {formatClassTrack(instance.class_track as ClassTrack | null, language)}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("common.student")}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {enrolledStudents.length === 0
                    ? t("common.noStudentsEnrolled")
                    : t("common.enrolled", { count: enrolledStudents.length })}
                </dd>
              </div>
            </dl>

            {enrolledStudents.length > 0 ? (
              <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-200 px-3 py-2 dark:border-white/10">
                {enrolledStudents.map((student) => (
                  <li key={student.id}>
                    <Link
                      href={`/students/${student.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      {formatStudentName(student)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white"
              >
                {t("common.close")}
              </button>
              <Link
                href={`/classes/${instance.classId}`}
                className="rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-500"
              >
                {t("common.viewClass")}
              </Link>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
