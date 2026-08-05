"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import {
  ScheduleRescheduleDialog,
  type PendingReschedule,
} from "@/components/schedule-reschedule-dialog";
import { ScheduleClassDetailDialog } from "@/components/schedule-class-detail-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatTime12Hour } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import {
  addDays,
  buildTeacherEventColorLookup,
  buildWeekEventInstances,
  computeHourRange,
  countEventsByTeacher,
  filterEventsByStudent,
  filterEventsByTeachers,
  formatDateYMD,
  formatDayHeader,
  formatHourLabel,
  formatScheduleEventStudentLabel,
  formatWeekRange,
  formatDayTitle,
  getEventColumnStyle,
  getInstancePosition,
  getTeacherEventColors,
  getWeekDays,
  groupInstancesByDay,
  HOUR_HEIGHT_PX,
  layoutDayEventColumns,
  maxLayoutColumnCount,
  dayColumnWidthPx,
  minutesToTimeString,
  snapMinutes,
  startOfWeek,
  timeToMinutes,
  type EventColorSet,
  type ScheduleEvent,
  type ScheduleEventColumnLayout,
  type ScheduleEventInstance,
  type ScheduleException,
  type ScheduleStudent,
  type ScheduleTeacher,
} from "@/lib/schedule-calendar";
import {
  filterStudentsByQuery,
  formatStudentName,
  formatTeacherName,
  sortStudents,
} from "@/lib/person-name";

const DRAG_THRESHOLD_PX = 6;
const SNAP_MINUTES = 15;
const COMPACT_MIN_HEIGHT = 36;
const TIME_GUTTER_WIDTH_PX = 64;
/** Above this event count, default to one teacher so the grid stays usable. */
const AUTO_TEACHER_FILTER_THRESHOLD = 250;

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function initialSelectedTeacherIds(events: ScheduleEvent[]) {
  if (events.length < AUTO_TEACHER_FILTER_THRESHOLD) {
    return [] as number[];
  }

  const counts = countEventsByTeacher(events);
  let bestId: number | null = null;
  let bestCount = 0;
  for (const [teacherId, count] of counts) {
    if (count > bestCount) {
      bestId = teacherId;
      bestCount = count;
    }
  }

  return bestId != null ? [bestId] : [];
}

type DragState = {
  instance: ScheduleEventInstance;
  pointerId: number;
  originX: number;
  originY: number;
  dayIndex: number;
  topPx: number;
  heightPx: number;
  moved: boolean;
};

const DEFAULT_EVENT_LAYOUT: ScheduleEventColumnLayout = {
  columnIndex: 0,
  columnCount: 1,
};

