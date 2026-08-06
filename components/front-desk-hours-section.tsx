"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  createFrontDeskHourLog,
  updateFrontDeskHourLog,
  type FrontDeskHourLogState,
} from "@/app/(dashboard)/tutors/actions";
import { useLanguage } from "@/components/language-provider";
import { DeleteFrontDeskHourButton } from "@/components/delete-front-desk-hour-button";
import { formatCentsAsCurrency } from "@/lib/money";
import { frontDeskDayPayCents } from "@/lib/staff-position";

export type FrontDeskHourLog = {
  id: number;
  work_date: string;
  hours: number;
  rate_cents: number;
  notes: string | null;
};

const inputClassName =
  "block w-full min-h-[2.375rem] rounded-md bg-white px-3 py-1.5 text-base leading-6 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

function HoursFormFields({
  idPrefix,
  log,
  defaultRateCents,
}: {
  idPrefix: string;
  log?: FrontDeskHourLog;
  defaultRateCents: number | null;
}) {
  const { t } = useLanguage();
  const rateDefault =
    log != null
      ? (log.rate_cents / 100).toFixed(log.rate_cents % 100 === 0 ? 0 : 2)
      : defaultRateCents != null
        ? (defaultRateCents / 100).toFixed(
            defaultRateCents % 100 === 0 ? 0 : 2,
          )
        : "";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-workDate`} className={labelClassName}>
            {t("common.workDate")}
          </label>
          <div className="mt-2">
            <input
              id={`${idPrefix}-workDate`}
              name="workDate"
              type="date"
              required
              defaultValue={log?.work_date ?? ""}
              className={inputClassName}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-hours`} className={labelClassName}>
            {t("common.hoursWorked")}
          </label>
          <div className="mt-2">
            <input
              id={`${idPrefix}-hours`}
              name="hours"
              type="number"
              required
              min="0.25"
              max="24"
              step="0.25"
              defaultValue={log?.hours ?? ""}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-rate`} className={labelClassName}>
          {t("common.hourlyRate")}
        </label>
        <div className="mt-2">
          <input
            id={`${idPrefix}-rate`}
            name="hourlyRate"
            type="text"
            inputMode="decimal"
            required
            defaultValue={rateDefault}
            placeholder={t("common.hourlyRatePlaceholder")}
            className={inputClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-notes`} className={labelClassName}>
          {t("common.notes")}
        </label>
        <div className="mt-2">
          <input
            id={`${idPrefix}-notes`}
            name="notes"
            type="text"
            defaultValue={log?.notes ?? ""}
            className={inputClassName}
          />
        </div>
      </div>
    </>
  );
}

const initialState: FrontDeskHourLogState = {};

export function FrontDeskHoursSection({
  teacherId,
  hourlyRateCents,
  logs,
}: {
  teacherId: number;
  hourlyRateCents: number | null;
  logs: FrontDeskHourLog[];
}) {
  const { language, t } = useLanguage();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FrontDeskHourLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const [createState, createAction, createPending] = useActionState(
    createFrontDeskHourLog,
    initialState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateFrontDeskHourLog,
    initialState,
  );

  useEffect(() => {
    if (createState.error) setError(createState.error);
    if (createState.success) {
      formRef.current?.reset();
      setError(null);
      setAddOpen(false);
    }
  }, [createState.error, createState.success]);

  useEffect(() => {
    if (updateState.error) setError(updateState.error);
    if (updateState.success) {
      setError(null);
      setEditing(null);
    }
  }, [updateState.error, updateState.success]);

  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);
  const totalPay = logs.reduce(
    (sum, log) => sum + frontDeskDayPayCents(Number(log.hours), log.rate_cents),
    0,
  );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.hoursWorked")}
          </h2>
          {logs.length > 0 ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("common.hoursPaySummary", {
                hours: totalHours.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                }),
                pay: formatCentsAsCurrency(totalPay, language),
              })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAddOpen(true);
          }}
          className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("common.logHours")}
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noHourLogs")}
        </p>
      ) : (
        <div className="mt-4 flow-root">
          <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
                <thead>
                  <tr>
                    <th className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white">
                      {t("common.workDate")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      {t("common.hoursWorked")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      {t("common.hourlyRate")}
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      {t("common.dayPay")}
                    </th>
                    <th className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {logs.map((log) => {
                    const pay = frontDeskDayPayCents(
                      Number(log.hours),
                      log.rate_cents,
                    );
                    return (
                      <tr key={log.id}>
                        <td className="py-4 pr-3 pl-4 text-sm text-gray-900 sm:pl-0 dark:text-white">
                          {log.work_date}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {Number(log.hours)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatCentsAsCurrency(log.rate_cents, language)}
                        </td>
                        <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCentsAsCurrency(pay, language)}
                        </td>
                        <td className="py-4 pr-4 pl-3 text-right text-sm sm:pr-0">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setEditing(log);
                              }}
                              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                            >
                              {t("common.edit")}
                            </button>
                            <DeleteFrontDeskHourButton
                              teacherId={teacherId}
                              logId={log.id}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white px-4 pt-5 pb-4 shadow-xl sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-md text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <XMarkIcon className="size-6" />
                </button>
              </div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("common.logHours")}
              </DialogTitle>
              <form
                ref={formRef}
                action={createAction}
                className="mt-6 space-y-4"
              >
                <input type="hidden" name="teacherId" value={teacherId} />
                <HoursFormFields
                  idPrefix={`${idPrefix}-add`}
                  defaultRateCents={hourlyRateCents}
                />
                {error && addOpen && !editing ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white dark:inset-ring-white/5"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={createPending}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-indigo-500"
                  >
                    {createPending ? t("common.saving") : t("common.saveHours")}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      {editing ? (
        <Dialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          className="relative z-50"
        >
          <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
              <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white px-4 pt-5 pb-4 shadow-xl sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("common.editHours")}
                </DialogTitle>
                <form
                  key={editing.id}
                  action={updateAction}
                  className="mt-6 space-y-4"
                >
                  <input type="hidden" name="teacherId" value={teacherId} />
                  <input type="hidden" name="logId" value={editing.id} />
                  <HoursFormFields
                    idPrefix={`${idPrefix}-edit`}
                    log={editing}
                    defaultRateCents={hourlyRateCents}
                  />
                  {error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  ) : null}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white dark:inset-ring-white/5"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={updatePending}
                      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-indigo-500"
                    >
                      {updatePending
                        ? t("common.saving")
                        : t("common.saveChanges")}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </div>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
