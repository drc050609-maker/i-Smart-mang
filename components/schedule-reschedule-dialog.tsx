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
import { formatTime12Hour, formatScheduleDate } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import type { ScheduleEventInstance } from "@/lib/schedule-calendar";

export type PendingReschedule = {
  instance: ScheduleEventInstance;
  newDate: string;
  newDayIndex: number;
  newStartTime: string;
  newEndTime: string;
};

const initialState: ScheduleActionState = {};

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

  const { instance, newDate, newDayIndex, newStartTime, newEndTime } = pending;
  const timeLabel = `${formatTime12Hour(newStartTime)} – ${formatTime12Hour(newEndTime)}`;
  const isRecurring = instance.is_recurring;
  const dateChanged = newDate !== instance.occurrenceDate;
  const timeChanged =
    newStartTime.slice(0, 5) !== instance.display_start_time.slice(0, 5) ||
    newEndTime.slice(0, 5) !== instance.display_end_time.slice(0, 5) ||
    dateChanged;

  return (
    <Dialog open onClose={() => !isPending && onClose()} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
          <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {isRecurring ? t("common.reschedule") : t("common.updateClassTime")}
            </DialogTitle>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">
                {formatClassSubject(instance.subject, language)}
              </span>
              {timeChanged ? (
                <>
                  {" "}
                  → {formatScheduleDate(newDate, language)} {timeLabel}
                </>
              ) : null}
            </p>

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
                    className="mt-0.5 size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
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
                    className="mt-0.5 size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                      {t("common.rescheduleAllFuture")}
                    </span>
                  </span>
                </label>
              </fieldset>
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {t("common.updateClassTime")}
              </p>
            )}

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
              <input type="hidden" name="newDayOfWeek" value={newDayIndex} />
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
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
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
