"use client";

import { useMemo, useState } from "react";
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
  filterClassOptionsByQuery,
  formatClassOptionLabel,
  sortClassesBySubject,
  type ClassPickerOption,
} from "@/lib/class-list";

export type ClassOption = ClassPickerOption;

const inputClassName =
  "block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

export function ClassCombobox({
  id,
  classes,
  value,
  onChange,
  name = "classId",
  required = false,
  placeholder,
}: {
  id: string;
  classes: ClassOption[];
  value: ClassOption | null;
  onChange: (classRow: ClassOption | null) => void;
  /** Set to `null` to skip the hidden form field (controlled-only usage). */
  name?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const sortedClasses = useMemo(() => sortClassesBySubject(classes), [classes]);
  const filteredClasses = useMemo(
    () => filterClassOptionsByQuery(sortedClasses, query, language),
    [sortedClasses, query, language],
  );

  return (
    <>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={value?.id ?? ""}
          required={required}
        />
      ) : null}

      <Combobox
        value={value}
        by={(a, b) => a?.id === b?.id}
        onChange={onChange}
        onClose={() => setQuery("")}
        nullable
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            className={inputClassName}
            displayValue={(classRow: ClassOption | null) =>
              classRow ? formatClassOptionLabel(classRow, language) : ""
            }
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder ?? t("common.searchClasses")}
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
            {filteredClasses.length === 0 ? (
              <div className="relative cursor-default px-3 py-2 text-gray-500 select-none dark:text-gray-400">
                {classes.length === 0
                  ? t("common.noClassesAvailable")
                  : t("common.noClassesFound")}
              </div>
            ) : (
              filteredClasses.map((classRow) => (
                <ComboboxOption
                  key={classRow.id}
                  value={classRow}
                  className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden dark:text-white"
                >
                  <span className="block truncate group-data-selected:font-semibold">
                    {formatClassOptionLabel(classRow, language)}
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
    </>
  );
}
