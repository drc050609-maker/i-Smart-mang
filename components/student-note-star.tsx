"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { StarIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useLanguage } from "@/components/language-provider";
import { formatStudentName } from "@/lib/person-name";
import type { ScheduleStudent } from "@/lib/schedule-calendar";

function hasStudentNote(notes: string | null | undefined) {
  return Boolean(notes?.trim());
}

export function studentHasNote(
  student: Pick<ScheduleStudent, "notes"> | null | undefined,
) {
  return hasStudentNote(student?.notes);
}

export function studentsWithNotes(students: ScheduleStudent[]) {
  return students.filter((student) => studentHasNote(student));
}

/** Clickable ★ that opens a dialog with one or more student notes. */
export function StudentNoteStar({
  students,
  className = "",
  iconClassName = "size-3.5",
}: {
  students: ScheduleStudent[];
  className?: string;
  iconClassName?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const noted = studentsWithNotes(students);

  if (noted.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        className={`inline-flex shrink-0 items-center justify-center rounded text-amber-500 hover:text-amber-400 focus:outline-2 focus:outline-offset-1 focus:outline-amber-500 ${className}`}
        title={t("common.viewStudentNotes")}
        aria-label={t("common.viewStudentNotes")}
      >
        <StarIcon aria-hidden="true" className={iconClassName} />
      </button>

      {open ? (
        <Dialog open onClose={() => setOpen(false)} className="relative z-50">
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
                  onClick={() => setOpen(false)}
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
                {t("common.notes")}
              </DialogTitle>

              <ul className="mt-4 space-y-4">
                {noted.map((student) => (
                  <li key={student.id}>
                    {noted.length > 1 ? (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatStudentName(student)}
                      </p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {student.notes?.trim()}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                >
                  {t("common.close")}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
        </Dialog>
      ) : null}
    </>
  );
}
