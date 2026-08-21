"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  createFrontDeskHourLog,
  updateFrontDeskHourLog,
  type FrontDeskHourLogState,
} from "@/app/(dashboard)/tutors/actions";
import {
  recordFrontDeskPaycheck,
  type FrontDeskPaycheckActionState,
} from "@/app/(dashboard)/tutors/front-desk-paycheck-actions";
import { useLanguage } from "@/components/language-provider";
import { DeleteFrontDeskHourButton } from "@/components/delete-front-desk-hour-button";
import { TimeSlotField } from "@/components/time-slot-field";
import { formatCentsAsCurrency } from "@/lib/money";
import {
  addMinutesToTimeInput,
  currentLocalTimeInputValue,
  formatTime12Hour,
  toTimeInputValue,
} from "@/lib/class-schedule";
import {
  formatWorkedDuration,
  frontDeskDayPayCents,
  workedMinutesBetween,
} from "@/lib/staff-position";
import {
  formatStatementMonth,
  statementMonthHref,
} from "@/lib/statements";
import {
  openFrontDeskTimesheetPdf,
  type FrontDeskTimesheetPdfLine,
} from "@/lib/front-desk-timesheet-pdf";
import { appLanguageLocale } from "@/lib/language";
import type { TranslationKey } from "@/lib/i18n";

export type FrontDeskHourLog = {
  id: number;
  work_date: string;
  clock_in: string;
  clock_out: string;
  hours: number;
  rate_cents: number;
  notes: string | null;
};

export type FrontDeskRecordedPaycheck = {
  id: number;
  year: number;
  month: number;
  total_minutes: number;
  total_amount_cents: number;
  created_at: string;
};

const WEEKDAY_KEYS: TranslationKey[] = [
  "enum.weekday.sunday",
  "enum.weekday.monday",
  "enum.weekday.tuesday",
  "enum.weekday.wednesday",
  "enum.weekday.thursday",
  "enum.weekday.friday",
  "enum.weekday.saturday",
];

const inputClassName =
  "block w-full min-h-[2.375rem] rounded-md bg-white px-3 py-1.5 text-base leading-6 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const pdfButtonClassName =
  "rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/15";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function monthLabel(year: number, monthIndex: number, language: string) {
  return new Date(year, monthIndex, 1).toLocaleDateString(
    language === "zh" ? "zh-CN" : "en-US",
    { month: "long", year: "numeric" },
  );
}

function formatLogDate(dateStr: string, language: "en" | "zh") {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(
    appLanguageLocale(language),
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    },
  );
}

