"use client";

import { useLanguage } from "@/components/language-provider";
import {
  getLessonTypeOptions,
  type LessonType,
} from "@/lib/class-lesson-type";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

export function LessonTypeField({
  idPrefix,
  defaultValue = "private",
  exclude,
}: {
  idPrefix: string;
  defaultValue?: LessonType | null;
  exclude?: readonly LessonType[];
}) {
  const { language, t } = useLanguage();
  const options = getLessonTypeOptions(language).filter(
    (option) => !exclude?.includes(option.value),
  );
  const initial =
    defaultValue && !exclude?.includes(defaultValue) ? defaultValue : "private";

  return (
    <fieldset>
      <legend className={labelClassName}>{t("common.lessonType")}</legend>
      <div className="mt-3 space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`${idPrefix}-${option.value}`}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 px-3 py-3 dark:border-white/10"
          >
            <input
              id={`${idPrefix}-${option.value}`}
              name="lessonType"
              type="radio"
              value={option.value}
              defaultChecked={initial === option.value}
              required
              className="mt-0.5 size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
