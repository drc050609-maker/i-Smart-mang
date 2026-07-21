"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { deleteLead } from "@/app/(dashboard)/leads/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";

export function DeleteLeadButton({
  leadId,
  parentName,
}: {
  leadId: number;
  parentName: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteLead, {});

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.push("/leads");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-500 dark:shadow-none dark:hover:bg-red-400 dark:focus-visible:outline-red-500"
      >
        {t("leads.deleteLead")}
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="leadId" value={leadId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={t("leads.deleteLeadConfirm", { name: parentName })}
        confirmLabel={t("common.delete")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </>
  );
}
