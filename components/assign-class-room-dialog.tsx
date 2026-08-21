"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronDownIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import {
  updateClassRoom,
  type ActionState,
} from "@/app/(dashboard)/classes/actions";
import type { RoomOption } from "@/components/add-class-dialog";
import { useLanguage } from "@/components/language-provider";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: ActionState = {};

export function AssignClassRoomDialog({
  classId,
  rooms,
  roomId,
  hasRoom,
  compact = false,
}: {
  classId: number;
  rooms: RoomOption[];
  roomId: number | null;
  hasRoom: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    updateClassRoom,
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
      router.refresh();
    }
  }, [state.error, state.success, state.savedAt, router]);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={
          hasRoom || compact
            ? "inline-flex items-center gap-x-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            : "inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
        }
      >
        {hasRoom || compact ? null : (
          <PlusIcon aria-hidden="true" className="size-4" />
        )}
        {hasRoom ? t("common.changeRoom") : t("common.addRoom")}
      </button>

      <Dialog open={open} onClose={closeDialog} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
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
                {hasRoom ? t("common.changeRoom") : t("common.assignRoom")}
              </DialogTitle>

              <form ref={formRef} action={formAction} className="mt-6 space-y-5">
                <input type="hidden" name="classId" value={classId} />
                <div>
                  <label htmlFor="assignClassRoom" className={labelClassName}>
                    {t("common.room")}
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="assignClassRoom"
                      name="roomId"
                      defaultValue={roomId ?? ""}
                      className={selectClassName}
                    >
                      <option value="">{t("common.unassigned")}</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          {t("common.room")} {room.room_number}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                </div>

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
                    {pending ? t("common.saving") : t("common.saveRoom")}
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
