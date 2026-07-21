"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/outline";

import {
  grantClassCredits,
  recordMakeupSession,
  transferStudentClassCredits,
  writeOffClassCredits,
  type ActionState,
} from "@/app/(dashboard)/students/credit-actions";
import {
  StudentCombobox,
  type StudentOption,
} from "@/components/student-combobox";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import { formatSessionDate } from "@/lib/class-session-credits";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: ActionState = {};

type CreditAction = "grant" | "writeoff" | "makeup" | "exchange" | "refund";

export function StudentCreditActionsDialog({
  studentId,
  classId,
  classSubject,
  scheduleId,
  remainingCredits,
  studentOptions,
}: {
  studentId: number;
  classId: number;
  classSubject: string;
  scheduleId: number | null;
  remainingCredits: number;
  studentOptions: StudentOption[];
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<CreditAction>("grant");
  const [targetStudent, setTargetStudent] = useState<StudentOption | null>(null);
  const [transferAll, setTransferAll] = useState(false);

  const otherStudents = useMemo(
    () => studentOptions.filter((student) => student.id !== studentId),
    [studentOptions, studentId],
  );

  const [grantState, grantAction, grantPending] = useActionState(
    grantClassCredits,
    initialState,
  );
  const [writeoffState, writeoffAction, writeoffPending] = useActionState(
    writeOffClassCredits,
    initialState,
  );
  const [makeupState, makeupAction, makeupPending] = useActionState(
    recordMakeupSession,
    initialState,
  );
  const [transferState, transferAction, transferPending] = useActionState(
    transferStudentClassCredits,
    initialState,
  );

  const pending =
    grantPending || writeoffPending || makeupPending || transferPending;
  const error =
    grantState.error ??
    writeoffState.error ??
    makeupState.error ??
    transferState.error;
  const success =
    grantState.success ||
    writeoffState.success ||
    makeupState.success ||
    transferState.success;

  useEffect(() => {
    if (success) {
      setOpen(false);
      setTargetStudent(null);
      setTransferAll(false);
    }
  }, [success]);

  const defaultTransferCredits =
    remainingCredits > 0 ? String(remainingCredits) : "1";

  const actionLabels: Record<CreditAction, string> = {
    grant: t("common.grantAction"),
    exchange: t("common.exchange"),
    refund: t("common.refundAction"),
    writeoff: t("common.writeOffAction"),
    makeup: t("common.makeUpAction"),
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
      >
        <PlusIcon aria-hidden="true" className="size-3.5" />
        {t("common.creditsButton")}
      </button>

      <Dialog open={open} onClose={() => !pending && setOpen(false)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("common.classCreditsTitle", {
                  subject: formatClassSubject(classSubject, language),
                })}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {remainingCredits} {t("common.credits")} · {t("common.remaining")}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(
                  ["grant", "exchange", "refund", "writeoff", "makeup"] as const
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAction(value)}
                    className={
                      action === value
                        ? "rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                        : "rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-300"
                    }
                  >
                    {actionLabels[value]}
                  </button>
                ))}
              </div>

              {error ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}

              {action === "grant" ? (
                <form action={grantAction} className="mt-4 space-y-4">
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="classId" value={classId} />
                  <div>
                    <label htmlFor="grant-credits" className={labelClassName}>
                      {t("common.creditsToAdd")}
                    </label>
                    <input
                      id="grant-credits"
                      name="credits"
                      type="number"
                      min={1}
                      required
                      className={`${inputClassName} mt-2`}
                    />
                  </div>
                  <div>
                    <label htmlFor="grant-reason" className={labelClassName}>
                      {t("common.reason")} {t("common.optional")}
                    </label>
                    <input id="grant-reason" name="reason" className={`${inputClassName} mt-2`} />
                  </div>
                  <SubmitRow pending={pending} label={t("common.grant")} t={t} />
                </form>
              ) : null}

              {action === "exchange" ? (
                <form action={transferAction} className="mt-4 space-y-4">
                  <input type="hidden" name="fromStudentId" value={studentId} />
                  <input type="hidden" name="classId" value={classId} />
                  <input type="hidden" name="transferType" value="exchange" />
                  <input
                    type="hidden"
                    name="toStudentId"
                    value={targetStudent?.id ?? ""}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("common.exchangeCredits")}
                  </p>
                  <div>
                    <label htmlFor="exchange-student" className={labelClassName}>
                      {t("common.transferTo")}
                    </label>
                    <div className="mt-2">
                      <StudentCombobox
                        id="exchange-student"
                        students={otherStudents}
                        selected={targetStudent}
                        onChange={setTargetStudent}
                      />
                    </div>
                  </div>
                  <CreditsField
                    id="exchange-credits"
                    defaultValue={defaultTransferCredits}
                    max={remainingCredits}
                    transferAll={transferAll}
                    onTransferAllChange={setTransferAll}
                    remainingCredits={remainingCredits}
                    t={t}
                  />
                  <div>
                    <label htmlFor="exchange-reason" className={labelClassName}>
                      {t("common.reason")} {t("common.optional")}
                    </label>
                    <input id="exchange-reason" name="reason" className={`${inputClassName} mt-2`} />
                  </div>
                  <SubmitRow
                    pending={pending}
                    label={t("common.exchangeCredits")}
                    disabled={!targetStudent || remainingCredits <= 0}
                    t={t}
                  />
                </form>
              ) : null}

              {action === "refund" ? (
                <form action={transferAction} className="mt-4 space-y-4">
                  <input type="hidden" name="fromStudentId" value={studentId} />
                  <input type="hidden" name="classId" value={classId} />
                  <input type="hidden" name="transferType" value="refund" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("common.refundCredits")}
                  </p>
                  <CreditsField
                    id="refund-credits"
                    defaultValue={defaultTransferCredits}
                    max={remainingCredits}
                    transferAll={transferAll}
                    onTransferAllChange={setTransferAll}
                    remainingCredits={remainingCredits}
                    t={t}
                  />
                  <div>
                    <label htmlFor="refund-reason" className={labelClassName}>
                      {t("common.reason")} {t("common.optional")}
                    </label>
                    <input id="refund-reason" name="reason" className={`${inputClassName} mt-2`} />
                  </div>
                  <SubmitRow
                    pending={pending}
                    label={t("common.refundCredits")}
                    disabled={remainingCredits <= 0}
                    t={t}
                  />
                </form>
              ) : null}

              {action === "writeoff" ? (
                <form action={writeoffAction} className="mt-4 space-y-4">
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="classId" value={classId} />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("common.writeOff")}
                  </p>
                  <div>
                    <label htmlFor="writeoff-credits" className={labelClassName}>
                      {t("common.credits")}
                    </label>
                    <input
                      id="writeoff-credits"
                      name="credits"
                      type="number"
                      min={1}
                      max={remainingCredits > 0 ? remainingCredits : undefined}
                      required
                      className={`${inputClassName} mt-2`}
                    />
                  </div>
                  <div>
                    <label htmlFor="writeoff-reason" className={labelClassName}>
                      {t("common.reason")} {t("common.optional")}
                    </label>
                    <input id="writeoff-reason" name="reason" className={`${inputClassName} mt-2`} />
                  </div>
                  <SubmitRow pending={pending} label={t("common.writeOff")} t={t} />
                </form>
              ) : null}

              {action === "makeup" ? (
                <form action={makeupAction} className="mt-4 space-y-4">
                  <input type="hidden" name="studentId" value={studentId} />
                  <input type="hidden" name="classId" value={classId} />
                  {scheduleId ? (
                    <input type="hidden" name="scheduleId" value={scheduleId} />
                  ) : null}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("common.makeUpCredit")}
                  </p>
                  <div>
                    <label htmlFor="makeup-date" className={labelClassName}>
                      {t("common.sessionDate")}
                    </label>
                    <input
                      id="makeup-date"
                      name="sessionDate"
                      type="date"
                      defaultValue={formatSessionDate(new Date())}
                      required
                      className={`${inputClassName} mt-2`}
                    />
                  </div>
                  <div>
                    <label htmlFor="makeup-cost" className={labelClassName}>
                      {t("common.creditCost")}
                    </label>
                    <select
                      id="makeup-cost"
                      name="creditCost"
                      required
                      className={`${inputClassName} mt-2`}
                      defaultValue="1"
                    >
                      <option value="1">1 {t("common.credits")}</option>
                      <option value="2">2 {t("common.credits")}</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="makeup-notes" className={labelClassName}>
                      {t("common.notes")} {t("common.optional")}
                    </label>
                    <input id="makeup-notes" name="notes" className={`${inputClassName} mt-2`} />
                  </div>
                  <SubmitRow pending={pending} label={t("common.makeUpCredit")} t={t} />
                </form>
              ) : null}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function CreditsField({
  id,
  defaultValue,
  max,
  transferAll,
  onTransferAllChange,
  remainingCredits,
  t,
}: {
  id: string;
  defaultValue: string;
  max: number;
  transferAll: boolean;
  onTransferAllChange: (value: boolean) => void;
  remainingCredits: number;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const [credits, setCredits] = useState(defaultValue);

  useEffect(() => {
    if (transferAll) {
      setCredits(String(Math.max(remainingCredits, 1)));
    }
  }, [transferAll, remainingCredits]);

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {t("common.credits")}
      </label>
      <input
        id={id}
        name="credits"
        type="number"
        min={1}
        max={max > 0 ? max : undefined}
        required
        value={credits}
        onChange={(event) => setCredits(event.target.value)}
        readOnly={transferAll}
        className={`${inputClassName} mt-2`}
      />
      <label className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          checked={transferAll}
          onChange={(event) => onTransferAllChange(event.target.checked)}
          disabled={remainingCredits <= 0}
        />
        {t("common.allCreditsFromPayment", { count: remainingCredits })}
      </label>
    </div>
  );
}

function SubmitRow({
  pending,
  label,
  disabled = false,
  t,
}: {
  pending: boolean;
  label: string;
  disabled?: boolean;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="submit"
        disabled={pending || disabled}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {pending ? t("common.saving") : label}
      </button>
    </div>
  );
}
