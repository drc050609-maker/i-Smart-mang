"use client";

import { ChevronDownIcon } from "@heroicons/react/20/solid";

import { useLanguage } from "@/components/language-provider";
import { durationSelectOptions } from "@/lib/class-duration";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const selectClassName = `${inputClassName} appearance-none pr-10`;

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

export function DurationMinutesField({
  id,
  name = "durationMinutes",
  value,
  onChange,
  required = false,
  label,
  help,
  allowEmpty = false,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  help?: string;
  allowEmpty?: boolean;
}) {
  const { t } = useLanguage();
  const current = value === "" ? null : Number(value);
  const options = durationSelectOptions(
    current != null && Number.isInteger(current) && current > 0 ? current : null,
  );

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label ?? t("common.duration")}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className={selectClassName}
        >
          {allowEmpty ? (
            <option value="">{t("common.typicalDurationOptional")}</option>
          ) : null}
          {options.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t("common.minutes", { count: minutes })}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
        />
      </div>
      {help ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{help}</p>
      ) : null}
    </div>
  );
}
