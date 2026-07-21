"use client";

import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import type { LiveClassItem } from "@/lib/live-classes";

export function DashboardUpcomingClasses({
  classes,
}: {
  classes: LiveClassItem[];
}) {
  const { language, t } = useLanguage();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("common.comingUpToday")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.classesStillScheduled")}
          </p>
        </div>
        <Link
          href="/schedule"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {t("common.fullSchedule")}
        </Link>
      </div>

      {classes.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noMoreClassesToday")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
          {classes.map((classItem) => (
            <li
              key={`${classItem.classId}-${classItem.scheduleId}`}
              className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  href={`/classes/${classItem.classId}`}
                  className="font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
                >
                  {formatClassSubject(classItem.subject, language)}
                </Link>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {classItem.teacherName ?? t("common.noTeacherAssigned")}
                  {classItem.roomNumber
                    ? ` · ${t("common.room")} ${classItem.roomNumber}`
                    : null}
                </p>
              </div>
              <p className="shrink-0 text-sm text-gray-600 dark:text-gray-300">
                {classItem.timeLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
