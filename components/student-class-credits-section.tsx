"use client";

import Link from "next/link";

import { ClassSessionActionButtons } from "@/components/class-session-action-buttons";
import { StudentCreditActionsDialog } from "@/components/student-credit-actions-dialog";
import type { StudentOption } from "@/components/student-combobox";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import { classHref } from "@/lib/return-to";
import {
  MAX_CLASS_CREDIT_VALUE,
  type StudentClassCreditRow,
} from "@/lib/class-session-credits";

const creditInputClassName =
  "w-20 rounded-md bg-white px-2 py-1 text-right text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

function BalanceCell({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <span
      className={
        highlight
          ? "font-semibold text-indigo-700 dark:text-indigo-300"
          : "text-gray-900 dark:text-white"
      }
    >
      {value}
    </span>
  );
}

export type CreditField =
  | "sessions_total"
  | "sessions_remaining"
  | "sessions_used"
  | "absence_count";

export function StudentClassCreditsSection({
  rows,
  studentOptions,
  returnTo,
  editing = false,
  onCreditChange,
}: {
  rows: StudentClassCreditRow[];
  studentOptions: StudentOption[];
  returnTo?: string | null;
  editing?: boolean;
  onCreditChange?: (classId: number, field: CreditField, value: number) => void;
}) {
  const { language, t } = useLanguage();

  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t("common.enrollToTrack")}
      </p>
    );
  }

  return (
    <div className="mt-4 flow-root">
      <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                >
                  {t("common.class")}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {t("common.total")}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {t("common.remaining")}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {t("common.used")}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {t("common.absences")}
                </th>
                {editing ? null : (
                  <th
                    scope="col"
                    className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                  >
                    {t("common.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {rows.map((row) => (
                <tr key={row.classId}>
                  <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                    <Link
                      href={classHref(row.classId, returnTo)}
                      className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      {formatClassSubject(row.subject, language)}
                    </Link>
                  </td>
                  <CreditValue
                    editing={editing}
                    value={row.balance.sessions_total}
                    onChange={(value) =>
                      onCreditChange?.(row.classId, "sessions_total", value)
                    }
                  />
                  <CreditValue
                    editing={editing}
                    value={row.balance.sessions_remaining}
                    highlight={!editing && row.balance.sessions_remaining <= 2}
                    onChange={(value) =>
                      onCreditChange?.(row.classId, "sessions_remaining", value)
                    }
                  />
                  <CreditValue
                    editing={editing}
                    value={row.balance.sessions_used}
                    onChange={(value) =>
                      onCreditChange?.(row.classId, "sessions_used", value)
                    }
                  />
                  <CreditValue
                    editing={editing}
                    value={row.balance.absence_count}
                    highlight={!editing && row.balance.absence_count > 0}
                    onChange={(value) =>
                      onCreditChange?.(row.classId, "absence_count", value)
                    }
                  />
                  {editing ? null : (
                    <td className="py-4 pr-4 pl-3 text-right text-sm sm:pr-0">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <StudentCreditActionsDialog
                          studentId={row.balance.student_id}
                          classId={row.classId}
                          classSubject={row.subject}
                          scheduleId={row.scheduleId}
                          remainingCredits={row.balance.sessions_remaining}
                          studentOptions={studentOptions}
                        />
                        <ClassSessionActionButtons
                          studentId={row.balance.student_id}
                          classId={row.classId}
                          scheduleId={row.scheduleId}
                          compact
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreditValue({
  editing,
  value,
  highlight,
  onChange,
}: {
  editing: boolean;
  value: number;
  highlight?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
      {editing ? (
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_CLASS_CREDIT_VALUE}
          step={1}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
          className={creditInputClassName}
        />
      ) : (
        <BalanceCell value={value} highlight={highlight} />
      )}
    </td>
  );
}
