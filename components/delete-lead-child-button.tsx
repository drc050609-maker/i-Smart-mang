"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { deleteLeadChild } from "@/app/(dashboard)/leads/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";

export function DeleteLeadChildButton({
  leadId,
  childId,
  childName,
}: {
  leadId: number;
  childId: number;
  childName: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteLeadChild, {});

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
        {t("common.delete")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="childId" value={childId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={t("leads.deleteChildConfirm", { name: childName })}
        confirmLabel={t("common.delete")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </>
  );
}
