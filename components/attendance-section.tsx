"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  markAllAttendancePresent,
  markAttendance,
  markStudentAllPresent,
  type ActionState,
  type MarkAllPresentState,
} from "@/app/(dashboard)/attendance/actions";
import {
  StudentCombobox,
  type StudentOption,
} from "@/components/student-combobox";
import { useLanguage } from "@/components/language-provider";
import { formatClassSubject } from "@/lib/class-subject";
import {
  attendanceStatusBadgeClass,
  formatAttendanceStatus,
  getAttendanceStatusOptions,
  type AttendanceStatus,
} from "@/lib/attendance";
import { appLanguageLocale } from "@/lib/language";
import { formatStudentName } from "@/lib/person-name";

export type AttendanceStudentRow = {
  studentId: number;
  firstName: string;
  lastName: string | null;
  status: AttendanceStatus | null;
};

export type AttendanceClassGroup = {
  scheduleId: number;
  classId: number;
  classSubject: string;
  teacherName: string | null;
  locationName: string | null;
  startTime: string;
  endTime: string;
  students: AttendanceStudentRow[];
};

export type AttendanceClassSession = {
  scheduleId: number;
  classId: number;
  classSubject: string;
  teacherName: string | null;
  locationName: string | null;
  startTime: string;
  endTime: string;
  status: AttendanceStatus | null;
};

export type AttendanceStudentDay = {
  studentId: number;
  firstName: string;
  lastName: string | null;
  sessions: AttendanceClassSession[];
};

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

function toStudentOption(row: AttendanceStudentDay): StudentOption {
  return {
    id: row.studentId,
    "first name": row.firstName,
    "last name": row.lastName,
  };
}

function AttendanceMarkButton({
  studentId,
  classId,
  scheduleId,
  sessionDate,
  status,
  label,
}: {
  studentId: number;
  classId: number;
  scheduleId: number;
  sessionDate: string;
  status: AttendanceStatus;
  label: string;
}) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(markAttendance, initialState);

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
        className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
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

