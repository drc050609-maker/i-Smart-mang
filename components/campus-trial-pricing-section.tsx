"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

import {
  updateCampusTrialPricing,
  type MoneyActionState,
} from "@/app/(dashboard)/finance-actions";
import { useLanguage } from "@/components/language-provider";
import { centsToDollarsInput, formatCentsAsCurrency } from "@/lib/money";
import { formatStaffLocationLabel, type StaffLocation } from "@/lib/staff-location";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: MoneyActionState = {};

export type CampusPricingRow = {
  id: number;
  slug: StaffLocation;
  name: string;
  trial_price_cents: number;
  trial_teacher_pay_cents: number;
};

export function CampusTrialPricingSection({
  campuses,
}: {
  campuses: CampusPricingRow[];
}) {
  const { language, t } = useLanguage();

  return (
    <section className="mt-10 rounded-lg border border-gray-200 p-4 dark:border-white/10">
      <div className="flex items-start gap-3">
        <CurrencyDollarIcon className="mt-0.5 size-5 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("settings.trialPricing")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.trialPricingDescription")}
          </p>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-gray-100 dark:divide-white/10">
        {campuses.map((campus) => (
          <li
            key={campus.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatStaffLocationLabel(campus.slug, language)}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("settings.trialFee")}:{" "}
                {formatCentsAsCurrency(campus.trial_price_cents, language)}
                {" · "}
                {t("settings.trialTeacherPay")}:{" "}
                {formatCentsAsCurrency(
                  campus.trial_teacher_pay_cents,
                  language,
                )}
              </p>
            </div>
            <EditCampusTrialPricingDialog campus={campus} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EditCampusTrialPricingDialog({ campus }: { campus: CampusPricingRow }) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: MoneyActionState, formData: FormData) => {
      const result = await updateCampusTrialPricing(prev, formData);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    initialState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
      >
        {t("common.edit")}
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
            <DialogPanel className="relative w-full max-w-md rounded-lg bg-white px-4 pt-5 pb-4 shadow-xl sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("settings.editTrialPricing")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatStaffLocationLabel(campus.slug, language)}
              </p>

              <form action={formAction} className="mt-5 space-y-4">
                <input type="hidden" name="locationId" value={campus.id} />
                <div>
                  <label htmlFor={`trial-price-${campus.id}`} className={labelClassName}>
                    {t("settings.trialFee")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`trial-price-${campus.id}`}
                      name="trialPrice"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      defaultValue={centsToDollarsInput(campus.trial_price_cents)}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor={`trial-pay-${campus.id}`}
                    className={labelClassName}
                  >
                    {t("settings.trialTeacherPay")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`trial-pay-${campus.id}`}
                      name="trialTeacherPay"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={centsToDollarsInput(
                        campus.trial_teacher_pay_cents,
                      )}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor={`trial-reason-${campus.id}`}
                    className={labelClassName}
                  >
                    {t("common.reason")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`trial-reason-${campus.id}`}
                      name="reason"
                      type="text"
                      defaultValue={t("settings.updatedTrialPricing")}
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
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60"
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
