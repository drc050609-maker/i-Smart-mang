"use client";

import { useLanguage } from "@/components/language-provider";
import {
  SelectChevron,
  selectFieldClassName,
} from "@/components/select-chevron";

export type ActiveTab = "active" | "inactive";

export function ActiveInactiveTabs({
  activeTab,
  onChange,
  activeCount,
  inactiveCount,
  entityLabel,
}: {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
  activeCount: number;
  inactiveCount: number;
  entityLabel?: string;
}) {
  const { t } = useLanguage();
  const safeLabel = entityLabel?.trim() || "status";
  const selectId = `${safeLabel.replace(/\s+/g, "-").toLowerCase()}-status-filter`;

  return (
    <div className="min-w-40 max-w-xs flex-1">
      <label
        htmlFor={selectId}
        className="block text-sm/6 font-medium text-gray-900 dark:text-white"
      >
        {t("common.status")}
      </label>
      <div className="relative mt-2">
        <select
          id={selectId}
          value={activeTab}
          onChange={(event) => onChange(event.target.value as ActiveTab)}
          aria-label={`${safeLabel} ${t("common.status")}`}
          className={selectFieldClassName}
        >
          <option value="active">
            {t("common.active")} ({activeCount})
          </option>
          <option value="inactive">
            {t("common.inactive")} ({inactiveCount})
          </option>
        </select>
        <SelectChevron />
      </div>
    </div>
  );
}
