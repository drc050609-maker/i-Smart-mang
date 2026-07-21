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
import { formatClassSubject } from "@/lib/class-subject";
import type { TranslationKey } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import {
  filterTeachersByQuery,
  formatTeacherName,
  sortTeachers,
} from "@/lib/person-name";

type ClassEmbed = {
  id: number;
  subject: string;
};

type TutorRow = {
  id: number;
  first_name: string;
  last_name: string | null;
  dob: string | null;
  is_active: boolean;
  classes: ClassEmbed[];
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

export function TutorsListTable({ tutors }: { tutors: TutorRow[] }) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");

  const activeCount = useMemo(
    () => tutors.filter((teacher) => teacher.is_active).length,
    [tutors],
  );
  const inactiveCount = tutors.length - activeCount;

  const tabTutors = useMemo(
    () =>
      tutors.filter((teacher) =>
        activeTab === "active" ? teacher.is_active : !teacher.is_active,
      ),
    [tutors, activeTab],
  );
  const sortedTutors = useMemo(() => sortTeachers(tabTutors), [tabTutors]);
  const filteredTutors = useMemo(
    () => filterTeachersByQuery(sortedTutors, query),
    [sortedTutors, query],
  );

  return (
    <div className="mt-6 space-y-4">
      <ActiveInactiveTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        entityLabel={t("nav.tutors")}
      />

      <ListSearchInput
        id="tutorsSearch"
        value={query}
        onChange={setQuery}
        placeholder={t("common.searchTutorsByName")}
      />

      {filteredTutors.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {tabTutors.length === 0
            ? activeTab === "active"
              ? t("common.noActiveEntity", { entity: t("nav.tutors") })
              : t("common.noInactiveEntity", { entity: t("nav.tutors") })
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
                      {t("common.class")}
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
                  {filteredTutors.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                        <Link
                          href={`/tutors/${teacher.id}`}
                          className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          {formatTeacherName(teacher)}
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {teacher.classes.length === 0 ? (
                          t("common.notAvailable")
                        ) : (
                          <span className="flex flex-wrap gap-x-2 gap-y-1">
                            {teacher.classes.map((classRow, index) => (
                              <span key={classRow.id}>
                                {index > 0 ? (
                                  <span className="mr-2 text-gray-300 dark:text-gray-600">
                                    ·
                                  </span>
                                ) : null}
                                <Link
                                  href={`/classes/${classRow.id}`}
                                  className="whitespace-nowrap text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                  {formatClassSubject(classRow.subject, language)}
                                </Link>
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatDob(teacher.dob, language, t("common.notAvailable"))}
                      </td>
                      <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                        <ActiveStatusBadge isActive={teacher.is_active} />
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap text-gray-500 sm:pr-0 dark:text-gray-400">
                        {teacher.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {formatTabCount(
          filteredTutors.length,
          tabTutors.length,
          activeTab,
          "nav.tutors",
          language,
          t,
        )}
      </p>
    </div>
  );
}
