"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import {
  recordTeacherPaycheck,
  saveTeacherClassPayRate,
  type PaycheckActionState,
} from "@/app/(dashboard)/tutors/paycheck-actions";
import { correctTeacherPaycheckAmount } from "@/app/(dashboard)/finance-actions";
import { EditAmountDialog } from "@/components/edit-amount-dialog";
import { useLanguage } from "@/components/language-provider";
import { Listbox, ListboxLabel, ListboxOption } from "@/components/listbox";
import { formatClassSubject } from "@/lib/class-subject";
import {
  formatStatementAmountCents,
  formatStatementMonth,
  statementMonthHref,
} from "@/lib/statements";
import { appLanguageLocale } from "@/lib/language";
import {
  paycheckPeriodKey,
  payRatesToInputValues,
  type TeacherPaycheckPeriodData,
} from "@/lib/teacher-paycheck";

const inputClassName =
  "block w-24 rounded-md bg-white px-3 py-1.5 text-right text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const initialState: PaycheckActionState = {};

type PaycheckLineSummary = {
  classId: number;
  subject: string;
  sessionCount: number;
  rateCents: number;
  lineTotalCents: number;
};

function formatRecordedAt(iso: string, language: "en" | "zh") {
  return new Date(iso).toLocaleString(appLanguageLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildLineSummaries(
  classLines: TeacherPaycheckPeriodData["classLines"],
  rates: Record<number, string>,
): PaycheckLineSummary[] {
  return classLines.map((line) => {
    const rate = Number(rates[line.classId] ?? "");
    const rateCents =
      Number.isFinite(rate) && rate >= 0 ? Math.round(rate * 100) : 0;

    return {
      classId: line.classId,
      subject: line.subject,
      sessionCount: line.sessionCount,
      rateCents,
      lineTotalCents: line.sessionCount * rateCents,
    };
  });
}

function PaycheckPeriodCard({
  teacherId,
  period,
  rates,
  onRateChange,
  onRateBlur,
}: {
  teacherId: number;
  period: TeacherPaycheckPeriodData;
  rates: Record<number, string>;
  onRateChange: (classId: number, value: string) => void;
  onRateBlur: (classId: number, value: string) => void;
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    recordTeacherPaycheck,
    initialState,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const savedPaycheck = period.savedPaycheck;
  const isRecorded = savedPaycheck !== null;

  useEffect(() => {
    setConfirmOpen(false);
    setFormError(null);
  }, [period.year, period.month]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setConfirmOpen(false);
    router.refresh();
  }, [state.success, router]);

  useEffect(() => {
    if (state.error) {
      setFormError(state.error);
    }
  }, [state.error]);

  const lineSummaries = useMemo(
    () => buildLineSummaries(period.classLines, rates),
    [period.classLines, rates],
  );

  const liveTotalCents = useMemo(() => {
    return lineSummaries.reduce((sum, line) => sum + line.lineTotalCents, 0);
  }, [lineSummaries]);

  const liveTotalSessions = useMemo(() => {
    return period.classLines.reduce((sum, line) => sum + line.sessionCount, 0);
  }, [period.classLines]);

  const linesPayload = useMemo(
    () =>
      JSON.stringify(
        period.classLines.map((line) => ({
          classId: line.classId,
          sessionCount: line.sessionCount,
          rate: Number(rates[line.classId] ?? 0),
        })),
      ),
    [period.classLines, rates],
  );

  function handleRateChange(classId: number, value: string) {
    setFormError(null);
    onRateChange(classId, value);
  }

  function handleRateBlur(classId: number, value: string) {
    onRateBlur(classId, value);
  }

  function openConfirmDialog() {
    if (liveTotalCents <= 0) {
      setFormError(t("common.enterPayRateForClass"));
      return;
    }

    setFormError(null);
    setConfirmOpen(true);
  }

  function closeConfirmDialog() {
    if (!isPending) {
      setConfirmOpen(false);
    }
  }

  if (period.classLines.length === 0) {
    return (
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t("common.assignClassesForPaycheck")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isRecorded
            ? t("common.recordedAt", {
                date: formatRecordedAt(savedPaycheck.createdAt, language),
              })
            : t("common.classesThisPeriod", { count: liveTotalSessions })}
        </p>
        {isRecorded ? (
          <div className="flex items-center gap-3">
            <EditAmountDialog
              title={t("common.editPaycheckAmount")}
              description={t("common.correctionKeepsHistory")}
              currentAmountCents={savedPaycheck.effectiveAmountCents}
              originalAmountCents={savedPaycheck.totalAmountCents}
              action={correctTeacherPaycheckAmount}
              hiddenFields={{ paycheckId: savedPaycheck.id }}
              allowZero
            />
            <Link
              href={statementMonthHref(period.year, period.month)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t("common.viewInStatements")}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
          <thead>
            <tr>
              <th
                scope="col"
                className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {t("common.class")}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {t("common.classesColumn")}
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {t("common.ratePerClass")}
              </th>
              <th
                scope="col"
                className="py-2 pl-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                {t("common.subtotal")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {period.classLines.map((line) => {
              const savedLine = savedPaycheck?.lines.find(
                (saved) => saved.classId === line.classId,
              );
              const rateValue = isRecorded
                ? savedLine
                  ? (savedLine.rateCents / 100).toString()
                  : "0"
                : (rates[line.classId] ?? "");
              const subtotalCents = isRecorded
                ? (savedLine?.lineTotalCents ?? 0)
                : (() => {
                    const rate = Number(rateValue);
                    if (!Number.isFinite(rate) || rate < 0) {
                      return 0;
                    }

                    return line.sessionCount * Math.round(rate * 100);
                  })();

              return (
                <tr key={line.classId}>
                  <td className="py-3 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                    {formatClassSubject(line.subject, language)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {isRecorded ? (savedLine?.sessionCount ?? line.sessionCount) : line.sessionCount}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {isRecorded ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatStatementAmountCents(
                          savedLine?.rateCents ?? 0,
                        )}
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={rateValue}
                          onChange={(event) =>
                            handleRateChange(line.classId, event.target.value)
                          }
                          onBlur={(event) =>
                            handleRateBlur(line.classId, event.target.value)
                          }
                          placeholder="0"
                          className={inputClassName}
                          aria-label={`${t("common.ratePerClass")} — ${formatClassSubject(line.subject, language)}`}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3 pl-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {formatStatementAmountCents(subtotalCents)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-white/10">
              <td
                colSpan={3}
                className="py-3 pr-3 text-right text-sm font-semibold text-gray-900 dark:text-white"
              >
                {t("common.totalPaycheck")}
              </td>
              <td className="py-3 pl-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                {formatStatementAmountCents(
                  isRecorded
                    ? savedPaycheck.effectiveAmountCents
                    : liveTotalCents,
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isRecorded ? (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
          {t("common.recordedAsExpenseFor", {
            month: formatStatementMonth(period.year, period.month, language),
          })}
        </p>
      ) : (
        <div className="mt-4">
          {formError && !confirmOpen ? (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400">{formError}</p>
          ) : null}

          <button
            type="button"
            onClick={openConfirmDialog}
            disabled={liveTotalCents <= 0}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
          >
            {t("common.reviewPaycheck")}
          </button>

          <form ref={formRef} action={formAction} className="hidden">
            <input type="hidden" name="teacherId" value={teacherId} />
            <input type="hidden" name="year" value={period.year} />
            <input type="hidden" name="month" value={period.month} />
            <input type="hidden" name="lines" value={linesPayload} />
          </form>

          <Dialog
            open={confirmOpen}
            onClose={closeConfirmDialog}
            className="relative z-50"
          >
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
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {t("common.confirmPaycheckTitle")}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.confirmPaycheckReview", {
                      month: formatStatementMonth(
                        period.year,
                        period.month,
                        language,
                      ),
                    })}
                  </p>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                          >
                            {t("common.class")}
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                          >
                            {t("common.classesColumn")}
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                          >
                            {t("common.rate")}
                          </th>
                          <th
                            scope="col"
                            className="py-2 pl-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                          >
                            {t("common.subtotal")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                        {lineSummaries.map((line) => (
                          <tr key={line.classId}>
                            <td className="py-2.5 pr-3 text-sm text-gray-900 dark:text-white">
                              {formatClassSubject(line.subject, language)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">
                              {line.sessionCount}
                            </td>
                            <td className="px-3 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">
                              {formatStatementAmountCents(line.rateCents)}
                            </td>
                            <td className="py-2.5 pl-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                              {formatStatementAmountCents(line.lineTotalCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 dark:border-white/10">
                          <td
                            colSpan={3}
                            className="py-3 pr-3 text-right text-sm font-semibold text-gray-900 dark:text-white"
                          >
                            {t("common.totalPaycheck")}
                          </td>
                          <td className="py-3 pl-3 text-right text-base font-semibold text-gray-900 dark:text-white">
                            {formatStatementAmountCents(liveTotalCents)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.paycheckExpenseWillRecord", {
                      count: liveTotalSessions,
                      month: formatStatementMonth(
                        period.year,
                        period.month,
                        language,
                      ),
                    })}
                  </p>

                  {formError && confirmOpen ? (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {formError}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeConfirmDialog}
                      disabled={isPending}
                      className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                    >
                      {t("common.back")}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => formRef.current?.requestSubmit()}
                      className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      {isPending
                        ? t("common.recording")
                        : t("common.confirmAndRecordPaycheck")}
                    </button>
                  </div>
                </DialogPanel>
              </div>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  );
}

export function TeacherPaycheckSection({
  teacherId,
  periods,
  defaultPayRates,
}: {
  teacherId: number;
  periods: TeacherPaycheckPeriodData[];
  defaultPayRates: Record<number, number>;
}) {
  const { language, t } = useLanguage();
  const defaultPeriodKey = periods[0]
    ? paycheckPeriodKey(periods[0].year, periods[0].month)
    : "";
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(defaultPeriodKey);
  const [rates, setRates] = useState<Record<number, string>>(() =>
    payRatesToInputValues(defaultPayRates),
  );
  const [rateSaveError, setRateSaveError] = useState<string | null>(null);

  const selectedPeriod =
    periods.find(
      (period) =>
        paycheckPeriodKey(period.year, period.month) === selectedPeriodKey,
    ) ?? periods[0] ?? null;

  function handleRateChange(classId: number, value: string) {
    setRateSaveError(null);
    setRates((current) => ({ ...current, [classId]: value }));
  }

  async function handleRateBlur(classId: number, value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const rate = Number(trimmed);
    if (!Number.isFinite(rate) || rate < 0) {
      return;
    }

    const result = await saveTeacherClassPayRate(teacherId, classId, rate);
    if (result.error) {
      setRateSaveError(result.error);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t("common.paycheck")}
      </h2>

      {periods.length > 0 ? (
        <div className="mt-3">
          <label
            id="paycheck-period-label"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("common.month")}
          </label>
          <Listbox
            aria-labelledby="paycheck-period-label"
            value={selectedPeriodKey}
            onChange={setSelectedPeriodKey}
            className="mt-1.5"
          >
            {periods.map((period) => {
              const key = paycheckPeriodKey(period.year, period.month);
              const recorded = period.savedPaycheck !== null;

              return (
                <ListboxOption key={key} value={key}>
                  <ListboxLabel>
                    {formatStatementMonth(period.year, period.month, language)}
                    {recorded ? ` · ${t("common.recorded")}` : ""}
                  </ListboxLabel>
                </ListboxOption>
              );
            })}
          </Listbox>
        </div>
      ) : null}

      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t("common.paycheckRatesHelp")}
      </p>

      {rateSaveError ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{rateSaveError}</p>
      ) : null}

      {selectedPeriod ? (
        <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-white/10">
          <PaycheckPeriodCard
            teacherId={teacherId}
            period={selectedPeriod}
            rates={rates}
            onRateChange={handleRateChange}
            onRateBlur={handleRateBlur}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noPaycheckPeriods")}
        </p>
      )}
    </section>
  );
}
