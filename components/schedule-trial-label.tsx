"use client";

import { useLanguage } from "@/components/language-provider";
import { formatTrialFormat } from "@/lib/class-lesson-type";
import { isTrialLessonType } from "@/lib/schedule-calendar";

export function ScheduleTrialLabel({
  lessonType,
  trialFormat,
  className = "shrink-0 font-medium opacity-80",
}: {
  lessonType: string | null | undefined;
  trialFormat?: string | null;
  className?: string;
}) {
  const { t, language } = useLanguage();
  if (!isTrialLessonType(lessonType)) return null;

  const formatLabel = formatTrialFormat(trialFormat, language);

  return (
    <span className={className}>
      {formatLabel
        ? `${t("common.trialLabel")} · ${formatLabel}`
        : t("common.trialLabel")}
    </span>
  );
}
