"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  createTeacher,
  type CreateTeacherState,
} from "@/app/(dashboard)/tutors/actions";
import { useLanguage } from "@/components/language-provider";
import type { TeacherOption } from "@/components/teacher-combobox";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: CreateTeacherState = {};

export function QuickAddTeacherDialog({
  onCreated,
  defaultFirstName = "",
  className,
  onOpenChange,
}: {
  onCreated: (teacher: TeacherOption) => void;
  defaultFirstName?: string;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstNameDefault, setFirstNameDefault] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createTeacher,
    initialState,
  );

  function setDialogOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function openDialog() {
    setError(null);
    setFirstNameDefault(defaultFirstName);
    setDialogOpen(true);
  }

  function closeDialog() {
    setError(null);
    setDialogOpen(false);
  }

  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success && state.teacher) {
      onCreatedRef.current(state.teacher);
      formRef.current?.reset();
      setError(null);
      setDialogOpen(false);
    }
  }, [state.error, state.success, state.teacher]);

  return (
    <>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={openDialog}
        className={
          className ??
          "inline-flex items-center gap-x-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        }
      >
        <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
        {t("common.addNewTutorInline")}
      </button>

      <Dialog open={open} onClose={closeDialog} className="relative z-[60]">
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

              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("common.addNewTutor")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.selectTeacherFirst")}
              </p>

              <form
                key={firstNameDefault}
                ref={formRef}
                action={formAction}
                className="mt-6 space-y-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="quickAddTeacherFirstName"
                      className={labelClassName}
                    >
                      {t("common.firstName")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="quickAddTeacherFirstName"
                        name="firstName"
                        type="text"
                        required
                        defaultValue={firstNameDefault}
                        autoComplete="given-name"
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="quickAddTeacherLastName"
                      className={labelClassName}
                    >
                      {t("common.lastName")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="quickAddTeacherLastName"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="quickAddTeacherDob" className={labelClassName}>
                    {t("common.dateOfBirth")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="quickAddTeacherDob"
                      name="dob"
                      type="date"
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="quickAddTeacherPhone"
                    className={labelClassName}
                  >
                    {t("common.phone")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="quickAddTeacherPhone"
                      name="phoneNumber"
                      type="tel"
                      autoComplete="tel"
                      className={inputClassName}
                    />
                  </div>
                </div>

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
                    {pending ? t("common.saving") : t("common.saveTutor")}
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
