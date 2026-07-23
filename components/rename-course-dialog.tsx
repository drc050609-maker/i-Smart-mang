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
  updateClassSubject,
  type UpdateClassState,
} from "@/app/(dashboard)/classes/actions";
import { useLanguage } from "@/components/language-provider";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: UpdateClassState = {};

export function RenameCourseDialog({
  classId,
  subject,
}: {
  classId: number;
  subject: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: UpdateClassState, formData: FormData) => {
      const result = await updateClassSubject(prev, formData);
      if (result.success) {
        setOpen(false);
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
        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 dark:hover:bg-white/10 dark:hover:text-indigo-400"
        aria-label={t("common.renameCourse")}
        title={t("common.renameCourse")}
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
                {t("common.renameCourse")}
              </DialogTitle>

              <form
                key={`${classId}-${subject}-${open}`}
                action={formAction}
                className="mt-5 space-y-4"
              >
                <input type="hidden" name="classId" value={classId} />
                <div>
                  <label
                    htmlFor={`rename-course-${classId}`}
                    className={labelClassName}
                  >
                    {t("common.courseName")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`rename-course-${classId}`}
                      name="subject"
                      type="text"
                      required
                      defaultValue={subject}
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
