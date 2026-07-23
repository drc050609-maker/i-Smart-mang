"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

import {
  updateClassPricing,
  type MoneyActionState,
} from "@/app/(dashboard)/finance-actions";
import { useLanguage } from "@/components/language-provider";
import { centsToDollarsInput } from "@/lib/money";
import {
  isTrialLesson,
  PACKAGE_20_COUNT,
  PACKAGE_20_DISCOUNT,
  PACKAGE_50_COUNT,
  PACKAGE_50_DISCOUNT,
  packageTuition,
  type TuitionPricing,
} from "@/lib/tuition";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: MoneyActionState = {};

export type PricingField = "single" | "package20" | "package50";

const FIELD_TITLE_KEY = {
  single: "common.singleClassPrice",
  package20: "common.package20Price",
  package50: "common.package50Price",
} as const;

function dollarsDefault(amount: number | null | undefined): string {
  if (amount == null) return "";
  return centsToDollarsInput(Math.round(amount * 100));
}

function resolvedPricing(pricing: TuitionPricing): TuitionPricing {
  const perClass = pricing.perClass;
  return {
    perClass,
    package20:
      pricing.package20 ??
      packageTuition(perClass, PACKAGE_20_COUNT, PACKAGE_20_DISCOUNT),
    package50:
      pricing.package50 ??
      packageTuition(perClass, PACKAGE_50_COUNT, PACKAGE_50_DISCOUNT),
  };
}

export function EditClassPricingDialog({
  classId,
  subject,
  lessonType,
  pricing,
  field = "single",
}: {
  classId: number;
  subject: string;
  lessonType: string | null;
  pricing: TuitionPricing;
  /** Which price to edit. Other fields are submitted unchanged. */
  field?: PricingField;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: MoneyActionState, formData: FormData) => {
      const result = await updateClassPricing(prev, formData);
      if (result.success) {
        setOpen(false);
      }
      return result;
    },
    initialState,
  );
  const trial = isTrialLesson(lessonType);
  const fieldTitle = t(FIELD_TITLE_KEY[field]);
  const values = resolvedPricing(pricing);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-white/10 dark:hover:text-indigo-400"
        aria-label={`${t("common.changePricing")}: ${fieldTitle}`}
        title={`${t("common.changePricing")}: ${fieldTitle}`}
      >
        <PencilSquareIcon className="size-3.5" />
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
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("common.changePricing")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subject} · {fieldTitle}
              </p>

              <form action={formAction} className="mt-5 space-y-4">
                <input type="hidden" name="classId" value={classId} />
                <input
                  type="hidden"
                  name="isTrial"
                  value={trial ? "true" : "false"}
                />

                {field !== "single" ? (
                  <input
                    type="hidden"
                    name="singlePrice"
                    value={dollarsDefault(values.perClass)}
                  />
                ) : null}
                {!trial && field !== "package20" ? (
                  <input
                    type="hidden"
                    name="package20Price"
                    value={dollarsDefault(values.package20)}
                  />
                ) : null}
                {!trial && field !== "package50" ? (
                  <input
                    type="hidden"
                    name="package50Price"
                    value={dollarsDefault(values.package50)}
                  />
                ) : null}

                {field === "single" ? (
                  <div>
                    <label
                      htmlFor={`single-${classId}-${field}`}
                      className={labelClassName}
                    >
                      {t("common.singleClassPrice")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`single-${classId}-${field}`}
                        name="singlePrice"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        defaultValue={dollarsDefault(values.perClass)}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                ) : null}

                {!trial && field === "package20" ? (
                  <div>
                    <label
                      htmlFor={`pkg20-${classId}`}
                      className={labelClassName}
                    >
                      {t("common.package20Price")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`pkg20-${classId}`}
                        name="package20Price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        defaultValue={dollarsDefault(values.package20)}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                ) : null}

                {!trial && field === "package50" ? (
                  <div>
                    <label
                      htmlFor={`pkg50-${classId}`}
                      className={labelClassName}
                    >
                      {t("common.package50Price")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`pkg50-${classId}`}
                        name="package50Price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        defaultValue={dollarsDefault(values.package50)}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor={`reason-${classId}-${field}`}
                    className={labelClassName}
                  >
                    {t("common.reason")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`reason-${classId}-${field}`}
                      name="reason"
                      type="text"
                      defaultValue={t("common.updatedClassPricing")}
                      className={inputClassName}
                    />
                  </div>
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
                    {pending ? t("common.saving") : t("common.saveChanges")}
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
