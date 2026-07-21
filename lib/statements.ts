import { translate, type TranslationKey } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import { appLanguageLocale } from "@/lib/language";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_NAME_KEYS: TranslationKey[] = [
  "enum.month.january",
  "enum.month.february",
  "enum.month.march",
  "enum.month.april",
  "enum.month.may",
  "enum.month.june",
  "enum.month.july",
  "enum.month.august",
  "enum.month.september",
  "enum.month.october",
  "enum.month.november",
  "enum.month.december",
];

export function getMonthName(month: number, language: AppLanguage = "en") {
  const key = MONTH_NAME_KEYS[month - 1];
  if (!key) return null;
  return translate(language, key);
}

export function formatStatementMonth(
  year: number,
  month: number,
  language: AppLanguage = "en",
): string {
  const name = getMonthName(month, language);
  if (!name) return `${year}`;
  return translate(language, "format.statementMonth", { month: name, year });
}

export function statementMonthHref(year: number, month: number): string {
  return `/statements/${year}/${month}`;
}

export function isValidStatementMonth(month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

/** True when the calendar month is entirely before the reference month. */
export function isPastStatementMonth(
  year: number,
  month: number,
  referenceDate = new Date(),
): boolean {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;

  if (year < refYear) {
    return true;
  }

  if (year > refYear) {
    return false;
  }

  return month < refMonth;
}

export function partitionStatementMonths(
  year: number,
  referenceDate = new Date(),
): { current: number[]; history: number[] } {
  const current: number[] = [];
  const history: number[] = [];

  for (let month = 1; month <= 12; month += 1) {
    if (isPastStatementMonth(year, month, referenceDate)) {
      history.push(month);
    } else {
      current.push(month);
    }
  }

  return { current, history };
}

export type StatementPeriod = {
  year: number;
  month: number;
};

export function statementPeriodKey(year: number, month: number) {
  return `${year}-${month}`;
}

export function periodsFromEntryDates(entryDates: string[]): StatementPeriod[] {
  const seen = new Set<string>();
  const periods: StatementPeriod[] = [];

  for (const entryDate of entryDates) {
    const [year, month] = entryDate.split("-").map(Number);
    if (!Number.isInteger(year) || !isValidStatementMonth(month)) {
      continue;
    }

    const key = statementPeriodKey(year, month);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    periods.push({ year, month });
  }

  return periods;
}

export function mergeStatementPeriods(
  ...sources: StatementPeriod[][]
): StatementPeriod[] {
  const seen = new Set<string>();
  const merged: StatementPeriod[] = [];

  for (const period of sources.flat()) {
    const key = statementPeriodKey(period.year, period.month);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(period);
  }

  return merged;
}

export function listStatementPeriods(
  periods: StatementPeriod[],
  currentYear: number,
): StatementPeriod[] {
  const seen = new Set<string>();
  const result: StatementPeriod[] = [];

  for (let month = 1; month <= 12; month += 1) {
    const key = statementPeriodKey(currentYear, month);
    seen.add(key);
    result.push({ year: currentYear, month });
  }

  for (const period of periods) {
    const key = statementPeriodKey(period.year, period.month);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(period);
  }

  return result.sort((periodA, periodB) => {
    if (periodA.year !== periodB.year) {
      return periodB.year - periodA.year;
    }

    return periodB.month - periodA.month;
  });
}

export function partitionStatementPeriods(
  periods: StatementPeriod[],
  referenceDate = new Date(),
): { current: StatementPeriod[]; history: StatementPeriod[] } {
  const current: StatementPeriod[] = [];
  const history: StatementPeriod[] = [];

  for (const period of periods) {
    if (isPastStatementMonth(period.year, period.month, referenceDate)) {
      history.push(period);
    } else {
      current.push(period);
    }
  }

  const sortNewestFirst = (
    periodA: StatementPeriod,
    periodB: StatementPeriod,
  ) => {
    if (periodA.year !== periodB.year) {
      return periodB.year - periodA.year;
    }

    return periodB.month - periodA.month;
  };

  return {
    current: current.sort(sortNewestFirst),
    history: history.sort(sortNewestFirst),
  };
}

export type StatementYearGroup = {
  year: number;
  periods: StatementPeriod[];
};

export function groupStatementPeriodsByYear(
  periods: StatementPeriod[],
): StatementYearGroup[] {
  const byYear = new Map<number, StatementPeriod[]>();

  for (const period of periods) {
    const yearPeriods = byYear.get(period.year) ?? [];
    yearPeriods.push(period);
    byYear.set(period.year, yearPeriods);
  }

  return [...byYear.entries()]
    .sort(([yearA], [yearB]) => yearB - yearA)
    .map(([year, yearPeriods]) => ({
      year,
      periods: yearPeriods.sort(
        (periodA, periodB) => periodB.month - periodA.month,
      ),
    }));
}

export type StatementEntryType = "income" | "expense";

export type StatementExpenseCategory = "fixed" | "variable";

export function getStatementExpenseCategory(entry: {
  recurring_statement_entry_id: number | null;
}): StatementExpenseCategory {
  return entry.recurring_statement_entry_id != null ? "fixed" : "variable";
}

export function statementExpenseCategoryLabel(
  category: StatementExpenseCategory,
  language: AppLanguage = "en",
) {
  return translate(
    language,
    category === "fixed"
      ? "enum.statementExpenseCategory.fixed"
      : "enum.statementExpenseCategory.variable",
  );
}

export const STATEMENT_ENTRY_TYPES = ["income", "expense"] as const;

export function parseStatementEntryType(
  value: FormDataEntryValue | null,
): StatementEntryType | null {
  const entryType = value?.toString().trim();
  if (
    !entryType ||
    !STATEMENT_ENTRY_TYPES.includes(entryType as StatementEntryType)
  ) {
    return null;
  }
  return entryType as StatementEntryType;
}

export function statementEntryTypeLabel(
  entryType: StatementEntryType,
  language: AppLanguage = "en",
) {
  return translate(
    language,
    entryType === "income"
      ? "enum.statementEntryType.income"
      : "enum.statementEntryType.expense",
  );
}

export function monthDateRange(year: number, month: number) {
  const monthPart = String(month).padStart(2, "0");
  const start = `${year}-${monthPart}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${monthPart}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function defaultEntryDateForMonth(year: number, month: number) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  if (year === currentYear && month === currentMonth) {
    const monthPart = String(month).padStart(2, "0");
    const dayPart = String(today.getDate()).padStart(2, "0");
    return `${year}-${monthPart}-${dayPart}`;
  }

  return monthDateRange(year, month).end;
}

export function formatStatementAmountCents(amountCents: number) {
  return (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatStatementEntryDate(
  date: string,
  language: AppLanguage = "en",
) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(
    appLanguageLocale(language),
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

export function revalidateStatementMonthPaths(year: number, month: number) {
  return [`/statements/${year}/${month}`, "/statements"] as const;
}
