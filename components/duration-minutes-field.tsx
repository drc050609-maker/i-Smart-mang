"use client";

import { useLanguage } from "@/components/language-provider";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

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

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label ?? t("common.duration")}
      </label>
      <div className="mt-2">
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={
            allowEmpty
              ? t("common.typicalDurationOptional")
              : t("common.durationMinutesPlaceholder")
          }
          className={inputClassName}
        />
      </div>
      {help ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{help}</p>
      ) : null}
    </div>
  );
}
