"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  updateStaffLanguage,
  type ActionState,
} from "@/app/(dashboard)/settings/actions";
import { useLanguage } from "@/components/language-provider";
import { APP_LANGUAGES, type AppLanguage } from "@/lib/language";

const selectClassName =
  "block w-full max-w-xs rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const initialState: ActionState = {};

export function LanguageSettingsSection({
  preferredLanguage,
}: {
  preferredLanguage: AppLanguage;
}) {
  const { setLanguage, t } = useLanguage();
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] =
    useState<AppLanguage>(preferredLanguage);
  const [state, formAction, pending] = useActionState(
    updateStaffLanguage,
    initialState,
  );

  useEffect(() => {
    setSelectedLanguage(preferredLanguage);
  }, [preferredLanguage]);

  useEffect(() => {
    if (state.success) {
      setLanguage(selectedLanguage);
      router.refresh();
    }
  }, [state.success, selectedLanguage, setLanguage, router]);

  return (
    <section className="mt-8 rounded-lg border border-gray-200 p-4 dark:border-white/10">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t("settings.language")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("settings.languageDescription")}
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="preferred-language"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("settings.language")}
          </label>
          <select
            id="preferred-language"
            name="language"
            value={selectedLanguage}
            onChange={(event) =>
              setSelectedLanguage(event.target.value as AppLanguage)
            }
            className={`${selectClassName} mt-2`}
          >
            {APP_LANGUAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending || selectedLanguage === preferredLanguage}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {pending ? t("settings.savingLanguage") : t("settings.saveLanguage")}
        </button>
      </form>

      {state.error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {t("settings.languageSaved")}
        </p>
      ) : null}
    </section>
  );
}
