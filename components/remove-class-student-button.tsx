"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { removeClassStudent } from "@/app/(dashboard)/classes/actions";

export function RemoveClassStudentButton({
  classId,
  enrollmentId,
  studentName,
}: {
  classId: number;
  enrollmentId: number;
  studentName: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(removeClassStudent, {});

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
      >
        {t("common.remove")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="enrollmentId" value={enrollmentId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={t("common.removeFromClass") + ` — ${studentName}`}
        confirmLabel={t("common.remove")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </>
  );
}
