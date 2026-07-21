"use client";

import { useLanguage } from "@/components/language-provider";

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
  entityLabel: string;
}) {
  const { t } = useLanguage();

  const tabs: { id: ActiveTab; label: string; count: number }[] = [
    { id: "active", label: t("common.active"), count: activeCount },
    { id: "inactive", label: t("common.inactive"), count: inactiveCount },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-white/10">
      <nav
        className="-mb-px flex gap-6"
        aria-label={`${entityLabel} ${t("common.status")}`}
      >
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isSelected ? "page" : undefined}
              className={`border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
