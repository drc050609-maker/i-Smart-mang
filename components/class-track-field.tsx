"use client";

import { useLanguage } from "@/components/language-provider";
import { getClassTrackOptions, type ClassTrack } from "@/lib/class-track";

const labelClassName =
  "block text-sm/6 font-medium text-gray-900 dark:text-white";

export function ClassTrackField({
  idPrefix,
  defaultValue = "instrumental",
}: {
  idPrefix: string;
  defaultValue?: ClassTrack | null;
}) {
  const { language, t } = useLanguage();
  const options = getClassTrackOptions(language);

  return (
    <fieldset>
      <legend className={labelClassName}>{t("common.classTrackLabel")}</legend>
      <div className="mt-3 space-y-3">
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={`${idPrefix}-${option.value}`}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 px-3 py-3 dark:border-white/10"
          >
            <input
              id={`${idPrefix}-${option.value}`}
              name="classTrack"
              type="radio"
              value={option.value}
              defaultChecked={(defaultValue ?? "instrumental") === option.value}
              required
              className="mt-0.5 size-4 border-gray-300 text-indigo-600 focus:ring-indigo-600 dark:border-white/20 dark:bg-white/5"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">
                {option.label}
              </span>
              {option.description ? (
                <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
