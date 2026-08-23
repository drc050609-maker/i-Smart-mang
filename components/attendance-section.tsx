"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

import {
  markAllAttendancePresent,
  markAttendance,
  markGroupAttendancePresent,
  type ActionState,
  type MarkAllPresentState,
} from "@/app/(dashboard)/attendance/actions";
import {
  ScheduleMakeupDialog,
  type MakeupDialogTarget,
} from "@/components/schedule-makeup-dialog";
import { ScheduleMakeupLabel } from "@/components/schedule-makeup-label";
import { useLanguage } from "@/components/language-provider";
import { minutesBetweenScheduleTimes } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import { formatSessionDate } from "@/lib/class-session-credits";
import {
  attendanceStatusBadgeClass,
  formatAttendanceStatus,
  getAttendancePageStatusOptions,
  type AttendanceStatus,
} from "@/lib/attendance";
import { appLanguageLocale } from "@/lib/language";
import { compareStudentNames, formatStudentName } from "@/lib/person-name";

export type AttendanceMakeupInfo = {
  id: number;
  makeupDate: string;
  startTime: string;
  endTime: string;
  creditsApplied: boolean;
  originalScheduleId: number | null;
  originalSessionDate: string | null;
  makeupScheduleId: number | null;
};

export type AttendanceStudentRow = {
  studentId: number;
  firstName: string;
  lastName: string | null;
  status: AttendanceStatus | null;
  sessionsTotal: number;
  sessionsRemaining: number;
  makeup: AttendanceMakeupInfo | null;
  isMakeupSlot: boolean;
};

export type AttendanceClassGroup = {
  scheduleId: number;
  classId: number;
  classSubject: string;
  lessonType: string | null;
  teacherId: number | null;
  teacherName: string | null;
  locationName: string | null;
  startTime: string;
  endTime: string;
  isMakeup: boolean;
  students: AttendanceStudentRow[];
};

export type AttendanceTeacherOption = {
  id: number;
  name: string;
};

type TeacherStudentEntry = {
  key: string;
  student: AttendanceStudentRow;
  scheduleId: number;
  classId: number;
  classSubject: string;
  lessonType: string | null;
  startTime: string;
  endTime: string;
  teacherName: string | null;
};

type TeacherColumn = {
  teacherId: number | null;
  teacherName: string;
  locationName: string | null;
  entries: TeacherStudentEntry[];
};

type AttendanceBlock =
  | { kind: "group"; key: string; entries: TeacherStudentEntry[] }
  | { kind: "student"; key: string; entry: TeacherStudentEntry };

function clusterEntriesForTeacher(
  entries: TeacherStudentEntry[],
): AttendanceBlock[] {
  const groupEntries = new Map<string, TeacherStudentEntry[]>();
  const individuals: TeacherStudentEntry[] = [];

  for (const entry of entries) {
    const isGroupClass =
      entry.lessonType?.trim().toLowerCase() === "group" &&
      !entry.student.isMakeupSlot;
    if (isGroupClass) {
      const key = `${entry.scheduleId}:${entry.startTime}`;
      const existing = groupEntries.get(key) ?? [];
      existing.push(entry);
      groupEntries.set(key, existing);
      continue;
    }
    individuals.push(entry);
  }

  const blocks: AttendanceBlock[] = [
    ...[...groupEntries.entries()].map(([key, group]) => ({
      kind: "group" as const,
      key,
      entries: group,
    })),
    ...individuals.map((entry) => ({
      kind: "student" as const,
      key: entry.key,
      entry,
    })),
  ];

  blocks.sort((a, b) => {
    const timeA = a.kind === "group" ? a.entries[0]!.startTime : a.entry.startTime;
    const timeB = b.kind === "group" ? b.entries[0]!.startTime : b.entry.startTime;
    const time = timeA.localeCompare(timeB);
    if (time !== 0) return time;
    if (a.kind !== b.kind) return a.kind === "group" ? -1 : 1;
    return 0;
  });

  return blocks;
}

