"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";

import { useLanguage } from "@/components/language-provider";
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
  "block w-full rounded-md bg-white py-2 pr-10 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

export function StudentCombobox({
  id,
  students,
  selected,
  onChange,
}: {
  id: string;
  students: StudentOption[];
  selected: StudentOption | null;
  onChange: (student: StudentOption | null) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const sortedStudents = useMemo(() => sortStudents(students), [students]);
  const filteredStudents = useMemo(
    () => filterStudentsByQuery(sortedStudents, query),
    [sortedStudents, query],
  );

  const displayValue = useCallback(
    (student: StudentOption | null) =>
      student ? formatStudentName(student) : "",
    [],
  );

  return (
    <Combobox
      value={selected}
      by={(a, b) => a?.id === b?.id}
      onChange={onChange}
      onClose={() => setQuery("")}
      nullable
    >
      <div className="relative">
        <ComboboxInput
          id={id}
          className={inputClassName}
          displayValue={displayValue}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("common.searchStudents")}
          autoComplete="off"
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDownIcon
            aria-hidden="true"
            className="size-5 text-gray-400"
          />
        </ComboboxButton>

        <ComboboxOptions
          transition
          anchor="bottom start"
          className="z-20 mt-1 max-h-60 w-(--input-width) overflow-auto rounded-md bg-white py-1 text-base shadow-lg outline outline-black/5 transition duration-100 ease-in data-closed:data-leave:opacity-0 sm:text-sm dark:bg-gray-900 dark:outline-white/10"
        >
          {filteredStudents.length === 0 ? (
            <div className="relative cursor-default px-4 py-2 text-gray-500 select-none dark:text-gray-400">
              {t("common.noStudentsFound")}
            </div>
          ) : (
            filteredStudents.map((student) => (
              <ComboboxOption
                key={student.id}
                value={student}
                className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white dark:text-white dark:data-focus:bg-indigo-500"
              >
                <span className="block truncate group-data-selected:font-semibold">
                  {formatStudentName(student)}
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
