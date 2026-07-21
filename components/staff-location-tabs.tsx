"use client";

import { useLanguage } from "@/components/language-provider";
import {
  formatStaffLocation,
  type StaffLocation,
} from "@/lib/staff-location";

export function StaffLocationTabs({
  activeLocation,
  onChange,
  counts,
}: {
  activeLocation: StaffLocation;
  onChange: (location: StaffLocation) => void;
  counts: Record<StaffLocation, number>;
}) {
  const { language, t } = useLanguage();
  const tabs: StaffLocation[] = ["brooklyn", "staten_island"];

  return (
    <div className="border-b border-gray-200 dark:border-white/10">
      <nav className="-mb-px flex gap-6" aria-label={t("common.campus")}>
        {tabs.map((location) => {
          const isSelected = activeLocation === location;

          return (
            <button
              key={location}
              type="button"
              onClick={() => onChange(location)}
              aria-current={isSelected ? "page" : undefined}
              className={`border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-300"
              }`}
            >
              {formatStaffLocation(location, language)} iSmart
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                }`}
              >
                {counts[location]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