function formatRecordedAt(iso: string, language: "en" | "zh") {
  return new Date(iso).toLocaleString(appLanguageLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function defaultClockOut(clockIn: string) {
  return addMinutesToTimeInput(clockIn, 8 * 60) ?? "23:55";
}

function HoursFormFields({
  idPrefix,
  workDate,
  log,
  defaultRateCents,
}: {
  idPrefix: string;
  workDate: string;
  log?: FrontDeskHourLog;
  defaultRateCents: number | null;
}) {
  const { t, language } = useLanguage();
  const rateDefault =
    log != null
      ? (log.rate_cents / 100).toFixed(log.rate_cents % 100 === 0 ? 0 : 2)
      : defaultRateCents != null
        ? (defaultRateCents / 100).toFixed(
            defaultRateCents % 100 === 0 ? 0 : 2,
          )
        : "";

  const clockInDefault = log?.clock_in
    ? toTimeInputValue(log.clock_in)
    : currentLocalTimeInputValue();
  const clockOutDefault = log?.clock_out
    ? toTimeInputValue(log.clock_out)
    : defaultClockOut(clockInDefault);

  return (
    <>
      <input type="hidden" name="workDate" value={workDate} />

      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("common.workDate")}:{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {workDate}
          </span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TimeSlotField
          id={`${idPrefix}-clockIn`}
          name="clockIn"
          required
          label={t("common.clockIn")}
          language={language}
          defaultValue={clockInDefault}
        />
        <TimeSlotField
          id={`${idPrefix}-clockOut`}
          name="clockOut"
          required
          label={t("common.clockOut")}
          language={language}
          defaultValue={clockOutDefault}
        />
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
const initialPaycheckState: FrontDeskPaycheckActionState = {};

export function FrontDeskHoursSection({
  teacherId,
  teacherName,
  hourlyRateCents,
  logs,
  recordedPaychecks = [],
}: {
  teacherId: number;
  teacherName: string;
  hourlyRateCents: number | null;
  logs: FrontDeskHourLog[];
  recordedPaychecks?: FrontDeskRecordedPaycheck[];
}) {
  const { language, t } = useLanguage();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitFormRef = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const [createState, createAction, createPending] = useActionState(
    createFrontDeskHourLog,
    initialState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateFrontDeskHourLog,
    initialState,
  );
  const [paycheckState, paycheckAction, paycheckPending] = useActionState(
    recordFrontDeskPaycheck,
    initialPaycheckState,
  );

  const logsByDate = useMemo(() => {
    const map = new Map<string, FrontDeskHourLog>();
    for (const log of logs) map.set(log.work_date, log);
    return map;
  }, [logs]);

  const selectedLog = selectedDate ? (logsByDate.get(selectedDate) ?? null) : null;
  const dialogOpen = selectedDate != null;

  useEffect(() => {
    if (createState.error) setError(createState.error);
    if (createState.success) {
      formRef.current?.reset();
      setError(null);
      setSelectedDate(null);
    }
  }, [createState.error, createState.success]);

  useEffect(() => {
    if (updateState.error) setError(updateState.error);
    if (updateState.success) {
      setError(null);
      setSelectedDate(null);
    }
  }, [updateState.error, updateState.success]);

  useEffect(() => {
    setConfirmOpen(false);
    setSubmitError(null);
    setPdfError(null);
  }, [viewYear, viewMonth]);

  useEffect(() => {
    if (paycheckState.error) {
      setSubmitError(paycheckState.error);
    }
    if (paycheckState.success) {
      setSubmitError(null);
      setConfirmOpen(false);
    }
  }, [paycheckState.error, paycheckState.success]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const statementMonth = viewMonth + 1;

  const monthLogs = useMemo(() => {
    const prefix = `${viewYear}-${pad2(viewMonth + 1)}-`;
    return logs.filter((log) => log.work_date.startsWith(prefix));
  }, [logs, viewYear, viewMonth]);

  const recordedPaycheck = useMemo(
    () =>
      recordedPaychecks.find(
        (paycheck) =>
          paycheck.year === viewYear && paycheck.month === statementMonth,
      ) ?? null,
    [recordedPaychecks, viewYear, statementMonth],
  );

  const monthMinutes = monthLogs.reduce((sum, log) => {
    const minutes =
      workedMinutesBetween(log.clock_in, log.clock_out) ??
      Math.round(Number(log.hours) * 60);
    return sum + minutes;
  }, 0);
  const monthDuration = formatWorkedDuration(monthMinutes);
  const monthPay = monthLogs.reduce(
    (sum, log) => sum + frontDeskDayPayCents(Number(log.hours), log.rate_cents),
    0,
  );
  const isSubmitted = recordedPaycheck != null;
  const canSubmit = !isSubmitted && monthPay > 0 && monthMinutes > 0;

  function openConfirmDialog() {
    if (!canSubmit) {
      setSubmitError(t("common.noFrontDeskHoursToSubmit"));
      return;
    }
    setSubmitError(null);
    setConfirmOpen(true);
  }

  function closeConfirmDialog() {
    if (!paycheckPending) {
      setConfirmOpen(false);
    }
  }

  function handleDownloadPdf() {
    setPdfError(null);

    const monthName = formatStatementMonth(viewYear, statementMonth, language);
    const sortedLogs = [...monthLogs].sort((a, b) =>
      a.work_date.localeCompare(b.work_date),
    );

    const pdfLines: FrontDeskTimesheetPdfLine[] = sortedLogs.map((log) => {
      const minutes =
        workedMinutesBetween(log.clock_in, log.clock_out) ??
        Math.round(Number(log.hours) * 60);
      const duration = formatWorkedDuration(minutes);
      const payCents = frontDeskDayPayCents(Number(log.hours), log.rate_cents);

      return {
        date: formatLogDate(log.work_date, language),
        clockIn: formatTime12Hour(log.clock_in),
        clockOut: formatTime12Hour(log.clock_out),
        duration: t("common.durationHoursMinutes", {
          hours: duration.hours,
          minutes: duration.minutes,
        }),
        rate: formatCentsAsCurrency(log.rate_cents, language),
        pay: formatCentsAsCurrency(payCents, language),
        notes: log.notes?.trim() || "—",
      };
    });

    const totalPayCents =
      recordedPaycheck != null ? recordedPaycheck.total_amount_cents : monthPay;

    const opened = openFrontDeskTimesheetPdf(
      {
        title: `${teacherName} — ${t("common.frontDeskTimesheet")}`,
        subtitle:
          recordedPaycheck != null
            ? `${monthName} · ${t("common.recordedAt", {
                date: formatRecordedAt(recordedPaycheck.created_at, language),
              })}`
            : monthName,
        date: t("common.date"),
        clockIn: t("common.clockIn"),
        clockOut: t("common.clockOut"),
        duration: t("common.hoursWorked"),
        rate: t("common.hourlyRate"),
        pay: t("common.amount"),
        notes: t("common.notes"),
        totalHours: t("common.monthTotal"),
        totalHoursValue: t("common.durationHoursMinutes", {
          hours: monthDuration.hours,
          minutes: monthDuration.minutes,
        }),
        totalPay: t("common.amount"),
        totalPayValue: formatCentsAsCurrency(totalPayCents, language),
        empty: t("common.noHoursLoggedThisMonth"),
        receivedAck: t("common.paycheckReceivedAck"),
        signature: t("common.signature"),
        signatureDate: t("common.date"),
        printHint: t("common.pdfPrintHint"),
      },
      pdfLines,
    );

    if (!opened) {
      setPdfError(t("common.pdfPopupBlocked"));
    }
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function openDay(day: number) {
    setError(null);
    setSelectedDate(toDateKey(viewYear, viewMonth, day));
  }

  const cells: Array<{ day: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      dateKey: toDateKey(viewYear, viewMonth, day),
    });
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.hoursWorked")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.clickDayToLog")}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="rounded-lg bg-gray-50 px-4 py-2 text-sm dark:bg-white/5">
            <p className="font-medium text-gray-900 dark:text-white">
              {t("common.monthTotal")}:{" "}
              {t("common.durationHoursMinutes", {
                hours: monthDuration.hours,
                minutes: monthDuration.minutes,
              })}
            </p>
            {monthLogs.length > 0 ? (
              <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                {formatCentsAsCurrency(monthPay, language)}
              </p>
            ) : null}
            {isSubmitted ? (
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                {t("common.recordedAsExpenseFor", {
                  month: formatStatementMonth(viewYear, statementMonth, language),
                })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={monthLogs.length === 0}
            className={pdfButtonClassName}
          >
            {t("common.downloadPdf")}
          </button>
          {isSubmitted ? (
            <Link
              href={statementMonthHref(viewYear, statementMonth)}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-indigo-300 dark:inset-ring-white/10 dark:hover:bg-white/20"
            >
              {t("common.viewInStatements")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={openConfirmDialog}
              disabled={!canSubmit}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
            >
              {t("common.reviewFrontDeskPay")}
            </button>
          )}
        </div>
      </div>

      {pdfError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{pdfError}</p>
      ) : null}

      {submitError && !confirmOpen ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{submitError}</p>
      ) : null}

      <form ref={submitFormRef} action={paycheckAction} className="hidden">
        <input type="hidden" name="teacherId" value={teacherId} />
        <input type="hidden" name="year" value={viewYear} />
        <input type="hidden" name="month" value={statementMonth} />
      </form>

      <Dialog open={confirmOpen} onClose={closeConfirmDialog} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-md sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("common.confirmFrontDeskPayTitle")}
              </DialogTitle>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("common.confirmFrontDeskPayHelp")}
              </p>
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-white/5">
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatStatementMonth(viewYear, statementMonth, language)}
                </p>
                <p className="mt-1 text-gray-700 dark:text-gray-300">
                  {t("common.durationHoursMinutes", {
                    hours: monthDuration.hours,
                    minutes: monthDuration.minutes,
                  })}
                </p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {formatCentsAsCurrency(monthPay, language)}
                </p>
              </div>
              {submitError ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {submitError}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeConfirmDialog}
                  disabled={paycheckPending}
                  className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={paycheckPending || monthLogs.length === 0}
                  className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                >
                  {t("common.downloadPdf")}
                </button>
                <button
                  type="button"
                  disabled={paycheckPending}
                  onClick={() => submitFormRef.current?.requestSubmit()}
                  className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                >
                  {paycheckPending
                    ? t("common.saving")
                    : t("common.confirmAndSubmitFrontDeskPay")}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t("common.previousMonth")}
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {monthLabel(viewYear, viewMonth, language)}
          </h3>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t("common.nextMonth")}
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10">
          {WEEKDAY_KEYS.map((key) => (
            <div
              key={key}
              className="px-1 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {t(key)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, index) => {
            if (cell.day == null || cell.dateKey == null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-24 border-b border-r border-gray-100 bg-gray-50/50 dark:border-white/5 dark:bg-white/[0.02]"
                />
              );
            }

            const log = logsByDate.get(cell.dateKey);
            const isToday =
              cell.dateKey ===
              toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
            const duration = log
              ? formatWorkedDuration(
                  workedMinutesBetween(log.clock_in, log.clock_out) ??
                    Math.round(Number(log.hours) * 60),
                )
              : null;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => openDay(cell.day!)}
                className={`min-h-24 border-b border-r border-gray-100 p-1.5 text-left transition hover:bg-indigo-50/60 dark:border-white/5 dark:hover:bg-indigo-500/10 ${
                  log
                    ? "bg-indigo-50/40 dark:bg-indigo-500/5"
                    : "bg-white dark:bg-transparent"
                }`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {cell.day}
                </span>
                {log && duration ? (
                  <div className="mt-1 space-y-0.5 px-0.5">
                    <p className="text-[10px] leading-tight text-gray-600 dark:text-gray-300 sm:text-xs">
                      {formatTime12Hour(log.clock_in)}–
                      {formatTime12Hour(log.clock_out)}
                    </p>
                    <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 sm:text-xs">
                      {t("common.durationHoursMinutes", {
                        hours: duration.hours,
                        minutes: duration.minutes,
                      })}
                    </p>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setSelectedDate(null)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedLog ? t("common.editHours") : t("common.logHours")}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            {selectedLog ? (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("common.duration")}:{" "}
                {(() => {
                  const d = formatWorkedDuration(
                    workedMinutesBetween(
                      selectedLog.clock_in,
                      selectedLog.clock_out,
                    ) ?? Math.round(Number(selectedLog.hours) * 60),
                  );
                  return t("common.durationHoursMinutes", {
                    hours: d.hours,
                    minutes: d.minutes,
                  });
                })()}
                {" · "}
                {t("common.dayPay")}:{" "}
                {formatCentsAsCurrency(
                  frontDeskDayPayCents(
                    Number(selectedLog.hours),
                    selectedLog.rate_cents,
                  ),
                  language,
                )}
              </p>
            ) : null}

            <form
              ref={formRef}
              action={selectedLog ? updateAction : createAction}
              className="mt-4 space-y-4"
            >
              <input type="hidden" name="teacherId" value={teacherId} />
              {selectedLog ? (
                <input type="hidden" name="logId" value={selectedLog.id} />
              ) : null}
              <HoursFormFields
                key={`${selectedLog?.id ?? "new"}-${selectedDate}`}
                idPrefix={idPrefix}
                workDate={selectedDate!}
                log={selectedLog ?? undefined}
                defaultRateCents={hourlyRateCents}
              />
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createPending || updatePending}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60"
                >
                  {createPending || updatePending
                    ? t("common.saving")
                    : t("common.saveHours")}
                </button>
              </div>
            </form>

            {selectedLog ? (
              <div className="mt-3 border-t border-gray-100 pt-3 dark:border-white/10">
                <DeleteFrontDeskHourButton
                  teacherId={teacherId}
                  logId={selectedLog.id}
                  onDeleted={() => setSelectedDate(null)}
                />
              </div>
            ) : null}
          </DialogPanel>
        </div>
      </Dialog>
    </section>
  );
}
