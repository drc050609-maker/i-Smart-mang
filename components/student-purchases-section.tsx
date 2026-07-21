"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

import {
  recordStudentPurchase,
  type PurchaseActionState,
} from "@/app/(dashboard)/purchases/actions";
import { correctStudentPurchaseAmount } from "@/app/(dashboard)/finance-actions";
import { EditAmountDialog } from "@/components/edit-amount-dialog";
import { useLanguage } from "@/components/language-provider";
import {
  StudentCombobox,
  type StudentOption,
} from "@/components/student-combobox";
import { appLanguageLocale } from "@/lib/language";
import { formatStudentName } from "@/lib/person-name";
import { formatTuition } from "@/lib/tuition";

export type PurchaseHistoryRow = {
  id: number;
  purchased_at: string;
  description: string;
  amount_cents: number;
  effective_amount_cents: number;
  student: StudentOption;
};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: PurchaseActionState = {};

type DialogStep = "form" | "confirm";

type PendingPurchase = {
  description: string;
  amount: number;
};

function formatPurchasedAt(iso: string, language: "en" | "zh") {
  return new Date(iso).toLocaleString(appLanguageLocale(language), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAmountFromCents(cents: number) {
  return formatTuition(cents / 100);
}

export function StudentPurchasesSection({
  students,
  recentPurchases,
}: {
  students: StudentOption[];
  recentPurchases: PurchaseHistoryRow[];
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const lastHandledPurchaseIdRef = useRef<number | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<DialogStep>("form");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    null,
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] =
    useState<PendingPurchase | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    recordStudentPurchase,
    initialState,
  );

  useEffect(() => {
    if (state.error) {
      setSuccessMessage(null);
    }

    if (
      state.success &&
      state.purchaseId &&
      state.purchaseId !== lastHandledPurchaseIdRef.current &&
      pendingPurchase &&
      selectedStudent
    ) {
      lastHandledPurchaseIdRef.current = state.purchaseId;
      setSuccessMessage(
        t("common.purchaseRecordedDetail", {
          student: formatStudentName(selectedStudent),
          amount: formatTuition(pendingPurchase.amount),
          description: pendingPurchase.description,
        }),
      );
      resetDialog();
      router.refresh();
    }
  }, [
    state.error,
    state.success,
    state.purchaseId,
    pendingPurchase,
    selectedStudent,
    router,
    t,
  ]);

  function resetDialog() {
    setRecordDialogOpen(false);
    setDialogStep("form");
    setPendingPurchase(null);
    setSelectedStudent(null);
    setDescription("");
    setAmount("");
    setFormError(null);
  }

  function openRecordDialog() {
    resetDialog();
    setSuccessMessage(null);
    setRecordDialogOpen(true);
  }

  function closeRecordDialog() {
    if (!pending) {
      resetDialog();
    }
  }

  function goToConfirmStep() {
    if (!selectedStudent) {
      setFormError(t("common.selectStudentFirst"));
      return;
    }

    const trimmedDescription = description.trim();
    const parsedAmount = Number(amount);

    if (!trimmedDescription) {
      setFormError(t("common.describePurchase"));
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError(t("common.enterValidAmount"));
      return;
    }

    setFormError(null);
    setPendingPurchase({
      description: trimmedDescription,
      amount: parsedAmount,
    });
    setDialogStep("confirm");
  }

  return (
    <div className="mt-6 space-y-6">
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {successMessage}
        </div>
      ) : null}

      <div>
        <button
          type="button"
          onClick={openRecordDialog}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("common.recordPurchase")}
        </button>
      </div>

      {recentPurchases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-white/15 dark:bg-gray-900/40">
          <ShoppingBagIcon
            aria-hidden="true"
            className="mx-auto size-10 text-gray-400 dark:text-gray-500"
          />
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {t("common.noPurchasesYet")}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.purchasesEmptyHelp")}
          </p>
          <button
            type="button"
            onClick={openRecordDialog}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("common.recordPurchase")}
          </button>
        </div>
      ) : (
        <div className="flow-root">
          <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                    >
                      {t("common.date")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.student")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.item")}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                    >
                      {t("common.amount")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {recentPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="py-4 pr-3 pl-4 text-sm whitespace-nowrap text-gray-700 sm:pl-0 dark:text-gray-300">
                        {formatPurchasedAt(purchase.purchased_at, language)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white">
                        {formatStudentName(purchase.student)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {purchase.description}
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap text-gray-900 sm:pr-0 dark:text-white">
                        <div className="flex items-center justify-end gap-2">
                          <span>
                            {formatAmountFromCents(
                              purchase.effective_amount_cents ??
                                purchase.amount_cents,
                            )}
                          </span>
                          <EditAmountDialog
                            compact
                            title={t("common.editPurchaseAmount")}
                            description={t("common.correctionKeepsHistory")}
                            currentAmountCents={
                              purchase.effective_amount_cents ??
                              purchase.amount_cents
                            }
                            originalAmountCents={purchase.amount_cents}
                            action={correctStudentPurchaseAmount}
                            hiddenFields={{ purchaseId: purchase.id }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={recordDialogOpen}
        onClose={closeRecordDialog}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              {dialogStep === "form" ? (
                <>
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {t("common.recordPurchase")}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.purchaseDialogHelp")}
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label htmlFor="purchase-student" className={labelClassName}>
                        {t("common.student")}
                      </label>
                      <div className="mt-2">
                        <StudentCombobox
                          id="purchase-student"
                          students={students}
                          selected={selectedStudent}
                          onChange={setSelectedStudent}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="purchase-description"
                        className={labelClassName}
                      >
                        {t("common.whatPayingFor")}
                      </label>
                      <input
                        id="purchase-description"
                        type="text"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder={t("common.placeholderPurchase")}
                        className={`${inputClassName} mt-2`}
                      />
                    </div>

                    <div>
                      <label htmlFor="purchase-amount" className={labelClassName}>
                        {t("common.amount")}
                      </label>
                      <div className="relative mt-2">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            $
                          </span>
                        </div>
                        <input
                          id="purchase-amount"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="0.00"
                          className={`${inputClassName} pl-7`}
                        />
                      </div>
                    </div>

                    {formError ? (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {formError}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeRecordDialog}
                      className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={goToConfirmStep}
                      className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      {t("common.continue")}
                    </button>
                  </div>
                </>
              ) : pendingPurchase && selectedStudent ? (
                <>
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {t("common.confirmPaymentTitle")}
                  </DialogTitle>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.confirmPurchaseBeforeRecord")}
                  </p>
                  <p className="mt-3 text-base text-gray-900 dark:text-white">
                    <span className="font-semibold">
                      {formatStudentName(selectedStudent)}
                    </span>{" "}
                    {t("common.payingFor")}{" "}
                    <span className="font-semibold">
                      {pendingPurchase.description}
                    </span>
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatTuition(pendingPurchase.amount)}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.addedToStatementsIncome")}
                  </p>

                  {state.error ? (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {state.error}
                    </p>
                  ) : null}

                  <form
                    action={formAction}
                    className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
                  >
                    <input
                      type="hidden"
                      name="studentId"
                      value={selectedStudent.id}
                    />
                    <input
                      type="hidden"
                      name="description"
                      value={pendingPurchase.description}
                    />
                    <input
                      type="hidden"
                      name="amount"
                      value={pendingPurchase.amount}
                    />
                    <button
                      type="button"
                      onClick={() => setDialogStep("form")}
                      disabled={pending}
                      className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                    >
                      {t("common.decline")}
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      {pending ? t("common.processing") : t("common.confirm")}
                    </button>
                  </form>
                </>
              ) : null}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
