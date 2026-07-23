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
  filterSubjectsByQuery,
  formatClassSubject,
} from "@/lib/class-subject";

const inputClassName =
  "block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

export function SubjectCombobox({
  id,
  subjects,
  value,
  onChange,
  required = false,
  name = "subject",
}: {
  id: string;
  subjects: string[];
  value: string;
  onChange: (subject: string) => void;
  required?: boolean;
  name?: string;
}) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");

  const filteredSubjects = useMemo(
    () => filterSubjectsByQuery(subjects, query),
    [subjects, query],
  );

  const trimmedQuery = query.trim();
  const queryAlreadyListed = subjects.some(
    (subject) => subject.toLowerCase() === trimmedQuery.toLowerCase(),
  );
  const showCustomOption = trimmedQuery.length > 0 && !queryAlreadyListed;

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />

      <Combobox
        value={value || null}
        onChange={(next) => {
          onChange(next ?? "");
          setQuery("");
        }}
        onClose={() => setQuery("")}
        nullable
      >
        <div className="relative">
          <ComboboxInput
            id={id}
            className={inputClassName}
            displayValue={(subject: string | null) =>
              subject ? formatClassSubject(subject, language) : ""
            }
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              onChange(next);
            }}
            placeholder={t("common.searchSubjects")}
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
            {filteredSubjects.length === 0 && !showCustomOption ? (
              <div className="relative cursor-default px-3 py-2 text-gray-500 select-none dark:text-gray-400">
                {t("common.noSubjectsFound")}
              </div>
            ) : (
              <>
                {showCustomOption ? (
                  <ComboboxOption
                    value={trimmedQuery}
                    className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden dark:text-white"
                  >
                    <span className="block truncate group-data-selected:font-semibold">
                      {t("common.useCustomSubject", { subject: trimmedQuery })}
                    </span>
                  </ComboboxOption>
                ) : null}
                {filteredSubjects.map((subject) => (
                  <ComboboxOption
                    key={subject}
                    value={subject}
                    className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden dark:text-white"
                  >
                    <span className="block truncate group-data-selected:font-semibold">
                      {formatClassSubject(subject, language)}
                    </span>
                    <span className="absolute inset-y-0 right-0 hidden items-center pr-4 text-indigo-600 group-data-focus:text-white group-data-selected:flex">
                      <CheckIcon aria-hidden="true" className="size-5" />
                    </span>
                  </ComboboxOption>
                ))}
              </>
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </>
  );
}
