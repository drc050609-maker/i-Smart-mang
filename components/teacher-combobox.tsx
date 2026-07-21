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
import { QuickAddTeacherDialog } from "@/components/quick-add-teacher-dialog";
import {
  filterTeachersByQuery,
  formatTeacherName,
  sortTeachers,
} from "@/lib/person-name";

export type TeacherOption = {
  id: number;
  first_name: string;
  last_name: string | null;
};

const inputClassName =
  "block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

function filterTeachers(teachers: TeacherOption[], query: string) {
  return filterTeachersByQuery(teachers, query);
}

export function TeacherCombobox({
  id,
  teachers,
  value,
  onChange,
  onTeacherAdded,
  onQuickAddOpenChange,
  inputName = "teacherId",
}: {
  id: string;
  teachers: TeacherOption[];
  value: TeacherOption | null;
  onChange: (teacher: TeacherOption | null) => void;
  onTeacherAdded?: (teacher: TeacherOption) => void;
  onQuickAddOpenChange?: (open: boolean) => void;
  inputName?: string;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const sortedTeachers = useMemo(() => sortTeachers(teachers), [teachers]);
  const filteredTeachers = useMemo(
    () => filterTeachers(sortedTeachers, query),
    [sortedTeachers, query],
  );

  const handleTeacherCreated = useCallback(
    (teacher: TeacherOption) => {
      onTeacherAdded?.(teacher);
      onChange(teacher);
      setQuery("");
    },
    [onChange, onTeacherAdded],
  );

  return (
    <>
      <input type="hidden" name={inputName} value={value?.id ?? ""} />

      <div className="space-y-2">
      <Combobox
        value={value}
        onChange={onChange}
        onClose={() => setQuery("")}
        nullable
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            className={inputClassName}
            displayValue={(teacher: TeacherOption | null) =>
              teacher ? formatTeacherName(teacher) : ""
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("common.searchTeachers")}
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
            {filteredTeachers.length === 0 ? (
              <div className="relative cursor-default px-3 py-2 text-gray-500 select-none dark:text-gray-400">
                {teachers.length === 0
                  ? t("common.noTutorsYet")
                  : t("common.noTutorsFound")}
              </div>
            ) : (
              filteredTeachers.map((teacher) => (
                <ComboboxOption
                  key={teacher.id}
                  value={teacher}
                  className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden dark:text-white"
                >
                  <span className="block truncate group-data-selected:font-semibold">
                    {formatTeacherName(teacher)}
                  </span>
                  <span className="absolute inset-y-0 right-0 hidden items-center pr-4 text-indigo-600 group-data-focus:text-white group-data-selected:flex">
                    <CheckIcon aria-hidden="true" className="size-5" />
                  </span>
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>

      <QuickAddTeacherDialog
        defaultFirstName={query.trim()}
        onCreated={handleTeacherCreated}
        onOpenChange={onQuickAddOpenChange}
      />
      </div>
    </>
  );
}
