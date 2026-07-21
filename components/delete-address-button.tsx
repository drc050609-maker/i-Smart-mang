"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { deleteStudentAddress } from "@/app/(dashboard)/students/actions";

export function DeleteAddressButton({
  studentId,
  addressId,
}: {
  studentId: number;
  addressId: number;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteStudentAddress, {});

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
        {t("common.delete")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="addressId" value={addressId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={t("common.deleteAddressConfirm")}
        confirmLabel={t("common.delete")}
        pending={pending}
      />

      {state.error ? (
        <span className="sr-only">{state.error}</span>
      ) : null}
    </>
  );
}
