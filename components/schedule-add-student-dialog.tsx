"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

import {
  addStudentToCalendar,
  fetchTeacherScheduleOptionsAction,
  type ScheduleActionState,
  type TeacherScheduleClassOption,
} from "@/app/(dashboard)/schedule/actions";
import { useLanguage } from "@/components/language-provider";
import { QuickAddStudentDialog } from "@/components/quick-add-student-dialog";
import { SubjectCombobox } from "@/components/subject-combobox";
import type { StudentOption } from "@/components/student-combobox";
import { formatTime12Hour } from "@/lib/class-schedule";
import { formatClassSubject } from "@/lib/class-subject";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import type { AppLanguage } from "@/lib/language";
import {
  filterStudentsByQuery,
  formatStudentName,
  formatTeacherName,
  sortStudents,
  sortTeachers,
} from "@/lib/person-name";
import type { ScheduleStudent, ScheduleTeacher } from "@/lib/schedule-calendar";

export type PendingAddStudent = {
  teacherId: number | null;
  date: string;
  startTime: string;
};

const initialState: ScheduleActionState = {};

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

function toTimeInputValue(time: string) {
  return time.slice(0, 5);
}

function formatClassOptionLabel(
  option: TeacherScheduleClassOption,
  language: AppLanguage,
  t: ReturnType<typeof useLanguage>["t"],
) {
  const subject = formatClassSubject(option.subject, language);
  const duration =
    option.duration_minutes && option.duration_minutes > 0
      ? t("common.minutes", { count: option.duration_minutes })
      : null;
  const lessonType = formatLessonType(
    option.lesson_type as LessonType | null,
    language,
  );
  return [subject, duration, lessonType].filter(Boolean).join(" · ");
}

