"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

import { ListSearchInput } from "@/components/list-search-input";
import { ActiveStatusBadge } from "@/components/active-status-badge";
import {
  countClassesByTrack,
  filterClassesByTrack,
  type ClassTrackTab,
} from "@/components/class-track-tabs";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import {
  classSubjectKey,
  filterClassesByQuery,
  groupClassesBySubject,
  sortClassesBySubject,
  type ClassSearchRow,
  type SubjectClassGroup,
} from "@/lib/class-list";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import {
  CLASS_TRACK_OPTIONS,
  formatClassTrack,
  type ClassTrack,
} from "@/lib/class-track";
import type { AppLanguage } from "@/lib/language";
import { formatTeacherName } from "@/lib/person-name";
import type { ActiveTab } from "@/components/active-inactive-tabs";
import {
  SelectChevron,
  selectFieldClassName,
} from "@/components/select-chevron";

function formatDuration(
  minutes: number | null,
  t: (
    key: "common.notAvailable" | "common.hour" | "common.hours" | "common.minutes",
    params?: Record<string, string | number>,
  ) => string,
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

function getTrackLabel(
  track: ClassTrackTab,
  language: AppLanguage,
  t: (key: "common.allTracks") => string,
) {
  if (track === "all") return t("common.allTracks");
  return formatClassTrack(track, language);
}

function formatClassesInTrackCount(
  filtered: number,
  total: number,
  activeTab: ActiveTab,
  track: ClassTrackTab,
  language: AppLanguage,
  t: ReturnType<typeof useLanguage>["t"],
) {
  const status =
    activeTab === "active"
      ? t("common.active").toLowerCase()
      : t("common.inactive").toLowerCase();
  const trackLabel = getTrackLabel(track, language, t);

  if (filtered === total) {
    return total === 1
      ? t("common.oneStatusClassInTrack", { status, track: trackLabel })
      : t("common.countStatusClassesInTrack", {
          count: total,
          status,
          track: trackLabel,
        });
  }

  return t("common.filteredStatusClassesInTrack", {
    filtered,
    total,
    status,
    track: trackLabel,
  });
}

function ClassTableRow({
  classRow,
  language,
  t,
  indented = false,
}: {
  classRow: ClassSearchRow;
  language: AppLanguage;
  t: ReturnType<typeof useLanguage>["t"];
  indented?: boolean;
}) {
  return (
    <tr>
      <td
        className={`py-4 pr-3 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-white ${
          indented ? "pl-10 sm:pl-8" : "pl-4 sm:pl-0"
        }`}
      >
        <Link
          href={`/classes/${classRow.id}`}
          className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {formatClassSubject(classRow.subject, language)}
        </Link>
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
        {formatClassTrack(classRow.class_track as ClassTrack | null, language)}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
        {formatLessonType(classRow.lesson_type as LessonType | null, language)}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
        {classRow.teacher
          ? formatTeacherName(classRow.teacher)
          : t("common.notAvailable")}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
        {classRow.room_number ?? t("common.notAvailable")}
      </td>
      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
        {formatDuration(classRow.duration_minutes, t)}
      </td>
      <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
        <ActiveStatusBadge isActive={classRow.is_active} />
      </td>
      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap text-gray-500 sm:pr-0 dark:text-gray-400">
        {classRow.id}
      </td>
    </tr>
  );
}

function SubjectGroupSummary({
  group,
  t,
}: {
  group: SubjectClassGroup;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const durationLabels = group.durations.map((minutes) =>
    formatDuration(minutes, t),
  );
  const teacherLabels = group.teachers.map((teacher) =>
    formatTeacherName(teacher),
  );

  return (
    <>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-normal text-gray-500 dark:text-gray-400">
        {durationLabels.length > 0 ? (
          <span>
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {t("common.durationsAvailable")}:
            </span>{" "}
            {durationLabels.join(", ")}
          </span>
        ) : null}
        {teacherLabels.length > 0 ? (
          <span>{t("common.teacherCount", { count: teacherLabels.length })}</span>
        ) : null}
        <span className="text-gray-400 dark:text-gray-500">
          {t("common.subjectClassCount", { count: group.classes.length })}
        </span>
      </div>
      {teacherLabels.length > 0 ? (
        <details className="mt-1.5 text-xs font-normal text-gray-500 dark:text-gray-400">
          <summary className="cursor-pointer select-none font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            {t("common.teachers")}
          </summary>
          <p className="mt-2 pl-0.5">{teacherLabels.join(", ")}</p>
        </details>
      ) : null}
    </>
  );
}

export function ClassesListTable({ classes }: { classes: ClassSearchRow[] }) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [trackTab, setTrackTab] = useState<ClassTrackTab>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    () => new Set(),
  );
  const seenClassIdsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const nextIds = new Set(classes.map((classRow) => classRow.id));
    const previousIds = seenClassIdsRef.current;
    if (previousIds) {
      const added = classes.filter((classRow) => !previousIds.has(classRow.id));
      if (added.length > 0) {
        setExpandedSubjects((current) => {
          const next = new Set(current);
          for (const classRow of added) {
            next.add(classSubjectKey(classRow.subject));
          }
          return next;
        });
      }
    }
    seenClassIdsRef.current = nextIds;
  }, [classes]);

  const statusFilteredClasses = useMemo(
    () =>
      classes.filter((classRow) =>
        activeTab === "active" ? classRow.is_active : !classRow.is_active,
      ),
    [classes, activeTab],
  );

  const trackCounts = useMemo(
    () => countClassesByTrack(statusFilteredClasses),
    [statusFilteredClasses],
  );

  const activeCount = useMemo(
    () => classes.filter((classRow) => classRow.is_active).length,
    [classes],
  );
  const inactiveCount = classes.length - activeCount;

  const tabClasses = useMemo(
    () => filterClassesByTrack(statusFilteredClasses, trackTab),
    [statusFilteredClasses, trackTab],
  );
  const sortedClasses = useMemo(() => sortClassesBySubject(tabClasses), [tabClasses]);
  const filteredClasses = useMemo(
    () => filterClassesByQuery(sortedClasses, query, language),
    [sortedClasses, query, language],
  );
  const subjectGroups = useMemo(
    () => groupClassesBySubject(filteredClasses),
    [filteredClasses],
  );

  const isSearching = query.trim().length > 0;

  function isSubjectExpanded(subjectKey: string) {
    return isSearching || expandedSubjects.has(subjectKey);
  }

  function toggleSubject(subjectKey: string) {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectKey)) {
        next.delete(subjectKey);
      } else {
        next.add(subjectKey);
      }
      return next;
    });
  }

  const statusLabel =
    activeTab === "active"
      ? t("common.active").toLowerCase()
      : t("common.inactive").toLowerCase();
  const trackLabel = getTrackLabel(trackTab, language, t);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-48 flex-1">
          <label
            htmlFor="classesTrackFilter"
            className="block text-sm/6 font-medium text-gray-900 dark:text-white"
          >
            {t("common.classTracks")}
          </label>
          <div className="relative mt-2">
            <select
              id="classesTrackFilter"
              value={trackTab}
              onChange={(event) =>
                setTrackTab(event.target.value as ClassTrackTab)
              }
              className={selectFieldClassName}
            >
              <option value="all">
                {t("common.allTracks")} ({trackCounts.all})
              </option>
              {CLASS_TRACK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {formatClassTrack(option.value, language)} (
                  {trackCounts[option.value] ?? 0})
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>

        <div className="min-w-40 flex-1">
          <label
            htmlFor="classesActiveFilter"
            className="block text-sm/6 font-medium text-gray-900 dark:text-white"
          >
            {t("common.status")}
          </label>
          <div className="relative mt-2">
            <select
              id="classesActiveFilter"
              value={activeTab}
              onChange={(event) =>
                setActiveTab(event.target.value as ActiveTab)
              }
              className={selectFieldClassName}
            >
              <option value="active">
                {t("common.active")} ({activeCount})
              </option>
              <option value="inactive">
                {t("common.inactive")} ({inactiveCount})
              </option>
            </select>
            <SelectChevron />
          </div>
        </div>

        <ListSearchInput
          id="classesSearch"
          value={query}
          onChange={setQuery}
          placeholder={t("common.searchClassesFull")}
          label={t("common.subject")}
          className="min-w-56 max-w-md flex-1"
        />
      </div>

      {filteredClasses.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {tabClasses.length === 0
            ? t("common.noClassesInTrackNamed", {
                status: statusLabel,
                track: trackLabel,
              })
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
                      {t("common.subject")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.track")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.type")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.teacher")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.room")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.duration")}
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
                  {subjectGroups.map((group) => {
                    if (group.classes.length === 1) {
                      return (
                        <ClassTableRow
                          key={group.classes[0].id}
                          classRow={group.classes[0]}
                          language={language}
                          t={t}
                        />
                      );
                    }

                    const expanded = isSubjectExpanded(group.subjectKey);
                    const subjectLabel = formatClassSubject(
                      group.subject,
                      language,
                    );

                    return (
                      <Fragment key={group.subjectKey}>
                        <tr className="bg-gray-50/80 dark:bg-white/5">
                          <td
                            colSpan={8}
                            className="py-3 pr-4 pl-4 text-sm sm:pl-0 sm:pr-0"
                          >
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => toggleSubject(group.subjectKey)}
                                aria-expanded={expanded}
                                aria-label={
                                  expanded
                                    ? t("common.hideSubjectClasses", {
                                        subject: subjectLabel,
                                      })
                                    : t("common.showSubjectClasses", {
                                        subject: subjectLabel,
                                      })
                                }
                                className="mt-0.5 shrink-0 rounded text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                              >
                                <ChevronRightIcon
                                  aria-hidden="true"
                                  className={`size-5 transition-transform ${
                                    expanded ? "rotate-90" : ""
                                  }`}
                                />
                              </button>
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSubject(group.subjectKey)
                                  }
                                  aria-expanded={expanded}
                                  className="text-left font-semibold text-gray-900 dark:text-white"
                                >
                                  {subjectLabel}
                                </button>
                                <SubjectGroupSummary
                                  group={group}
                                  t={t}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                        {expanded
                          ? group.classes.map((classRow) => (
                              <ClassTableRow
                                key={classRow.id}
                                classRow={classRow}
                                language={language}
                                t={t}
                                indented
                              />
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {formatClassesInTrackCount(
          filteredClasses.length,
          tabClasses.length,
          activeTab,
          trackTab,
          language,
          t,
        )}
      </p>
    </div>
  );
}
