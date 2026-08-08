"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { deleteStudent } from "@/app/(dashboard)/students/actions";

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: number;
  studentName: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteStudent, {});

  useEffect(() => {
    if (!state.success) {
      return;
    }

    // Prefer returning to the previous page (schedule, students list, etc.).
    try {
      if (document.referrer) {
        const referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin) {
          router.back();
          return;
        }
      }
    } catch {
      // Fall through to students list.
    }

    router.replace("/students");
  }, [router, state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500"
      >
        {t("common.deleteStudent")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="studentId" value={studentId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={t("common.deleteStudentConfirm", { name: studentName })}
        confirmLabel={t("common.delete")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </>
  );
}
