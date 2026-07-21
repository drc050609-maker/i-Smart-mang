"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import {
  attendanceStatusBadgeClass,
  formatAttendanceStatus,
} from "@/lib/attendance";
import { formatTime12Hour } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import { useLanguage } from "@/components/language-provider";
import { translate, type TranslationKey } from "@/lib/i18n";
import { appLanguageLocale } from "@/lib/language";
import {
  formatAttendanceHistoryDate,
  groupStudentAttendanceByDate,
  type StudentAttendanceHistoryRow,
} from "@/lib/student-attendance-history";

const WEEKDAY_KEYS: TranslationKey[] = [
  "enum.weekday.sunday",
  "enum.weekday.monday",
  "enum.weekday.tuesday",
  "enum.weekday.wednesday",
  "enum.weekday.thursday",
  "enum.weekday.friday",
  "enum.weekday.saturday",
];

type CalendarCell = {
  date: string | null;
  day: number | null;
  inMonth: boolean;
};

function parseYearMonth(dateStr: string) {
  const [year, month] = dateStr.split("-").map(Number);
  return { year, month };
}

function formatMonthYear(year: number, month: number, language: "en" | "zh") {
  return new Date(year, month - 1, 1).toLocaleDateString(
    appLanguageLocale(language),
    {
      month: "long",
      year: "numeric",
    },
  );
}

function buildCalendarDays(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay.getDay();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({ date: null, day: null, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const monthPart = String(month).padStart(2, "0");
    const dayPart = String(day).padStart(2, "0");
    cells.push({
      date: `${year}-${monthPart}-${dayPart}`,
      day,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null, inMonth: false });
  }

  return cells;
}

function formatTimeRange(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) return "—";
  return `${formatTime12Hour(startTime)} – ${formatTime12Hour(endTime)}`;
}

function sessionStatusBadge(
  session: StudentAttendanceHistoryRow,
  language: "en" | "zh",
  t: (key: TranslationKey, params?: Record<string, string | number>) => string,
) {
  if (session.historyType === "makeup") {
    return {
      label: t("common.makeUp"),
      className:
        "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
    };
  }

  if (session.status) {
    return {
      label: formatAttendanceStatus(session.status, language),
      className: attendanceStatusBadgeClass(session.status),
    };
  }

  if (session.creditsUsed > 0) {
    return {
      label: t("common.creditUsed"),
      className:
        "bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-white/10 dark:text-gray-300 dark:ring-white/20",
    };
  }

  return {
    label: t("common.notMarked"),
    className:
      "bg-gray-50 text-gray-500 ring-gray-500/20 dark:bg-white/10 dark:text-gray-400 dark:ring-white/10",
  };
}

function SessionStatusBadge({ session }: { session: StudentAttendanceHistoryRow }) {
  const { language, t } = useLanguage();
  const badge = sessionStatusBadge(session, language, t);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function AttendanceHistoryCalendar({
  dates,
  byDate,
  selectedDate,
  onSelectDate,
}: {
  dates: string[];
  byDate: Map<string, StudentAttendanceHistoryRow[]>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const { language, t } = useLanguage();
  const historyDateSet = useMemo(() => new Set(dates), [dates]);
  const initialMonth = useMemo(() => {
    if (selectedDate) {
      return parseYearMonth(selectedDate);
    }

    if (dates[0]) {
      return parseYearMonth(dates[0]);
    }

    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  }, [dates, selectedDate]);

  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);

  const calendarDays = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  function goToPreviousMonth() {
    if (viewMonth === 1) {
      setViewYear((year) => year - 1);
      setViewMonth(12);
      return;
    }

    setViewMonth((month) => month - 1);
  }

  function goToNextMonth() {
    if (viewMonth === 12) {
      setViewYear((year) => year + 1);
      setViewMonth(1);
      return;
    }

    setViewMonth((month) => month + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
          aria-label={t("common.previousMonth")}
        >
          <ChevronLeftIcon className="size-5" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatMonthYear(viewYear, viewMonth, language)}
        </p>
        <button
          type="button"
          onClick={goToNextMonth}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
          aria-label={t("common.nextMonth")}
        >
          <ChevronRightIcon className="size-5" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {t("common.daysWithClassHistory", { count: dates.length })}
      </p>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="py-1">
            {translate(language, key)}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {calendarDays.map((cell, index) => {
          if (!cell.date || cell.day === null) {
            return (
              <div
                key={`empty-${viewYear}-${viewMonth}-${index}`}
                className="aspect-square"
                aria-hidden="true"
              />
            );
          }

          const hasHistory = historyDateSet.has(cell.date);
          const isSelected = cell.date === selectedDate;
          const sessionCount = byDate.get(cell.date)?.length ?? 0;

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!hasHistory}
              onClick={() => onSelectDate(cell.date!)}
              aria-label={
                hasHistory
                  ? `${formatAttendanceHistoryDate(cell.date, language)}, ${sessionCount} ${sessionCount === 1 ? t("common.class") : t("common.classes")}`
                  : `${cell.day}`
              }
              aria-pressed={isSelected}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${
                isSelected
                  ? "bg-indigo-600 font-semibold text-white dark:bg-indigo-500"
                  : hasHistory
                    ? "bg-indigo-50 font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                    : "cursor-default text-gray-300 dark:text-gray-600"
              }`}
            >
              <span>{cell.day}</span>
              {hasHistory && !isSelected ? (
                <span className="absolute bottom-1 size-1 rounded-full bg-indigo-500 dark:bg-indigo-300" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StudentAttendanceHistorySection({
  rows,
}: {
  rows: StudentAttendanceHistoryRow[];
}) {
  const { language, t } = useLanguage();
  const { dates, byDate } = useMemo(
    () => groupStudentAttendanceByDate(rows),
    [rows],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => dates[0] ?? null,
  );

  const activeDate =
    selectedDate && byDate.has(selectedDate) ? selectedDate : (dates[0] ?? null);
  const sessions = activeDate ? (byDate.get(activeDate) ?? []) : [];

  if (rows.length === 0) {
    return (
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t("common.noClassHistory")}
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
        <AttendanceHistoryCalendar
          dates={dates}
          byDate={byDate}
          selectedDate={activeDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {activeDate ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {formatAttendanceHistoryDate(activeDate, language)}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.classHistoryOnDay", { count: sessions.length })}
          </p>

          <ul className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/classes/${session.classId}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {formatClassSubject(session.classSubject, language)}
                  </Link>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatTimeRange(session.startTime, session.endTime)}
                    {session.teacherName ? ` · ${session.teacherName}` : ""}
                    {session.creditsUsed > 0
                      ? ` · ${t("common.creditsUsedCount", { count: session.creditsUsed })}`
                      : ""}
                    {session.source === "automatic"
                      ? ` · ${t("common.autoRecorded")}`
                      : ""}
                  </p>
                  {session.notes ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {session.notes}
                    </p>
                  ) : null}
                </div>
                <SessionStatusBadge session={session} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.selectDateForHistory")}
          </p>
        </div>
      )}
    </div>
  );
}
