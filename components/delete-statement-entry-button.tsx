"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { deleteStatementEntry } from "@/app/(dashboard)/statements/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useLanguage } from "@/components/language-provider";

export function DeleteStatementEntryButton({
  entryId,
  year,
  month,
  kind,
}: {
  entryId: number;
  year: number;
  month: number;
  kind: "manual" | "teacher_paycheck" | "front_desk_paycheck" | "recurring";
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(deleteStatementEntry, {});

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  const description =
    kind === "teacher_paycheck"
      ? t("common.deleteTeacherPaycheckStatementConfirm")
      : kind === "front_desk_paycheck"
        ? t("common.deleteFrontDeskPayStatementConfirm")
        : kind === "recurring"
          ? t("common.deleteRecurringStatementInstanceConfirm")
          : t("common.deleteStatementEntryConfirm");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-60 dark:text-red-400"
      >
        {t("common.delete")}
      </button>
      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="entryId" value={entryId} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
      </form>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.areYouSure")}
        description={
          state.error ? `${description}\n\n${state.error}` : description
        }
        confirmLabel={pending ? t("common.deleting") : t("common.delete")}
        pending={pending}
      />
      {state.error && !open ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </>
  );
}
