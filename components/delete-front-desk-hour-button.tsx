"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { deleteFrontDeskHourLog } from "@/app/(dashboard)/tutors/actions";

export function DeleteFrontDeskHourButton({
  teacherId,
  logId,
  onDeleted,
}: {
  teacherId: number;
  logId: number;
  onDeleted?: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    deleteFrontDeskHourLog,
    {},
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      onDeleted?.();
    }
  }, [state.success, onDeleted]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:text-red-500 disabled:opacity-60 dark:text-red-400"
      >
        {t("common.delete")}
      </button>
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="teacherId" value={teacherId} />
        <input type="hidden" name="logId" value={logId} />
      </form>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={t("common.deleteHourLogConfirm")}
        confirmLabel={t("common.delete")}
        pending={pending}
      />
    </>
  );
}
