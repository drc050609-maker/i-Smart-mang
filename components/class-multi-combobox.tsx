"use client";

import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon, XMarkIcon } from "@heroicons/react/20/solid";

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

export function ClassMultiCombobox({
  id,
  classes,
  selected,
  onChange,
}: {
  id: string;
  classes: ClassOption[];
  selected: ClassOption[];
  onChange: (classes: ClassOption[]) => void;
}) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const selectedIds = useMemo(
    () => new Set(selected.map((classRow) => classRow.id)),
    [selected],
  );
  const sortedClasses = useMemo(() => sortClassesBySubject(classes), [classes]);
  const filteredClasses = useMemo(
    () => filterClassOptionsByQuery(sortedClasses, query, language),
    [sortedClasses, query, language],
  );

  function toggleClass(classRow: ClassOption) {
    if (selectedIds.has(classRow.id)) {
      onChange(selected.filter((item) => item.id !== classRow.id));
      return;
    }

    onChange([...selected, classRow]);
  }

  function removeClass(classId: number) {
    onChange(selected.filter((item) => item.id !== classId));
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((classRow) => (
            <li
              key={classRow.id}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pr-1 pl-3 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
            >
              <span>{formatClassOptionLabel(classRow, language)}</span>
              <button
                type="button"
                onClick={() => removeClass(classRow.id)}
                className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
              >
                <span className="sr-only">
                  {t("common.remove")} {formatClassOptionLabel(classRow, language)}
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
        onChange={(classRow: ClassOption | null) => {
          if (classRow) {
            toggleClass(classRow);
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
            placeholder={t("common.searchAndSelectClasses")}
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
              filteredClasses.map((classRow) => {
                const isSelected = selectedIds.has(classRow.id);

                return (
                  <ComboboxOption
                    key={classRow.id}
                    value={classRow}
                    className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden dark:text-white"
                  >
                    <span
                      className={`block truncate ${isSelected ? "font-semibold" : ""}`}
                    >
                      {formatClassOptionLabel(classRow, language)}
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
    </div>
  );
}