function groupClassGroupsByTeacher(
  classGroups: AttendanceClassGroup[],
  unassignedLabel: string,
  allTeachers: AttendanceTeacherOption[] = [],
): TeacherColumn[] {
  const columns = new Map<string, TeacherColumn>();

  for (const teacher of allTeachers) {
    columns.set(`id:${teacher.id}`, {
      teacherId: teacher.id,
      teacherName: teacher.name,
      locationName: null,
      entries: [],
    });
  }

  for (const group of classGroups) {
    const mapKey =
      group.teacherId != null
        ? `id:${group.teacherId}`
        : `name:${group.teacherName ?? "unassigned"}`;
    let column = columns.get(mapKey);
    if (!column) {
      column = {
        teacherId: group.teacherId,
        teacherName: group.teacherName?.trim() || unassignedLabel,
        locationName: group.locationName,
        entries: [],
      };
      columns.set(mapKey, column);
    } else if (!column.locationName && group.locationName) {
      column.locationName = group.locationName;
    }

    for (const student of group.students) {
      column.entries.push({
        key: `${group.scheduleId}:${student.studentId}`,
        student,
        scheduleId: group.scheduleId,
        classId: group.classId,
        classSubject: group.classSubject,
        lessonType: group.lessonType,
        startTime: group.startTime,
        endTime: group.endTime,
        teacherName: group.teacherName,
      });
    }
  }

  for (const column of columns.values()) {
    column.entries.sort((a, b) => {
      const time = a.startTime.localeCompare(b.startTime);
      if (time !== 0) return time;
      return compareStudentNames(
        { "first name": a.student.firstName, "last name": a.student.lastName },
        { "first name": b.student.firstName, "last name": b.student.lastName },
      );
    });
  }

  return [...columns.values()].sort((a, b) =>
    a.teacherName.localeCompare(b.teacherName, undefined, {
      sensitivity: "base",
    }),
  );
}

const initialState: ActionState = {};
const initialMarkAllState: MarkAllPresentState = {};

