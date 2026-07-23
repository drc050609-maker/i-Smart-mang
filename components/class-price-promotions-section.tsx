"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import {
  createClassPricePromotion,
  deactivateClassPricePromotion,
  type MoneyActionState,
} from "@/app/(dashboard)/finance-actions";
import {
  ClassCombobox,
  type ClassOption as ClassPickerOption,
} from "@/components/class-combobox";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import {
  formatTuition,
  isPromotionActiveOnDate,
  type ClassPricePromotion,
} from "@/lib/tuition";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: MoneyActionState = {};

type ClassOption = {
  id: number;
  subject: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ClassPricePromotionsSection({
  classes,
  promotions,
}: {
  classes: ClassOption[];
  promotions: ClassPricePromotion[];
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassPickerOption | null>(
    null,
  );
  const today = todayIsoDate();

  const classPickerOptions = useMemo<ClassPickerOption[]>(
    () =>
      classes.map((classRow) => ({
        id: classRow.id,
        subject: classRow.subject,
        teacher: null,
      })),
    [classes],
  );

  const subjectById = useMemo(() => {
    const map = new Map<number, string>();
    for (const classRow of classes) {
      map.set(classRow.id, classRow.subject);
    }
    return map;
  }, [classes]);

  const sortedPromotions = useMemo(
    () =>
      [...promotions].sort((a, b) => {
        if (a.start_date === b.start_date) {
          return b.id - a.id;
        }
        return a.start_date < b.start_date ? 1 : -1;
      }),
    [promotions],
  );

  const [createState, createAction, createPending] = useActionState(
    async (prev: MoneyActionState, formData: FormData) => {
      const result = await createClassPricePromotion(prev, formData);
      if (result.success) {
        setSelectedClass(null);
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  function openDialog() {
    setSelectedClass(null);
    setOpen(true);
  }

  function closeDialog() {
    setSelectedClass(null);
    setOpen(false);
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.specialPacks")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.specialPacksSubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={openDialog}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {t("common.addSpecialPack")}
        </button>
      </div>

      {sortedPromotions.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noSpecialPacks")}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
            <thead>
              <tr>
                <th className="py-3.5 pr-3 pl-0 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.name")}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.class")}
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.dates")}
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.perClass")}
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.packageCountPack", { count: 20 })}
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.packageCountPack", { count: 50 })}
                </th>
                <th className="py-3.5 pr-0 pl-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {sortedPromotions.map((promo) => {
                const activeNow = isPromotionActiveOnDate(promo, today);
                const subject = subjectById.get(promo.class_id) ?? `#${promo.class_id}`;

                return (
                  <tr key={promo.id}>
                    <td className="py-4 pr-3 pl-0 text-sm font-medium text-gray-900 dark:text-white">
                      {promo.name}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatClassSubject(subject, language)}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {promo.start_date} → {promo.end_date}
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {promo.single_price_cents != null
                        ? formatTuition(promo.single_price_cents / 100, language)
                        : "—"}
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {promo.package_20_price_cents != null
                        ? formatTuition(
                            promo.package_20_price_cents / 100,
                            language,
                          )
                        : "—"}
                    </td>
                    <td className="px-3 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                      {promo.package_50_price_cents != null
                        ? formatTuition(
                            promo.package_50_price_cents / 100,
                            language,
                          )
                        : "—"}
                    </td>
                    <td className="py-4 pr-0 pl-3 text-right text-sm whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className={
                            activeNow
                              ? "text-green-700 dark:text-green-400"
                              : promo.is_active
                                ? "text-amber-700 dark:text-amber-400"
                                : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          {activeNow
                            ? t("common.promoActiveNow")
                            : promo.is_active
                              ? t("common.promoScheduled")
                              : t("common.inactive")}
                        </span>
                        {promo.is_active ? (
                          <DeactivatePromotionButton promotionId={promo.id} />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("common.addSpecialPack")}
              </DialogTitle>

              <form action={createAction} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="promo-name" className={labelClassName}>
                    {t("common.name")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="promo-name"
                      name="name"
                      type="text"
                      required
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="promo-class" className={labelClassName}>
                    {t("common.class")}
                  </label>
                  <div className="mt-2">
                    <ClassCombobox
                      id="promo-class"
                      classes={classPickerOptions}
                      value={selectedClass}
                      onChange={setSelectedClass}
                      name="classId"
                      required
                      placeholder={t("common.searchClasses")}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="promo-start" className={labelClassName}>
                      {t("common.startDate")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="promo-start"
                        name="startDate"
                        type="date"
                        required
                        defaultValue={today}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="promo-end" className={labelClassName}>
                      {t("common.endDate")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="promo-end"
                        name="endDate"
                        type="date"
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="promo-single" className={labelClassName}>
                      {t("common.singleClassPrice")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="promo-single"
                        name="singlePrice"
                        type="number"
                        min="0.01"
                        step="0.01"
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="promo-20" className={labelClassName}>
                      {t("common.package20Price")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="promo-20"
                        name="package20Price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="promo-50" className={labelClassName}>
                      {t("common.package50Price")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="promo-50"
                        name="package50Price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("common.specialPackPriceHelp")}
                </p>

                {createState.error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {createState.error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={createPending || !selectedClass}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  >
                    {createPending ? t("common.saving") : t("common.saveChanges")}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

function DeactivatePromotionButton({ promotionId }: { promotionId: number }) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(
    deactivateClassPricePromotion,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="promotionId" value={promotionId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
      >
        {pending ? t("common.saving") : t("common.deactivate")}
      </button>
      {state.error ? (
        <span className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
