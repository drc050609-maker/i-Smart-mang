"use client";

import { Switch } from "@headlessui/react";
import { useEffect, useState, useTransition } from "react";

import { useLanguage } from "@/components/language-provider";

export function ActiveToggle({
  checked,
  disabled,
  label,
  onToggle,
  align = "end",
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: (nextActive: boolean) => Promise<{ error?: string }>;
  align?: "start" | "end";
}) {
  const [isActive, setIsActive] = useState(checked);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useLanguage();

  useEffect(() => {
    setIsActive(checked);
  }, [checked]);

  function handleChange(nextActive: boolean) {
    const previous = isActive;
    setIsActive(nextActive);
    setError(null);

    startTransition(async () => {
      const result = await onToggle(nextActive);
      if (result.error) {
        setIsActive(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div
      className={`flex flex-col gap-1 ${align === "start" ? "items-start" : "items-end"}`}
    >
      <Switch
        checked={isActive}
        onChange={handleChange}
        disabled={disabled || pending}
        className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 data-checked:bg-indigo-600 dark:bg-white/10 dark:data-checked:bg-indigo-500"
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out group-data-checked:translate-x-5"
        />
      </Switch>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {pending
          ? t("common.saving")
          : isActive
            ? t("common.active")
            : t("common.inactive")}
      </span>
      {error ? (
        <span
          className={`max-w-48 text-xs text-red-600 dark:text-red-400 ${align === "start" ? "text-left" : "text-right"}`}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
