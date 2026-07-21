"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CreditCardIcon, PlusIcon } from "@heroicons/react/24/outline";

import {
  recordClassPayment,
  updateClassPaymentStatus,
  type RecordPaymentState,
} from "@/app/(dashboard)/payments/actions";
import {
  correctClassPaymentAmount,
} from "@/app/(dashboard)/finance-actions";
import { EditAmountDialog } from "@/components/edit-amount-dialog";
import {
  StudentCombobox,
  type StudentOption,
} from "@/components/student-combobox";
import { useLanguage } from "@/components/language-provider";
import {
  TeacherCombobox,
  type TeacherOption,
} from "@/components/teacher-combobox";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import { formatClassSubject } from "@/lib/class-subject";
import { appLanguageLocale } from "@/lib/language";
import {
  availablePaymentPlans,
  paymentPlanLabel,
  sessionCountForPlan,
  type PaymentPlan,
} from "@/lib/payment-plan";
import {
  formatStudentName,
  formatTeacherName,
  sortTeachers,
  type TeacherNameFields,
} from "@/lib/person-name";
import {
  formatPaymentStatus,
  paymentStatusBadgeClass,
  type PaymentStatus,
} from "@/lib/payment-status";
import {
  formatTuition,
  type TuitionPricing,
} from "@/lib/tuition";

export type PayableClassRow = {
  id: number;
  subject: string;
  teacher_id: number | null;
  duration_minutes: number | null;
  lesson_type: string | null;
  class_track: string | null;
  teacher: TeacherNameFields | null;
  pricing: TuitionPricing;
};

export type PaymentHistoryRow = {
  id: number;
  paid_at: string;
  payment_plan: PaymentPlan;
  amount_cents: number;
  effective_amount_cents: number;
  session_count: number;
  status: PaymentStatus;
  student: StudentOption;
  classSubject: string;
};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: RecordPaymentState = {};

type DialogStep = "form" | "confirm";

type PendingPayment = {
  classRow: PayableClassRow;
  plan: PaymentPlan;
  amount: number;
};

