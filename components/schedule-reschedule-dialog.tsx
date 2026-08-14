"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import {
  rescheduleFromCalendar,
  type ScheduleActionState,
} from "@/app/(dashboard)/schedule/actions";
import { useLanguage } from "@/components/language-provider";
import { ScheduleTrialLabel } from "@/components/schedule-trial-label";
import { formatTime12Hour, formatScheduleDate } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import {
  formatScheduleEventStudentLabel,
  scheduleEventUnassignedLabel,
  timeToMinutes,
  type ScheduleEventInstance,
} from "@/lib/schedule-calendar";

export type PendingReschedule = {
  instance: ScheduleEventInstance;
  newDate: string;
  newDayIndex: number;
  newStartTime: string;
  newEndTime: string;
};

const initialState: ScheduleActionState = {};

function formatDurationLabel(
  minutes: number,
  t: ReturnType<typeof useLanguage>["t"],
) {
  if (minutes <= 0) return t("common.notAvailable");
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1
      ? t("common.hour")
      : t("common.hours", { count: hours });
  }
  return t("common.minutes", { count: minutes });
}

export function ScheduleRescheduleDialog({
  pending,
  onClose,
  onSuccess,
}: {
  pending: PendingReschedule | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, language } = useLanguage();
  const [scope, setScope] = useState<"occurrence" | "series">("occurrence");
  const [state, formAction, isPending] = useActionState(
    rescheduleFromCalendar,
    initialState,
  );
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);

  onCloseRef.current = onClose;
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (state.success) {
      onSuccessRef.current();
      onCloseRef.current();
    }
  }, [state.success]);

  if (!pending) {
    return null;
  }

  const { instance, newDate, newStartTime, newEndTime } = pending;
  const originalStart = instance.display_start_time;
  const originalEnd = instance.display_end_time;
  const originalDuration =
    timeToMinutes(originalEnd) - timeToMinutes(originalStart);
  const newDuration = timeToMinutes(newEndTime) - timeToMinutes(newStartTime);
  const isRecurring = instance.is_recurring;
  const dateChanged = newDate !== instance.occurrenceDate;
  const startChanged =
    newStartTime.slice(0, 5) !== originalStart.slice(0, 5);
  const endChanged = newEndTime.slice(0, 5) !== originalEnd.slice(0, 5);
  const durationChanged = originalDuration !== newDuration;
  const timeChanged = dateChanged || startChanged || endChanged;
  const isDurationOnlyChange =
    durationChanged && !dateChanged && (!startChanged || !endChanged);

  const originalTimeLabel = `${formatTime12Hour(originalStart)} – ${formatTime12Hour(originalEnd)}`;
  const newTimeLabel = `${formatTime12Hour(newStartTime)} – ${formatTime12Hour(newEndTime)}`;

  return (
    <Dialog open onClose={() => !isPending && onClose()} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/40" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
          <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {isDurationOnlyChange
                ? t("common.changeDuration")
                : isRecurring
                  ? t("common.reschedule")
                  : t("common.updateClassTime")}
            </DialogTitle>

            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
              {formatScheduleEventStudentLabel(
                instance.students,
                scheduleEventUnassignedLabel(
                  instance.lesson_type,
                  formatClassSubject(instance.subject, language),
                  {
                    trial: t("common.trialLabel"),
                    group: t("enum.lessonType.group"),
                  },
                ),
              )}
              {instance.students.length > 0 ? (
                <ScheduleTrialLabel lessonType={instance.lesson_type} />
              ) : null}
            </p>
            {instance.students.length > 0 ||
            instance.lesson_type === "group" ||
            instance.lesson_type === "trial" ? (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {formatClassSubject(instance.subject, language)}
              </p>
            ) : null}

            <div className="mt-4 space-y-3 rounded-lg bg-violet-50/60 p-3 text-sm dark:bg-violet-500/10">
              {isDurationOnlyChange ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("common.originalDuration")}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatDurationLabel(originalDuration, t)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 dark:text-gray-400">
                      {t("common.newDuration")}
                    </span>
                    <span className="font-semibold text-violet-700 dark:text-violet-300">
                      {formatDurationLabel(newDuration, t)}
                    </span>
                  </div>
                  <div className="border-t border-violet-100/70 pt-3 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("common.originalTime")}
                      </span>
                      <span className="text-right text-gray-900 dark:text-white">
                        {originalTimeLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">
                        {t("common.newTime")}
                      </span>
                      <span className="text-right font-medium text-violet-700 dark:text-violet-300">
                        {newTimeLabel}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t("common.originalTime")}
                    </p>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">
                      {formatScheduleDate(instance.occurrenceDate, language)}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {originalTimeLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {t("common.duration")}:{" "}
                      {formatDurationLabel(originalDuration, t)}
                    </p>
                  </div>
                  <div className="border-t border-violet-100/70 pt-3 dark:border-white/10">
                    <p className="text-xs font-medium uppercase tracking-wide text-violet-700 dark:text-violet-300">
                      {t("common.newTime")}
                    </p>
                    <p className="mt-1 font-medium text-violet-900 dark:text-violet-100">
                      {formatScheduleDate(newDate, language)}
                    </p>
                    <p className="text-violet-800 dark:text-violet-200">
                      {newTimeLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-violet-600 dark:text-violet-300">
                      {t("common.duration")}:{" "}
                      {formatDurationLabel(newDuration, t)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {isRecurring ? (
              <fieldset className="mt-4 space-y-3">
                <legend className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("common.reschedule")}
                </legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
                  <input
                    type="radio"
                    name="scopeChoice"
                    value="occurrence"
                    checked={scope === "occurrence"}
                    onChange={() => setScope("occurrence")}
                    className="mt-0.5 size-4 border-gray-300 text-violet-600 focus:ring-violet-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {t("common.rescheduleThisOccurrence")}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                      {formatScheduleDate(instance.occurrenceDate, language)}
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
                  <input
                    type="radio"
                    name="scopeChoice"
                    value="series"
                    checked={scope === "series"}
                    onChange={() => setScope("series")}
                    className="mt-0.5 size-4 border-gray-300 text-violet-600 focus:ring-violet-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {t("common.rescheduleAllFuture")}
                    </span>
                  </span>
                </label>
              </fieldset>
            ) : null}

            {state.error ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {state.error}
              </p>
            ) : null}

            <form
              action={formAction}
              className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
              onSubmit={(event) => {
                if (!timeChanged) {
                  event.preventDefault();
                  onClose();
                }
              }}
            >
              <input type="hidden" name="scheduleId" value={instance.scheduleId} />
              <input type="hidden" name="classId" value={instance.classId} />
              <input type="hidden" name="scope" value={isRecurring ? scope : "series"} />
              <input
                type="hidden"
                name="occurrenceDate"
                value={instance.occurrenceDate}
              />
              <input type="hidden" name="newDate" value={newDate} />
              <input type="hidden" name="newStartTime" value={newStartTime} />
              <input type="hidden" name="newEndTime" value={newEndTime} />
              <input
                type="hidden"
                name="newDayOfWeek"
                value={new Date(`${newDate}T00:00:00`).getDay()}
              />
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={isPending || !timeChanged}
                className="rounded-md bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-800 ring-1 ring-violet-200/80 hover:bg-violet-50 disabled:opacity-60 dark:bg-violet-500/20 dark:text-violet-100 dark:ring-violet-400/30 dark:hover:bg-violet-500/30"
              >
                {isPending ? t("common.saving") : t("common.save")}
              </button>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
