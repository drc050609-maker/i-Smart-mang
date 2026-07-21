"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronDownIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  createStudentAddress,
  updateStudentAddress,
  type CreateStudentAddressState,
  type UpdateStudentAddressState,
} from "@/app/(dashboard)/students/actions";
import { useLanguage } from "@/components/language-provider";

export type StudentAddress = {
  id: number;
  "street 1": string;
  "street 2": string | null;
  city: string | null;
  state: string | null;
  "zip code": string | null;
};

const inputClassName =
  "block w-full min-h-[2.375rem] rounded-md bg-white px-3 py-1.5 text-base leading-6 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
] as const;

function normalizeStateValue(state: string | null | undefined) {
  if (!state) return "";
  const trimmed = state.trim();
  const byAbbrev = US_STATES.find(
    (entry) => entry.value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byAbbrev) return byAbbrev.value;
  const byName = US_STATES.find(
    (entry) => entry.label.toLowerCase() === trimmed.toLowerCase(),
  );
  return byName?.value ?? trimmed;
}

type AddressFormFieldsProps = {
  address?: StudentAddress;
  idPrefix: string;
};

function AddressFormFields({ address, idPrefix }: AddressFormFieldsProps) {
  const { t } = useLanguage();

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor={`${idPrefix}-street1`} className={labelClassName}>
            {t("common.street1")}
          </label>
          <div className="mt-2">
            <input
              id={`${idPrefix}-street1`}
              name="street1"
              type="text"
              required
              defaultValue={address?.["street 1"] ?? ""}
              autoComplete="address-line1"
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-street2`} className={labelClassName}>
            {t("common.street2")}
          </label>
          <div className="mt-2">
            <input
              id={`${idPrefix}-street2`}
              name="street2"
              type="text"
              defaultValue={address?.["street 2"] ?? ""}
              autoComplete="address-line2"
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${idPrefix}-city`} className={labelClassName}>
            {t("common.city")}
          </label>
          <div className="mt-2">
            <input
              id={`${idPrefix}-city`}
              name="city"
              type="text"
              defaultValue={address?.city ?? ""}
              autoComplete="address-level2"
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
              defaultValue={normalizeStateValue(address?.state)}
              autoComplete="address-level1"
              className={selectClassName}
            >
              <option value="">{t("common.state")}</option>
              {US_STATES.map((stateOption) => (
                <option key={stateOption.value} value={stateOption.value}>
                  {stateOption.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
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
              type="text"
              inputMode="numeric"
              maxLength={5}
              pattern="[0-9]{0,5}"
              defaultValue={address?.["zip code"] ?? ""}
              autoComplete="postal-code"
              className={inputClassName}
            />
          </div>
        </div>
      </div>
    </>
  );
}

const initialCreateState: CreateStudentAddressState = {};
const initialUpdateState: UpdateStudentAddressState = {};

export function AddStudentAddressDialog({
  studentId,
}: {
  studentId: number;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const [state, formAction, pending] = useActionState(
    createStudentAddress,
    initialCreateState,
  );

  function openDialog() {
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    setError(null);
    setOpen(false);
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      formRef.current?.reset();
      setError(null);
      setOpen(false);
    }
  }, [state.error, state.success]);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {t("common.addAddress")}
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
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
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

              <div className="sm:flex sm:items-start">
                <div className="mt-3 w-full text-left sm:mt-0">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {t("common.addAddress")}
                  </DialogTitle>

                  <form
                    ref={formRef}
                    action={formAction}
                    className="mt-6 space-y-4"
                  >
                    <input type="hidden" name="studentId" value={studentId} />
                    <AddressFormFields idPrefix={idPrefix} />

                    {error ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </p>
                    ) : null}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={closeDialog}
                        className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                      >
                        {pending ? t("common.saving") : t("common.saveAddress")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function EditStudentAddressDialog({
  studentId,
  address,
  open,
  onClose,
}: {
  studentId: number;
  address: StudentAddress;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const [state, formAction, pending] = useActionState(
    updateStudentAddress,
    initialUpdateState,
  );

  function closeDialog() {
    setError(null);
    onClose();
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      setError(null);
      onClose();
    }
  }, [state.error, state.success, onClose]);

  return (
    <Dialog open={open} onClose={closeDialog} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
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

            <div className="sm:flex sm:items-start">
              <div className="mt-3 w-full text-left sm:mt-0">
                <DialogTitle
                  as="h3"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  {t("common.editAddress")}
                </DialogTitle>

                <form
                  key={address.id}
                  ref={formRef}
                  action={formAction}
                  className="mt-6 space-y-4"
                >
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="addressId" value={address.id} />
                  <AddressFormFields
                    idPrefix={idPrefix}
                    address={address}
                  />

                  {error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeDialog}
                      className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                    >
                      {pending ? t("common.saving") : t("common.saveChanges")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
