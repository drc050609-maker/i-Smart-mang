"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ListSearchInput } from "@/components/list-search-input";
import {
  ActiveInactiveTabs,
  type ActiveTab,
} from "@/components/active-inactive-tabs";
import { ActiveStatusBadge } from "@/components/active-status-badge";
import { useLanguage } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import {
  filterStudentsByQuery,
  formatStudentName,
  sortStudents,
} from "@/lib/person-name";

type StudentRow = {
  id: number;
  "first name": string;
  "last name": string | null;
  dob: string | null;
  is_active: boolean;
};

function formatDob(dob: string | null, language: AppLanguage, notAvailable: string) {
  if (!dob) return notAvailable;
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Date(`${dob}T00:00:00`).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function entityForCount(
  navKey: TranslationKey,
  language: AppLanguage,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) {
  if (language === "zh") return t(navKey);
  const entities: Record<string, string> = {
    "nav.students": "student",
    "nav.tutors": "tutor",
    "nav.classes": "class",
  };
  return entities[navKey];
}

function formatTabCount(
  filtered: number,
  total: number,
  activeTab: ActiveTab,
  navKey: TranslationKey,
  language: AppLanguage,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) {
  const entity = entityForCount(navKey, language, t);

  if (filtered === total) {
    if (activeTab === "active") {
      return total === 1
        ? t("common.countActiveEntity", { count: total, entity })
        : t("common.countActiveEntityPlural", { count: total, entity });
    }
    return total === 1
      ? t("common.countInactiveEntity", { count: total, entity })
      : t("common.countInactiveEntityPlural", { count: total, entity });
  }

  if (activeTab === "active") {
    return t("common.countFilteredEntity", { filtered, total, entity });
  }
  return t("common.countFilteredInactiveEntity", { filtered, total, entity });
}

export function StudentsListTable({
  students,
  outOfCreditsStudentIds = [],
}: {
  students: StudentRow[];
  outOfCreditsStudentIds?: number[];
}) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const outOfCreditsSet = useMemo(
    () => new Set(outOfCreditsStudentIds),
    [outOfCreditsStudentIds],
  );

  const activeCount = useMemo(
    () => students.filter((student) => student.is_active).length,
    [students],
  );
  const inactiveCount = students.length - activeCount;

  const tabStudents = useMemo(
    () =>
      students.filter((student) =>
        activeTab === "active" ? student.is_active : !student.is_active,
      ),
    [students, activeTab],
  );
  const sortedStudents = useMemo(() => sortStudents(tabStudents), [tabStudents]);
  const filteredStudents = useMemo(
    () => filterStudentsByQuery(sortedStudents, query),
    [sortedStudents, query],
  );


  return (
    <div className="mt-6 space-y-4">
      <ActiveInactiveTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        entityLabel={t("nav.students")}
      />

      <ListSearchInput
        id="studentsSearch"
        value={query}
        onChange={setQuery}
        placeholder={t("common.searchStudentsByName")}
      />

      {filteredStudents.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {tabStudents.length === 0
            ? activeTab === "active"
              ? t("common.noActiveEntity", { entity: t("nav.students") })
              : t("common.noInactiveEntity", { entity: t("nav.students") })
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
                      {t("common.name")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.dateOfBirth")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.active")}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                    >
                      {t("common.id")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {filteredStudents.map((student) => {
                    const isOutOfCredits = outOfCreditsSet.has(student.id);

                    return (
                    <tr key={student.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap sm:pl-0">
                        <Link
                          href={`/students/${student.id}`}
                          className={
                            isOutOfCredits
                              ? "text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                              : "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          }
                        >
                          {formatStudentName(student)}
                        </Link>
                        {isOutOfCredits ? (
                          <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
                            {t("common.noCreditsLeft")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatDob(student.dob, language, t("common.notAvailable"))}
                      </td>
                      <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                        <ActiveStatusBadge isActive={student.is_active} />
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap text-gray-500 sm:pr-0 dark:text-gray-400">
                        {student.id}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {formatTabCount(
          filteredStudents.length,
          tabStudents.length,
          activeTab,
          "nav.students",
          language,
          t,
        )}
        {outOfCreditsStudentIds.length > 0 ? (
          <>
            {" "}
            ·{" "}
            <span className="text-red-600 dark:text-red-400">
              {t("common.redNamesNoCredits")}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
