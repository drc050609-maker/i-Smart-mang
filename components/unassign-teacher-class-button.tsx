"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import { unassignTeacherClass } from "@/app/(dashboard)/tutors/actions";

export function UnassignTeacherClassButton({
  teacherId,
  classId,
  classSubject,
}: {
  teacherId: number;
  classId: number;
  classSubject: string;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(unassignTeacherClass, {});

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
        <input type="hidden" name="teacherId" value={teacherId} />
        <input type="hidden" name="classId" value={classId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.removeClass")}
        description={`${t("common.unassigned")} — ${formatClassSubject(classSubject, language)}`}
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
