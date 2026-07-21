"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronDownIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { updateLead, type ActionState } from "@/app/(dashboard)/leads/actions";
import { useLanguage } from "@/components/language-provider";
import {
  STAFF_LOCATIONS,
  formatStaffLocationLabel,
} from "@/lib/staff-location";

import type { Database } from "@/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const inputClassName =
  "block w-full min-h-[2.375rem] rounded-md bg-white px-3 py-1.5 text-base leading-6 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const textareaClassName =
  "block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

const initialState: ActionState = {};

export function EditLeadDialog({ lead }: { lead: Lead }) {
  const { language, t } = useLanguage();
  const idPrefix = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(updateLead, initialState);

  function closeDialog() {
    setError(null);
    setOpen(false);
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      setError(null);
      setOpen(false);
    }
  }, [state.error, state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
      >
        <PencilIcon aria-hidden="true" className="size-4" />
        {t("common.edit")}
      </button>

      <Dialog open={open} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-2xl sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <XMarkIcon aria-hidden="true" className="size-6" />
                </button>
              </div>

              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("leads.editLead")}
              </DialogTitle>

              <form ref={formRef} action={formAction} className="mt-6 space-y-6">
                <input type="hidden" name="leadId" value={lead.id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${idPrefix}-parentFirstName`} className={labelClassName}>
                      {t("leads.studentFirstName")} *
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-parentFirstName`}
                        name="parentFirstName"
                        required
                        defaultValue={lead.parent_first_name}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-parentLastName`} className={labelClassName}>
                      {t("leads.studentLastName")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-parentLastName`}
                        name="parentLastName"
                        defaultValue={lead.parent_last_name ?? ""}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-phoneNumber`} className={labelClassName}>
                      {t("common.phone")} *
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-phoneNumber`}
                        name="phoneNumber"
                        type="tel"
                        required
                        defaultValue={lead.phone_number}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-email`} className={labelClassName}>
                      {t("common.email")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-email`}
                        name="email"
                        type="email"
                        defaultValue={lead.email ?? ""}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-location`} className={labelClassName}>
                      {t("common.campus")}
                    </label>
                    <div className="relative mt-2">
                      <select
                        id={`${idPrefix}-location`}
                        name="location"
                        defaultValue={lead.location ?? ""}
                        className={selectClassName}
                      >
                        <option value="">{t("common.notAvailable")}</option>
                        {STAFF_LOCATIONS.map((location) => (
                          <option key={location} value={location}>
                            {formatStaffLocationLabel(location, language)}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <input
                        type="checkbox"
                        name="needsFutureContact"
                        value="true"
                        defaultChecked={lead.needs_future_contact}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5"
                      />
                      {t("leads.needsFutureContact")}
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={`${idPrefix}-street1`} className={labelClassName}>
                      {t("common.street1")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-street1`}
                        name="street1"
                        defaultValue={lead.street_1 ?? ""}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`${idPrefix}-street2`} className={labelClassName}>
                      {t("common.street2")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-street2`}
                        name="street2"
                        defaultValue={lead.street_2 ?? ""}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-city`} className={labelClassName}>
                      {t("common.city")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-city`}
                        name="city"
                        defaultValue={lead.city ?? ""}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-state`} className={labelClassName}>
                      {t("common.state")}
                    </label>
                    <div className="relative mt-2">
                      <select
                        id={`${idPrefix}-state`}
                        name="state"
                        defaultValue={lead.state ?? ""}
                        className={selectClassName}
                      >
                        <option value="">{t("common.selectState")}</option>
                        {US_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-zipCode`} className={labelClassName}>
                      {t("common.zip")}
                    </label>
                    <div className="mt-2">
                      <input
                        id={`${idPrefix}-zipCode`}
                        name="zipCode"
                        defaultValue={lead.zip_code ?? ""}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor={`${idPrefix}-description`} className={labelClassName}>
                    {t("leads.description")}
                  </label>
                  <div className="mt-2">
                    <textarea
                      id={`${idPrefix}-description`}
                      name="description"
                      rows={4}
                      defaultValue={lead.description ?? ""}
                      className={textareaClassName}
                      placeholder={t("leads.descriptionPlaceholder")}
                    />
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
                    disabled={pending}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400"
                  >
                    {pending ? t("common.saving") : t("common.save")}
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
