import { cookies } from "next/headers";

import { RecurringStatementEntriesDialog } from "@/components/recurring-statement-entries-dialog";
import { StatementsMonthList } from "@/components/statements-month-list";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import {
  listStatementPeriods,
  mergeStatementPeriods,
  periodsFromEntryDates,
} from "@/lib/statements";
import { createClient } from "@/utils/supabase/server";

export default async function StatementsPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const currentYear = new Date().getFullYear();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { data: entryRows, error: entriesError },
    { data: periodRows, error: periodsError },
    { data: recurringRows, error: recurringError },
  ] = await Promise.all([
    supabase.from("statement_entries").select("entry_date"),
    supabase.from("statement_periods").select("year, month"),
    supabase
      .from("recurring_statement_entries")
      .select("id, entry_type, amount_cents, description, day_of_month, is_active")
      .order("description"),
  ]);

  const loadError =
    entriesError?.message ??
    periodsError?.message ??
    recurringError?.message ??
    null;

  const periods = listStatementPeriods(
    mergeStatementPeriods(
      periodsFromEntryDates(
        (entryRows ?? []).map((row) => row.entry_date),
      ),
      (periodRows ?? []).map((row) => ({
        year: row.year,
        month: row.month,
      })),
    ),
    currentYear,
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t("nav.statements")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.statementsSubtitle")}
          </p>
        </div>
        <RecurringStatementEntriesDialog entries={recurringRows ?? []} />
      </div>

      {loadError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.statements"), message: loadError })}
        </p>
      ) : (
        <StatementsMonthList periods={periods} />
      )}
    </div>
  );
}
