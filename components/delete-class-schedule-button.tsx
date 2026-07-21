"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { deleteClassSchedule } from "@/app/(dashboard)/classes/actions";

export function DeleteClassScheduleButton({
  classId,
  scheduleId,
}: {
  classId: number;
  scheduleId: number;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteClassSchedule, {});

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
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
      >
        {t("common.deleteClassSchedule")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="scheduleId" value={scheduleId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.removeMeetingTime")}
        description={t("common.removeMeetingTimeConfirm")}
        confirmLabel={t("common.remove")}
        pending={pending}
      />
    </>
  );
}
