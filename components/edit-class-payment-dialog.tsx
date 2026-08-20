"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import {
  updateClassPayment,
  type RecordPaymentState,
} from "@/app/(dashboard)/payments/actions";
import {
  ClassCombobox,
  type ClassOption,
} from "@/components/class-combobox";
import { useLanguage } from "@/components/language-provider";
import { QuickAddStudentDialog } from "@/components/quick-add-student-dialog";
import {
  StudentCombobox,
  type StudentOption,
} from "@/components/student-combobox";
import {
  availablePaymentPlans,
  paymentPlanLabel,
  type PaymentPlan,
} from "@/lib/payment-plan";
import { centsToDollarsInput } from "@/lib/money";
import { formatStudentName } from "@/lib/person-name";
import type { TeacherNameFields } from "@/lib/person-name";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const initialState: RecordPaymentState = {};

function toDateTimeLocal(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type EditablePayment = {
  id: number;
  paid_at: string;
  payment_plan: PaymentPlan;
  amount_cents: number;
  effective_amount_cents: number;
  notes: string | null;
  classId: number;
  classSubject: string;
  student: StudentOption;
};

type PayableClass = {
  id: number;
  subject: string;
  lesson_type: string | null;
  teacher: TeacherNameFields | null;
};

export function EditClassPaymentDialog({
  payment,
  students,
  classes,
}: {
  payment: EditablePayment;
  students: StudentOption[];
  classes: PayableClass[];
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentOption | null>(payment.student);
  const [extraStudents, setExtraStudents] = useState<StudentOption[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [classId, setClassId] = useState<number>(payment.classId);
  const [plan, setPlan] = useState<PaymentPlan>(payment.payment_plan);
  const [state, formAction, pending] = useActionState(
    updateClassPayment,
    initialState,
  );

  useEffect(() => {
    if (!open) return;
    setStudent(payment.student);
    setClassId(payment.classId);
    setPlan(payment.payment_plan);
    setError(null);
  }, [open, payment]);

  useEffect(() => {
    if (state.error) setError(state.error);
    if (state.success) {
      setError(null);
      setOpen(false);
    }
  }, [state.error, state.success]);

  const studentOptions = useMemo(() => {
    const byId = new Map<number, StudentOption>();
    byId.set(payment.student.id, payment.student);
    for (const row of students) {
      byId.set(row.id, row);
    }
    for (const row of extraStudents) {
      byId.set(row.id, row);
    }
    return [...byId.values()];
  }, [extraStudents, payment.student, students]);

  function handleStudentCreated(created: StudentOption) {
    setExtraStudents((current) =>
      current.some((item) => item.id === created.id)
        ? current
        : [...current, created],
    );
    setStudent(created);
  }

  const classRows = useMemo(() => {
    if (classes.some((row) => row.id === payment.classId)) {
      return classes;
    }
    return [
      {
        id: payment.classId,
        subject: payment.classSubject,
        lesson_type: null,
        teacher: null,
      },
      ...classes,
    ];
  }, [classes, payment.classId, payment.classSubject]);

  const classOptions: ClassOption[] = useMemo(
    () =>
      classRows.map((row) => ({
        id: row.id,
        subject: row.subject,
        teacher: row.teacher,
        lesson_type: row.lesson_type,
      })),
    [classRows],
  );
  const selectedClass = classOptions.find((row) => row.id === classId) ?? null;
  const lessonType =
    classRows.find((row) => row.id === classId)?.lesson_type ?? null;
  const plans = [
    ...new Set([...availablePaymentPlans(lessonType), payment.payment_plan]),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        {t("common.edit")}
      </button>

      <Dialog
        open={open}
        onClose={() => {
          if (!pending && !quickAddOpen) setOpen(false);
        }}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("common.editPayment")}
              </DialogTitle>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("common.editPaymentHelp")}
              </p>

              <form
                key={`${payment.id}-${open ? "open" : "closed"}`}
                action={formAction}
                className="mt-5 space-y-4"
              >
                <input type="hidden" name="paymentId" value={payment.id} />
                <input type="hidden" name="studentId" value={student?.id ?? ""} />
                <input type="hidden" name="classId" value={classId} />
                <input type="hidden" name="paymentPlan" value={plan} />

                <div>
                  <label className={labelClassName}>{t("common.student")}</label>
                  <div className="mt-2">
                    <StudentCombobox
                      id={`edit-payment-student-${payment.id}`}
                      students={studentOptions}
                      selected={student}
                      onChange={setStudent}
                    />
                  </div>
                  <div className="mt-2">
                    <QuickAddStudentDialog
                      onCreated={handleStudentCreated}
                      onOpenChange={setQuickAddOpen}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>{t("common.class")}</label>
                  <div className="mt-2">
                    <ClassCombobox
                      id={`edit-payment-class-${payment.id}`}
                      classes={classOptions}
                      value={selectedClass}
                      onChange={(row) => {
                        if (row) setClassId(row.id);
                      }}
                      name={null}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`edit-payment-plan-${payment.id}`} className={labelClassName}>
                    {t("common.plan")}
                  </label>
                  <div className="mt-2">
                    <select
                      id={`edit-payment-plan-${payment.id}`}
                      value={plan}
                      onChange={(event) =>
                        setPlan(event.target.value as PaymentPlan)
                      }
                      className={inputClassName}
                    >
                      {plans.map((value) => (
                        <option key={value} value={value}>
                          {paymentPlanLabel(value, language)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`edit-payment-amount-${payment.id}`} className={labelClassName}>
                    {t("common.amount")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`edit-payment-amount-${payment.id}`}
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      defaultValue={centsToDollarsInput(
                        payment.effective_amount_cents ?? payment.amount_cents,
                      )}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`edit-payment-paid-at-${payment.id}`} className={labelClassName}>
                    {t("common.paidAt")}
                  </label>
                  <div className="mt-2">
                    <input
                      id={`edit-payment-paid-at-${payment.id}`}
                      name="paidAt"
                      type="datetime-local"
                      defaultValue={toDateTimeLocal(payment.paid_at)}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`edit-payment-notes-${payment.id}`} className={labelClassName}>
                    {t("common.notes")}
                  </label>
                  <div className="mt-2">
                    <textarea
                      id={`edit-payment-notes-${payment.id}`}
                      name="notes"
                      rows={2}
                      defaultValue={payment.notes ?? ""}
                      className={inputClassName}
                    />
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 dark:bg-white/10 dark:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending || student == null}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {pending ? t("common.saving") : t("common.savePayment")}
                  </button>
                </div>
              </form>

              <p className="sr-only">
                {student ? formatStudentName(student) : ""}
              </p>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
