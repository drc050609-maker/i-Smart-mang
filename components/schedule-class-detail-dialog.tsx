"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import {
  deleteFromCalendar,
  type ScheduleActionState,
} from "@/app/(dashboard)/schedule/actions";
import { ActiveStatusBadge } from "@/components/active-status-badge";
import { useLanguage } from "@/components/language-provider";
import { StudentNoteStar } from "@/components/student-note-star";
import { ScheduleTrialLabel } from "@/components/schedule-trial-label";
import { formatTime12Hour, formatScheduleDate } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import { classHref } from "@/lib/return-to";
import { formatClassTrack, type ClassTrack } from "@/lib/class-track";
import type {
  ScheduleEventInstance,
  ScheduleStudent,
} from "@/lib/schedule-calendar";
import { formatStudentName, sortStudents } from "@/lib/person-name";

const initialDeleteState: ScheduleActionState = {};

export function ScheduleClassDetailDialog({
  instance,
  students,
  onClose,
  onDeleted,
}: {
  instance: ScheduleEventInstance | null;
  students: ScheduleStudent[];
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { t, language } = useLanguage();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [scope, setScope] = useState<"occurrence" | "series">("occurrence");
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteFromCalendar,
    initialDeleteState,
  );

  useEffect(() => {
    setConfirmingDelete(false);
    setScope("occurrence");
  }, [instance?.instanceKey]);

  useEffect(() => {
    if (deleteState.success) {
      if (onDeleted) {
        onDeleted();
      } else {
        onClose();
      }
    }
  }, [deleteState.success, onClose, onDeleted]);

  if (!instance) {
    return null;
  }

  const timeLabel = `${formatTime12Hour(instance.display_start_time)} – ${formatTime12Hour(instance.display_end_time)}`;
  // Prefer the slot-linked student(s). For group/unassigned slots, fall back to
  // student_ids resolved against the active student list (class roster).
  const studentById = new Map(students.map((student) => [student.id, student]));
  const slotStudents = sortStudents(instance.students).map((student) => {
    const campus = studentById.get(student.id);
    if (!campus?.notes?.trim()) return student;
    return { ...student, notes: campus.notes };
  });
  const rosterStudents = sortStudents(
    instance.student_ids
      .map((id) => studentById.get(id))
      .filter((student): student is ScheduleStudent => student !== undefined),
  );
  const displayStudents =
    slotStudents.length > 0
      ? slotStudents
      : instance.schedule_student_id == null
        ? rosterStudents
        : [];
  const studentHeading =
    instance.schedule_student_id != null
      ? t("common.student")
      : instance.lesson_type === "group"
        ? t("enum.lessonType.group")
        : t("common.student");
  const studentSummary =
    displayStudents.length === 0
      ? instance.lesson_type === "trial"
        ? t("common.trialLabel")
        : t("common.noStudentsEnrolled")
      : instance.schedule_student_id != null
        ? formatStudentName(displayStudents[0]!)
        : t("common.enrolled", { count: displayStudents.length });

  const deleteDescription =
    instance.is_recurring && scope === "series"
      ? t("common.deleteAllOccurrencesConfirm")
      : t("common.deleteScheduleEventConfirm");

  return (
    <Dialog
      open
      onClose={() => !deletePending && onClose()}
      className="relative z-50"
    >
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
                  {studentHeading}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {studentSummary}
                </dd>
              </div>
            </dl>

            {displayStudents.length > 0 ? (
              <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-md border border-gray-200 px-3 py-2 dark:border-white/10">
                {displayStudents.map((student) => (
                  <li key={student.id} className="flex items-center gap-1">
                    <Link
                      href={`/students/${student.id}`}
                      className="text-sm text-violet-700 hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200"
                    >
                      {formatStudentName(student)}
                    </Link>
                    <ScheduleTrialLabel lessonType={instance.lesson_type} />
                    <StudentNoteStar students={[student]} />
                  </li>
                ))}
              </ul>
            ) : null}

            {confirmingDelete ? (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {t("common.deleteFromCalendar")}
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {deleteDescription}
                </p>

                {instance.is_recurring ? (
                  <fieldset className="mt-3 space-y-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-red-200/80 bg-white px-3 py-2 dark:border-red-500/20 dark:bg-gray-900/40">
                      <input
                        type="radio"
                        name="deleteScope"
                        value="occurrence"
                        checked={scope === "occurrence"}
                        onChange={() => setScope("occurrence")}
                        className="mt-0.5 size-4 border-gray-300 text-red-600 focus:ring-red-600"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">
                          {t("common.deleteThisOccurrence")}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                          {formatScheduleDate(instance.occurrenceDate, language)}
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-red-200/80 bg-white px-3 py-2 dark:border-red-500/20 dark:bg-gray-900/40">
                      <input
                        type="radio"
                        name="deleteScope"
                        value="series"
                        checked={scope === "series"}
                        onChange={() => setScope("series")}
                        className="mt-0.5 size-4 border-gray-300 text-red-600 focus:ring-red-600"
                      />
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">
                        {t("common.deleteAllOccurrences")}
                      </span>
                    </label>
                  </fieldset>
                ) : null}

                {deleteState.error ? (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {deleteState.error}
                  </p>
                ) : null}

                <form
                  action={deleteAction}
                  className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
                >
                  <input
                    type="hidden"
                    name="scheduleId"
                    value={instance.scheduleId}
                  />
                  <input type="hidden" name="classId" value={instance.classId} />
                  <input
                    type="hidden"
                    name="scope"
                    value={instance.is_recurring ? scope : "series"}
                  />
                  <input
                    type="hidden"
                    name="occurrenceDate"
                    value={instance.occurrenceDate}
                  />
                  <input
                    type="hidden"
                    name="startTime"
                    value={instance.display_start_time}
                  />
                  <input
                    type="hidden"
                    name="endTime"
                    value={instance.display_end_time}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deletePending}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 disabled:opacity-60 dark:bg-white/10 dark:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={deletePending}
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    {deletePending ? t("common.deleting") : t("common.delete")}
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  {t("common.deleteFromCalendar")}
                </button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white"
                  >
                    {t("common.close")}
                  </button>
                  <Link
                    href={classHref(instance.classId, "/schedule")}
                    className="rounded-md bg-violet-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-violet-500"
                  >
                    {t("common.viewClass")}
                  </Link>
                </div>
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
