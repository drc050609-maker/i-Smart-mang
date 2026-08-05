"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { KeyIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { adminSetStaffPassword } from "@/app/(dashboard)/settings/actions";
import { useLanguage } from "@/components/language-provider";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

export function AdminSetStaffPasswordDialog({
  staffId,
  email,
  displayName,
}: {
  staffId: string;
  email: string;
  displayName: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function openDialog() {
    setError(null);
    setSuccessMessage(null);
    setOpen(true);
  }

  function closeDialog() {
    if (pending) return;
    setError(null);
    setSuccessMessage(null);
    setOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set("staffId", staffId);

    startTransition(async () => {
      const result = await adminSetStaffPassword({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setSuccessMessage(t("common.passwordUpdated"));
      window.setTimeout(() => {
        setOpen(false);
        setSuccessMessage(null);
      }, 1000);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-indigo-700 shadow-xs inset-ring inset-ring-indigo-200 hover:bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-200 dark:shadow-none dark:inset-ring-indigo-400/30 dark:hover:bg-indigo-500/20"
      >
        <KeyIcon aria-hidden="true" className="size-4" />
        {t("common.setPassword")}
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
                  disabled={pending}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 disabled:opacity-50 dark:bg-gray-900 dark:hover:text-gray-300"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <XMarkIcon aria-hidden="true" className="size-6" />
                </button>
              </div>

              <DialogTitle
                as="h3"
                className="text-base font-semibold text-gray-900 dark:text-white"
              >
                {t("common.setPassword")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.setManagerPasswordHelp", { name: displayName })}
              </p>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {email}
              </p>

              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="mt-6 space-y-4"
              >
                <div>
                  <label
                    htmlFor={`adminNewPassword-${staffId}`}
                    className={labelClassName}
                  >
                    {t("common.newPassword")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`adminNewPassword-${staffId}`}
                      name="newPassword"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`adminConfirmPassword-${staffId}`}
                    className={labelClassName}
                  >
                    {t("common.confirmPassword")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`adminConfirmPassword-${staffId}`}
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className={inputClassName}
                    />
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : null}

                {successMessage ? (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {successMessage}
                  </p>
                ) : null}

                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse sm:gap-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 sm:w-auto dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                  >
                    {pending ? t("common.saving") : t("common.updatePassword")}
                  </button>
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={pending}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                  >
                    {t("common.cancel")}
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
