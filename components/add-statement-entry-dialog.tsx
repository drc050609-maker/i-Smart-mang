"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/outline";

import {
  addStatementEntry,
  type StatementActionState,
} from "@/app/(dashboard)/statements/actions";
import { useLanguage } from "@/components/language-provider";
import {
  statementEntryTypeLabel,
  type StatementEntryType,
} from "@/lib/statements";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: StatementActionState = {};

export function AddStatementEntryDialog({
  year,
  month,
  defaultEntryType = "income",
}: {
  year: number;
  month: number;
  defaultEntryType?: StatementEntryType;
}) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<StatementEntryType>(defaultEntryType);
  const [state, formAction, pending] = useActionState(
    addStatementEntry,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  function openDialog(type: StatementEntryType) {
    setEntryType(type);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openDialog("income")}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("common.addIncome")}
        </button>
        <button
          type="button"
          onClick={() => openDialog("expense")}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/15"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("common.addExpense")}
        </button>
      </div>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-300 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-lg sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <DialogTitle
                as="h3"
                className="text-base font-semibold text-gray-900 dark:text-white"
              >
                {t("common.addEntry")} — {statementEntryTypeLabel(entryType, language)}
              </DialogTitle>

              <form action={formAction} className="mt-4 space-y-4">
                <input type="hidden" name="year" value={year} />
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="entryType" value={entryType} />

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
                  <label htmlFor="statement-amount" className={labelClassName}>
                    {t("common.amount")}
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        $
                      </span>
                    </div>
                    <input
                      id="statement-amount"
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
                    htmlFor="statement-description"
                    className={labelClassName}
                  >
                    {t("common.description")}
                  </label>
                  <input
                    id="statement-description"
                    name="description"
                    type="text"
                    required
                    placeholder={t("common.placeholderDescription")}
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
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/15"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    {pending ? t("common.saving") : t("common.saveEntry")}
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
