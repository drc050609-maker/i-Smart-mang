"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import {
  updateEnrollmentGradeLevel,
  type UpdateEnrollmentGradeState,
} from "@/app/(dashboard)/students/actions";
import { useLanguage } from "@/components/language-provider";
import {
  SelectChevron,
  selectFieldClassName,
} from "@/components/select-chevron";
import { GRADE_LEVEL_OPTIONS } from "@/lib/class-subject";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: UpdateEnrollmentGradeState = {};

function resolveDefaultPreset(gradeLevel: string | null) {
  if (!gradeLevel) return "";
  if ((GRADE_LEVEL_OPTIONS as readonly string[]).includes(gradeLevel)) {
    return gradeLevel;
  }
  return "__custom__";
}

export function EditEnrollmentGradeDialog({
  enrollmentId,
  studentId,
  subjectLabel,
  gradeLevel,
}: {
  enrollmentId: number;
  studentId: number;
  subjectLabel: string;
  gradeLevel: string | null;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    updateEnrollmentGradeLevel,
    initialState,
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
      setError(null);
      setOpen(false);
    }
  }, [state.error, state.success]);

  const presetDefault = resolveDefaultPreset(gradeLevel);
  const customDefault =
    gradeLevel && !(GRADE_LEVEL_OPTIONS as readonly string[]).includes(gradeLevel)
      ? gradeLevel
      : "";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        {t("common.editGrade")}
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
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-md sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
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
                {t("common.editGradeLevel")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subjectLabel}
              </p>

              <form
                key={`${enrollmentId}-${gradeLevel ?? "none"}`}
                action={formAction}
                className="mt-6 space-y-4"
              >
                <input type="hidden" name="enrollmentId" value={enrollmentId} />
                <input type="hidden" name="studentId" value={studentId} />

                <div>
                  <label
                    htmlFor={`grade-preset-${enrollmentId}`}
                    className={labelClassName}
                  >
                    {t("common.gradeLevel")}
                  </label>
                  <div className="relative mt-2 grid grid-cols-1">
                    <select
                      id={`grade-preset-${enrollmentId}`}
                      name="gradePreset"
                      defaultValue={presetDefault}
                      className={selectFieldClassName}
                    >
                      <option value="">{t("common.noGradeLevel")}</option>
                      {GRADE_LEVEL_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      <option value="__custom__">
                        {t("common.customGradeLevel")}
                      </option>
                    </select>
                    <SelectChevron />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`grade-custom-${enrollmentId}`}
                    className={labelClassName}
                  >
                    {t("common.customGradeLevel")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`grade-custom-${enrollmentId}`}
                      name="gradeCustom"
                      type="text"
                      placeholder="G5"
                      defaultValue={customDefault}
                      className={inputClassName}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t("common.gradeLevelHelp")}
                  </p>
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
