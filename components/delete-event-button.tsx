"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";
import { deleteEvent } from "@/app/(dashboard)/events/actions";

export function DeleteEventButton({ eventId }: { eventId: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteEvent, {});

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
        <input type="hidden" name="eventId" value={eventId} />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.deletePost")}
        description={t("common.deletePostConfirm")}
        confirmLabel={t("common.delete")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </>
  );
}
