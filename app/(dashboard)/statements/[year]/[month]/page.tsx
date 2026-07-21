import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import {
  StatementMonthView,
  type StatementEntryRow,
} from "@/components/statement-month-view";
import {
  syncRecurringStatementEntries,
} from "@/app/(dashboard)/statements/actions";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import {
  formatStatementMonth,
  isValidStatementMonth,
  monthDateRange,
} from "@/lib/statements";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
  params: Promise<{ year: string; month: string }>;
};

export default async function StatementMonthPage({ params }: PageProps) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const { year: yearParam, month: monthParam } = await params;
  const year = Number(yearParam);
  const month = Number(monthParam);

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !isValidStatementMonth(month)
  ) {
    notFound();
  }

  const label = formatStatementMonth(year, month, staff.preferred_language);
  const { start, end } = monthDateRange(year, month);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await syncRecurringStatementEntries(year, month);

  const { data, error } = await supabase
    .from("statement_entries")
    .select(
      "id, entry_type, amount_cents, description, entry_date, class_payment_id, student_purchase_id, recurring_statement_entry_id, teacher_paycheck_id, financial_adjustment_id, corrects_entry_id",
    )
    .gte("entry_date", start)
    .lte("entry_date", end)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const entries = (data as StatementEntryRow[] | null) ?? [];

  return (
    <div>
      <div>
        <Link
          href="/statements"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("common.backToStatements")}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
          {label}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.statementMonthIncome", { month: label })}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("common.statementEntries"), message: error.message })}
        </p>
      ) : (
        <StatementMonthView year={year} month={month} entries={entries} />
      )}
    </div>
  );
}
