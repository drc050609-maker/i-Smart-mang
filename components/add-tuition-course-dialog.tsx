"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/outline";

import {
  createClassWithPricing,
  type CreateClassState,
} from "@/app/(dashboard)/classes/actions";
import { ClassTrackField } from "@/components/class-track-field";
import { useLanguage } from "@/components/language-provider";
import { LessonTypeField } from "@/components/lesson-type-field";
import {
  SelectChevron,
  selectFieldClassName,
} from "@/components/select-chevron";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: CreateClassState = {};

const DURATION_OPTIONS = [30, 45, 60, 90] as const;

export function AddTuitionCourseDialog() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [lessonType, setLessonType] = useState<"private" | "group" | "trial">(
    "private",
  );
  const [state, formAction, pending] = useActionState(
    async (prev: CreateClassState, formData: FormData) => {
      const result = await createClassWithPricing(prev, formData);
      if (result.success) {
        setOpen(false);
        formRef.current?.reset();
        setLessonType("private");
      }
      return result;
    },
    initialState,
  );

  useEffect(() => {
    if (!open) {
      setLessonType("private");
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        {t("common.addCourse")}
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
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("common.addCourse")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.addCourseHelp")}
              </p>

              <form ref={formRef} action={formAction} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="tuition-course-name" className={labelClassName}>
                    {t("common.courseName")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="tuition-course-name"
                      name="subject"
                      type="text"
                      required
                      placeholder={t("common.courseNamePlaceholder")}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="tuition-course-duration"
                    className={labelClassName}
                  >
                    {t("common.duration")}
                  </label>
                  <div className="relative mt-2 grid grid-cols-1">
                    <select
                      id="tuition-course-duration"
                      name="durationMinutes"
                      defaultValue={45}
                      className={selectFieldClassName}
                    >
                      {DURATION_OPTIONS.map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {t("common.minutes", { count: minutes })}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </div>

                <div
                  onChange={(event) => {
                    const target = event.target as HTMLInputElement;
                    if (target.name === "lessonType") {
                      setLessonType(
                        target.value as "private" | "group" | "trial",
                      );
                    }
                  }}
                >
                  <LessonTypeField idPrefix="tuition-add-lesson" />
                </div>

                <ClassTrackField idPrefix="tuition-add-track" />

                <div>
                  <label
                    htmlFor="tuition-single-price"
                    className={labelClassName}
                  >
                    {t("common.singleClassPrice")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="tuition-single-price"
                      name="singlePrice"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      className={inputClassName}
                    />
                  </div>
                </div>

                {lessonType !== "trial" ? (
                  <>
                    <div>
                      <label
                        htmlFor="tuition-pkg20-price"
                        className={labelClassName}
                      >
                        {t("common.package20Price")}
                      </label>
                      <div className="mt-2">
                        <input
                          id="tuition-pkg20-price"
                          name="package20Price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          className={inputClassName}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="tuition-pkg50-price"
                        className={labelClassName}
                      >
                        {t("common.package50Price")}
                      </label>
                      <div className="mt-2">
                        <input
                          id="tuition-pkg50-price"
                          name="package50Price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          className={inputClassName}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

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
                    {pending ? t("common.saving") : t("common.addCourse")}
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
