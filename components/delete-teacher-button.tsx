"use client";

import { useActionState, useRef, useState } from "react";

import { deleteTeacher } from "@/app/(dashboard)/tutors/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";

export function DeleteTeacherButton({
  teacherId,
  teacherName,
}: {
  teacherId: number;
  teacherName: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteTeacher, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500"
      >
        {t("common.deleteTeacher")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="teacherId" value={teacherId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={t("common.deleteTeacherConfirm", { name: teacherName })}
        confirmLabel={t("common.delete")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </>
  );
}