function MarkAllPresentButton({
  sessionDate,
  studentId,
  unmarkedCount,
  label,
}: {
  sessionDate: string;
  studentId?: number;
  unmarkedCount: number;
  label: string;
}) {
  const { t } = useLanguage();
  const action = studentId ? markStudentAllPresent : markAllAttendancePresent;
  const [state, formAction, pending] = useActionState(action, initialMarkAllState);

  if (unmarkedCount === 0) {
    return null;
  }

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="sessionDate" value={sessionDate} />
      {studentId ? (
        <input type="hidden" name="studentId" value={studentId} />
      ) : null}
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

function ClassGroupCard({
  group,
  sessionDate,
}: {
  group: AttendanceClassGroup;
  sessionDate: string;
}) {
  const { language, t } = useLanguage();
  const attendanceOptions = getAttendanceStatusOptions(language);
  const markedCount = group.students.filter((s) => s.status !== null).length;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {formatClassSubject(group.classSubject, language)}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatTime(group.startTime, language)} – {formatTime(group.endTime, language)}
            {group.teacherName ? ` · ${group.teacherName}` : ""}
            {group.locationName ? ` · ${group.locationName}` : ""}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("common.studentsMarked", {
              students: group.students.length,
              marked: markedCount,
            })}
          </p>
        </div>
      </div>

      {group.students.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noEnrolledStudents")}
        </p>
      ) : (
        <div className="mt-4 flow-root">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.student")}
                </th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.status")}
                </th>
                <th className="py-2 pl-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {t("common.mark")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {group.students.map((student) => (
                <tr key={student.studentId}>
                  <td className="py-3 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                    {formatStudentName({
                      "first name": student.firstName,
                      "last name": student.lastName,
                    })}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {student.status ? (
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${attendanceStatusBadgeClass(student.status)}`}
                      >
                        {formatAttendanceStatus(student.status, language)}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">
                        {t("common.notMarked")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {attendanceOptions.map((option) => (
                        <AttendanceMarkButton
                          key={option.value}
                          studentId={student.studentId}
                          classId={group.classId}
                          scheduleId={group.scheduleId}
                          sessionDate={sessionDate}
                          status={option.value}
                          label={option.label}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AttendanceSection({
  sessionDate,
  classGroups,
  studentDays,
  initialStudentId,
}: {
  sessionDate: string;
  classGroups: AttendanceClassGroup[];
  studentDays: AttendanceStudentDay[];
  initialStudentId?: number;
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const studentOptions = useMemo(
    () => studentDays.map(toStudentOption),
    [studentDays],
  );
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(
    () =>
      initialStudentId
        ? (studentOptions.find((s) => s.id === initialStudentId) ?? null)
        : null,
  );

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudent(
        studentOptions.find((s) => s.id === initialStudentId) ?? null,
      );
    }
  }, [initialStudentId, studentOptions]);

  const selectedDay = selectedStudent
    ? studentDays.find((day) => day.studentId === selectedStudent.id)
    : null;

  function updateStudentSearchParam(student: StudentOption | null) {
    const params = new URLSearchParams({ date: sessionDate });
    if (student) {
      params.set("student", String(student.id));
    }
    window.history.replaceState(null, "", `/attendance?${params.toString()}`);
  }

  function handleStudentChange(student: StudentOption | null) {
    const match = student
      ? (studentOptions.find((s) => s.id === student.id) ?? student)
      : null;
    setSelectedStudent(match);
    updateStudentSearchParam(match);
  }

  const totalUnmarked = studentDays.reduce(
    (count, day) =>
      count + day.sessions.filter((session) => session.status === null).length,
    0,
  );

  const studentUnmarked =
    selectedDay?.sessions.filter((session) => session.status === null).length ??
    0;

  function handleDateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const date = formData.get("date")?.toString() ?? sessionDate;
    const params = new URLSearchParams({ date });
    if (selectedStudent) {
      params.set("student", String(selectedStudent.id));
    }
    router.push(`/attendance?${params.toString()}`);
  }

  const attendanceOptions = getAttendanceStatusOptions(language);

  const studentDetailSection = !selectedStudent ? null : !selectedDay ||
    selectedDay.sessions.length === 0 ? (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      {t("common.noClassesScheduled", {
        name: formatStudentName(selectedStudent),
      })}
    </p>
  ) : (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {formatStudentName(selectedStudent)}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.classCountOnDate", {
              count: selectedDay.sessions.length,
              date: formatAttendanceDate(sessionDate, language),
            })}
          </p>
        </div>
        <MarkAllPresentButton
          sessionDate={sessionDate}
          studentId={selectedStudent.id}
          unmarkedCount={studentUnmarked}
          label={t("common.markAllPresent", { count: studentUnmarked })}
        />
      </div>

      <div className="mt-4 flow-root">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
          <thead>
            <tr>
              <th className="py-2 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                {t("common.class")}
              </th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">
                {t("common.time")}
              </th>
              <th className="px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white">
                {t("common.status")}
              </th>
              <th className="py-2 pl-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                {t("common.mark")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {selectedDay.sessions.map((session) => (
              <tr key={session.scheduleId}>
                <td className="py-3 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                  <div>{formatClassSubject(session.classSubject, language)}</div>
                  {(session.teacherName || session.locationName) && (
                    <div className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {[session.teacherName, session.locationName]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                  {formatTime(session.startTime, language)} – {formatTime(session.endTime, language)}
                </td>
                <td className="px-3 py-3 text-sm">
                  {session.status ? (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${attendanceStatusBadgeClass(session.status)}`}
                    >
                      {formatAttendanceStatus(session.status, language)}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">
                      {t("common.notMarked")}
                    </span>
                  )}
                </td>
                <td className="py-3 pl-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {attendanceOptions.map((option) => (
                      <AttendanceMarkButton
                        key={option.value}
                        studentId={selectedStudent.id}
                        classId={session.classId}
                        scheduleId={session.scheduleId}
                        sessionDate={sessionDate}
                        status={option.value}
                        label={option.label}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900/40">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[12rem] flex-1 max-w-md">
              <label
                htmlFor="attendance-student"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("common.student")}
              </label>
              <div className="mt-1">
                <StudentCombobox
                  id="attendance-student"
                  students={studentOptions}
                  selected={selectedStudent}
                  onChange={handleStudentChange}
                />
              </div>
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

      {selectedStudent ? (
        studentDetailSection
      ) : (
        <>
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

          {classGroups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.noClassesOnDate")}
            </p>
          ) : (
            <div className="space-y-6">
              {classGroups.map((group) => (
                <ClassGroupCard
                  key={group.scheduleId}
                  group={group}
                  sessionDate={sessionDate}
                />
              ))}
            </div>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.viewStudentClassesOnly")}
          </p>
        </>
      )}
    </div>
  );
}
