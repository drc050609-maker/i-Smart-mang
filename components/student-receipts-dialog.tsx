"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  DocumentArrowUpIcon,
  PhotoIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  deleteStudentReceipt,
  uploadStudentReceipt,
  type ActionState,
} from "@/app/(dashboard)/students/actions";
import { useLanguage } from "@/components/language-provider";
import {
  formatReceiptUploadedAt,
  type StudentReceiptView,
} from "@/lib/student-receipt";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: ActionState = {};

export function StudentReceiptsDialog({
  studentId,
  receipts,
}: {
  studentId: number;
  receipts: StudentReceiptView[];
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadStudentReceipt,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteStudentReceipt,
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
    if (uploadState.error) {
      setError(uploadState.error);
    }
    if (uploadState.success) {
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [uploadState.error, uploadState.success]);

  useEffect(() => {
    if (deleteState.error) {
      setError(deleteState.error);
    }
    if (deleteState.success) {
      setError(null);
    }
  }, [deleteState.error, deleteState.success]);

  const pending = uploadPending || deletePending;
  const countLabel =
    receipts.length > 0 ? ` (${String(receipts.length)})` : "";

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
      >
        <PhotoIcon aria-hidden="true" className="size-4" />
        {t("common.receipts")}
        {countLabel}
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
              className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:p-6 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="absolute top-4 right-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label={t("common.close")}
                >
                  <XMarkIcon className="size-5" />
                </button>
              </div>

              <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
                {t("common.receipts")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.receiptsHelp")}
              </p>

              <form action={uploadAction} className="mt-4 space-y-3">
                <input type="hidden" name="studentId" value={studentId} />
                <div>
                  <label
                    htmlFor={`student-receipt-${studentId}`}
                    className={labelClassName}
                  >
                    {t("common.receiptPhoto")}
                  </label>
                  <input
                    ref={fileInputRef}
                    id={`student-receipt-${studentId}`}
                    name="receipt"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
                    required
                    className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-300 dark:file:bg-indigo-500/10 dark:file:text-indigo-300 dark:hover:file:bg-indigo-500/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`student-receipt-note-${studentId}`}
                    className={labelClassName}
                  >
                    {t("common.note")}{" "}
                    <span className="font-normal text-gray-500 dark:text-gray-400">
                      {t("common.optional")}
                    </span>
                  </label>
                  <input
                    id={`student-receipt-note-${studentId}`}
                    name="note"
                    type="text"
                    maxLength={200}
                    placeholder={t("common.receiptNotePlaceholder")}
                    className={`mt-2 ${inputClassName}`}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex w-full items-center justify-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 sm:w-auto"
                >
                  <DocumentArrowUpIcon aria-hidden="true" className="size-4" />
                  {uploadPending
                    ? t("common.saving")
                    : t("common.saveReceipt")}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-200 pt-4 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.allReceipts")}
                </h3>
                {receipts.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.noReceiptsYet")}
                  </p>
                ) : (
                  <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                    {receipts.map((receipt) => (
                      <li
                        key={receipt.id}
                        className="flex gap-3 rounded-lg border border-gray-200 p-3 dark:border-white/10"
                      >
                        {receipt.url ? (
                          <a
                            href={receipt.url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={receipt.url}
                              alt={receipt.file_name}
                              className="size-16 rounded-md object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-white/10">
                            <PhotoIcon className="size-6 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {receipt.file_name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatReceiptUploadedAt(
                              receipt.created_at,
                              language,
                            )}
                          </p>
                          {receipt.note?.trim() ? (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                              {receipt.note}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {receipt.url ? (
                              <a
                                href={receipt.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                {t("common.viewReceipt")}
                              </a>
                            ) : null}
                            <form action={deleteAction}>
                              <input
                                type="hidden"
                                name="studentId"
                                value={studentId}
                              />
                              <input
                                type="hidden"
                                name="receiptId"
                                value={receipt.id}
                              />
                              <button
                                type="submit"
                                disabled={pending}
                                className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
                              >
                                {t("common.delete")}
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