function formatPaidAt(iso: string, language: "en" | "zh") {
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

function formatClassCount(count: number, t: (key: import("@/lib/i18n").TranslationKey, params?: Record<string, string | number>) => string) {
  return count === 1
    ? t("common.classCount", { count: 1 })
    : t("common.classCountPlural", { count });
}

function planAmount(pricing: TuitionPricing, plan: PaymentPlan) {
  switch (plan) {
    case "single":
      return pricing.perClass;
    case "package_20":
      return pricing.package20;
    case "package_50":
      return pricing.package50;
  }
}

function teacherFromClass(classRow: PayableClassRow): TeacherOption | null {
  if (!classRow.teacher_id || !classRow.teacher) return null;
  return {
    id: classRow.teacher_id,
    first_name: classRow.teacher.first_name,
    last_name: classRow.teacher.last_name,
  };
}

export function ClassPaymentsSection({
  classes,
  students,
  recentPayments,
}: {
  classes: PayableClassRow[];
  students: StudentOption[];
  recentPayments: PaymentHistoryRow[];
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const lastHandledPaymentIdRef = useRef<number | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<DialogStep>("form");
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    null,
  );
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOption | null>(
    null,
  );
  const [selectedClassId, setSelectedClassId] = useState<number | "">("");
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | "">("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    recordClassPayment,
    initialState,
  );

  const teacherOptions = useMemo(() => {
    const byId = new Map<number, TeacherOption>();
    for (const classRow of classes) {
      const teacher = teacherFromClass(classRow);
      if (teacher) {
        byId.set(teacher.id, teacher);
      }
    }
    return sortTeachers([...byId.values()]);
  }, [classes]);

  const classesForTeacher = useMemo(() => {
    if (!selectedTeacher) return [];
    return classes.filter(
      (classRow) => classRow.teacher_id === selectedTeacher.id,
    );
  }, [classes, selectedTeacher]);

  const selectedClass = useMemo(
    () =>
      typeof selectedClassId === "number"
        ? (classes.find((classRow) => classRow.id === selectedClassId) ?? null)
        : null,
    [classes, selectedClassId],
  );

  const availablePlans = useMemo(() => {
    if (!selectedClass) return [];
    return availablePaymentPlans(selectedClass.lesson_type)
      .map((plan) => {
        const amount = planAmount(selectedClass.pricing, plan);
        if (amount === null) return null;
        return { plan, amount };
      })
      .filter((row): row is { plan: PaymentPlan; amount: number } => row !== null);
  }, [selectedClass]);

  useEffect(() => {
    if (state.error) {
      setSuccessMessage(null);
    }

    if (
      state.success &&
      state.paymentId &&
      state.paymentId !== lastHandledPaymentIdRef.current &&
      pendingPayment &&
      selectedStudent
    ) {
      lastHandledPaymentIdRef.current = state.paymentId;
      const classCount = sessionCountForPlan(pendingPayment.plan);
      setSuccessMessage(
        t("common.paymentRecorded", {
          student: formatStudentName(selectedStudent),
          count: classCount,
          subject: formatClassSubject(pendingPayment.classRow.subject, language),
        }),
      );
      resetDialog();
      router.refresh();
    }
  }, [
    state.error,
    state.success,
    state.paymentId,
    pendingPayment,
    selectedStudent,
    router,
    t,
    language,
  ]);

  function resetDialog() {
    setRecordDialogOpen(false);
    setDialogStep("form");
    setPendingPayment(null);
    setSelectedStudent(null);
    setSelectedTeacher(null);
    setSelectedClassId("");
    setSelectedPlan("");
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

  function handleTeacherChange(teacher: TeacherOption | null) {
    setSelectedTeacher(teacher);
    setSelectedClassId("");
    setSelectedPlan("");
  }

  function goToConfirmStep() {
    if (!selectedStudent) {
      setFormError(t("common.selectStudentFirst"));
      return;
    }

    if (!selectedTeacher) {
      setFormError(t("common.selectTeacherFirst"));
      return;
    }

    if (!selectedClass) {
      setFormError(t("common.selectClassFirst"));
      return;
    }

    if (!selectedPlan) {
      setFormError(t("common.howManyClasses"));
      return;
    }

    const amount = planAmount(selectedClass.pricing, selectedPlan);
    if (amount === null || amount <= 0) {
      setFormError(t("common.paymentOptionUnavailable"));
      return;
    }

    setFormError(null);
    setPendingPayment({
      classRow: selectedClass,
      plan: selectedPlan,
      amount,
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
          {t("common.recordPayment")}
        </button>
      </div>

      {recentPayments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-white/15 dark:bg-gray-900/40">
          <CreditCardIcon
            aria-hidden="true"
            className="mx-auto size-10 text-gray-400 dark:text-gray-500"
          />
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {t("common.noPaymentsYet")}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.paymentsSubtitle")}
          </p>
          <button
            type="button"
            onClick={openRecordDialog}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            {t("common.recordPayment")}
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
                      {t("common.class")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.plan")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.status")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.amount")}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                    >
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-4 pr-3 pl-4 text-sm whitespace-nowrap text-gray-700 sm:pl-0 dark:text-gray-300">
                        {formatPaidAt(payment.paid_at, language)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white">
                        {formatStudentName(payment.student)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatClassSubject(payment.classSubject, language)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {paymentPlanLabel(payment.payment_plan, language)}
                        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                          {payment.session_count === 1
                            ? t("common.sessionCount", {
                                count: payment.session_count,
                              })
                            : t("common.sessionCountPlural", {
                                count: payment.session_count,
                              })}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${paymentStatusBadgeClass(payment.status)}`}
                        >
                          {formatPaymentStatus(payment.status, language)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        <div className="flex items-center justify-end gap-2">
                          <span>
                            {formatAmountFromCents(
                              payment.effective_amount_cents ??
                                payment.amount_cents,
                            )}
                          </span>
                          {payment.effective_amount_cents != null &&
                          payment.effective_amount_cents !==
                            payment.amount_cents ? (
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                              ({formatAmountFromCents(payment.amount_cents)})
                            </span>
                          ) : null}
                          {payment.status === "completed" ? (
                            <EditAmountDialog
                              compact
                              title={t("common.editPaymentAmount")}
                              description={t("common.correctionKeepsHistory")}
                              currentAmountCents={
                                payment.effective_amount_cents ??
                                payment.amount_cents
                              }
                              originalAmountCents={payment.amount_cents}
                              action={correctClassPaymentAmount}
                              hiddenFields={{ paymentId: payment.id }}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                        {payment.status === "completed" ? (
                          <PaymentStatusActions
                            payment={payment}
                            students={students}
                          />
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            {t("common.notAvailable")}
                          </span>
                        )}
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
                    {t("common.recordPayment")}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.recordPaymentDialogHelp")}
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label htmlFor="payment-student" className={labelClassName}>
                        {t("common.student")}
                      </label>
                      <div className="mt-2">
                        <StudentCombobox
                          id="payment-student"
                          students={students}
                          selected={selectedStudent}
                          onChange={setSelectedStudent}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="payment-teacher" className={labelClassName}>
                        {t("common.teacher")}
                      </label>
                      <div className="mt-2">
                        <TeacherCombobox
                          id="payment-teacher"
                          teachers={teacherOptions}
                          value={selectedTeacher}
                          onChange={handleTeacherChange}
                        />
                      </div>
                    </div>

                    {selectedTeacher ? (
                      <div>
                        <label htmlFor="payment-class" className={labelClassName}>
                          {t("common.class")}
                        </label>
                        {classesForTeacher.length === 0 ? (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t("common.noActiveClassesFor", {
                              name: formatTeacherName(selectedTeacher),
                            })}
                          </p>
                        ) : (
                          <select
                            id="payment-class"
                            value={selectedClassId}
                            onChange={(event) => {
                              setSelectedClassId(
                                event.target.value
                                  ? Number(event.target.value)
                                  : "",
                              );
                              setSelectedPlan("");
                            }}
                            className={`${inputClassName} mt-2`}
                          >
                            <option value="">{t("common.selectClass")}</option>
                            {classesForTeacher.map((classRow) => (
                              <option key={classRow.id} value={classRow.id}>
                                {formatClassSubject(classRow.subject, language)}
                                {classRow.lesson_type
                                  ? ` · ${formatLessonType(classRow.lesson_type as LessonType, language)}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ) : null}

                    {selectedClass ? (
                      <fieldset>
                        <legend className={labelClassName}>
                          {t("common.howManyClasses")}
                        </legend>
                        <div className="mt-2 space-y-2">
                          {availablePlans.map(({ plan, amount }) => (
                            <label
                              key={plan}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition ${
                                selectedPlan === plan
                                  ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                                  : "border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="paymentPlanChoice"
                                  value={plan}
                                  checked={selectedPlan === plan}
                                  onChange={() => setSelectedPlan(plan)}
                                  className="size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5"
                                />
                                <span>
                                  <span className="block text-sm font-medium text-gray-900 dark:text-white">
                                    {paymentPlanLabel(plan, language)}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                                    {sessionCountForPlan(plan) === 1
                                      ? t("common.sessionCount", {
                                          count: sessionCountForPlan(plan),
                                        })
                                      : t("common.sessionCountPlural", {
                                          count: sessionCountForPlan(plan),
                                        })}
                                  </span>
                                </span>
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatTuition(amount)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}

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
              ) : pendingPayment && selectedStudent ? (
                <>
                  <DialogTitle
                    as="h3"
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {t("common.confirmPaymentTitle")}
                  </DialogTitle>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.confirmPaymentBeforeRecord")}
                  </p>
                  <p className="mt-3 text-base text-gray-900 dark:text-white">
                    <span className="font-semibold">
                      {formatStudentName(selectedStudent)}
                    </span>{" "}
                    {t("common.paidFor")}{" "}
                    <span className="font-semibold">
                      {formatClassCount(
                        sessionCountForPlan(pendingPayment.plan),
                        t,
                      )}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {formatClassSubject(pendingPayment.classRow.subject, language)} ·{" "}
                    {paymentPlanLabel(pendingPayment.plan, language)}
                    {pendingPayment.classRow.teacher
                      ? ` · ${formatTeacherName(pendingPayment.classRow.teacher)}`
                      : ""}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
                    {formatTuition(pendingPayment.amount)}
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
                      name="classId"
                      value={pendingPayment.classRow.id}
                    />
                    <input
                      type="hidden"
                      name="paymentPlan"
                      value={pendingPayment.plan}
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

function PaymentStatusActions({
  payment,
  students,
}: {
  payment: PaymentHistoryRow;
  students: StudentOption[];
}) {
  const { language, t } = useLanguage();
  const [openAction, setOpenAction] = useState<"refund" | "exchange" | null>(
    null,
  );
  const [targetStudent, setTargetStudent] = useState<StudentOption | null>(
    null,
  );
  const [transferAll, setTransferAll] = useState(true);
  const [credits, setCredits] = useState("");
  const [state, formAction, pending] = useActionState(
    updateClassPaymentStatus,
    initialState,
  );

  const otherStudents = useMemo(
    () => students.filter((student) => student.id !== payment.student.id),
    [students, payment.student.id],
  );

  useEffect(() => {
    if (state.success) {
      setOpenAction(null);
      setTargetStudent(null);
    }
  }, [state.success]);

  useEffect(() => {
    if (openAction) {
      setTransferAll(true);
      setCredits(String(payment.session_count));
    }
  }, [openAction, payment.session_count]);

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1">
        <button
          type="button"
          onClick={() => setOpenAction("refund")}
          className="rounded-md px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          {t("common.refundAction")}
        </button>
        <button
          type="button"
          onClick={() => setOpenAction("exchange")}
          className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10"
        >
          {t("common.exchange")}
        </button>
      </div>

      <Dialog
        open={openAction !== null}
        onClose={() => !pending && setOpenAction(null)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {openAction === "refund"
                  ? t("common.refundCredits")
                  : t("common.exchangeCredits")}
              </DialogTitle>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {formatStudentName(payment.student)} — {formatClassSubject(payment.classSubject, language)} (
                {t("common.allCreditsFromPayment", {
                  count: payment.session_count,
                })})
              </p>

              {state.error ? (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                  {state.error}
                </p>
              ) : null}

              <form action={formAction} className="mt-4 space-y-4">
                <input type="hidden" name="paymentId" value={payment.id} />
                <input
                  type="hidden"
                  name="status"
                  value={openAction ?? "refunded"}
                />
                {openAction === "exchange" ? (
                  <>
                    <input
                      type="hidden"
                      name="toStudentId"
                      value={targetStudent?.id ?? ""}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        {t("common.transferTo")}
                      </label>
                      <div className="mt-2">
                        <StudentCombobox
                          id={`exchange-student-${payment.id}`}
                          students={otherStudents}
                          selected={targetStudent}
                          onChange={setTargetStudent}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                <div>
                  <label
                    htmlFor={`payment-credits-${payment.id}`}
                    className="block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {t("common.credits")}
                  </label>
                  <input
                    id={`payment-credits-${payment.id}`}
                    name="credits"
                    type="number"
                    min={1}
                    max={payment.session_count}
                    required
                    readOnly={transferAll}
                    value={credits}
                    onChange={(event) => setCredits(event.target.value)}
                    className="mt-2 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 dark:bg-white/5 dark:text-white dark:outline-white/10"
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={transferAll}
                      onChange={(event) => {
                        setTransferAll(event.target.checked);
                        if (event.target.checked) {
                          setCredits(String(payment.session_count));
                        }
                      }}
                    />
                    {t("common.allCreditsFromPayment", {
                      count: payment.session_count,
                    })}
                  </label>
                </div>

                <div>
                  <label
                    htmlFor={`payment-notes-${payment.id}`}
                    className="block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {t("common.notes")} {t("common.optional")}
                  </label>
                  <input
                    id={`payment-notes-${payment.id}`}
                    name="notes"
                    className="mt-2 block w-full rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 dark:bg-white/5 dark:text-white dark:outline-white/10"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpenAction(null)}
                    disabled={pending}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      pending ||
                      (openAction === "exchange" && !targetStudent)
                    }
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {pending
                      ? t("common.saving")
                      : openAction === "refund"
                        ? t("common.refundAction")
                        : t("common.exchange")}
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
