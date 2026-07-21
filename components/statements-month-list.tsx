"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import {
  getMonthName,
  groupStatementPeriodsByYear,
  type StatementPeriod,
  statementMonthHref,
} from "@/lib/statements";

const selectClassName =
  "rounded-md bg-white py-1.5 pr-8 pl-3 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

function MonthCard({
  year,
  month,
  language,
}: StatementPeriod & { language: "en" | "zh" }) {
  const monthName = getMonthName(month, language);

  if (!monthName) {
    return null;
  }

  return (
    <li>
      <Link
        href={statementMonthHref(year, month)}
        className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-white/10 dark:bg-gray-900/40 dark:hover:border-indigo-500/40"
      >
        <span className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
          {monthName}
          <span
            className="ml-1 inline text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
            aria-hidden
          >
            →
          </span>
        </span>
      </Link>
    </li>
  );
}

export function StatementsMonthList({
  periods,
}: {
  periods: StatementPeriod[];
}) {
  const { language, t } = useLanguage();
  const yearGroups = useMemo(
    () => groupStatementPeriodsByYear(periods),
    [periods],
  );
  const currentYear = new Date().getFullYear();
  const defaultYear =
    yearGroups.find((group) => group.year === currentYear)?.year ??
    yearGroups[0]?.year ??
    currentYear;
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const selectedYearPeriods = useMemo(() => {
    return yearGroups.find((group) => group.year === selectedYear)?.periods ?? [];
  }, [yearGroups, selectedYear]);

  if (periods.length === 0) {
    return (
      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        {t("common.statementsAutoMonths")}
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="statements-year"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t("common.year")}
        </label>
        <select
          id="statements-year"
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className={selectClassName}
        >
          {yearGroups.map(({ year }) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label={`${selectedYear} statements`}>
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {selectedYearPeriods.map((period) => (
            <MonthCard
              key={`${period.year}-${period.month}`}
              year={period.year}
              month={period.month}
              language={language}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}
