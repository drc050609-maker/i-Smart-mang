import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import type { StaffLocation } from "@/lib/staff-location";

export const STAFF_ROLES = ["admin", "manager"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

export function formatStaffRole(role: StaffRole, language: AppLanguage = "en") {
  return translate(
    language,
    role === "admin" ? "enum.staffRole.admin" : "enum.staffRole.manager",
  );
}

export function canCreateStaffRole(
  actorRole: StaffRole,
  targetRole: StaffRole,
): boolean {
  if (actorRole !== "admin") {
    return false;
  }

  return targetRole === "admin" || targetRole === "manager";
}

export function canCreateStaffAtLocation(
  actorRole: StaffRole,
  targetRole: StaffRole,
  location: StaffLocation,
): boolean {
  if (!canCreateStaffRole(actorRole, targetRole)) {
    return false;
  }

  if (targetRole === "admin" && location !== "brooklyn") {
    return false;
  }

  return true;
}
