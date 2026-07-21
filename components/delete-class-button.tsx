"use client";

import { useActionState, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import { deleteClass } from "@/app/(dashboard)/classes/actions";

export function DeleteClassButton({
  classId,
  classSubject,
}: {
  classId: number;
  classSubject: string;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteClass, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500"
      >
        {t("common.deleteClass")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="classId" value={classId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.deleteClass")}
        description={`${t("common.deleteClassConfirm")} (${formatClassSubject(classSubject, language)})`}
        confirmLabel={t("common.deleteClass")}
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
