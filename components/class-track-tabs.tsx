"use client";

import { useLanguage } from "@/components/language-provider";
import {
  CLASS_TRACK_OPTIONS,
  formatClassTrack,
  type ClassTrack,
} from "@/lib/class-track";

export type ClassTrackTab = ClassTrack | "all";

export function ClassTrackTabs({
  activeTrack,
  onChange,
  counts,
}: {
  activeTrack: ClassTrackTab;
  onChange: (track: ClassTrackTab) => void;
  counts: Record<ClassTrackTab, number>;
}) {
  const { language, t } = useLanguage();

  const tabs: { id: ClassTrackTab; label: string }[] = [
    { id: "all", label: t("common.allTracks") },
    ...CLASS_TRACK_OPTIONS.map((option) => ({
      id: option.value,
      label: formatClassTrack(option.value, language),
    })),
  ];

  return (
    <div className="border-b border-gray-200 dark:border-white/10">
      <nav
        className="-mb-px flex gap-4 overflow-x-auto"
        aria-label={t("common.classTracks")}
      >
        {tabs.map((tab) => {
          const isSelected = activeTrack === tab.id;
          const count = counts[tab.id] ?? 0;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isSelected ? "page" : undefined}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
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
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function filterClassesByTrack<T extends { class_track: string | null }>(
  classes: T[],
  track: ClassTrackTab,
) {
  if (track === "all") {
    return classes;
  }

  return classes.filter((classRow) => classRow.class_track === track);
}

export function countClassesByTrack(
  classes: { class_track: string | null }[],
): Record<ClassTrackTab, number> {
  const counts: Record<ClassTrackTab, number> = {
    all: classes.length,
    instrumental: 0,
    vocal: 0,
    composition: 0,
    dance: 0,
    music_education: 0,
    other: 0,
  };

  for (const classRow of classes) {
    const track = classRow.class_track;
    if (track && track in counts) {
      counts[track as ClassTrack] += 1;
    } else {
      counts.other += 1;
    }
  }

  return counts;
}
