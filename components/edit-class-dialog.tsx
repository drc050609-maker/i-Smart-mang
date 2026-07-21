"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronDownIcon, PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  updateClass,
  type UpdateClassState,
} from "@/app/(dashboard)/classes/actions";
import {
  TeacherCombobox,
  type TeacherOption,
} from "@/components/teacher-combobox";
import type { RoomOption } from "@/components/add-class-dialog";
import { LessonTypeField } from "@/components/lesson-type-field";
import { ClassTrackField } from "@/components/class-track-field";
import { useLanguage } from "@/components/language-provider";
import type { LessonType } from "@/lib/class-lesson-type";
import type { ClassTrack } from "@/lib/class-track";

export type ClassFormData = {
  id: number;
  subject: string;
  teacher_id: number | null;
  room_id: number | null;
  duration_minutes: number | null;
  lesson_type: LessonType | null;
  class_track: ClassTrack | null;
};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: UpdateClassState = {};

function findTeacher(
  teachers: TeacherOption[],
  teacherId: number | null,
): TeacherOption | null {
  if (teacherId === null) return null;
  return teachers.find((teacher) => teacher.id === teacherId) ?? null;
}

export function EditClassDialog({
  classData,
  teachers,
  rooms,
}: {
  classData: ClassFormData;
  teachers: TeacherOption[];
  rooms: RoomOption[];
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherOptions, setTeacherOptions] = useState(teachers);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOption | null>(
    () => findTeacher(teachers, classData.teacher_id),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    updateClass,
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
    setSelectedTeacher(findTeacher(teacherOptions, classData.teacher_id));
    setOpen(true);
  }

  function closeDialog() {
    setError(null);
    setSelectedTeacher(findTeacher(teacherOptions, classData.teacher_id));
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
        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
      >
        <PencilIcon aria-hidden="true" className="size-4" />
        {t("common.edit")}
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

              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("common.editClass")}
              </DialogTitle>

              <form
                key={`${classData.id}-${classData.subject}-${classData.teacher_id}-${classData.room_id}-${classData.duration_minutes}-${classData.lesson_type}-${classData.class_track}`}
                ref={formRef}
                action={formAction}
                className="mt-6 space-y-5"
              >
                <input type="hidden" name="classId" value={classData.id} />

                <div>
                  <label htmlFor="editClassSubject" className={labelClassName}>
                    {t("common.subject")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="editClassSubject"
                      name="subject"
                      type="text"
                      required
                      defaultValue={classData.subject}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <LessonTypeField
                  idPrefix="editClassLessonType"
                  defaultValue={classData.lesson_type}
                />

                <ClassTrackField
                  idPrefix="editClassClassTrack"
                  defaultValue={classData.class_track}
                />

                <div>
                  <label htmlFor="editClassTeacher" className={labelClassName}>
                    {t("common.teacher")}
                  </label>
                  <div className="mt-2">
                    <TeacherCombobox
                      id="editClassTeacher"
                      teachers={teacherOptions}
                      value={selectedTeacher}
                      onChange={setSelectedTeacher}
                      onTeacherAdded={handleTeacherAdded}
                      onQuickAddOpenChange={setQuickAddOpen}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="editClassRoom" className={labelClassName}>
                    {t("common.room")}
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="editClassRoom"
                      name="roomId"
                      defaultValue={classData.room_id ?? ""}
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
                </div>

                <div>
                  <label htmlFor="editClassDuration" className={labelClassName}>
                    {t("common.duration")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="editClassDuration"
                      name="durationMinutes"
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      defaultValue={classData.duration_minutes ?? ""}
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