const ScheduleEventBlock = memo(function ScheduleEventBlock({
  instance,
  startHour,
  layout,
  dimmed,
  isDragging,
  showFullName = false,
  colorByTeacherId,
  onPointerDownRef,
}: {
  instance: ScheduleEventInstance;
  startHour: number;
  layout: ScheduleEventColumnLayout;
  dimmed?: boolean;
  isDragging: boolean;
  showFullName?: boolean;
  colorByTeacherId?: Map<number, EventColorSet>;
  onPointerDownRef: MutableRefObject<
    | ((
        instance: ScheduleEventInstance,
        event: ReactPointerEvent<HTMLDivElement>,
      ) => void)
    | null
  >;
}) {
  const { language, t } = useLanguage();
  const colors = getTeacherEventColors(instance.teacher_id, colorByTeacherId);
  const { top, height } = getInstancePosition(instance, startHour);
  const displayHeight = Math.max(height, COMPACT_MIN_HEIGHT);
  const columnStyle = getEventColumnStyle(layout);
  const subjectLabel = formatClassSubject(instance.subject, language);
  const unassignedLabel =
    instance.lesson_type === "group"
      ? t("enum.lessonType.group")
      : subjectLabel;
  const studentLabel = formatScheduleEventStudentLabel(
    instance.students,
    unassignedLabel,
  );
  const timeLabel = `${formatTime12Hour(instance.display_start_time)} – ${formatTime12Hour(instance.display_end_time)}`;
  const showSecondary = displayHeight >= 40;
  const showSubjectTertiary =
    displayHeight >= 58 && studentLabel !== subjectLabel;
  const tooltip =
    studentLabel === subjectLabel
      ? `${subjectLabel} · ${timeLabel}`
      : `${studentLabel} · ${timeLabel} · ${subjectLabel}`;

  return (
    <div
      data-instance-key={instance.instanceKey}
      style={{
        top,
        height: displayHeight,
        contentVisibility: "auto",
        containIntrinsicSize: `auto ${displayHeight}px`,
        ...columnStyle,
      }}
      onPointerDown={
        dimmed
          ? undefined
          : (event) => onPointerDownRef.current?.(instance, event)
      }
      className={classNames(
        "absolute z-10 overflow-hidden rounded border-l-4 px-1.5 py-0.5 text-left shadow-sm transition",
        dimmed
          ? "pointer-events-none"
          : "cursor-grab active:cursor-grabbing",
        colors.bg,
        colors.border,
        colors.text,
        !instance.is_active && "opacity-60",
        dimmed && "opacity-30",
        isDragging && "opacity-40",
      )}
      title={tooltip}
    >
      <p
        className={classNames(
          "text-[11px] font-semibold leading-tight",
          showFullName ? "break-words" : "truncate",
        )}
      >
        {studentLabel}
      </p>
      {showSecondary ? (
        <p className="text-[10px] leading-tight opacity-80 whitespace-nowrap">
          {timeLabel}
        </p>
      ) : null}
      {showSubjectTertiary ? (
        <p
          className={classNames(
            "text-[10px] leading-tight opacity-70",
            showFullName ? "break-words" : "truncate",
          )}
        >
          {subjectLabel}
        </p>
      ) : null}
    </div>
  );
});

