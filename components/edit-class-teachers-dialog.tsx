"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  updateClassTeachers,
  type ActionState,
} from "@/app/(dashboard)/classes/actions";
import type { TeacherOption } from "@/components/teacher-combobox";
import { TeacherMultiCombobox } from "@/components/teacher-multi-combobox";
import { useLanguage } from "@/components/language-provider";
import { formatTeacherName } from "@/lib/person-name";

const initialState: ActionState = {};

export function EditClassTeachersDialog({
  classId,
  teachers,
  assignedTeachers,
  compact = false,
}: {
  classId: number;
  teachers: TeacherOption[];
  assignedTeachers: TeacherOption[];
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherOptions, setTeacherOptions] = useState(teachers);
  const [selectedTeachers, setSelectedTeachers] = useState(assignedTeachers);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    updateClassTeachers,
    initialState,
  );

  useEffect(() => {
    setTeacherOptions(teachers);
  }, [teachers]);

  useEffect(() => {
    setSelectedTeachers(assignedTeachers);
  }, [assignedTeachers]);

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
    setSelectedTeachers(assignedTeachers);
    setOpen(true);
  }

  function closeDialog() {
    setError(null);
    setSelectedTeachers(assignedTeachers);
    setOpen(false);
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }
    if (state.success) {
      setError(null);
      setOpen(false);
      router.refresh();
    }
  }, [state.error, state.success, state.savedAt, router]);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-x-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        {compact ? null : <PencilIcon aria-hidden="true" className="size-4" />}
        {t("common.editTeachers")}
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
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <XMarkIcon aria-hidden="true" className="size-6" />
                </button>
              </div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("common.editTeachers")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.editTeachersHelp")}
              </p>

              <form ref={formRef} action={formAction} className="mt-6 space-y-5">
                <input type="hidden" name="classId" value={classId} />
                {selectedTeachers.length === 0 ? (
                  <input type="hidden" name="teacherIds" value="" />
                ) : null}
                <TeacherMultiCombobox
                  id="editClassTeachers"
                  teachers={teacherOptions}
                  selected={selectedTeachers}
                  onChange={setSelectedTeachers}
                  onTeacherAdded={handleTeacherAdded}
                  onQuickAddOpenChange={setQuickAddOpen}
                />

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {pending ? t("common.saving") : t("common.saveTeachers")}
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

export function AssignedTeachersList({
  teachers,
}: {
  teachers: TeacherOption[];
}) {
  const { t } = useLanguage();

  if (teachers.length === 0) {
    return (
      <p className="text-sm text-gray-900 dark:text-white">
        {t("common.noTeacherAssigned")}
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {teachers.map((teacher) => (
        <li
          key={teacher.id}
          className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800 dark:bg-white/10 dark:text-gray-200"
        >
          {formatTeacherName(teacher)}
        </li>
      ))}
    </ul>
  );
}
