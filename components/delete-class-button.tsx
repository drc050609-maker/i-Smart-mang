"use client";

import { useActionState, useRef, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import {
  deleteClass,
  deleteTuitionCourse,
  type ActionState,
} from "@/app/(dashboard)/classes/actions";

const initialState: ActionState = {};

export function DeleteClassButton({
  classId,
  classSubject,
  lessonType,
  compact = false,
}: {
  classId: number;
  classSubject: string;
  lessonType?: string | null;
  compact?: boolean;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmDescription =
    lessonType === "trial"
      ? t("common.deleteTrialConfirm")
      : t("common.deleteClassConfirm");
  const [state, formAction, pending] = useActionState(
    compact
      ? async (prev: ActionState, formData: FormData) => {
          const result = await deleteTuitionCourse(prev, formData);
          if (result.success) {
            setOpen(false);
          }
          return result;
        }
      : deleteClass,
    initialState,
  );

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          aria-label={t("common.deleteClass")}
          title={t("common.deleteClass")}
        >
          <TrashIcon className="size-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500"
        >
          {t("common.deleteClass")}
        </button>
      )}

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="classId" value={classId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.deleteClass")}
        description={`${confirmDescription} (${formatClassSubject(classSubject, language)} #${classId})`}
        confirmLabel={t("common.deleteClass")}
        pending={pending}
      />

      {state.error ? (
        <p
          className={
            compact
              ? "mt-1 text-xs text-red-600 dark:text-red-400"
              : "mt-2 text-sm text-red-600 dark:text-red-400"
          }
        >
          {state.error}
        </p>
      ) : null}
    </>
  );
}
