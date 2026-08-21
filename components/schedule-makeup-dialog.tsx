"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import {
  scheduleMakeupClass,
  type ActionState,
} from "@/app/(dashboard)/attendance/actions";
import { TimeSlotField } from "@/components/time-slot-field";
import { useLanguage } from "@/components/language-provider";
import { toTimeInputValue } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";

export type MakeupDialogTarget = {
  studentId: number;
  studentName: string;
  classId: number;
  classSubject: string;
  teacherName: string | null;
  originalScheduleId: number;
  originalSessionDate: string;
  defaultDate: string;
  defaultStartTime: string;
  durationMinutes: number;
};

const initialState: ActionState = {};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

export function ScheduleMakeupDialog({
  target,
  onClose,
}: {
  target: MakeupDialogTarget | null;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const [state, formAction, pending] = useActionState(
    scheduleMakeupClass,
    initialState,
  );
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (state.success) {
      onCloseRef.current();
    }
  }, [state.success]);

  return (
    <Dialog open={target != null} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
          <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("common.makeUpClass")}
            </DialogTitle>
            {target ? (
              <>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {target.studentName}
                  {" · "}
                  {formatClassSubject(target.classSubject, language)}
                  {target.teacherName ? ` · ${target.teacherName}` : ""}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t("common.makeupDialogHelp")}
                </p>

                <form action={formAction} className="mt-4 space-y-4">
                  <input type="hidden" name="studentId" value={target.studentId} />
                  <input type="hidden" name="classId" value={target.classId} />
                  <input
                    type="hidden"
                    name="originalScheduleId"
                    value={target.originalScheduleId}
                  />
                  <input
                    type="hidden"
                    name="originalSessionDate"
                    value={target.originalSessionDate}
                  />
                  <input
                    type="hidden"
                    name="durationMinutes"
                    value={target.durationMinutes}
                  />

                  <div>
                    <label htmlFor="makeup-date" className={labelClassName}>
                      {t("common.makeupDate")}
                    </label>
                    <input
                      key={`${target.studentId}-${target.originalScheduleId}-${target.defaultDate}`}
                      id="makeup-date"
                      name="makeupDate"
                      type="date"
                      required
                      defaultValue={target.defaultDate}
                      className={`${inputClassName} mt-2`}
                    />
                  </div>

                  <TimeSlotField
                    key={`${target.studentId}-${target.originalScheduleId}-${target.defaultStartTime}`}
                    id="makeup-start-time"
                    name="startTime"
                    required
                    defaultValue={toTimeInputValue(target.defaultStartTime)}
                    label={t("common.makeupTime")}
                    language={language}
                  />

                  {state.error ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {state.error}
                    </p>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:inset-ring-white/10"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      {pending ? t("common.saving") : t("common.saveMakeup")}
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
