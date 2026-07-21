import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import type { Database } from "@/types/database.types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "enrolled",
  "closed",
];

export type LeadParent = {
  parent_first_name: string;
  parent_last_name: string | null;
};

export type LeadChild = {
  id: number;
  first_name: string;
  last_name: string | null;
  dob: string | null;
  background: string | null;
  experience: string | null;
  student_id?: number | null;
  converted_at?: string | null;
};

export function formatParentName(parent: LeadParent) {
  const last = parent.parent_last_name;
  return last
    ? `${parent.parent_first_name} ${last}`
    : parent.parent_first_name;
}

export function formatLeadChildName(child: Pick<LeadChild, "first_name" | "last_name">) {
  const last = child.last_name;
  return last ? `${child.first_name} ${last}` : child.first_name;
}

export function formatLeadStatus(status: LeadStatus, language: AppLanguage = "en") {
  return translate(language, `enum.leadStatus.${status}`);
}

export function formatLeadAddress(lead: {
  street_1: string | null;
  street_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}) {
  const lines: string[] = [];

  if (lead.street_1) {
    lines.push(
      lead.street_2 ? `${lead.street_1}, ${lead.street_2}` : lead.street_1,
    );
  }

  const cityLine = [lead.city, lead.state, lead.zip_code]
    .filter(Boolean)
    .join(", ");

  if (cityLine) {
    lines.push(cityLine);
  }

  return lines;
}

export function filterLeadsByQuery<
  T extends LeadParent & { phone_number: string; email?: string | null },
>(leads: T[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return leads;

  return leads.filter((lead) => {
    const haystack = [
      formatParentName(lead),
      lead.phone_number,
      lead.email ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function sortLeadsByParentName<
  T extends LeadParent & { created_at: string },
>(leads: T[]) {
  return [...leads].sort((a, b) => {
    const nameCompare = formatParentName(a).localeCompare(
      formatParentName(b),
      undefined,
      { sensitivity: "base" },
    );
    if (nameCompare !== 0) return nameCompare;
    return b.created_at.localeCompare(a.created_at);
  });
}
