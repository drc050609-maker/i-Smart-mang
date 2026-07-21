"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronDownIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  createClass,
  type CreateClassState,
} from "@/app/(dashboard)/classes/actions";
import {
  TeacherCombobox,
  type TeacherOption,
} from "@/components/teacher-combobox";
import { LessonTypeField } from "@/components/lesson-type-field";
import { ClassTrackField } from "@/components/class-track-field";
import { useLanguage } from "@/components/language-provider";

export type { TeacherOption };

export type RoomOption = {
  id: number;
  room_number: string;
  class_size: number;
};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: CreateClassState = {};

export function AddClassDialog({
  teachers,
  rooms,
}: {
  teachers: TeacherOption[];
  rooms: RoomOption[];
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherOptions, setTeacherOptions] = useState(teachers);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOption | null>(
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createClass,
    initialState,
  );

  useEffect(() => {
    setTeacherOptions(teachers);
  }, [teachers]);

  function handleTeacherAdded(teacher: TeacherOption) {
    setTeacherOptions((current) => {
      if (current.some((item) => item.id === teacher.id)) {
        return current;
      }
      return [...current, teacher];
    });
  }

  function openDialog() {
    setError(null);
    setSelectedTeacher(null);
    setOpen(true);
  }

  function closeDialog() {
    setError(null);
    setSelectedTeacher(null);
    setOpen(false);
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      formRef.current?.reset();
      setSelectedTeacher(null);
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
        {t("common.addNewClass")}
      </button>

      <Dialog
        open={open}
        onClose={() => {
          if (!quickAddOpen) {
            closeDialog();
          }
        }}
        className="relative z-50"
      >
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
                    {t("common.addNewClass")}
                  </DialogTitle>

                  <form
                    ref={formRef}
                    action={formAction}
                    className="mt-6 space-y-5"
                  >
                    <div>
                      <label htmlFor="classSubject" className={labelClassName}>
                        {t("common.subject")}
                      </label>
                      <div className="mt-2">
                        <input
                          id="classSubject"
                          name="subject"
                          type="text"
                          required
                          placeholder={t("common.placeholderSubject")}
                          className={inputClassName}
                        />
                      </div>
                    </div>

                    <LessonTypeField idPrefix="addClassLessonType" />

                    <ClassTrackField idPrefix="addClassClassTrack" />

                    <div>
                      <label htmlFor="classTeacher" className={labelClassName}>
                        {t("common.teacher")}
                      </label>
                      <div className="mt-2">
                        <TeacherCombobox
                          id="classTeacher"
                          teachers={teacherOptions}
                          value={selectedTeacher}
                          onChange={setSelectedTeacher}
                          onTeacherAdded={handleTeacherAdded}
                          onQuickAddOpenChange={setQuickAddOpen}
                        />
                      </div>
                      {teacherOptions.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {t("common.noTutorsAddFirst")}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="classRoom" className={labelClassName}>
                        {t("common.room")}
                      </label>
                      <div className="relative mt-2">
                        <select
                          id="classRoom"
                          name="roomId"
                          defaultValue=""
                          className={selectClassName}
                        >
                          <option value="">{t("common.unassigned")}</option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {t("common.room")} {room.room_number}{" "}
                              {t("common.capacity", { count: room.class_size })}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon
                          aria-hidden="true"
                          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      {rooms.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {t("common.noRoomsAvailable")}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label htmlFor="classDuration" className={labelClassName}>
                        {t("common.duration")}
                      </label>
                      <div className="mt-2">
                        <input
                          id="classDuration"
                          name="durationMinutes"
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
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
                        {pending ? t("common.saving") : t("common.saveClass")}
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
