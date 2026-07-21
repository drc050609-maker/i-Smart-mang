"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { TrialClassForm } from "@/components/trial-class-form";
import {
  formatTrialPrice,
  TRIAL_CLASS_DURATION_MINUTES,
} from "@/lib/trial-class";

type TeacherOption = {
  id: number;
  name: string;
};

export function TrialClassDialog({
  subjects,
  teachers,
  triggerStyle = "link",
}: {
  subjects: string[];
  teachers: TeacherOption[];
  triggerStyle?: "link" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function openDialog() {
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
  }

  function handleBookAnother() {
    setFormKey((current) => current + 1);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={
          triggerStyle === "button"
            ? "inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
            : "text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        }
      >
        Book trial class
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
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:flex-col sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <XMarkIcon aria-hidden="true" className="size-6" />
                </button>
              </div>

              <div className="sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
                <div className="text-left sm:mt-0">
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    Book a trial class
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatTrialPrice()} · {TRIAL_CLASS_DURATION_MINUTES}{" "}
                    minutes · one-on-one with your teacher
                  </p>
                </div>

                <div className="mt-6 min-h-0 overflow-y-auto sm:flex-1">
                  {teachers.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No teachers are available for trial classes right now.
                      Please contact the school to schedule.
                    </p>
                  ) : (
                    <TrialClassForm
                      key={formKey}
                      subjects={subjects}
                      teachers={teachers}
                      onBookAnother={handleBookAnother}
                    />
                  )}
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
