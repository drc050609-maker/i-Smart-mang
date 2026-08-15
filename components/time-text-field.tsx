"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import {
  formatTime12Hour,
  formatTimeInputDisplay,
  parseTypedTime,
} from "@/lib/class-schedule";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

export function TimeTextField({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required = false,
  label,
  help,
  showPreview = true,
}: {
  id?: string;
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  label?: string;
  help?: string;
  showPreview?: boolean;
}) {
  const { t } = useLanguage();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(() => {
    const initial = defaultValue ?? "";
    return formatTimeInputDisplay(initial) || initial;
  });
  const displayValue = isControlled ? value : uncontrolledValue;
  const parsed = parseTypedTime(displayValue);
  const preview = parsed ? formatTime12Hour(parsed) : "";
  const trimmed = displayValue.trim();
  const isInvalid = trimmed !== "" && !parsed;
  const helpText = help === undefined ? t("common.timeHelp") : help;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (isInvalid) {
      input.setCustomValidity(t("common.timeInvalid"));
      return;
    }

    input.setCustomValidity("");
  }, [isInvalid, t]);

  function handleChange(next: string) {
    if (!isControlled) {
      setUncontrolledValue(next);
    }
    onChange?.(next);
  }

  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div className={label ? "mt-2" : undefined}>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={displayValue}
          onChange={(event) => handleChange(event.target.value)}
          required={required}
          placeholder={t("common.timePlaceholder")}
          aria-invalid={isInvalid || undefined}
          className={inputClassName}
        />
      </div>
      {isInvalid ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {t("common.timeInvalid")}
        </p>
      ) : showPreview && preview ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{preview}</p>
      ) : null}
      {helpText ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
      ) : null}
    </div>
  );
}
