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

/** Legacy key from a prior filter-persistence experiment — clear so Jeff is not restored. */
const LEGACY_TEACHER_FILTER_STORAGE_KEY = "schedule-selected-teacher-ids";

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
  // Empty selection = all teachers. Always start from the server default.
  const [selectedTeacherIds, setSelectedTeacherIds] =
    useState(initialTeacherIds);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const requestIdRef = useRef(0);
  const selectedTeacherIdsRef = useRef(selectedTeacherIds);
  useEffect(() => {
    selectedTeacherIdsRef.current = selectedTeacherIds;
  });

  useEffect(() => {
    try {
      sessionStorage.removeItem(LEGACY_TEACHER_FILTER_STORAGE_KEY);
    } catch {
      // Ignore private-mode / storage failures.
    }
  }, []);

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

  const handleSelectedTeacherIdsChange = useCallback(
    (nextIds: number[]) => {
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
