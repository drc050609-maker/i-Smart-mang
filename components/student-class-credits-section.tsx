"use client";

import Link from "next/link";

import { ClassSessionActionButtons } from "@/components/class-session-action-buttons";
import { StudentCreditActionsDialog } from "@/components/student-credit-actions-dialog";
import type { StudentOption } from "@/components/student-combobox";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import type { StudentClassCreditRow } from "@/lib/class-session-credits";

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

export function StudentClassCreditsSection({
  rows,
  studentOptions,
}: {
  rows: StudentClassCreditRow[];
  studentOptions: StudentOption[];
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
                <th
                  scope="col"
                  className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                >
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {rows.map((row) => (
                <tr key={row.classId}>
                  <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                    <Link
                      href={`/classes/${row.classId}`}
                      className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      {formatClassSubject(row.subject, language)}
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                    <BalanceCell value={row.balance.sessions_total} />
                  </td>
                  <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                    <BalanceCell
                      value={row.balance.sessions_remaining}
                      highlight={row.balance.sessions_remaining <= 2}
                    />
                  </td>
                  <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                    <BalanceCell value={row.balance.sessions_used} />
                  </td>
                  <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                    <BalanceCell
                      value={row.balance.absence_count}
                      highlight={row.balance.absence_count > 0}
                    />
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
