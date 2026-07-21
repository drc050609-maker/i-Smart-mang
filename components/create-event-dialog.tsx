"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  createEvent,
  type EventActionState,
} from "@/app/(dashboard)/events/actions";
import { useLanguage } from "@/components/language-provider";
import {
  ALLOWED_EVENT_MEDIA_MIME_TYPES,
  MAX_EVENT_MEDIA_FILES,
} from "@/lib/event-media";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: EventActionState = {};

type PreviewFile = {
  id: string;
  file: File;
  url: string;
  isVideo: boolean;
};

function syncFilesToInput(
  input: HTMLInputElement | null,
  files: PreviewFile[],
) {
  if (!input) {
    return;
  }

  const dataTransfer = new DataTransfer();
  for (const item of files) {
    dataTransfer.items.add(item.file);
  }

  input.files = dataTransfer.files;
}

export function CreateEventDialog() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(createEvent, initialState);

  const acceptTypes = useMemo(
    () => ALLOWED_EVENT_MEDIA_MIME_TYPES.join(","),
    [],
  );

  function resetDialog() {
    setSelectedFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setError(null);
    syncFilesToInput(fileInputRef.current, []);
  }

  function openDialog() {
    resetDialog();
    setOpen(true);
  }

  function closeDialog() {
    resetDialog();
    setOpen(false);
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    const incoming = Array.from(fileList);

    setSelectedFiles((current) => {
      const remainingSlots = MAX_EVENT_MEDIA_FILES - current.length;

      if (remainingSlots <= 0) {
        setError(
          t("common.photosVideos", { count: MAX_EVENT_MEDIA_FILES }),
        );
        syncFilesToInput(fileInputRef.current, current);
        return current;
      }

      const nextFiles = incoming.slice(0, remainingSlots).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      }));

      const mergedFiles = [...current, ...nextFiles];
      syncFilesToInput(fileInputRef.current, mergedFiles);
      setError(null);

      return mergedFiles;
    });
  }

  function removeFile(id: string) {
    setSelectedFiles((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }

      const nextFiles = current.filter((item) => item.id !== id);
      syncFilesToInput(fileInputRef.current, nextFiles);
      return nextFiles;
    });
  }

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      closeDialog();
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
        {t("common.new")}
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
              className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
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
                {t("common.createEvent")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.eventsSubtitle")}
              </p>

              <form
                action={formAction}
                className="mt-6 space-y-5"
                onSubmit={() => {
                  setError(null);
                  syncFilesToInput(fileInputRef.current, selectedFiles);
                }}
              >
                <div>
                  <label htmlFor="eventTitle" className={labelClassName}>
                    {t("common.placeholderEventTitle")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="eventTitle"
                      name="title"
                      type="text"
                      placeholder={t("common.placeholderEventTitle")}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="eventBody" className={labelClassName}>
                    {t("common.description")}
                  </label>
                  <div className="mt-2">
                    <textarea
                      id="eventBody"
                      name="body"
                      required
                      rows={4}
                      placeholder={t("common.placeholderEventBody")}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="eventMedia" className={labelClassName}>
                      {t("common.photosVideos", { count: MAX_EVENT_MEDIA_FILES })}{" "}
                      <span className="font-normal text-gray-500">
                        {t("common.optional")}
                      </span>
                    </label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedFiles.length}/{MAX_EVENT_MEDIA_FILES}
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    id="eventMedia"
                    name="media"
                    type="file"
                    accept={acceptTypes}
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      handleFilesSelected(event.target.files);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedFiles.length >= MAX_EVENT_MEDIA_FILES}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-8 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:text-gray-300 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
                  >
                    <PhotoIcon className="size-5" />
                    {t("common.add")} {t("common.photos")} / {t("common.videos")}
                  </button>

                  {selectedFiles.length > 0 ? (
                    <ul className="mt-3 grid grid-cols-3 gap-2">
                      {selectedFiles.map((item, index) => (
                        <li
                          key={item.id}
                          className="relative overflow-hidden rounded-md border border-gray-200 dark:border-white/10"
                        >
                          {item.isVideo ? (
                            <video
                              src={item.url}
                              className="aspect-square size-full object-cover"
                              muted
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt=""
                              className="aspect-square size-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                            aria-label={t("common.remove")}
                          >
                            <XMarkIcon className="size-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            {index + 1}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
                    {pending ? t("common.posting") : t("common.postEvent")}
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
