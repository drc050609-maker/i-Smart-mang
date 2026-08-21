"use client";

import { useLanguage } from "@/components/language-provider";

export function ScheduleMakeupLabel({
  isMakeup,
  className = "shrink-0 font-medium opacity-80",
}: {
  isMakeup: boolean | null | undefined;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!isMakeup) return null;

  return <span className={className}>{t("common.makeupLesson")}</span>;
}
