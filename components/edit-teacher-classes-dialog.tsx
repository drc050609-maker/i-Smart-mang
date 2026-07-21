"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  updateTeacherClasses,
  type UpdateTeacherClassesState,
} from "@/app/(dashboard)/tutors/actions";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";

export type TeacherClassOption = {
  id: number;
  subject: string;
  teacher_id: number | null;
  room_number: string | null;
  current_teacher_name: string | null;
};

const initialState: UpdateTeacherClassesState = {};

export function EditTeacherClassesDialog({
  teacherId,
  classes,
  assignedClassIds,
}: {
  teacherId: number;
  classes: TeacherClassOption[];
  assignedClassIds: number[];
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const assignedSet = new Set(assignedClassIds);
  const [state, formAction, pending] = useActionState(
    updateTeacherClasses,
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

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        <PencilIcon aria-hidden="true" className="size-4" />
        {t("common.assignClasses")}
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

              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("common.assignClasses")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.searchAndSelectClasses")}
              </p>

              <form
                key={`${teacherId}-${assignedClassIds.join(",")}`}
                ref={formRef}
                action={formAction}
                className="mt-6 space-y-4"
              >
                <input type="hidden" name="teacherId" value={teacherId} />

                {classes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("common.noClassesAvailable")}
                  </p>
                ) : (
                  <fieldset className="space-y-3">
                    <legend className="sr-only">{t("common.classes")}</legend>
                    {classes.map((classRow) => {
                      const isAssigned = assignedSet.has(classRow.id);
                      const taughtByOther =
                        classRow.teacher_id !== null &&
                        classRow.teacher_id !== teacherId;

                      return (
                        <label
                          key={classRow.id}
                          htmlFor={`class-${classRow.id}`}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 px-3 py-3 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          <input
                            id={`class-${classRow.id}`}
                            name="classIds"
                            type="checkbox"
                            value={classRow.id}
                            defaultChecked={isAssigned}
                            className="mt-0.5 size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5 dark:focus:ring-indigo-500"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-gray-900 dark:text-white">
                              {formatClassSubject(classRow.subject, language)}
                            </span>
                            <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
                              {[
                                classRow.room_number
                                  ? `${t("common.room")} ${classRow.room_number}`
                                  : null,
                                taughtByOther
                                  ? `${t("common.teacher")}: ${classRow.current_teacher_name}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || t("common.unassigned")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}

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
                    disabled={pending || classes.length === 0}
                    className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                  >
                    {pending ? t("common.saving") : t("common.saveClasses")}
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
