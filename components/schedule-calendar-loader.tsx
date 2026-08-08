"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchScheduleCalendarEventsAction } from "@/app/(dashboard)/schedule/actions";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { useLanguage } from "@/components/language-provider";
import type {
  ScheduleEvent,
  ScheduleException,
  ScheduleStudent,
  ScheduleTeacher,
} from "@/lib/schedule-calendar";

const TEACHER_FILTER_STORAGE_KEY = "schedule-selected-teacher-ids";

function readStoredTeacherIds(): number[] | null {
  try {
    const raw = sessionStorage.getItem(TEACHER_FILTER_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (id): id is number => typeof id === "number" && Number.isInteger(id),
    );
  } catch {
    return null;
  }
}

function writeStoredTeacherIds(teacherIds: number[]) {
  try {
    sessionStorage.setItem(
      TEACHER_FILTER_STORAGE_KEY,
      JSON.stringify(teacherIds),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function ScheduleCalendarLoader({
  teachers,
  students,
  initialTeacherIds,
  initialEvents,
  initialExceptions,
}: {
  teachers: ScheduleTeacher[];
  students: ScheduleStudent[];
  initialTeacherIds: number[];
  initialEvents: ScheduleEvent[];
  initialExceptions: ScheduleException[];
}) {
  const { t } = useLanguage();
  const [events, setEvents] = useState(initialEvents);
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [selectedTeacherIds, setSelectedTeacherIds] =
    useState(initialTeacherIds);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const requestIdRef = useRef(0);
  const selectedTeacherIdsRef = useRef(selectedTeacherIds);
  selectedTeacherIdsRef.current = selectedTeacherIds;
  const didRestoreFilterRef = useRef(false);

  const loadEventsForTeachers = useCallback((teacherIds: number[]) => {
    const requestId = ++requestIdRef.current;
    setError(null);
    setLoading(true);

    void fetchScheduleCalendarEventsAction(teacherIds)
      .then((result) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        setEvents(result.events);
        setExceptions(result.exceptions);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      });
  }, []);

  // Restore the last teacher filter after refresh/remount (e.g. after delete).
  useEffect(() => {
    if (didRestoreFilterRef.current) return;
    didRestoreFilterRef.current = true;

    const stored = readStoredTeacherIds();
    if (stored == null) return;

    const sameAsInitial =
      stored.length === initialTeacherIds.length &&
      stored.every((id, index) => id === initialTeacherIds[index]);
    if (sameAsInitial) return;

    setSelectedTeacherIds(stored);
    loadEventsForTeachers(stored);
  }, [initialTeacherIds, loadEventsForTeachers]);

  const handleSelectedTeacherIdsChange = useCallback(
    (nextIds: number[]) => {
      writeStoredTeacherIds(nextIds);
      setSelectedTeacherIds(nextIds);
      loadEventsForTeachers(nextIds);
    },
    [loadEventsForTeachers],
  );

  const handleScheduleMutated = useCallback(() => {
    setScheduleRevision((current) => current + 1);
    loadEventsForTeachers(selectedTeacherIdsRef.current);
  }, [loadEventsForTeachers]);

  return (
    <div className="relative">
      {loading ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-2">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900/95 dark:text-gray-300 dark:ring-white/10">
            {t("common.loading")}
          </span>
        </div>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", {
            entity: t("nav.schedule"),
            message: error,
          })}
        </p>
      ) : null}
      <div className={loading ? "opacity-60 transition-opacity" : undefined}>
        <ScheduleCalendar
          events={events}
          exceptions={exceptions}
          teachers={teachers}
          students={students}
          selectedTeacherIds={selectedTeacherIds}
          onSelectedTeacherIdsChange={handleSelectedTeacherIdsChange}
          onScheduleMutated={handleScheduleMutated}
          scheduleRevision={scheduleRevision}
          useServerTeacherCounts
        />
      </div>
    </div>
  );
}
