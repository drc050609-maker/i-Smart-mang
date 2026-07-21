"use client";

import { useActionState, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

import type { MoneyActionState } from "@/app/(dashboard)/finance-actions";
import { useLanguage } from "@/components/language-provider";
import { centsToDollarsInput, formatCentsAsCurrency } from "@/lib/money";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: MoneyActionState = {};

type MoneyAction = (
  prev: MoneyActionState,
  formData: FormData,
) => Promise<MoneyActionState>;

export function EditAmountDialog({
  title,
  description,
  currentAmountCents,
  originalAmountCents,
  action,
  hiddenFields,
  allowZero = false,
  buttonLabel,
  compact = false,
}: {
  title: string;
  description?: string;
  currentAmountCents: number;
  originalAmountCents?: number;
  action: MoneyAction;
  hiddenFields: Record<string, string | number>;
  allowZero?: boolean;
  buttonLabel?: string;
  compact?: boolean;
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: MoneyActionState, formData: FormData) => {
      const result = await action(prev, formData);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    initialState,
  );

  const showOriginal =
    originalAmountCents != null &&
    originalAmountCents !== currentAmountCents;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-white/10 dark:hover:text-indigo-400"
            : "inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
        }
        aria-label={buttonLabel ?? t("common.editAmount")}
      >
        <PencilSquareIcon className="size-4" aria-hidden="true" />
        {compact ? null : (buttonLabel ?? t("common.editAmount"))}
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
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
                {title}
              </DialogTitle>
              {description ? (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              ) : null}

              <dl className="mt-4 space-y-1 text-sm">
                {showOriginal ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 dark:text-gray-400">
                      {t("common.originalAmount")}
                    </dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {formatCentsAsCurrency(originalAmountCents, language)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500 dark:text-gray-400">
                    {t("common.currentAmount")}
                  </dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {formatCentsAsCurrency(currentAmountCents, language)}
                  </dd>
                </div>
              </dl>

              <form action={formAction} className="mt-5 space-y-4">
                {Object.entries(hiddenFields).map(([name, value]) => (
                  <input
                    key={name}
                    type="hidden"
                    name={name}
                    value={String(value)}
                  />
                ))}

                <div>
                  <label htmlFor="edit-amount" className={labelClassName}>
                    {t("common.newAmount")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="edit-amount"
                      name="amount"
                      type="number"
                      inputMode="decimal"
                      min={allowZero ? "0" : "0.01"}
                      step="0.01"
                      required
                      defaultValue={centsToDollarsInput(currentAmountCents)}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-reason" className={labelClassName}>
                    {t("common.reason")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="edit-reason"
                      name="reason"
                      type="text"
                      required
                      placeholder={t("common.correctionReasonPlaceholder")}
                      className={inputClassName}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("common.correctionKeepsHistory")}
                  </p>
                </div>

                {state.error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {state.error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    {pending ? t("common.saving") : t("common.saveCorrection")}
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

export type EditAmountDialogProps = ComponentProps<typeof EditAmountDialog>;
