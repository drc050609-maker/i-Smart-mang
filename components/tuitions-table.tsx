"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListSearchInput } from "@/components/list-search-input";
import {
  ActiveInactiveTabs,
  type ActiveTab,
} from "@/components/active-inactive-tabs";
import { ActiveStatusBadge } from "@/components/active-status-badge";
import { EditClassPricingDialog } from "@/components/edit-class-pricing-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import { classSubjectSearchText, formatClassSubject } from "@/lib/class-subject";
import { formatClassTrack, type ClassTrack } from "@/lib/class-track";
import type { AppLanguage } from "@/lib/language";
import {
  formatDiscountRate,
  formatTuition,
  PACKAGE_20_COUNT,
  PACKAGE_20_DISCOUNT,
  PACKAGE_50_COUNT,
  PACKAGE_50_DISCOUNT,
  type TuitionPricing,
} from "@/lib/tuition";
import { formatTeacherName, type TeacherNameFields } from "@/lib/person-name";

export type TuitionClassRow = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  lesson_type: string | null;
  class_track: string | null;
  is_active: boolean;
  teacher: TeacherNameFields | null;
  pricing: TuitionPricing;
};

function formatDuration(
  minutes: number | null,
  t: (key: "common.notAvailable" | "common.hour" | "common.hours" | "common.minutes", params?: Record<string, string | number>) => string,
) {
  if (!minutes) return t("common.notAvailable");
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1
      ? t("common.hour")
      : t("common.hours", { count: hours });
  }
  return t("common.minutes", { count: minutes });
}

function filterTuitionRows(
  rows: TuitionClassRow[],
  query: string,
  language: AppLanguage,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter((row) => {
    const haystack = [
      classSubjectSearchText(row.subject, language),
      row.teacher ? formatTeacherName(row.teacher) : "",
      formatLessonType(row.lesson_type as LessonType | null, language),
      formatClassTrack(row.class_track as ClassTrack | null, language),
      formatTuition(row.pricing.perClass, language),
      String(row.id),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function TuitionsTable({ classes }: { classes: TuitionClassRow[] }) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");

  const activeCount = useMemo(
    () => classes.filter((row) => row.is_active).length,
    [classes],
  );
  const inactiveCount = classes.length - activeCount;

  const statusFiltered = useMemo(
    () =>
      classes.filter((row) =>
        activeTab === "active" ? row.is_active : !row.is_active,
      ),
    [classes, activeTab],
  );

  const sorted = useMemo(
    () =>
      [...statusFiltered].sort((a, b) =>
        a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }),
      ),
    [statusFiltered],
  );

  const filtered = useMemo(
    () => filterTuitionRows(sorted, query, language),
    [sorted, query, language],
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
            {t("common.packageOff", {
              count: PACKAGE_20_COUNT,
              rate: Math.round(PACKAGE_20_DISCOUNT * 100),
            })}
          </p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
          <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
            {t("common.packageOff", {
              count: PACKAGE_50_COUNT,
              rate: Math.round(PACKAGE_50_DISCOUNT * 100),
            })}
          </p>
        </div>
      </div>

      <ActiveInactiveTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        entityLabel={t("nav.classes")}
      />

      <ListSearchInput
        id="tuition-search"
        value={query}
        onChange={setQuery}
        placeholder={t("common.searchClassesPrices")}
      />

      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {statusFiltered.length === 0
            ? activeTab === "active"
              ? t("common.noActiveEntity", { entity: t("nav.classes") })
              : t("common.noInactiveEntity", { entity: t("nav.classes") })
            : t("common.noMatchSearch")}
        </p>
      ) : (
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
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.duration")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.type")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.perClass")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.packageCountPack", { count: PACKAGE_20_COUNT })}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.packageCountPack", { count: PACKAGE_50_COUNT })}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.active")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {filtered.map((classRow) => (
                    <tr key={classRow.id}>
                      <td className="py-4 pr-3 pl-4 text-sm sm:pl-0">
                        <Link
                          href={`/classes/${classRow.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          {formatClassSubject(classRow.subject, language)}
                        </Link>
                        {classRow.teacher ? (
                          <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                            {formatTeacherName(classRow.teacher)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatDuration(classRow.duration_minutes, t)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {formatLessonType(classRow.lesson_type as LessonType | null, language)}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white">
                        {formatTuition(classRow.pricing.perClass, language)}
                      </td>
                      <td className="px-3 py-4 text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {classRow.pricing.package20 !== null ? (
                          <>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatTuition(classRow.pricing.package20, language)}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                              −{formatDiscountRate(PACKAGE_20_DISCOUNT)}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            {t("common.notAvailable")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {classRow.pricing.package50 !== null ? (
                          <>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatTuition(classRow.pricing.package50, language)}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                              −{formatDiscountRate(PACKAGE_50_DISCOUNT)}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">
                            {t("common.notAvailable")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <ActiveStatusBadge isActive={classRow.is_active} />
                          <EditClassPricingDialog
                            classId={classRow.id}
                            subject={classRow.subject}
                            lessonType={classRow.lesson_type}
                            pricing={classRow.pricing}
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
    </div>
  );
}
