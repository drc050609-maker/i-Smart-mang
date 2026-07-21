"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@heroicons/react/24/outline";

import {
  clearClassPricingField,
  type MoneyActionState,
} from "@/app/(dashboard)/finance-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { PricingField } from "@/components/edit-class-pricing-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";

const initialState: MoneyActionState = {};

const FIELD_TITLE_KEY = {
  single: "common.singleClassPrice",
  package20: "common.package20Price",
  package50: "common.package50Price",
} as const;

export function DeleteClassPricingButton({
  classId,
  subject,
  field,
}: {
  classId: number;
  subject: string;
  field: PricingField;
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldTitle = t(FIELD_TITLE_KEY[field]);
  const [state, formAction, pending] = useActionState(
    async (prev: MoneyActionState, formData: FormData) => {
      const result = await clearClassPricingField(prev, formData);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
      return result;
    },
    initialState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        aria-label={`${t("common.deletePricing")}: ${fieldTitle}`}
        title={`${t("common.deletePricing")}: ${fieldTitle}`}
      >
        <TrashIcon className="size-3.5" />
      </button>

      <form ref={formRef} action={formAction} className="hidden">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="field" value={field} />
        <input
          type="hidden"
          name="reason"
          value={t("common.clearedClassPricing")}
        />
      </form>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        title={t("common.deletePricing")}
        description={`${t("common.deletePricingFieldConfirm", { field: fieldTitle })} (${formatClassSubject(subject, language)})`}
        confirmLabel={t("common.deletePricing")}
        pending={pending}
      />

      {state.error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
    </>
  );
}
