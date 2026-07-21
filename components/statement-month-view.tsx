"use client";

import { useMemo, useState } from "react";

import { AddStatementEntryDialog } from "@/components/add-statement-entry-dialog";
import { EditAmountDialog } from "@/components/edit-amount-dialog";
import { useLanguage } from "@/components/language-provider";
import { correctManualStatementEntryAmount } from "@/app/(dashboard)/finance-actions";
import {
  formatStatementAmountCents,
  formatStatementEntryDate,
  getStatementExpenseCategory,
  type StatementEntryType,
  type StatementExpenseCategory,
} from "@/lib/statements";

export type StatementEntryRow = {
  id: number;
  entry_type: StatementEntryType;
  amount_cents: number;
  description: string;
  entry_date: string;
  class_payment_id: number | null;
  student_purchase_id: number | null;
  recurring_statement_entry_id: number | null;
  teacher_paycheck_id: number | null;
  financial_adjustment_id?: number | null;
  corrects_entry_id?: number | null;
};

type ExpenseFilter = "all" | StatementExpenseCategory;

const selectClassName =
  "rounded-md bg-white py-1.5 pr-8 pl-3 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

function sumCents(entries: StatementEntryRow[]) {
  return entries.reduce((total, entry) => total + entry.amount_cents, 0);
}

function EntryList({
  entries,
  emptyMessage,
}: {
  entries: StatementEntryRow[];
  emptyMessage: string;
}) {
  const { language, t } = useLanguage();

  if (entries.length === 0) {
    return (
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
      {entries.map((entry) => {
        const isManual =
          !entry.class_payment_id &&
          !entry.student_purchase_id &&
          !entry.teacher_paycheck_id &&
          !entry.recurring_statement_entry_id &&
          !entry.financial_adjustment_id &&
          !entry.corrects_entry_id;

        return (
          <li
            key={entry.id}
            className="flex items-start justify-between gap-4 py-3 first:pt-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {entry.description}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {formatStatementEntryDate(entry.entry_date, language)}
                {entry.class_payment_id
                  ? ` · ${t("common.fromPayment")}`
                  : entry.student_purchase_id
                    ? ` · ${t("common.fromPurchase")}`
                    : entry.teacher_paycheck_id
                      ? ` · ${t("common.fromPaycheck")}`
                      : entry.recurring_statement_entry_id
                        ? ` · ${t("common.fromRecurring")}`
                        : entry.financial_adjustment_id
                          ? ` · ${t("common.fromCorrection")}`
                          : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatStatementAmountCents(entry.amount_cents)}
              </p>
              {isManual ? (
                <EditAmountDialog
                  compact
                  title={t("common.editStatementAmount")}
                  description={t("common.manualEntryCorrectionHelp")}
                  currentAmountCents={entry.amount_cents}
                  action={correctManualStatementEntryAmount}
                  hiddenFields={{ entryId: entry.id }}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function filterExpensesByCategory(
  entries: StatementEntryRow[],
  category: StatementExpenseCategory,
) {
  return entries.filter(
    (entry) => getStatementExpenseCategory(entry) === category,
  );
}

export function StatementMonthView({
  year,
  month,
  entries,
}: {
  year: number;
  month: number;
  entries: StatementEntryRow[];
}) {
  const { t } = useLanguage();
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>("all");

  const incomeEntries = useMemo(
    () => entries.filter((entry) => entry.entry_type === "income"),
    [entries],
  );
  const expenseEntries = useMemo(
    () => entries.filter((entry) => entry.entry_type === "expense"),
    [entries],
  );
  const fixedExpenseEntries = useMemo(
    () => filterExpensesByCategory(expenseEntries, "fixed"),
    [expenseEntries],
  );
  const variableExpenseEntries = useMemo(
    () => filterExpensesByCategory(expenseEntries, "variable"),
    [expenseEntries],
  );

  const visibleExpenseEntries = useMemo(() => {
    if (expenseFilter === "all") {
      return expenseEntries;
    }

    return expenseFilter === "fixed"
      ? fixedExpenseEntries
      : variableExpenseEntries;
  }, [
    expenseFilter,
    expenseEntries,
    fixedExpenseEntries,
    variableExpenseEntries,
  ]);

  const incomeTotal = sumCents(incomeEntries);
  const fixedExpenseTotal = sumCents(fixedExpenseEntries);
  const variableExpenseTotal = sumCents(variableExpenseEntries);
  const expenseTotal = fixedExpenseTotal + variableExpenseTotal;
  const visibleExpenseTotal = sumCents(visibleExpenseEntries);
  const netTotal = incomeTotal - expenseTotal;

  function expenseEmptyMessage(filter: ExpenseFilter) {
    if (filter === "fixed") {
      return t("common.noFixedExpenses");
    }

    if (filter === "variable") {
      return t("common.noVariableExpenses");
    }

    return t("common.noExpenses");
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.totalIncome")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatStatementAmountCents(incomeTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.fixedExpenses")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
              {formatStatementAmountCents(fixedExpenseTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.variableExpenses")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
              {formatStatementAmountCents(variableExpenseTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.net")}
            </p>
            <p
              className={
                netTotal >= 0
                  ? "mt-1 text-2xl font-semibold text-gray-900 dark:text-white"
                  : "mt-1 text-2xl font-semibold text-red-600 dark:text-red-400"
              }
            >
              {formatStatementAmountCents(netTotal)}
            </p>
          </div>
        </div>

        <AddStatementEntryDialog year={year} month={month} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("common.income")}
            </h2>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatStatementAmountCents(incomeTotal)}
            </p>
          </div>
          <EntryList
            entries={incomeEntries}
            emptyMessage={t("common.noIncome")}
          />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("common.expenses")}
              </h2>
              <select
                id="statement-expense-filter"
                value={expenseFilter}
                onChange={(event) =>
                  setExpenseFilter(event.target.value as ExpenseFilter)
                }
                className={selectClassName}
                aria-label={t("common.expenses")}
              >
                <option value="all">{t("common.allExpenses")}</option>
                <option value="fixed">{t("common.fixedExpensesTab")}</option>
                <option value="variable">
                  {t("common.variableExpensesTab")}
                </option>
              </select>
            </div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              {formatStatementAmountCents(visibleExpenseTotal)}
            </p>
          </div>
          <EntryList
            entries={visibleExpenseEntries}
            emptyMessage={expenseEmptyMessage(expenseFilter)}
          />
        </section>
      </div>
    </div>
  );
}
