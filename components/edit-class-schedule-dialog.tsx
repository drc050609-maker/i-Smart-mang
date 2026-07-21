"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CalendarDaysIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  addClassSchedule,
  updateClassSchedule,
  type UpdateClassScheduleState,
} from "@/app/(dashboard)/classes/actions";
import { useLanguage } from "@/components/language-provider";
import {
  addMinutesToTimeInput,
  type ClassScheduleFields,
  type ClassScheduleRow,
  formatTime12Hour,
  formatWeekday,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/class-schedule";

const emptySchedule: ClassScheduleFields = {
  is_recurring: true,
  schedule_day_of_week: null,
  schedule_date: null,
  schedule_start_time: null,
  schedule_end_time: null,
};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const readOnlyClassName =
  "block w-full rounded-md bg-gray-50 px-3 py-1.5 text-base text-gray-700 sm:text-sm/6 dark:bg-white/5 dark:text-gray-300";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: UpdateClassScheduleState = {};

export function ClassScheduleDialog({
  classId,
  schedule,
  durationMinutes,
  triggerLabel,
  triggerVariant = "primary",
}: {
  classId: number;
  schedule?: ClassScheduleRow;
  durationMinutes: number | null;
  triggerLabel?: string;
  triggerVariant?: "primary" | "text";
}) {
  const { t, language } = useLanguage();
  const isEdit = Boolean(schedule?.id);
  const scheduleValues = schedule ?? emptySchedule;
  const usesClassDuration =
    durationMinutes !== null &&
    Number.isInteger(durationMinutes) &&
    durationMinutes > 0;
  const initialStartTime = toTimeInputValue(scheduleValues.schedule_start_time);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(scheduleValues.is_recurring);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(
    toTimeInputValue(scheduleValues.schedule_end_time),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateClassSchedule : addClassSchedule,
    initialState,
  );
  const buttonLabel =
    triggerLabel ?? (isEdit ? t("common.edit") : t("common.addMeetingTime"));

  const computedEndTime = useMemo(() => {
    if (!usesClassDuration || !startTime) {
      return null;
    }

    return addMinutesToTimeInput(startTime, durationMinutes);
  }, [durationMinutes, startTime, usesClassDuration]);

  function resetFormState() {
    setIsRecurring(scheduleValues.is_recurring);
    setStartTime(initialStartTime);
    setEndTime(toTimeInputValue(scheduleValues.schedule_end_time));
  }

  function openDialog() {
    setError(null);
    resetFormState();
    setOpen(true);
  }

  function closeDialog() {
    setError(null);
    resetFormState();
    setOpen(false);
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      setError(null);
      setOpen(false);
    }
  }, [state.error, state.success]);

  const endTimeValue = usesClassDuration ? computedEndTime : endTime;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={
          triggerVariant === "text"
            ? "text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            : "inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
        }
      >
        {triggerVariant === "primary" ? (
          <CalendarDaysIcon aria-hidden="true" className="size-4" />
        ) : null}
        {buttonLabel}
      </button>

      <Dialog open={open} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <XMarkIcon aria-hidden="true" className="size-6" />
                </button>
              </div>

              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {isEdit ? t("common.editMeetingTime") : t("common.addMeetingTime")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.scheduleHelp")}
              </p>

              <form
                key={`${classId}-${schedule?.id ?? "new"}-${scheduleValues.is_recurring}-${scheduleValues.schedule_day_of_week}-${scheduleValues.schedule_date}-${scheduleValues.schedule_start_time}-${scheduleValues.schedule_end_time}-${durationMinutes}`}
                ref={formRef}
                action={formAction}
                className="mt-6 space-y-5"
              >
                <input type="hidden" name="classId" value={classId} />
                {schedule?.id ? (
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                ) : null}
                <input
                  type="hidden"
                  name="isRecurring"
                  value={isRecurring ? "true" : "false"}
                />
                {usesClassDuration && endTimeValue ? (
                  <input
                    type="hidden"
                    name="scheduleEndTime"
                    value={`${endTimeValue}:00`}
                  />
                ) : null}

                <fieldset>
                  <legend className={labelClassName}>{t("common.type")}</legend>
                  <div className="mt-3 space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 px-3 py-3 dark:border-white/10">
                      <input
                        type="radio"
                        name="meetingType"
                        checked={isRecurring}
                        onChange={() => setIsRecurring(true)}
                        className="mt-0.5 size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">
                          {t("common.repeatsWeekly")}
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 px-3 py-3 dark:border-white/10">
                      <input
                        type="radio"
                        name="meetingType"
                        checked={!isRecurring}
                        onChange={() => setIsRecurring(false)}
                        className="mt-0.5 size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">
                          {t("common.oneTime")}
                        </span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                {isRecurring ? (
                  <div>
                    <label htmlFor="scheduleDayOfWeek" className={labelClassName}>
                      {t("common.schedule")}
                    </label>
                    <div className="relative mt-2">
                      <select
                        id="scheduleDayOfWeek"
                        name="scheduleDayOfWeek"
                        required
                        defaultValue={
                          scheduleValues.schedule_day_of_week?.toString() ?? ""
                        }
                        className={selectClassName}
                      >
                        <option value="">{t("common.pickDate")}</option>
                        {Array.from({ length: 7 }, (_, index) => (
                          <option key={index} value={index}>
                            {formatWeekday(index, language)}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="scheduleDate" className={labelClassName}>
                      {t("common.date")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="scheduleDate"
                        name="scheduleDate"
                        type="date"
                        required
                        defaultValue={toDateInputValue(scheduleValues.schedule_date)}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                )}

                <div className={usesClassDuration ? "" : "grid gap-5 sm:grid-cols-2"}>
                  <div>
                    <label htmlFor="scheduleStartTime" className={labelClassName}>
                      {t("common.startTime")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="scheduleStartTime"
                        name="scheduleStartTime"
                        type="time"
                        required
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  {usesClassDuration ? (
                    <div className="mt-5">
                      <span className={labelClassName}>{t("common.endTime")}</span>
                      <div className="mt-2">
                        <p className={readOnlyClassName}>
                          {computedEndTime
                            ? formatTime12Hour(`${computedEndTime}:00`)
                            : t("common.pickDate")}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {t("common.minutes", { count: durationMinutes })}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="scheduleEndTime" className={labelClassName}>
                        {t("common.endTime")}
                      </label>
                      <div className="mt-2">
                        <input
                          id="scheduleEndTime"
                          name="scheduleEndTime"
                          type="time"
                          required
                          value={endTime}
                          onChange={(event) => setEndTime(event.target.value)}
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      pending ||
                      (usesClassDuration && Boolean(startTime && !computedEndTime))
                    }
                    className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                  >
                    {pending
                      ? t("common.saving")
                      : isEdit
                        ? t("common.saveChanges")
                        : t("common.addTime")}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** @deprecated Use ClassScheduleDialog */
export const EditClassScheduleDialog = ClassScheduleDialog;
