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
import { classSubjectKey } from "@/lib/class-list";
import { formatClassSubject } from "@/lib/class-subject";
import {
  asPaymentLessonType,
  formatPaymentClassType,
  paymentClassSubjects,
  paymentClassTimeOptions,
  paymentClassTypesForSubject,
  resolvePaymentClass,
  type PaymentClassPickerValue,
  type PaymentPickerClass,
} from "@/lib/payment-class-picker";

const inputClassName =
  "block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 dark:disabled:bg-white/5 dark:disabled:text-gray-500";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

type FieldOption = {
  value: string;
  label: string;
};

function OptionCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  emptyMessage,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: FieldOption[];
  placeholder: string;
  disabled?: boolean;
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value) ?? null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  return (
    <Combobox
      value={selected}
      by={(a, b) => a?.value === b?.value}
      onChange={(option) => onChange(option?.value ?? "")}
      onClose={() => setQuery("")}
      disabled={disabled}
      nullable
    >
      <div className="relative">
        <ComboboxInput
          id={id}
          className={inputClassName}
          displayValue={(option: FieldOption | null) => option?.label ?? ""}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
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
          {filtered.length === 0 ? (
            <div className="relative cursor-default px-3 py-2 text-gray-500 select-none dark:text-gray-400">
              {emptyMessage}
            </div>
          ) : (
            filtered.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option}
                className="group relative cursor-default py-2 pr-9 pl-3 text-gray-900 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden dark:text-white"
              >
                <span className="block truncate group-data-selected:font-semibold">
                  {option.label}
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
  );
}

export function PaymentClassFields({
  idPrefix,
  classes,
  value,
  onChange,
}: {
  idPrefix: string;
  classes: PaymentPickerClass[];
  value: PaymentClassPickerValue;
  onChange: (next: PaymentClassPickerValue) => void;
}) {
  const { language, t } = useLanguage();

  const subjects = useMemo(
    () => paymentClassSubjects(classes),
    [classes],
  );
  const selectedSubject =
    subjects.find(
      (subject) => classSubjectKey(subject) === classSubjectKey(value.subject),
    ) ?? value.subject;
  const subjectOptions = useMemo(
    () =>
      subjects.map((subject) => ({
        value: subject,
        label: formatClassSubject(subject, language),
      })),
    [language, subjects],
  );

  const typeOptions = useMemo(() => {
    if (!value.subject) return [];
    return paymentClassTypesForSubject(classes, value.subject).map(
      (lessonType) => ({
        value: lessonType,
        label: formatPaymentClassType(lessonType, language),
      }),
    );
  }, [classes, language, value.subject]);

  const timeOptions = useMemo(() => {
    if (!value.subject || value.lessonType === "") return [];
    return paymentClassTimeOptions(
      classes,
      value.subject,
      value.lessonType,
      language,
    ).map((option) => ({
      value: option.key,
      label: option.label,
    }));
  }, [classes, language, value.lessonType, value.subject]);

  function handleSubjectChange(subject: string) {
    onChange({ subject, lessonType: "", timeKey: "" });
  }

  function handleTypeChange(nextType: string) {
    const lessonType = asPaymentLessonType(nextType) ?? "";
    onChange({
      subject: value.subject,
      lessonType,
      timeKey: "",
    });
  }

  function handleTimeChange(timeKey: string) {
    onChange({
      subject: value.subject,
      lessonType: value.lessonType,
      timeKey,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-subject`} className={labelClassName}>
          {t("common.subject")}
        </label>
        <div className="mt-2">
          <OptionCombobox
            id={`${idPrefix}-subject`}
            value={selectedSubject}
            onChange={handleSubjectChange}
            options={subjectOptions}
            placeholder={t("common.selectSubject")}
            emptyMessage={
              subjects.length === 0
                ? t("common.noClassesAvailable")
                : t("common.noSubjectsFound")
            }
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-type`} className={labelClassName}>
          {t("common.type")}
        </label>
        <div className="mt-2">
          <OptionCombobox
            id={`${idPrefix}-type`}
            value={value.lessonType}
            onChange={handleTypeChange}
            options={typeOptions}
            placeholder={t("common.selectType")}
            disabled={!value.subject}
            emptyMessage={
              value.subject
                ? t("common.noClassTypesAvailable")
                : t("common.selectSubjectFirst")
            }
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-time`} className={labelClassName}>
          {t("common.time")}
        </label>
        <div className="mt-2">
          <OptionCombobox
            id={`${idPrefix}-time`}
            value={value.timeKey}
            onChange={handleTimeChange}
            options={timeOptions}
            placeholder={t("common.selectTime")}
            disabled={!value.subject || value.lessonType === ""}
            emptyMessage={
              value.lessonType
                ? t("common.noClassTimesAvailable")
                : t("common.selectTypeFirst")
            }
          />
        </div>
      </div>
    </div>
  );
}

export function resolvedPaymentClassFromPicker<T extends PaymentPickerClass>(
  classes: T[],
  value: PaymentClassPickerValue,
) {
  if (!value.subject || value.lessonType === "" || !value.timeKey) {
    return null;
  }
  return resolvePaymentClass(classes, value.timeKey);
}