export function ScheduleAddStudentDialog({
  pending,
  teachers,
  students,
  onClose,
  onSuccess,
}: {
  pending: PendingAddStudent | null;
  teachers: ScheduleTeacher[];
  students: ScheduleStudent[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const sortedTeachers = useMemo(() => sortTeachers(teachers), [teachers]);
  const [teacherId, setTeacherId] = useState<number | "">("");
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [extraStudents, setExtraStudents] = useState<StudentOption[]>([]);
  const [classId, setClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [isRecurring, setIsRecurring] = useState(true);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [teacherStudentIds, setTeacherStudentIds] = useState<number[]>([]);
  const [classes, setClasses] = useState<TeacherScheduleClassOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);
  const [state, formAction, pendingSubmit] = useActionState(
    addStudentToCalendar,
    initialState,
  );

  onCloseRef.current = onClose;
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!pending) {
      return;
    }

    setTeacherId(pending.teacherId ?? "");
    setStudent(null);
    setExtraStudents([]);
    setClassId("");
    setSubject("");
    setDurationMinutes("45");
    setIsRecurring(true);
    setDate(pending.date);
    setStartTime(toTimeInputValue(pending.startTime));
    setTeacherStudentIds([]);
    setClasses([]);
    setSubjects([]);
    setOptionsError(null);
    setError(null);
  }, [pending]);

  useEffect(() => {
    if (!pending || teacherId === "") {
      setTeacherStudentIds([]);
      setClasses([]);
      setSubjects([]);
      setLoadingOptions(false);
      return;
    }

    let cancelled = false;
    setLoadingOptions(true);
    setOptionsError(null);

    void fetchTeacherScheduleOptionsAction(teacherId)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.error) {
          setOptionsError(result.error);
          setClasses([]);
          setTeacherStudentIds([]);
          setSubjects([]);
          return;
        }

        setClasses(result.classes);
        setTeacherStudentIds(result.teacherStudentIds);
        setSubjects(result.subjects);
        setClassId((current) => {
          if (current && current !== "new") {
            if (result.classes.some((row) => String(row.id) === current)) {
              return current;
            }
          }
          if (result.classes.length === 1) {
            return String(result.classes[0]!.id);
          }
          if (result.classes.length === 0) {
            return "new";
          }
          return "";
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pending, teacherId]);

  useEffect(() => {
    if (state.error) {
      setError(state.error);
    }

    if (state.success) {
      onSuccessRef.current();
      router.refresh();
      onCloseRef.current();
    }
  }, [state.error, state.success, router]);

  const availableStudents = useMemo(() => {
    const byId = new Map<number, StudentOption>();
    for (const item of students) {
      byId.set(item.id, {
        id: item.id,
        "first name": item["first name"],
        "last name": item["last name"],
      });
    }
    for (const item of extraStudents) {
      byId.set(item.id, item);
    }
    return [...byId.values()];
  }, [students, extraStudents]);

  const teacherStudents = useMemo(() => {
    const idSet = new Set(teacherStudentIds);
    return sortStudents(
      availableStudents.filter((item) => idSet.has(item.id)),
    );
  }, [availableStudents, teacherStudentIds]);

  const selectedClass = classes.find((row) => String(row.id) === classId) ?? null;
  const creatingNewClass = classId === "new" || (classId === "" && classes.length === 0);

  function handleStudentAdded(created: StudentOption) {
    setExtraStudents((current) => {
      if (current.some((item) => item.id === created.id)) {
        return current;
      }
      return [...current, created];
    });
    setStudent(created);
  }

  if (!pending) {
    return null;
  }

  const selectedTeacher =
    teacherId === ""
      ? null
      : (sortedTeachers.find((teacher) => teacher.id === teacherId) ?? null);
  const timePreview = startTime ? formatTime12Hour(`${startTime}:00`) : "";

  return (
    <Dialog
      open
      onClose={() => {
        if (!pendingSubmit && !quickAddOpen) {
          onClose();
        }
      }}
      className="relative z-50"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-900/50" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
          <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10">
            <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-gray-300"
              >
                <span className="sr-only">{t("common.close")}</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>

            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("common.addStudentToSchedule")}
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedTeacher
                ? t("common.addStudentToScheduleHelp", {
                    name: formatTeacherName(selectedTeacher),
                  })
                : t("common.selectTeacherToAddStudent")}
            </p>

            <form ref={formRef} action={formAction} className="mt-6 space-y-5">
              <input
                type="hidden"
                name="teacherId"
                value={teacherId === "" ? "" : teacherId}
              />
              <input type="hidden" name="studentId" value={student?.id ?? ""} />
              <input
                type="hidden"
                name="isRecurring"
                value={isRecurring ? "true" : "false"}
              />
              {selectedClass && !creatingNewClass ? (
                <input
                  type="hidden"
                  name="durationMinutes"
                  value={selectedClass.duration_minutes ?? durationMinutes}
                />
              ) : null}

              <div>
                <label htmlFor="addScheduleTeacher" className={labelClassName}>
                  {t("common.teacher")}
                </label>
                <div className="relative mt-2">
                  <select
                    id="addScheduleTeacher"
                    value={teacherId === "" ? "" : String(teacherId)}
                    onChange={(event) => {
                      const value = event.target.value;
                      setTeacherId(value === "" ? "" : Number(value));
                      setStudent(null);
                      setClassId("");
                      setSubject("");
                    }}
                    required
                    className={selectClassName}
                  >
                    <option value="">{t("common.selectTeacherFirst")}</option>
                    {sortedTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {formatTeacherName(teacher)}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="addScheduleStudent" className={labelClassName}>
                  {t("common.student")}
                </label>
                <div className="mt-2">
                  <ScheduleStudentPicker
                    id="addScheduleStudent"
                    students={availableStudents}
                    teacherStudents={teacherStudents}
                    selected={student}
                    onChange={setStudent}
                    disabled={teacherId === ""}
                  />
                </div>
                <div className="mt-2">
                  <QuickAddStudentDialog
                    onCreated={handleStudentAdded}
                    onOpenChange={setQuickAddOpen}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="addScheduleClass" className={labelClassName}>
                  {t("common.class")}
                </label>
                <div className="relative mt-2">
                  <select
                    id="addScheduleClass"
                    name="classId"
                    value={
                      creatingNewClass && classes.length === 0 && classId === ""
                        ? "new"
                        : classId
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      setClassId(value);
                      if (value !== "new") {
                        const match = classes.find((row) => String(row.id) === value);
                        if (match?.duration_minutes) {
                          setDurationMinutes(String(match.duration_minutes));
                        }
                        if (match) {
                          setSubject(match.subject);
                        }
                      }
                    }}
                    required
                    disabled={teacherId === "" || loadingOptions}
                    className={selectClassName}
                  >
                    {classes.length === 0 ? (
                      <option value="new">{t("common.createNewClass")}</option>
                    ) : (
                      <>
                        <option value="">{t("common.selectClassFirst")}</option>
                        {classes.map((option) => (
                          <option key={option.id} value={option.id}>
                            {formatClassOptionLabel(option, language, t)}
                          </option>
                        ))}
                        <option value="new">{t("common.createNewClass")}</option>
                      </>
                    )}
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>

              {creatingNewClass ? (
                <>
                  <div>
                    <label htmlFor="addScheduleSubject" className={labelClassName}>
                      {t("common.subject")}
                    </label>
                    <div className="mt-2">
                      <SubjectCombobox
                        id="addScheduleSubject"
                        subjects={subjects}
                        value={subject}
                        onChange={setSubject}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="addScheduleDuration" className={labelClassName}>
                      {t("common.duration")}
                    </label>
                    <div className="mt-2">
                      <input
                        id="addScheduleDuration"
                        name="durationMinutes"
                        type="number"
                        min={1}
                        step={1}
                        value={durationMinutes}
                        onChange={(event) => setDurationMinutes(event.target.value)}
                        required
                        className={inputClassName}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="addScheduleDate" className={labelClassName}>
                    {t("common.date")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="addScheduleDate"
                      name="scheduleDate"
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      required
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="addScheduleStartTime" className={labelClassName}>
                    {t("common.startTime")}
                  </label>
                  <div className="mt-2">
                    <input
                      id="addScheduleStartTime"
                      name="startTime"
                      type="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      required
                      className={inputClassName}
                    />
                  </div>
                  {timePreview ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {timePreview}
                    </p>
                  ) : null}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(event) => setIsRecurring(event.target.checked)}
                  className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                {t("common.repeatsWeekly")}
              </label>

              {optionsError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{optionsError}</p>
              ) : null}
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={pendingSubmit}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 disabled:opacity-60 dark:bg-white/10 dark:text-white"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={
                    pendingSubmit ||
                    teacherId === "" ||
                    student == null ||
                    (!creatingNewClass && classId === "")
                  }
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                  {pendingSubmit ? t("common.adding") : t("common.addToSchedule")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

function ScheduleStudentPicker({
  id,
  students,
  teacherStudents,
  selected,
  onChange,
  disabled,
}: {
  id: string;
  students: StudentOption[];
  teacherStudents: StudentOption[];
  selected: StudentOption | null;
  onChange: (student: StudentOption | null) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const sortedAll = useMemo(() => sortStudents(students), [students]);
  const trimmedQuery = query.trim();
  const list = useMemo(() => {
    if (trimmedQuery) {
      return filterStudentsByQuery(sortedAll, trimmedQuery);
    }
    if (teacherStudents.length > 0) {
      return teacherStudents;
    }
    return sortedAll;
  }, [trimmedQuery, sortedAll, teacherStudents]);

  return (
    <Combobox
      value={selected}
      by={(a, b) => a?.id === b?.id}
      onChange={onChange}
      onClose={() => setQuery("")}
      disabled={disabled}
      nullable
    >
      <div className="relative">
        <ComboboxInput
          id={id}
          className={inputClassName}
          displayValue={(item: StudentOption | null) =>
            item ? formatStudentName(item) : ""
          }
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            teacherStudents.length > 0
              ? t("common.searchTeacherStudents")
              : t("common.searchStudents")
          }
          autoComplete="off"
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon className="size-5 text-gray-400" />
        </ComboboxButton>
        <ComboboxOptions
          transition
          anchor="bottom start"
          className="z-20 mt-1 max-h-60 w-(--input-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline outline-black/5 sm:text-sm dark:bg-gray-900 dark:outline-white/10"
        >
          {!trimmedQuery && teacherStudents.length > 0 ? (
            <div className="px-3 py-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {t("common.teacherStudents")}
            </div>
          ) : null}
          {list.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
              {t("common.noStudentsFound")}
            </div>
          ) : (
            list.map((item) => (
              <ComboboxOption
                key={item.id}
                value={item}
                className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white dark:text-white"
              >
                <span className="block truncate group-data-selected:font-semibold">
                  {formatStudentName(item)}
                </span>
                <span className="absolute inset-y-0 right-0 hidden items-center pr-4 text-indigo-600 group-data-focus:text-white group-data-selected:flex dark:text-indigo-400">
                  <CheckIcon aria-hidden="true" className="size-5" />
                </span>
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
