"use client";

import { ActiveToggle } from "@/components/active-toggle";
import { useLanguage } from "@/components/language-provider";
import { updateLeadActive } from "@/app/(dashboard)/leads/actions";

export function LeadActiveToggle({
  leadId,
  isActive,
}: {
  leadId: number;
  isActive: boolean;
}) {
  const { t } = useLanguage();

  async function onToggle(nextActive: boolean) {
    const formData = new FormData();
    formData.set("leadId", String(leadId));
    formData.set("isActive", String(nextActive));
    return updateLeadActive(formData);
  }

  return (
    <ActiveToggle
      checked={isActive}
      label={t("common.active")}
      onToggle={onToggle}
      align="start"
    />
  );
}
