"use client";

import { useActionState, useRef, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import {
  deleteTuitionCourse,
  type ActionState,
} from "@/app/(dashboard)/classes/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";

const initialState: ActionState = {};

export function DeleteCourseButton({
  classId,
  subject,
}: {
  classId: number;
  subject: string;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await deleteTuitionCourse(prev, formData);
      if (result.success) {
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        aria-label={t("common.deleteCourse")}
        title={t("common.deleteCourse")}
      >
        <TrashIcon className="size-3.5" />
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="classId" value={classId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.deleteCourse")}
        description={`${t("common.deleteCourseConfirm")} (${formatClassSubject(subject, language)})`}
        confirmLabel={t("common.deleteCourse")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </>
  );
}
