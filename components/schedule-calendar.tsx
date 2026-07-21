"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { formatClassSubject } from "@/lib/class-subject";
import {
  addDays,
  buildWeekEventInstances,
  computeHourRange,
  countEventsByTeacher,
  filterEventsByStudent,
  filterEventsByTeachers,
  formatDateYMD,
  formatDayHeader,
  formatHourLabel,
  formatWeekRange,
  getInstancePosition,
  getTeacherEventColors,
  getWeekDays,
  HOUR_HEIGHT_PX,
  minutesToTimeString,
  snapMinutes,
  startOfWeek,
  timeToMinutes,
  type ScheduleEvent,
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
const COMPACT_MIN_HEIGHT = 24;

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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

function ScheduleEventBlock({
  instance,
  startHour,
  dimmed,
  isDragging,
  onPointerDown,
}: {
  instance: ScheduleEventInstance;
  startHour: number;
  dimmed?: boolean;
  isDragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const { language } = useLanguage();
  const colors = getTeacherEventColors(instance.teacher_id);
  const { top, height } = getInstancePosition(instance, startHour);
  const displayHeight = Math.max(height, COMPACT_MIN_HEIGHT);
  const subjectLabel = formatClassSubject(instance.subject, language);

  return (
    <div
      style={{ top, height: displayHeight }}
      onPointerDown={onPointerDown}
      className={classNames(
        "absolute inset-x-1 z-10 cursor-grab overflow-hidden rounded border-l-4 px-1.5 py-0.5 text-left shadow-sm transition active:cursor-grabbing",
        colors.bg,
        colors.border,
        colors.text,
        !instance.is_active && "opacity-60",
        dimmed && "opacity-30",
        isDragging && "opacity-40",
      )}
      title={subjectLabel}
    >
      <p className="truncate text-[11px] font-semibold leading-tight">
        {subjectLabel}
      </p>
    </div>
  );
}

export function ScheduleCalendar({
  events,
  exceptions,
  teachers,
  students,
}: {
  events: ScheduleEvent[];
  exceptions: ScheduleException[];
  teachers: ScheduleTeacher[];
  students: ScheduleStudent[];
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const dayColumnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragMovedRef = useRef(false);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ScheduleStudent | null>(
    null,
  );
  const [studentQuery, setStudentQuery] = useState("");
  const [selectedInstance, setSelectedInstance] =
    useState<ScheduleEventInstance | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    dayIndex: number;
    topPx: number;
    heightPx: number;
    instance: ScheduleEventInstance;
  } | null>(null);
  const [pendingReschedule, setPendingReschedule] =
    useState<PendingReschedule | null>(null);

  const closeRescheduleDialog = useCallback(() => {
    setPendingReschedule(null);
  }, []);

  const handleRescheduleSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const closeClassDetail = useCallback(() => {
    setSelectedInstance(null);
  }, []);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const teacherFilteredEvents = useMemo(
    () => filterEventsByTeachers(events, selectedTeacherIds),
    [events, selectedTeacherIds],
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

  const allWeekInstances = useMemo(
    () =>
      buildWeekEventInstances(
        filterEventsByTeachers(events, selectedTeacherIds),
        exceptions,
        weekDays,
      ),
    [events, exceptions, weekDays, selectedTeacherIds],
  );

  const hourRangeEvents = useMemo(
    () =>
      weekInstances.map((instance) => ({
        schedule_start_time: instance.display_start_time,
        schedule_end_time: instance.display_end_time,
      })),
    [weekInstances],
  );

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

  const teachersWithCounts = useMemo(
    () =>
      teachers
        .map((teacher) => ({
          ...teacher,
          class_count: teacherCounts.get(teacher.id) ?? 0,
        }))
        .filter((teacher) => teacher.class_count > 0),
    [teachers, teacherCounts],
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
      const topPx = Math.max(0, Math.min(maxTop, relativeY - dragState.heightPx / 2));

      setDragState((current) =>
        current
          ? {
              ...current,
              moved,
              dayIndex,
              topPx,
            }
          : null,
      );

      setDragPreview({
        dayIndex,
        topPx,
        heightPx: dragState.heightPx,
        instance: dragState.instance,
      });
    },
    [dragState, gridHeight],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      if (dragMovedRef.current) {
        resolveDrop(dragState.dayIndex, dragState.topPx, dragState.instance);
      } else {
        setSelectedInstance(dragState.instance);
      }

      setDragState(null);
      setDragPreview(null);
      dragMovedRef.current = false;
    },
    [dragState, resolveDrop],
  );

  useEffect(() => {
    if (!dragState) {
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
  }, [dragState, handlePointerMove, handlePointerUp]);

  function goToPreviousWeek() {
    setWeekStart((current) => addDays(current, -7));
    setSelectedInstance(null);
  }

  function goToNextWeek() {
    setWeekStart((current) => addDays(current, 7));
    setSelectedInstance(null);
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date()));
    setSelectedInstance(null);
  }

  function toggleTeacher(teacherId: number) {
    setSelectedTeacherIds((current) =>
      current.includes(teacherId)
        ? current.filter((id) => id !== teacherId)
        : [...current, teacherId],
    );
  }

  function handleEventPointerDown(
    instance: ScheduleEventInstance,
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0) return;

    dragMovedRef.current = false;
    const { height, top } = getInstancePosition(instance, startHour);
    setDragState({
      instance,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      dayIndex: instance.displayDayIndex,
      topPx: top,
      heightPx: Math.max(height, COMPACT_MIN_HEIGHT),
      moved: false,
    });

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  const highlightStudentFilter = selectedStudent !== null;

  return (
    <div className="mt-6 flex flex-col gap-6 xl:flex-row">
      <aside className="w-full shrink-0 xl:w-56">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t("common.teachers")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.teacherFilterHelp")}
        </p>

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
              {events.length}
            </span>
          </button>

          {teachersWithCounts.map((teacher) => {
            const isSelected = selectedTeacherIds.includes(teacher.id);
            const colors = getTeacherEventColors(teacher.id);

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

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
                onClick={goToPreviousWeek}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={t("common.previousWeek")}
              >
                <ChevronLeftIcon className="size-5" />
              </button>
              <button
                type="button"
                onClick={goToNextWeek}
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={t("common.nextWeek")}
              >
                <ChevronRightIcon className="size-5" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatWeekRange(weekStart, language)}
            </h2>
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
            {weekInstances.length === 0
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
            <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-gray-200 dark:border-white/10">
              <div className="border-r border-gray-200 dark:border-white/10" />
              {weekDays.map((day) => {
                const header = formatDayHeader(day, today, language);

                return (
                  <div
                    key={day.toISOString()}
                    className="border-r border-gray-200 px-2 py-3 text-center last:border-r-0 dark:border-white/10"
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
                  </div>
                );
              })}
            </div>

            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
              <div
                ref={gridRef}
                className="relative grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]"
                style={{ height: gridHeight }}
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

                {weekDays.map((day, dayIndex) => {
                  const dayInstances = weekInstances.filter(
                    (instance) => instance.displayDayIndex === dayIndex,
                  );
                  const allDayInstances = allWeekInstances.filter(
                    (instance) => instance.displayDayIndex === dayIndex,
                  );

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

                      {highlightStudentFilter
                        ? allDayInstances
                            .filter(
                              (instance) =>
                                !dayInstances.some(
                                  (visible) =>
                                    visible.instanceKey === instance.instanceKey,
                                ),
                            )
                            .map((instance) => (
                              <ScheduleEventBlock
                                key={`dim-${instance.instanceKey}`}
                                instance={instance}
                                startHour={startHour}
                                dimmed
                                isDragging={false}
                                onPointerDown={() => {}}
                              />
                            ))
                        : null}

                      {dayInstances.map((instance) => (
                        <ScheduleEventBlock
                          key={instance.instanceKey}
                          instance={instance}
                          startHour={startHour}
                          isDragging={
                            dragState?.instance.instanceKey === instance.instanceKey
                          }
                          onPointerDown={(event) =>
                            handleEventPointerDown(instance, event)
                          }
                        />
                      ))}

                      {dragPreview && dragPreview.dayIndex === dayIndex ? (
                        <div
                          className="pointer-events-none absolute inset-x-1 z-30 rounded border-2 border-dashed border-indigo-500 bg-indigo-500/20"
                          style={{
                            top: dragPreview.topPx,
                            height: dragPreview.heightPx,
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
          {teachersWithCounts.map((teacher) => {
            const colors = getTeacherEventColors(teacher.id);
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
          onSuccess={handleRescheduleSuccess}
        />
      ) : null}

      <ScheduleClassDetailDialog
        instance={selectedInstance}
        students={students}
        onClose={closeClassDetail}
      />
    </div>
  );
}
