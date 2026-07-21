import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";

export const STAFF_LOCATIONS = ["brooklyn", "staten_island"] as const;

export type StaffLocation = (typeof STAFF_LOCATIONS)[number];

export function isStaffLocation(value: string): value is StaffLocation {
  return STAFF_LOCATIONS.includes(value as StaffLocation);
}

export function formatStaffLocation(
  location: StaffLocation,
  language: AppLanguage = "en",
) {
  return translate(
    language,
    location === "brooklyn"
      ? "enum.staffLocation.brooklyn"
      : "enum.staffLocation.staten_island",
  );
}

export function formatStaffLocationLabel(
  location: StaffLocation,
  language: AppLanguage = "en",
) {
  return translate(
    language,
    location === "brooklyn"
      ? "enum.staffLocation.brooklynLabel"
      : "enum.staffLocation.statenIslandLabel",
  );
}