function formatTime(time: string, language: "en" | "zh") {
  const [hours, minutes] = time.slice(0, 5).split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString(appLanguageLocale(language), {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAttendanceDate(sessionDate: string, language: "en" | "zh") {
  return new Date(`${sessionDate}T00:00:00`).toLocaleDateString(
    appLanguageLocale(language),
    {
      weekday: "long",
      month: "short",
      day: "numeric",
    },
  );
}

function addDaysYmd(ymd: string, days: number) {
  const date = new Date(`${ymd}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatSessionDate(date);
}

function makeupTargetForSession(options: {
  studentId: number;
  studentName: string;
  classId: number;
  classSubject: string;
  teacherName: string | null;
  scheduleId: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  isMakeupSlot: boolean;
  makeup: AttendanceMakeupInfo | null;
}): MakeupDialogTarget | null {
  const originalScheduleId = options.isMakeupSlot
    ? options.makeup?.originalScheduleId
    : options.scheduleId;
  const originalSessionDate = options.isMakeupSlot
    ? options.makeup?.originalSessionDate
    : options.sessionDate;
  if (!originalScheduleId || !originalSessionDate) {
    return null;
  }

  const durationMinutes =
    minutesBetweenScheduleTimes(options.startTime, options.endTime) ?? 45;

  return {
    studentId: options.studentId,
    studentName: options.studentName,
    classId: options.classId,
    classSubject: options.classSubject,
    teacherName: options.teacherName,
    originalScheduleId,
    originalSessionDate,
    defaultDate: options.makeup?.makeupDate ?? addDaysYmd(originalSessionDate, 7),
    defaultStartTime: options.makeup?.startTime ?? options.startTime,
    durationMinutes,
  };
}

function AttendanceMarkButton({
  studentId,
  classId,
  scheduleId,
  sessionDate,
  status,
  currentStatus,
  label,
}: {
  studentId: number;
  classId: number;
  scheduleId: number;
  sessionDate: string;
  status: AttendanceStatus;
  currentStatus: AttendanceStatus | null;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    markAttendance,
    initialState,
  );
  const selected = currentStatus === status;

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <input type="hidden" name="sessionDate" value={sessionDate} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={pending}
        className={
          selected
            ? "rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            : "rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
        }
      >
        {pending ? "…" : label}
      </button>
      {state.error ? (
        <span className="ml-2 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function MarkGroupPresentButton({
  scheduleId,
  classId,
  sessionDate,
  unmarkedCount,
}: {
  scheduleId: number;
  classId: number;
  sessionDate: string;
  unmarkedCount: number;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(
    markGroupAttendancePresent,
    initialMarkAllState,
  );

  if (unmarkedCount === 0) {
    return null;
  }

  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sessionDate" value={sessionDate} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
      >
        {pending ? t("common.marking") : t("common.markGroupPresent")}
      </button>
      {state.error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </form>
  );
}

function MarkAllPresentButton({
  sessionDate,
  unmarkedCount,
  label,
}: {
  sessionDate: string;
  unmarkedCount: number;
  label: string;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(
    markAllAttendancePresent,
    initialMarkAllState,
  );

  if (unmarkedCount === 0) {
    return null;
  }

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="sessionDate" value={sessionDate} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
      >
        {pending ? t("common.marking") : label}
      </button>
      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.success && state.markedCount !== undefined ? (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
          {t("common.markedPresent", {
            marked: state.markedCount,
            skipped: state.skippedCount ?? 0,
          })}
        </p>
      ) : null}
    </form>
  );
}

function AttendanceActionButtons({
  studentId,
  classId,
  scheduleId,
  sessionDate,
  status,
  studentName,
  classSubject,
  teacherName,
  startTime,
  endTime,
  isMakeupSlot,
  makeup,
  onMakeup,
}: {
  studentId: number;
  classId: number;
  scheduleId: number;
  sessionDate: string;
  status: AttendanceStatus | null;
  studentName: string;
  classSubject: string;
  teacherName: string | null;
  startTime: string;
  endTime: string;
  isMakeupSlot: boolean;
  makeup: AttendanceMakeupInfo | null;
  onMakeup: (target: MakeupDialogTarget) => void;
}) {
  const { language, t } = useLanguage();
  const attendanceOptions = getAttendancePageStatusOptions(language);
  const makeupTarget = makeupTargetForSession({
    studentId,
    studentName,
    classId,
    classSubject,
    teacherName,
    scheduleId,
    sessionDate,
    startTime,
    endTime,
    isMakeupSlot,
    makeup,
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {attendanceOptions.map((option) => (
        <AttendanceMarkButton
          key={option.value}
          studentId={studentId}
          classId={classId}
          scheduleId={scheduleId}
          sessionDate={sessionDate}
          status={option.value}
          currentStatus={status}
          label={option.label}
        />
      ))}
      {makeupTarget ? (
        <button
          type="button"
          onClick={() => onMakeup(makeupTarget)}
          className="rounded-md bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 shadow-xs inset-ring inset-ring-sky-200 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-200 dark:inset-ring-sky-500/30 dark:hover:bg-sky-500/20"
        >
          {makeup ? t("common.rescheduleMakeup") : t("common.makeUpClass")}
        </button>
      ) : null}
    </div>
  );
}

function AttendanceStudentItem({
  entry,
  sessionDate,
  showTime,
  onMakeup,
}: {
  entry: TeacherStudentEntry;
  sessionDate: string;
  showTime: boolean;
  onMakeup: (target: MakeupDialogTarget) => void;
}) {
  const { language, t } = useLanguage();
  const studentName = formatStudentName({
    "first name": entry.student.firstName,
    "last name": entry.student.lastName,
  });

  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="inline-flex flex-wrap items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
            {studentName}
            <ScheduleMakeupLabel isMakeup={entry.student.isMakeupSlot} />
          </p>
          {showTime ? (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {formatTime(entry.startTime, language)} –{" "}
              {formatTime(entry.endTime, language)}
            </p>
          ) : null}
        </div>
        <dl className="flex flex-wrap gap-x-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            <dt className="inline">{t("common.totalClass")} </dt>
            <dd className="inline font-medium text-gray-900 dark:text-white">
              {entry.student.sessionsTotal}
            </dd>
          </div>
          <div>
            <dt className="inline">{t("common.remainingClass")} </dt>
            <dd className="inline font-medium text-gray-900 dark:text-white">
              {entry.student.sessionsRemaining}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {entry.student.status ? (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${attendanceStatusBadgeClass(entry.student.status)}`}
          >
            {formatAttendanceStatus(entry.student.status, language)}
          </span>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("common.notMarked")}
          </span>
        )}
        {entry.student.makeup ? (
          <span className="text-xs text-sky-700 dark:text-sky-300">
            {t("common.makeupScheduled", {
              date: formatAttendanceDate(
                entry.student.makeup.makeupDate,
                language,
              ),
              time: formatTime(entry.student.makeup.startTime, language),
            })}
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        <AttendanceActionButtons
          studentId={entry.student.studentId}
          classId={entry.classId}
          scheduleId={entry.scheduleId}
          sessionDate={sessionDate}
          status={entry.student.status}
          studentName={studentName}
          classSubject={entry.classSubject}
          teacherName={entry.teacherName}
          startTime={entry.startTime}
          endTime={entry.endTime}
          isMakeupSlot={entry.student.isMakeupSlot}
          makeup={entry.student.makeup}
          onMakeup={onMakeup}
        />
      </div>
    </div>
  );
}

function GroupClassAttendanceBlock({
  entries,
  sessionDate,
}: {
  entries: TeacherStudentEntry[];
  sessionDate: string;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [makeupTarget, setMakeupTarget] = useState<MakeupDialogTarget | null>(
    null,
  );
  const first = entries[0]!;
  const subjectLabel = formatClassSubject(first.classSubject, language);
  const title = t("common.groupClassAtTime", {
    subject: subjectLabel,
    time: formatTime(first.startTime, language),
  });
  const markedCount = entries.filter((entry) => entry.student.status !== null)
    .length;
  const unmarkedCount = entries.length - markedCount;
  const allPresent =
    entries.length > 0 &&
    entries.every((entry) => entry.student.status === "present");

  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {t("common.studentsMarked", {
                students: entries.length,
                marked: markedCount,
              })}
              {" · "}
              {t("common.groupClassOpenHelp")}
            </p>
          </div>
          {allPresent ? (
            <span
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${attendanceStatusBadgeClass("present")}`}
            >
              {formatAttendanceStatus("present", language)}
            </span>
          ) : null}
          <ChevronRightIcon className="size-5 shrink-0 text-gray-400" />
        </button>
        <MarkGroupPresentButton
          scheduleId={first.scheduleId}
          classId={first.classId}
          sessionDate={sessionDate}
          unmarkedCount={unmarkedCount}
        />
      </div>

      <Dialog
        open={open}
        onClose={() => {
          if (makeupTarget) return;
          setOpen(false);
        }}
        className="relative z-40"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
            <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("common.studentsMarked", {
                      students: entries.length,
                      marked: markedCount,
                    })}
                  </p>
                </div>
                {allPresent ? (
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${attendanceStatusBadgeClass("present")}`}
                  >
                    {formatAttendanceStatus("present", language)}
                  </span>
                ) : (
                  <MarkGroupPresentButton
                    scheduleId={first.scheduleId}
                    classId={first.classId}
                    sessionDate={sessionDate}
                    unmarkedCount={unmarkedCount}
                  />
                )}
              </div>

              <ul className="mt-4 max-h-[60vh] divide-y divide-gray-100 overflow-y-auto dark:divide-white/5">
                {entries.map((entry) => (
                  <li key={entry.key}>
                    <AttendanceStudentItem
                      entry={entry}
                      sessionDate={sessionDate}
                      showTime={false}
                      onMakeup={setMakeupTarget}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (makeupTarget) return;
                    setOpen(false);
                  }}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
                >
                  {t("common.close")}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
        <ScheduleMakeupDialog
          key={
            makeupTarget
              ? `${makeupTarget.studentId}-${makeupTarget.originalScheduleId}`
              : "idle"
          }
          target={makeupTarget}
          onClose={() => setMakeupTarget(null)}
        />
      </Dialog>
    </li>
  );
}

function TeacherAttendanceCard({
  column,
  sessionDate,
  onMakeup,
}: {
  column: TeacherColumn;
  sessionDate: string;
  onMakeup: (target: MakeupDialogTarget) => void;
}) {
  const { t } = useLanguage();
  const markedCount = column.entries.filter(
    (entry) => entry.student.status !== null,
  ).length;
  const blocks = clusterEntriesForTeacher(column.entries);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          {column.teacherName}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {column.locationName ? `${column.locationName} · ` : null}
          {t("common.studentsMarked", {
            students: column.entries.length,
            marked: markedCount,
          })}
        </p>
      </div>

      {column.entries.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noClassesScheduled", { name: column.teacherName })}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-white/5">
          {blocks.map((block) => {
            if (block.kind === "student") {
              return (
                <li key={block.key}>
                  <AttendanceStudentItem
                    entry={block.entry}
                    sessionDate={sessionDate}
                    showTime
                    onMakeup={onMakeup}
                  />
                </li>
              );
            }

            return (
              <GroupClassAttendanceBlock
                key={block.key}
                entries={block.entries}
                sessionDate={sessionDate}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AttendanceSection({
  sessionDate,
  classGroups,
  teachers,
  selectedTeacherId,
}: {
  sessionDate: string;
  classGroups: AttendanceClassGroup[];
  teachers: AttendanceTeacherOption[];
  selectedTeacherId?: number;
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [makeupTarget, setMakeupTarget] = useState<MakeupDialogTarget | null>(
    null,
  );
  const teacherColumns = useMemo(
    () =>
      groupClassGroupsByTeacher(
        classGroups,
        t("common.unassigned"),
        selectedTeacherId
          ? teachers.filter((teacher) => teacher.id === selectedTeacherId)
          : teachers,
      ),
    [classGroups, selectedTeacherId, t, teachers],
  );

  function attendanceParams(overrides?: { date?: string; teacher?: string }) {
    const params = new URLSearchParams({
      date: overrides?.date ?? sessionDate,
    });
    const teacherValue =
      overrides?.teacher ??
      (selectedTeacherId ? String(selectedTeacherId) : "all");
    if (teacherValue && teacherValue !== "all") {
      params.set("teacher", teacherValue);
    }
    return params;
  }

  const totalUnmarked = classGroups.reduce(
    (count, group) =>
      count + group.students.filter((student) => student.status === null).length,
    0,
  );

  function handleDateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const date = formData.get("date")?.toString() ?? sessionDate;
    router.push(`/attendance?${attendanceParams({ date }).toString()}`);
  }

  function handleTeacherChange(event: React.ChangeEvent<HTMLSelectElement>) {
    router.push(
      `/attendance?${attendanceParams({ teacher: event.target.value }).toString()}`,
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label
                htmlFor="attendance-teacher"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("common.teachers")}
              </label>
              <select
                id="attendance-teacher"
                value={selectedTeacherId ? String(selectedTeacherId) : "all"}
                onChange={handleTeacherChange}
                className="mt-1 block rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10"
              >
                <option value="all">{t("common.allTeachers")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            <form
              key={sessionDate}
              className="flex items-end gap-2"
              onSubmit={handleDateSubmit}
            >
              <div>
                <label
                  htmlFor="attendance-date"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("common.date")}
                </label>
                <input
                  id="attendance-date"
                  name="date"
                  type="date"
                  defaultValue={sessionDate}
                  className="mt-1 block rounded-md bg-white px-3 py-1.5 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:inset-ring-white/10"
              >
                {t("common.go")}
              </button>
            </form>
          </div>

          <MarkAllPresentButton
            sessionDate={sessionDate}
            unmarkedCount={totalUnmarked}
            label={t("common.markAllPresent", { count: totalUnmarked })}
          />
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t("common.attendancePickDateHelp")}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("common.classesOnDate", {
            date: formatAttendanceDate(sessionDate, language),
          })}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.attendanceAllClassesHelp")}
        </p>
      </div>

      {teachers.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("common.noTeachersToday")}
        </p>
      ) : teacherColumns.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("common.noClassesOnDate")}
        </p>
      ) : (
        <div
          className={
            teacherColumns.length === 1
              ? undefined
              : "columns-1 gap-3 lg:columns-2"
          }
        >
          {teacherColumns.map((column) => (
            <div
              key={
                column.teacherId != null
                  ? `teacher-${column.teacherId}`
                  : `teacher-${column.teacherName}`
              }
              className={
                teacherColumns.length === 1 ? undefined : "mb-3 break-inside-avoid"
              }
            >
              <TeacherAttendanceCard
                column={column}
                sessionDate={sessionDate}
                onMakeup={setMakeupTarget}
              />
            </div>
          ))}
        </div>
      )}

      <ScheduleMakeupDialog
        key={
          makeupTarget
            ? `${makeupTarget.studentId}-${makeupTarget.originalScheduleId}`
            : "idle"
        }
        target={makeupTarget}
        onClose={() => setMakeupTarget(null)}
      />
    </div>
  );
}
