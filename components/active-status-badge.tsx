"use client";

import { useLanguage } from "@/components/language-provider";

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useLanguage();

  return (
    <span
      className={
        isActive
          ? "text-green-700 dark:text-green-400"
          : "text-gray-500 dark:text-gray-400"
      }
    >
      {isActive ? t("common.active") : t("common.inactive")}
    </span>
  );
}
