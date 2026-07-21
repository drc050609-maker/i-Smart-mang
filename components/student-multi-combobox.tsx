"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/20/solid";

import { useLanguage } from "@/components/language-provider";
import { QuickAddStudentDialog } from "@/components/quick-add-student-dialog";
import {
  filterStudentsByQuery,
  formatStudentName,
  sortStudents,
} from "@/lib/person-name";

export type StudentOption = {
  id: number;
  "first name": string;
  "last name": string | null;
};

const inputClassName =
  "block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

export function formatStudentOptionName(student: StudentOption) {
  return formatStudentName(student);
}

function filterStudents(students: StudentOption[], query: string) {
  return filterStudentsByQuery(students, query);
}

export function StudentMultiCombobox({
  id,
  students,
  selected,
  onChange,
  onStudentAdded,
  onQuickAddOpenChange,
}: {
  id: string;
  students: StudentOption[];
  selected: StudentOption[];
  onChange: (students: StudentOption[]) => void;
  onStudentAdded?: (student: StudentOption) => void;
  onQuickAddOpenChange?: (open: boolean) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const selectedIds = useMemo(
    () => new Set(selected.map((student) => student.id)),
    [selected],
  );
  const sortedStudents = useMemo(() => sortStudents(students), [students]);
  const filteredStudents = useMemo(
    () => filterStudents(sortedStudents, query),
    [sortedStudents, query],
  );

  const handleStudentCreated = useCallback(
    (student: StudentOption) => {
      onStudentAdded?.(student);
      if (!selectedIds.has(student.id)) {
        onChange([...selected, student]);
      }
      setQuery("");
    },
    [onChange, onStudentAdded, selected, selectedIds],
  );

  function toggleStudent(student: StudentOption) {
    if (selectedIds.has(student.id)) {
      onChange(selected.filter((item) => item.id !== student.id));
      return;
    }

    onChange([...selected, student]);
  }

  function removeStudent(studentId: number) {
    onChange(selected.filter((item) => item.id !== studentId));
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((student) => (
            <li
              key={student.id}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pr-1 pl-3 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
            >
              <span>{formatStudentOptionName(student)}</span>
              <button
                type="button"
                onClick={() => removeStudent(student.id)}
                className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
              >
                <span className="sr-only">
                  {t("common.remove")} {formatStudentOptionName(student)}
                </span>
                <XMarkIcon aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Combobox
        as="div"
        value={null}
        onChange={(student: StudentOption | null) => {
          if (student) {
            toggleStudent(student);
          }
        }}
        onClose={() => setQuery("")}
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            className={inputClassName}
            displayValue={() => query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("common.searchAndSelectStudents")}
            autoComplete="off"
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-hidden">
            <ChevronDownIcon
              aria-hidden="true"
              className="size-5 text-gray-400 dark:text-gray-500"
            />
          </ComboboxButton>

          <ComboboxOptions
            transition
            anchor="bottom start"
            className="z-20 mt-1 max-h-60 w-(--input-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline outline-black/5 transition duration-100 ease-in data-closed:data-leave:opacity-0 sm:text-sm dark:bg-gray-800 dark:outline-white/10"
          >
            {filteredStudents.length === 0 ? (
              <div className="relative cursor-default px-3 py-2 text-gray-500 select-none dark:text-gray-400">
                {students.length === 0
                  ? t("common.noStudentsYet")
                  : t("common.noStudentsFound")}
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedIds.has(student.id);

                return (
                  <ComboboxOption
                    key={student.id}
                    value={student}
                    className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden dark:text-white"
                  >
                    <span
                      className={`block truncate ${isSelected ? "font-semibold" : ""}`}
                    >
                      {formatStudentOptionName(student)}
                    </span>
                    {isSelected ? (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 group-data-focus:text-white">
                        <CheckIcon aria-hidden="true" className="size-5" />
                      </span>
                    ) : null}
                  </ComboboxOption>
                );
              })
            )}
          </ComboboxOptions>
        </div>
      </Combobox>

      <div className="mt-2">
        <QuickAddStudentDialog
          defaultFirstName={query.trim()}
          onCreated={handleStudentCreated}
          onOpenChange={onQuickAddOpenChange}
        />
      </div>
    </div>
  );
}
