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
  createStudentPhoneContact,
  updateStudentPhoneContact,
  type CreateStudentPhoneContactState,
  type UpdateStudentPhoneContactState,
} from "@/app/(dashboard)/students/actions";
import { useLanguage } from "@/components/language-provider";
import {
  PHONE_OWNER_ROLES,
  phoneOwnerRoleLabelKey,
  type PhoneOwnerRole,
} from "@/lib/phone-owner";

export type StudentPhoneContact = {
  id: number;
  phone_number: string;
  owner_role: PhoneOwnerRole;
  owner_name: string | null;
  is_primary: boolean;
};

const inputClassName =
  "block w-full min-h-[2.375rem] rounded-md bg-white px-3 py-1.5 text-base leading-6 text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

function PhoneFormFields({
  contact,
  idPrefix,
}: {
  contact?: StudentPhoneContact;
  idPrefix: string;
}) {
  const { t } = useLanguage();

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className={labelClassName}>
          {t("common.phone")}
        </label>
        <div className="mt-2">
          <input
            id={`${idPrefix}-phone`}
            name="phoneNumber"
            type="tel"
            required
            defaultValue={contact?.phone_number ?? ""}
            autoComplete="tel"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-ownerRole`} className={labelClassName}>
            {t("common.phoneOwner")}
          </label>
          <div className="relative mt-2">
            <select
              id={`${idPrefix}-ownerRole`}
              name="ownerRole"
              required
              defaultValue={contact?.owner_role ?? "mother"}
              className={selectClassName}
            >
              {PHONE_OWNER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(phoneOwnerRoleLabelKey(role))}
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
          <label htmlFor={`${idPrefix}-ownerName`} className={labelClassName}>
            {t("common.ownerName")}
          </label>
          <div className="mt-2">
            <input
              id={`${idPrefix}-ownerName`}
              name="ownerName"
              type="text"
              defaultValue={contact?.owner_name ?? ""}
              placeholder={t("common.ownerNamePlaceholder")}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-isPrimary`}
          name="isPrimary"
          type="checkbox"
          defaultChecked={contact?.is_primary ?? false}
          value="true"
          className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5"
        />
        <label
          htmlFor={`${idPrefix}-isPrimary`}
          className="text-sm font-medium text-gray-900 dark:text-white"
        >
          {t("common.primaryPhone")}
        </label>
      </div>
    </>
  );
}

const initialCreateState: CreateStudentPhoneContactState = {};
const initialUpdateState: UpdateStudentPhoneContactState = {};

export function AddStudentPhoneDialog({ studentId }: { studentId: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const [state, formAction, pending] = useActionState(
    createStudentPhoneContact,
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
    if (state.error) setError(state.error);
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
        {t("common.addPhone")}
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
                    {t("common.addPhone")}
                  </DialogTitle>

                  <form
                    ref={formRef}
                    action={formAction}
                    className="mt-6 space-y-4"
                  >
                    <input type="hidden" name="studentId" value={studentId} />
                    <PhoneFormFields idPrefix={idPrefix} />

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
                        {pending ? t("common.saving") : t("common.savePhone")}
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

export function EditStudentPhoneDialog({
  studentId,
  contact,
  open,
  onClose,
}: {
  studentId: number;
  contact: StudentPhoneContact;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const [state, formAction, pending] = useActionState(
    updateStudentPhoneContact,
    initialUpdateState,
  );

  function closeDialog() {
    setError(null);
    onClose();
  }

  useEffect(() => {
    if (state.error) setError(state.error);
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
                  {t("common.editPhone")}
                </DialogTitle>

                <form
                  key={contact.id}
                  ref={formRef}
                  action={formAction}
                  className="mt-6 space-y-4"
                >
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="phoneId" value={contact.id} />
                  <PhoneFormFields idPrefix={idPrefix} contact={contact} />

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
