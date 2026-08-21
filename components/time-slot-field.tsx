"use client";

import { useEffect, useRef, useState } from "react";

import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import {
  currentLocalTimeParts,
  partsToTimeInputValue,
  timeInputToParts,
  type DayPeriod,
  type TimeSlotParts,
} from "@/lib/class-schedule";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

const clockInputClassName = `${inputClassName} text-center tabular-nums`;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function clampHour(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 1 || parsed > 12) return null;
  return parsed;
}

function clampMinute(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 59) return null;
  return parsed;
}

function partsFromValue(value: string | undefined): TimeSlotParts {
  return timeInputToParts(value) ?? currentLocalTimeParts();
}

function applyParts(parts: TimeSlotParts) {
  return {
    hourText: String(parts.hour12),
    minuteText: pad2(parts.minute),
    period: parts.period,
  };
}

export function TimeSlotField({
  id,
  name,
  value,
  defaultValue,
  onChange,
  required = false,
  label,
  language = "en",
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  label?: string;
  language?: AppLanguage;
  defaultToNow?: boolean;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const hourId = id;
  const minuteId = `${id}-minute`;
  const isControlled = value !== undefined;
  const [partsState, setPartsState] = useState(() =>
    applyParts(partsFromValue(isControlled ? value : defaultValue)),
  );
  const lastEmittedRef = useRef(
    isControlled ? (value || partsToTimeInputValue(partsFromValue(value))) : "",
  );

  const { hourText, minuteText, period } = partsState;
  const hour12 = clampHour(hourText);
  const minute = clampMinute(minuteText);
  const submittedValue =
    hour12 == null || minute == null
      ? ""
      : partsToTimeInputValue({ hour12, minute, period });

  useEffect(() => {
    if (!isControlled) {
      return;
    }

    if (value === lastEmittedRef.current) {
      return;
    }

    const next = timeInputToParts(value);
    if (!next) {
      return;
    }

    lastEmittedRef.current = value ?? "";
    setPartsState(applyParts(next));
  }, [isControlled, value]);

  function emit(nextHour: string, nextMinute: string, nextPeriod: DayPeriod) {
    const nextHour12 = clampHour(nextHour);
    const nextMinuteValue = clampMinute(nextMinute);
    if (nextHour12 == null || nextMinuteValue == null) {
      return;
    }
    const nextValue = partsToTimeInputValue({
      hour12: nextHour12,
      minute: nextMinuteValue,
      period: nextPeriod,
    });
    lastEmittedRef.current = nextValue;
    onChange?.(nextValue);
  }

  function commitHour() {
    if (hour12 == null) {
      const fallback =
        timeInputToParts(lastEmittedRef.current) ?? currentLocalTimeParts();
      setPartsState((current) => ({
        ...current,
        hourText: String(fallback.hour12),
      }));
      emit(String(fallback.hour12), minuteText, period);
      return;
    }
    setPartsState((current) => ({ ...current, hourText: String(hour12) }));
    emit(String(hour12), minuteText, period);
  }

  function commitMinute() {
    if (minute == null) {
      const fallback =
        timeInputToParts(lastEmittedRef.current) ?? currentLocalTimeParts();
      setPartsState((current) => ({
        ...current,
        minuteText: pad2(fallback.minute),
      }));
      emit(hourText, pad2(fallback.minute), period);
      return;
    }
    setPartsState((current) => ({ ...current, minuteText: pad2(minute) }));
    emit(hourText, pad2(minute), period);
  }

  function selectPeriod(next: DayPeriod) {
    setPartsState((current) => ({ ...current, period: next }));
    emit(hourText, minuteText, next);
  }

  return (
    <div>
      {label ? (
        <label htmlFor={hourId} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div className={label ? "mt-2" : undefined}>
        {name ? (
          <input type="hidden" name={name} value={submittedValue} />
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={hourId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={t("common.hourInput")}
            required={required}
            value={hourText}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "").slice(0, 2);
              setPartsState((current) => ({ ...current, hourText: next }));
              emit(next, minuteText, period);
            }}
            onBlur={commitHour}
            className={`${clockInputClassName} w-16`}
          />
          <span className="text-base font-medium text-gray-500 dark:text-gray-400">
            :
          </span>
          <input
            id={minuteId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={t("common.minuteInput")}
            required={required}
            value={minuteText}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "").slice(0, 2);
              setPartsState((current) => ({ ...current, minuteText: next }));
              emit(hourText, next, period);
            }}
            onBlur={commitMinute}
            className={`${clockInputClassName} w-16`}
          />
          <div
            className="inline-flex rounded-md shadow-xs inset-ring inset-ring-gray-300 dark:inset-ring-white/10"
            role="group"
            aria-label={t("common.amPm")}
          >
            {(["AM", "PM"] as const).map((option, index) => {
              const selected = period === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectPeriod(option)}
                  aria-pressed={selected}
                  className={classNames(
                    selected
                      ? "bg-indigo-600 text-white dark:bg-indigo-500"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20",
                    index === 0 && "rounded-l-md",
                    index === 1 && "rounded-r-md",
                    "px-3 py-1.5 text-sm font-semibold",
                  )}
                >
                  {option === "AM" ? t("common.am") : t("common.pm")}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
