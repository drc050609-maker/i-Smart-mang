"use client";

import { useLanguage } from "@/components/language-provider";
import { isTrialLessonType } from "@/lib/schedule-calendar";

export function ScheduleTrialLabel({
  lessonType,
  className = "shrink-0 font-medium opacity-80",
}: {
  lessonType: string | null | undefined;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!isTrialLessonType(lessonType)) return null;

  return <span className={className}>{t("common.trialLabel")}</span>;
}