export function ScheduleCalendar({
  events,
  exceptions,
  teachers,
  students,
  selectedTeacherIds: selectedTeacherIdsProp,
  onSelectedTeacherIdsChange,
  useServerTeacherCounts = false,
}: {
  events: ScheduleEvent[];
  exceptions: ScheduleException[];
  teachers: ScheduleTeacher[];
  students: ScheduleStudent[];
  selectedTeacherIds?: number[];
  onSelectedTeacherIdsChange?: (teacherIds: number[]) => void;
  useServerTeacherCounts?: boolean;
}) {
  const { language, t } = useLanguage();
  const gridRef = useRef<HTMLDivElement>(null);
  const dayColumnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragMovedRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const dragPreviewElRef = useRef<HTMLDivElement | null>(null);
  const eventPointerDownRef = useRef<
    | ((
        instance: ScheduleEventInstance,
        event: ReactPointerEvent<HTMLDivElement>,
      ) => void)
    | null
  >(null);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [focusDate, setFocusDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [internalSelectedTeacherIds, setInternalSelectedTeacherIds] = useState<
    number[]
  >(() =>
    selectedTeacherIdsProp ?? initialSelectedTeacherIds(events),
  );
  const selectedTeacherIds =
    selectedTeacherIdsProp ?? internalSelectedTeacherIds;

  function setSelectedTeacherIds(next: number[]) {
    if (onSelectedTeacherIdsChange) {
      onSelectedTeacherIdsChange(next);
      return;
    }
    setInternalSelectedTeacherIds(next);
  }

  const [showTeacherFilters, setShowTeacherFilters] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<ScheduleStudent | null>(
    null,
  );
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedInstance, setSelectedInstance] =
    useState<ScheduleEventInstance | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [pendingReschedule, setPendingReschedule] =
    useState<PendingReschedule | null>(null);

  const closeRescheduleDialog = useCallback(() => {
    setPendingReschedule(null);
  }, []);

  const closeClassDetail = useCallback(() => {
    setSelectedInstance(null);
  }, []);

  const teacherColorById = useMemo(
    () =>
      buildTeacherEventColorLookup([
        ...teachers.map((teacher) => teacher.id),
        ...events.map((event) => event.teacher_id),
      ]),
    [teachers, events],
  );

  const weekStart = useMemo(() => startOfWeek(focusDate), [focusDate]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const displayDays = useMemo(() => {
    if (viewMode === "day") {
      const dayIndex = focusDate.getDay();
      return [{ date: weekDays[dayIndex]!, dayIndex }];
    }
    return weekDays.map((date, dayIndex) => ({ date, dayIndex }));
  }, [viewMode, focusDate, weekDays]);
  useEffect(() => {
    dayColumnRefs.current = Array.from({ length: 7 }, () => null);
  }, [viewMode, weekStart]);

  const teacherFilteredEvents = useMemo(
    () =>
      onSelectedTeacherIdsChange
        ? events
        : filterEventsByTeachers(events, selectedTeacherIds),
    [events, selectedTeacherIds, onSelectedTeacherIdsChange],
  );

  const visibleEvents = useMemo(
    () =>
      filterEventsByStudent(
        teacherFilteredEvents,
        selectedStudent?.id ?? null,
      ),
    [teacherFilteredEvents, selectedStudent],
  );

  const weekInstances = useMemo(
    () => buildWeekEventInstances(visibleEvents, exceptions, weekDays),
    [visibleEvents, exceptions, weekDays],
  );

  const highlightStudentFilter = selectedStudent !== null;

  const allWeekInstances = useMemo(() => {
    if (!highlightStudentFilter) {
      return weekInstances;
    }

    return buildWeekEventInstances(teacherFilteredEvents, exceptions, weekDays);
  }, [
    highlightStudentFilter,
    weekInstances,
    teacherFilteredEvents,
    exceptions,
    weekDays,
  ]);

  const instancesByDay = useMemo(
    () => groupInstancesByDay(weekInstances),
    [weekInstances],
  );

  const allInstancesByDay = useMemo(() => {
    if (!highlightStudentFilter) {
      return instancesByDay;
    }
    return groupInstancesByDay(allWeekInstances);
  }, [highlightStudentFilter, instancesByDay, allWeekInstances]);

  const layoutsByDay = useMemo(() => {
    return allInstancesByDay.map((dayInstances) =>
      layoutDayEventColumns(dayInstances),
    );
  }, [allInstancesByDay]);

  const dimmedInstancesByDay = useMemo(() => {
    if (!highlightStudentFilter) {
      return Array.from({ length: 7 }, () => [] as ScheduleEventInstance[]);
    }

    return allInstancesByDay.map((allDayInstances, dayIndex) => {
      const visibleKeys = new Set(
        (instancesByDay[dayIndex] ?? []).map((instance) => instance.instanceKey),
      );
      return allDayInstances.filter(
        (instance) => !visibleKeys.has(instance.instanceKey),
      );
    });
  }, [highlightStudentFilter, allInstancesByDay, instancesByDay]);

  const dayColumnWidthsPx = useMemo(() => {
    if (viewMode !== "day") return null;

    return displayDays.map(({ dayIndex }) => {
      const layouts = layoutsByDay[dayIndex] ?? new Map();
      return dayColumnWidthPx(maxLayoutColumnCount(layouts));
    });
  }, [viewMode, displayDays, layoutsByDay]);

  const calendarGridTemplateColumns = useMemo(() => {
    if (!dayColumnWidthsPx) {
      return `${TIME_GUTTER_WIDTH_PX}px repeat(${displayDays.length}, minmax(0, 1fr))`;
    }

    const dayCols = dayColumnWidthsPx
      .map((width) => `minmax(${width}px, 1fr)`)
      .join(" ");
    return `${TIME_GUTTER_WIDTH_PX}px ${dayCols}`;
  }, [dayColumnWidthsPx, displayDays.length]);

  const calendarMinWidthPx = useMemo(() => {
    if (!dayColumnWidthsPx) return undefined;

    return (
      TIME_GUTTER_WIDTH_PX +
      dayColumnWidthsPx.reduce((sum, width) => sum + width, 0)
    );
  }, [dayColumnWidthsPx]);

  const hourRangeEvents = useMemo(() => {
    const instancesForRange =
      viewMode === "day"
        ? (instancesByDay[focusDate.getDay()] ?? [])
        : weekInstances;

    return instancesForRange.map((instance) => ({
      schedule_start_time: instance.display_start_time,
      schedule_end_time: instance.display_end_time,
    }));
  }, [instancesByDay, weekInstances, viewMode, focusDate]);

  const { startHour, endHour } = useMemo(
    () =>
      computeHourRange(
        hourRangeEvents.length > 0
          ? hourRangeEvents
          : events.map((event) => ({
              schedule_start_time: event.schedule_start_time,
              schedule_end_time: event.schedule_end_time,
            })),
      ),
    [hourRangeEvents, events],
  );

  const hours = useMemo(() => {
    const range: number[] = [];
    for (let hour = startHour; hour < endHour; hour += 1) {
      range.push(hour);
    }
    return range;
  }, [startHour, endHour]);

  const gridHeight = hours.length * HOUR_HEIGHT_PX;

  const teacherCounts = useMemo(
    () => countEventsByTeacher(events),
    [events],
  );

  const sortedStudents = useMemo(() => sortStudents(students), [students]);
  const filteredStudents = useMemo(
    () => filterStudentsByQuery(sortedStudents, studentQuery),
    [sortedStudents, studentQuery],
  );

  const teachersWithCounts = useMemo(() => {
    if (useServerTeacherCounts) {
      return teachers.filter((teacher) => teacher.class_count > 0);
    }

    return teachers
      .map((teacher) => ({
        ...teacher,
        class_count: teacherCounts.get(teacher.id) ?? 0,
      }))
      .filter((teacher) => teacher.class_count > 0);
  }, [teachers, teacherCounts, useServerTeacherCounts]);

  const totalScheduleCount = useMemo(() => {
    if (useServerTeacherCounts) {
      return teachersWithCounts.reduce(
        (sum, teacher) => sum + teacher.class_count,
        0,
      );
    }
    return events.length;
  }, [useServerTeacherCounts, teachersWithCounts, events.length]);

  const visibleInstanceCount = useMemo(() => {
    if (viewMode === "day") {
      return (instancesByDay[focusDate.getDay()] ?? []).length;
    }
    return weekInstances.length;
  }, [viewMode, instancesByDay, focusDate, weekInstances]);

  const syncDragPreviewDom = useCallback(
    (dayIndex: number, topPx: number, heightPx: number, visible: boolean) => {
      const preview = dragPreviewElRef.current;
      if (!preview) return;

      if (!visible) {
        preview.style.display = "none";
        return;
      }

      const column = dayColumnRefs.current[dayIndex];
      const grid = gridRef.current;
      if (!column || !grid) {
        preview.style.display = "none";
        return;
      }

      const gridRect = grid.getBoundingClientRect();
      const columnRect = column.getBoundingClientRect();
      preview.style.display = "block";
      preview.style.top = `${topPx}px`;
      preview.style.left = `${columnRect.left - gridRect.left + 4}px`;
      preview.style.width = `${Math.max(0, columnRect.width - 8)}px`;
      preview.style.height = `${heightPx}px`;
    },
    [],
  );

  const visibleInstanceCount = useMemo(() => {
    if (viewMode === "day") {
      return (instancesByDay[focusDate.getDay()] ?? []).length;
    }
    return weekInstances.length;
  }, [viewMode, instancesByDay, focusDate, weekInstances]);

  const syncDragPreviewDom = useCallback(
    (dayIndex: number, topPx: number, heightPx: number, visible: boolean) => {
      const preview = dragPreviewElRef.current;
      if (!preview) return;

      if (!visible) {
        preview.style.display = "none";
        return;
      }

      const column = dayColumnRefs.current[dayIndex];
      const grid = gridRef.current;
      if (!column || !grid) {
        preview.style.display = "none";
        return;
      }

      const gridRect = grid.getBoundingClientRect();
      const columnRect = column.getBoundingClientRect();
      preview.style.display = "block";
      preview.style.top = `${topPx}px`;
      preview.style.left = `${columnRect.left - gridRect.left + 4}px`;
      preview.style.width = `${Math.max(0, columnRect.width - 8)}px`;
      preview.style.height = `${heightPx}px`;
    },
    [],
  );

  const resolveDrop = useCallback(
    (dayIndex: number, topPx: number, instance: ScheduleEventInstance) => {
      const gridStartMinutes = startHour * 60;
      const rawMinutes = gridStartMinutes + (topPx / HOUR_HEIGHT_PX) * 60;
      const snapped = snapMinutes(rawMinutes, SNAP_MINUTES);
      const duration =
        timeToMinutes(instance.display_end_time) -
        timeToMinutes(instance.display_start_time);
      const newStartTime = minutesToTimeString(snapped);
      const newEndTime = minutesToTimeString(snapped + duration);
      const newDate = formatDateYMD(weekDays[dayIndex]!);

      setPendingReschedule({
        instance,
        newDate,
        newDayIndex: dayIndex,
        newStartTime,
        newEndTime,
      });
    },
    [startHour, weekDays],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.originX;
      const deltaY = event.clientY - dragState.originY;
      const moved =
        dragState.moved ||
        Math.abs(deltaX) > DRAG_THRESHOLD_PX ||
        Math.abs(deltaY) > DRAG_THRESHOLD_PX;

      if (moved) {
        dragMovedRef.current = true;
        dragState.moved = true;
      }

      let dayIndex = dragState.dayIndex;
      for (let index = 0; index < dayColumnRefs.current.length; index += 1) {
        const column = dayColumnRefs.current[index];
        if (!column) continue;
        const rect = column.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          dayIndex = index;
          break;
        }
      }

      const column = dayColumnRefs.current[dayIndex];
      if (!column) return;

      const rect = column.getBoundingClientRect();
      const relativeY = event.clientY - rect.top;
      const maxTop = gridHeight - dragState.heightPx;
      const topPx = Math.max(
        0,
        Math.min(maxTop, relativeY - dragState.heightPx / 2),
      );

      dragState.dayIndex = dayIndex;
      dragState.topPx = topPx;
      syncDragPreviewDom(dayIndex, topPx, dragState.heightPx, true);
    },
    [gridHeight, syncDragPreviewDom],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      if (dragMovedRef.current) {
        resolveDrop(dragState.dayIndex, dragState.topPx, dragState.instance);
      } else {
        setSelectedInstance(dragState.instance);
      }

      dragStateRef.current = null;
      setDraggingKey(null);
      syncDragPreviewDom(0, 0, 0, false);
      dragMovedRef.current = false;
    },
    [resolveDrop, syncDragPreviewDom],
  );

  useEffect(() => {
    if (!draggingKey) {
      return;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggingKey, handlePointerMove, handlePointerUp]);

  function goToPrevious() {
    setFocusDate((current) =>
      addDays(current, viewMode === "day" ? -1 : -7),
    );
  }

  function goToNext() {
    setFocusDate((current) => addDays(current, viewMode === "day" ? 1 : 7));
  }

  function goToToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setFocusDate(now);
  }

  function goToDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return;
    }

    const [year, month, day] = value.split("-").map(Number);
    const next = new Date(year!, month! - 1, day!);
    if (Number.isNaN(next.getTime())) {
      return;
    }

    next.setHours(0, 0, 0, 0);
    setFocusDate(next);
    setViewMode("day");
  }

  function openDayView(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    setFocusDate(next);
    setViewMode("day");
  }

  function toggleTeacher(teacherId: number) {
    const next = selectedTeacherIds.includes(teacherId)
      ? selectedTeacherIds.filter((id) => id !== teacherId)
      : [...selectedTeacherIds, teacherId];
    setSelectedTeacherIds(next);
  }

  function toggleTeacherFilters() {
    setShowTeacherFilters((open) => !open);
  }

  const handleEventPointerDown = useCallback(
    (
      instance: ScheduleEventInstance,
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (event.button !== 0) return;

      dragMovedRef.current = false;
      const { height, top } = getInstancePosition(instance, startHour);
      const nextDrag: DragState = {
        instance,
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        dayIndex: instance.displayDayIndex,
        topPx: top,
        heightPx: Math.max(height, COMPACT_MIN_HEIGHT),
        moved: false,
      };
      dragStateRef.current = nextDrag;
      setDraggingKey(instance.instanceKey);
      // Defer so the preview node exists after draggingKey commit.
      requestAnimationFrame(() => {
        syncDragPreviewDom(
          nextDrag.dayIndex,
          nextDrag.topPx,
          nextDrag.heightPx,
          true,
        );
      });

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [startHour, syncDragPreviewDom],
  );

  useEffect(() => {
    eventPointerDownRef.current = handleEventPointerDown;
  }, [handleEventPointerDown]);

  return (
    <div className="mt-6 flex flex-col gap-6 xl:flex-row">
      {showTeacherFilters ? (
      <aside className="w-full shrink-0 xl:w-56">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("common.teachers")}
          </h2>
        </div>

        <div className="mt-4 space-y-1">
          <button
            type="button"
            onClick={() => setSelectedTeacherIds([])}
            className={classNames(
              selectedTeacherIds.length === 0
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={classNames(
                  selectedTeacherIds.length === 0
                    ? "border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400"
                    : "border-gray-300 bg-white dark:border-white/20 dark:bg-white/5",
                  "flex size-4 items-center justify-center rounded border",
                )}
              >
                {selectedTeacherIds.length === 0 ? (
                  <CheckIcon className="size-3 text-white" />
                ) : null}
              </span>
              {t("common.allTeachers")}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalScheduleCount}
            </span>
          </button>

          {teachersWithCounts.map((teacher) => {
            const isSelected = selectedTeacherIds.includes(teacher.id);
            const colors = getTeacherEventColors(teacher.id, teacherColorById);

            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => toggleTeacher(teacher.id)}
                className={classNames(
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={classNames(
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400"
                        : "border-gray-300 bg-white dark:border-white/20 dark:bg-white/5",
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                    )}
                  >
                    {isSelected ? (
                      <CheckIcon className="size-3 text-white" />
                    ) : (
                      <span
                        className={classNames("size-2 rounded-full", colors.dot)}
                      />
                    )}
                  </span>
                  <span className="truncate">{formatTeacherName(teacher)}</span>
                </span>
                <span className="ml-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {teacher.class_count}
                </span>
              </button>
            );
          })}
        </div>
      </aside>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleTeacherFilters}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
            >
              {showTeacherFilters
                ? t("common.hideTeacherFilters")
                : t("common.showTeacherFilters")}
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
            >
              {t("common.today")}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goToPrevious}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={
                  viewMode === "day"
                    ? t("common.previousDay")
                    : t("common.previousWeek")
                }
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={
                  viewMode === "day" ? t("common.nextDay") : t("common.nextWeek")
                }
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {viewMode === "day"
                ? formatDayTitle(focusDate, language)
                : formatWeekRange(weekStart, language)}
            </h2>
            <label className="inline-flex items-center gap-2">
              <span className="sr-only">{t("common.pickDate")}</span>
              <input
                type="date"
                value={formatDateYMD(focusDate)}
                onChange={(event) => goToDate(event.target.value)}
                className="rounded-md bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-xs inset-ring inset-ring-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/10 dark:text-white dark:inset-ring-white/10 dark:focus:outline-indigo-500"
              />
            </label>
            <div className="ml-1 inline-flex rounded-md shadow-xs inset-ring inset-ring-gray-300 dark:inset-ring-white/10">
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={classNames(
                  viewMode === "day"
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20",
                  "rounded-l-md px-3 py-1.5 text-sm font-semibold",
                )}
              >
                {t("common.dayView")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={classNames(
                  viewMode === "week"
                    ? "bg-indigo-600 text-white dark:bg-indigo-500"
                    : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20",
                  "rounded-r-md px-3 py-1.5 text-sm font-semibold",
                )}
              >
                {t("common.weekView")}
              </button>
            </div>
          </div>

          <div className="relative w-full max-w-sm">
            <Combobox
              value={selectedStudent}
              onChange={(student) => {
                setSelectedStudent(student);
                setStudentQuery(student ? formatStudentName(student) : "");
              }}
            >
              <div className="relative">
                <MagnifyingGlassIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
                <ComboboxInput
                  className="block w-full rounded-md bg-white py-1.5 pr-10 pl-10 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                  displayValue={(student: ScheduleStudent | null) =>
                    student ? formatStudentName(student) : studentQuery
                  }
                  onChange={(event) => {
                    setStudentQuery(event.target.value);
                    if (selectedStudent) {
                      setSelectedStudent(null);
                    }
                  }}
                  placeholder={t("common.searchStudents")}
                />
                {selectedStudent ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentQuery("");
                    }}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label={t("common.clearStudentFilter")}
                  >
                    <XMarkIcon className="size-4" />
                  </button>
                ) : (
                  <ComboboxButton className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-400">
                    <ChevronDownIcon className="size-4" />
                  </ComboboxButton>
                )}
              </div>

              <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline-1 outline-black/5 sm:text-sm dark:bg-gray-900 dark:outline-white/10">
                {filteredStudents.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.noStudentsFound")}
                  </p>
                ) : (
                  filteredStudents.map((student) => (
                    <ComboboxOption
                      key={student.id}
                      value={student}
                      className="cursor-pointer px-3 py-2 text-gray-900 data-focus:bg-indigo-600 data-focus:text-white dark:text-white"
                    >
                      {formatStudentName(student)}
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            </Combobox>
          </div>
        </div>

        {selectedStudent ? (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {t("common.showingClassesFor", {
              name: formatStudentName(selectedStudent),
            })}
            {visibleInstanceCount === 0
              ? t("common.showingClassesNoneFound")
              : "."}
          </p>
        ) : null}

        {events.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {t("common.noScheduleAddOnClass")}
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <div
                className="grid border-b border-gray-200 dark:border-white/10"
                style={{
                  gridTemplateColumns: calendarGridTemplateColumns,
                  ...(calendarMinWidthPx != null
                    ? { minWidth: calendarMinWidthPx }
                    : {}),
                }}
              >
                <div className="border-r border-gray-200 dark:border-white/10" />
                {displayDays.map(({ date: day }) => {
                  const header = formatDayHeader(day, today, language);

                  return (
                    <div
                      key={day.toISOString()}
                      className="border-r border-gray-200 px-2 py-3 text-center last:border-r-0 dark:border-white/10"
                    >
                      {viewMode === "week" ? (
                        <button
                          type="button"
                          onClick={() => openDayView(day)}
                          className="mx-auto block rounded-md px-1 py-0.5 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:bg-white/10 dark:focus-visible:outline-indigo-500"
                          aria-label={formatDayTitle(day, language)}
                        >
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {header.weekday}
                          </p>
                          <p
                            className={classNames(
                              header.isToday
                                ? "bg-indigo-600 text-white"
                                : "text-gray-900 dark:text-white",
                              "mx-auto mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                            )}
                          >
                            {header.day}
                          </p>
                        </button>
                      ) : (
                        <>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {header.weekday}
                          </p>
                          <p
                            className={classNames(
                              header.isToday
                                ? "bg-indigo-600 text-white"
                                : "text-gray-900 dark:text-white",
                              "mx-auto mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                            )}
                          >
                            {header.day}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                <div
                  ref={gridRef}
                  className="relative"
                  style={{
                    height: gridHeight,
                    ...(calendarMinWidthPx != null
                      ? { minWidth: calendarMinWidthPx }
                      : {}),
                  }}
                >
                  <div
                    className="grid h-full"
                    style={{
                      gridTemplateColumns: calendarGridTemplateColumns,
                    }}
                  >
                    <div className="relative border-r border-gray-200 dark:border-white/10">
                      {hours.map((hour, index) => (
                        <div
                          key={hour}
                          className="absolute right-2 text-xs text-gray-500 dark:text-gray-400"
                          style={{
                            top: index * HOUR_HEIGHT_PX - 8,
                          }}
                        >
                          {formatHourLabel(hour, language)}
                        </div>
                      ))}
                    </div>

                    {displayDays.map(({ date: day, dayIndex }) => {
                      const dayInstances = instancesByDay[dayIndex] ?? [];
                      const dimmedInstances =
                        dimmedInstancesByDay[dayIndex] ?? [];
                      const dayLayouts = layoutsByDay[dayIndex] ?? new Map();

                      return (
                        <div
                          key={day.toISOString()}
                          ref={(element) => {
                            dayColumnRefs.current[dayIndex] = element;
                          }}
                          className="relative border-r border-gray-200 last:border-r-0 dark:border-white/10"
                        >
                          {hours.map((hour, index) => (
                            <div
                              key={hour}
                              className="absolute inset-x-0 border-t border-gray-100 dark:border-white/5"
                              style={{ top: index * HOUR_HEIGHT_PX }}
                            />
                          ))}

                          {dimmedInstances.map((instance) => (
                            <ScheduleEventBlock
                              key={`dim-${instance.instanceKey}`}
                              instance={instance}
                              startHour={startHour}
                              layout={
                                dayLayouts.get(instance.instanceKey) ??
                                DEFAULT_EVENT_LAYOUT
                              }
                              dimmed
                              isDragging={false}
                              showFullName={viewMode === "day"}
                              colorByTeacherId={teacherColorById}
                              onPointerDownRef={eventPointerDownRef}
                            />
                          ))}

                          {dayInstances.map((instance) => (
                            <ScheduleEventBlock
                              key={instance.instanceKey}
                              instance={instance}
                              startHour={startHour}
                              layout={
                                dayLayouts.get(instance.instanceKey) ??
                                DEFAULT_EVENT_LAYOUT
                              }
                              isDragging={draggingKey === instance.instanceKey}
                              showFullName={viewMode === "day"}
                              colorByTeacherId={teacherColorById}
                              onPointerDownRef={eventPointerDownRef}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    ref={dragPreviewElRef}
                    className="pointer-events-none absolute z-30 rounded border-2 border-dashed border-indigo-500 bg-indigo-500/20"
                    style={{ display: "none" }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
          {teachersWithCounts.map((teacher) => {
            const colors = getTeacherEventColors(teacher.id, teacherColorById);
            return (
              <span key={teacher.id} className="inline-flex items-center gap-1.5">
                <span className={classNames("size-2.5 rounded-full", colors.dot)} />
                {formatTeacherName(teacher)}
              </span>
            );
          })}
          {events.some((event) => event.teacher_id === null) ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={classNames(
                  "size-2.5 rounded-full",
                  getTeacherEventColors(null).dot,
                )}
              />
              {t("common.noTeacherAssigned")}
            </span>
          ) : null}
        </div>
      </div>

      {pendingReschedule ? (
        <ScheduleRescheduleDialog
          key={`${pendingReschedule.instance.instanceKey}:${pendingReschedule.newDate}:${pendingReschedule.newStartTime}`}
          pending={pendingReschedule}
          onClose={closeRescheduleDialog}
          onSuccess={closeRescheduleDialog}
        />
      ) : null}

      <ScheduleClassDetailDialog
        key={selectedInstance?.instanceKey ?? "closed"}
        instance={selectedInstance}
        students={students}
        onClose={closeClassDetail}
      />
    </div>
  );
}
