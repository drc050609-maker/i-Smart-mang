"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { formatStudentName } from "@/lib/person-name";

export type DashboardLowCreditsStudent = {
  id: number;
  "first name": string;
  "last name": string | null;
  totalRemaining: number;
};

export function DashboardLowCredits({
  students,
}: {
  students: DashboardLowCreditsStudent[];
}) {
  const { t } = useLanguage();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.lowCreditsTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.lowCreditsSubtitle")}
          </p>
        </div>
        <Link
          href="/students"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("nav.students")}
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.lowCreditsEmpty")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
          {students.map((student) => (
            <li
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <Link
                href={`/students/${student.id}`}
                className="font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
              >
                {formatStudentName(student)}
              </Link>
              <span
                className={
                  student.totalRemaining <= 0
                    ? "text-sm font-medium text-red-600 dark:text-red-400"
                    : "text-sm font-medium text-amber-700 dark:text-amber-300"
                }
              >
                {student.totalRemaining <= 0
                  ? t("common.noCreditsLeft")
                  : t("common.creditsRemainingCount", {
                      count: student.totalRemaining,
                    })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
