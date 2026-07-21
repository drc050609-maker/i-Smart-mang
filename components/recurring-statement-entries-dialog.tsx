"use client";

import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import {
  addRecurringStatementEntry,
  deleteRecurringStatementEntry,
  toggleRecurringStatementEntry,
  type RecurringStatementEntryRow,
  type StatementActionState,
} from "@/app/(dashboard)/statements/actions";
import { updateRecurringEntryAmount } from "@/app/(dashboard)/finance-actions";
import { ActiveToggle } from "@/components/active-toggle";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditAmountDialog } from "@/components/edit-amount-dialog";
import { useLanguage } from "@/components/language-provider";
import {
  formatStatementAmountCents,
  statementEntryTypeLabel,
  type StatementEntryType,
} from "@/lib/statements";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: StatementActionState = {};

function DeleteRecurringEntryButton({
  entry,
}: {
  entry: RecurringStatementEntryRow;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteRecurringStatementEntry(entry.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-white/10 dark:hover:text-red-400"
        aria-label={t("common.deleteRecurringEntry")}
      >
        <TrashIcon className="size-4" />
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={t("common.deleteRecurringEntry")}
        description={t("common.recurringEntriesHelp")}
        confirmLabel={t("common.delete")}
        pending={pending}
      />

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </>
  );
}

export function RecurringStatementEntriesDialog({
  entries,
}: {
  entries: RecurringStatementEntryRow[];
}) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<StatementEntryType>("expense");
  const [state, formAction, pending] = useActionState(
    addRecurringStatementEntry,
    initialState,
  );
  const [togglePending] = useTransition();

  useEffect(() => {
    if (state.success) {
      setEntryType("expense");
    }
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        <ArrowPathIcon aria-hidden="true" className="size-4" />
        {t("common.recurringEntries")}
      </button>

      <Dialog open={open} onClose={() => !pending && setOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("common.recurringEntries")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.recurringEntriesHelp")}
              </p>

              {entries.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  {t("common.noRecurringEntries")}
                </p>
              ) : (
                <ul className="mt-4 max-h-48 divide-y divide-gray-100 overflow-y-auto dark:divide-white/10">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.description}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {statementEntryTypeLabel(entry.entry_type, language)} ·{" "}
                          {t("common.dayOfMonth")} {entry.day_of_month} ·{" "}
                          {formatStatementAmountCents(entry.amount_cents)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <EditAmountDialog
                          compact
                          title={t("common.editRecurringAmount")}
                          description={t("common.recurringAmountEditHelp")}
                          currentAmountCents={entry.amount_cents}
                          action={updateRecurringEntryAmount}
                          hiddenFields={{ entryId: entry.id }}
                        />
                        <ActiveToggle
                          checked={entry.is_active}
                          disabled={togglePending}
                          label={t("common.toggleActiveStatus", {
                            name: entry.description,
                          })}
                          onToggle={(nextActive) =>
                            toggleRecurringStatementEntry(entry.id, nextActive)
                          }
                        />
                        <DeleteRecurringEntryButton entry={entry} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form action={formAction} className="mt-6 space-y-4 border-t border-gray-200 pt-6 dark:border-white/10">
                <input type="hidden" name="entryType" value={entryType} />

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t("common.addRecurringEntry")}
                </p>

                <div>
                  <span className={labelClassName}>{t("common.type")}</span>
                  <div className="mt-2 flex gap-2">
                    {(["income", "expense"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEntryType(type)}
                        className={
                          entryType === type
                            ? "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white"
                            : "rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
                        }
                      >
                        {statementEntryTypeLabel(type, language)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="recurring-amount" className={labelClassName}>
                    {t("common.amount")}
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        $
                      </span>
                    </div>
                    <input
                      id="recurring-amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className={`${inputClassName} pl-7`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="recurring-description"
                    className={labelClassName}
                  >
                    {t("common.description")}
                  </label>
                  <input
                    id="recurring-description"
                    name="description"
                    type="text"
                    required
                    placeholder={t("common.placeholderDescription")}
                    className={`${inputClassName} mt-2`}
                  />
                </div>

                <div>
                  <label htmlFor="recurring-day" className={labelClassName}>
                    {t("common.dayOfMonth")}
                  </label>
                  <input
                    id="recurring-day"
                    name="dayOfMonth"
                    type="number"
                    min={1}
                    max={28}
                    required
                    defaultValue={1}
                    className={`${inputClassName} mt-2`}
                  />
                </div>

                {state.error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {state.error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white"
                  >
                    {t("common.close")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {pending ? t("common.saving") : t("common.addEntry")}
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
