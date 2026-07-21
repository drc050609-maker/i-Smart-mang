"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { UserPlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  convertAllLeadChildrenToStudents,
  type ConvertLeadChildState,
} from "@/app/(dashboard)/leads/actions";
import { useLanguage } from "@/components/language-provider";
import { DEFAULT_STARTING_CLASS_CREDITS } from "@/lib/class-session-credits";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: ConvertLeadChildState = {};

export function ConvertAllLeadChildrenButton({
  leadId,
  pendingCount,
}: {
  leadId: number;
  pendingCount: number;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    convertAllLeadChildrenToStudents,
    initialState,
  );

  if (pendingCount === 0) {
    return null;
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
      if (state.studentId) {
        router.push(`/students/${state.studentId}`);
      } else {
        router.refresh();
      }
    }
  }, [router, state.error, state.studentId, state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 dark:bg-green-500 dark:shadow-none dark:hover:bg-green-400 dark:focus-visible:outline-green-500"
      >
        <UserPlusIcon aria-hidden="true" className="size-4" />
        {t("leads.convertAllToStudents", { count: pendingCount })}
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
                {t("leads.convertAllToStudents", { count: pendingCount })}
              </DialogTitle>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("leads.convertAllDescription", { count: pendingCount })}
              </p>

              <form ref={formRef} action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="leadId" value={leadId} />

                <div>
                  <label htmlFor="convert-all-credits" className={labelClassName}>
                    {t("leads.startingClassSessions")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="convert-all-credits"
                      name="startingClassCredits"
                      type="number"
                      min={0}
                      max={500}
                      step={1}
                      defaultValue={DEFAULT_STARTING_CLASS_CREDITS}
                      className={inputClassName}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("leads.convertAddressNote")}
                  </p>
                </div>

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-x-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-500 disabled:opacity-50 dark:bg-green-500 dark:shadow-none dark:hover:bg-green-400"
                  >
                    <UserPlusIcon aria-hidden="true" className="size-4" />
                    {pending ? t("common.processing") : t("common.confirm")}
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
