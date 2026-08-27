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
import { StudentMultiCombobox } from "@/components/student-multi-combobox";
import { DurationMinutesField } from "@/components/duration-minutes-field";
import { TimeSlotField } from "@/components/time-slot-field";
import { DEFAULT_SLOT_DURATION_MINUTES } from "@/lib/class-duration";
import { formatLessonType, type LessonType } from "@/lib/class-lesson-type";
import { formatClassSubject } from "@/lib/class-subject";
import {
  currentLocalTimeInputValue,
  toTimeInputValue,
} from "@/lib/class-schedule";
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

const SCHEDULE_LESSON_TYPES = ["private", "group"] as const;

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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
  const [selectedClassId, setSelectedClassId] = useState<number | "new">("new");
  const [lessonType, setLessonType] = useState<Extract<LessonType, "private" | "group">>(
    "private",
  );
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [extraStudents, setExtraStudents] = useState<StudentOption[]>([]);
  const [subject, setSubject] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(
    String(DEFAULT_SLOT_DURATION_MINUTES),
  );
  const [isRecurring, setIsRecurring] = useState(true);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [teacherStudentIds, setTeacherStudentIds] = useState<number[]>([]);
  const [classes, setClasses] = useState<TeacherScheduleClassOption[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);
  const [state, formAction, pendingSubmit] = useActionState(
    addStudentToCalendar,
    initialState,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (!pending) {
      return;
    }

    setTeacherId(pending.teacherId ?? "");
    setSelectedClassId("new");
    setLessonType("private");
    setStudent(null);
    setSelectedStudents([]);
    setExtraStudents([]);
    setSubject("");
    setDurationMinutes(String(DEFAULT_SLOT_DURATION_MINUTES));
    setIsRecurring(true);
    setDate(pending.date);
    setStartTime(
      pending.startTime
        ? toTimeInputValue(pending.startTime)
        : currentLocalTimeInputValue(),
    );
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
      return;
    }

    let cancelled = false;
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
        const uniqueSubjects = [
          ...new Set(result.classes.map((row) => row.subject.trim()).filter(Boolean)),
        ];
        setSubject((current) => {
          if (current && uniqueSubjects.includes(current)) {
            return current;
          }
          if (uniqueSubjects.length === 1) {
            return uniqueSubjects[0]!;
          }
          return current;
        });
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

  const instrumentSubjects = useMemo(() => {
    const fromClasses = classes
      .map((row) => row.subject.trim())
      .filter(Boolean);
    return [...new Set([...fromClasses, ...subjects])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [classes, subjects]);

  function handleStudentAdded(created: StudentOption) {
    setExtraStudents((current) => {
      if (current.some((item) => item.id === created.id)) {
        return current;
      }
      return [...current, created];
    });
    if (lessonType === "private") {
      setStudent(created);
    }
  }

  function handleLessonTypeChange(next: Extract<LessonType, "private" | "group">) {
    setLessonType(next);
    if (next === "group" && student) {
      setSelectedStudents((current) =>
        current.some((item) => item.id === student.id)
          ? current
          : [student, ...current],
      );
      return;
    }
    if (next === "private" && !student && selectedStudents[0]) {
      setStudent(selectedStudents[0]);
    }
  }

  function handleClassChange(nextId: number | "new") {
    setSelectedClassId(nextId);
    if (nextId === "new") {
      return;
    }
    const selected = classes.find((row) => row.id === nextId);
    if (!selected) {
      return;
    }
    const nextLessonType =
      selected.lesson_type === "group" ? "group" : "private";
    handleLessonTypeChange(nextLessonType);
    if (selected.subject.trim()) {
      setSubject(selected.subject);
    }
    if (selected.duration_minutes && selected.duration_minutes > 0) {
      setDurationMinutes(String(selected.duration_minutes));
    }
  }

  if (!pending) {
    return null;
  }

  const selectedTeacher =
    teacherId === ""
      ? null
      : (sortedTeachers.find((teacher) => teacher.id === teacherId) ?? null);

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
              {lessonType === "group"
                ? t("common.addGroupClassToSchedule")
                : t("common.addClassTime")}
            </DialogTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedTeacher
                ? t("common.addClassTimeHelp")
                : t("common.selectTeacherToAddStudent")}
            </p>

            <form ref={formRef} action={formAction} className="mt-6 space-y-5">
              <input
                type="hidden"
                name="teacherId"
                value={teacherId === "" ? "" : teacherId}
              />
              {lessonType === "private" ? (
                <input type="hidden" name="studentId" value={student?.id ?? ""} />
              ) : (
                selectedStudents.map((item) => (
                  <input
                    key={item.id}
                    type="hidden"
                    name="studentIds"
                    value={item.id}
                  />
                ))
              )}
              <input
                type="hidden"
                name="classId"
                value={selectedClassId === "new" ? "new" : selectedClassId}
              />
              <input
                type="hidden"
                name="isRecurring"
                value={isRecurring ? "true" : "false"}
              />

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
                      setSelectedClassId("new");
                      setStudent(null);
                      setSelectedStudents([]);
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

              {teacherId !== "" && classes.length > 0 ? (
                <div>
                  <label htmlFor="addScheduleClass" className={labelClassName}>
                    {t("common.selectClass")}
                  </label>
                  <div className="relative mt-2">
                    <select
                      id="addScheduleClass"
                      value={
                        selectedClassId === "new" ? "new" : String(selectedClassId)
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        handleClassChange(
                          value === "new" ? "new" : Number(value),
                        );
                      }}
                      className={selectClassName}
                    >
                      <option value="new">{t("common.createNewClass")}</option>
                      {classes
                        .filter((row) => row.lesson_type !== "trial")
                        .map((row) => {
                          const typeLabel = formatLessonType(
                            row.lesson_type === "group" ||
                              row.lesson_type === "private" ||
                              row.lesson_type === "trial"
                              ? row.lesson_type
                              : "private",
                            language,
                          );
                          const durationLabel = row.duration_minutes
                            ? t("common.minutes", { count: row.duration_minutes })
                            : null;
                          return (
                            <option key={row.id} value={row.id}>
                              {[
                                formatClassSubject(row.subject, language),
                                typeLabel,
                                durationLabel,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </option>
                          );
                        })}
                    </select>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                </div>
              ) : null}

              <fieldset>
                <legend className={labelClassName}>{t("common.lessonType")}</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SCHEDULE_LESSON_TYPES.map((value) => (
                    <label
                      key={value}
                      className={classNames(
                        "flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold",
                        lessonType === value
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5",
                      )}
                    >
                      <input
                        type="radio"
                        name="lessonType"
                        value={value}
                        checked={lessonType === value}
                        onChange={() => handleLessonTypeChange(value)}
                        className="sr-only"
                      />
                      {t(
                        value === "group"
                          ? "enum.lessonType.group"
                          : "enum.lessonType.private",
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>

              {lessonType === "group" ? (
                <div>
                  <label htmlFor="addScheduleStudents" className={labelClassName}>
                    {t("common.students")}
                  </label>
                  <div className="mt-2">
                    <StudentMultiCombobox
                      id="addScheduleStudents"
                      students={availableStudents}
                      teacherStudents={teacherStudents}
                      selected={selectedStudents}
                      onChange={setSelectedStudents}
                      onStudentAdded={handleStudentAdded}
                      onQuickAddOpenChange={setQuickAddOpen}
                      disabled={teacherId === ""}
                    />
                  </div>
                  {selectedStudents.length === 0 ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t("common.selectAtLeastOneStudent")}
                    </p>
                  ) : null}
                </div>
              ) : (
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
              )}

              <div>
                <label htmlFor="addScheduleSubject" className={labelClassName}>
                  {t("common.instrument")}
                </label>
                <div className="mt-2">
                  <SubjectCombobox
                    id="addScheduleSubject"
                    subjects={instrumentSubjects}
                    value={subject}
                    onChange={setSubject}
                    required
                  />
                </div>
              </div>

              <DurationMinutesField
                id="addScheduleDuration"
                value={durationMinutes}
                onChange={setDurationMinutes}
                required
                help={t("common.lessonLengthHelp")}
              />

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
                <TimeSlotField
                  id="addScheduleStartTime"
                  name="startTime"
                  required
                  label={t("common.startTime")}
                  language={language}
                  value={startTime}
                  onChange={setStartTime}
                />
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
                    (lessonType === "group"
                      ? selectedStudents.length === 0
                      : student == null) ||
                    !subject.trim() ||
                    !durationMinutes
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
