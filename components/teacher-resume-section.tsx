"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";

import {
  removeTeacherResume,
  uploadTeacherResume,
  type ActionState,
} from "@/app/(dashboard)/tutors/actions";
import { useLanguage } from "@/components/language-provider";

const initialState: ActionState = {};

export function TeacherResumeSection({
  teacherId,
  resumeFileName,
  resumeUrl,
}: {
  teacherId: number;
  resumeFileName: string | null;
  resumeUrl: string | null;
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadTeacherResume,
    initialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeTeacherResume,
    initialState,
  );

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
    if (removeState.error) {
      setError(removeState.error);
    }
    if (removeState.success) {
      setError(null);
    }
  }, [removeState.error, removeState.success]);

  const pending = uploadPending || removePending;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t("common.resume")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("common.resumeHelp")}
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-white/10">
        {resumeUrl && resumeFileName ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {resumeFileName}
              </p>
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t("common.viewResume")}
              </a>
            </div>
            <form action={removeAction}>
              <input type="hidden" name="teacherId" value={teacherId} />
              <button
                type="submit"
                disabled={pending}
                className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-xs inset-ring inset-ring-gray-300 hover:bg-red-50 disabled:opacity-60 dark:bg-white/10 dark:text-red-400 dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
              >
                {removePending ? t("common.saving") : t("common.removeResume")}
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.noResumeYet")}
          </p>
        )}

        <form action={uploadAction} className="mt-4 space-y-3">
          <input type="hidden" name="teacherId" value={teacherId} />
          <div>
            <label
              htmlFor={`teacher-resume-${teacherId}`}
              className="block text-sm/6 font-medium text-gray-900 dark:text-white"
            >
              {resumeUrl ? t("common.replaceResume") : t("common.uploadResume")}
            </label>
            <input
              ref={fileInputRef}
              id={`teacher-resume-${teacherId}`}
              name="resume"
              type="file"
              accept="application/pdf,.pdf"
              required
              className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-gray-300 dark:file:bg-indigo-500/10 dark:file:text-indigo-300 dark:hover:file:bg-indigo-500/20"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
          >
            <DocumentArrowUpIcon aria-hidden="true" className="size-4" />
            {uploadPending ? t("common.saving") : t("common.uploadResume")}
          </button>
        </form>
      </div>
    </section>
  );
}
