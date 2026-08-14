import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";
import type { StaffLocation } from "@/lib/staff-location";

/** admin + manager = console staff; teacher = app login; front_desk = hours login */
export const STAFF_ROLES = ["admin", "manager", "teacher", "front_desk"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

const STAFF_ROLE_KEYS = {
  admin: "enum.staffRole.admin",
  manager: "enum.staffRole.manager",
  teacher: "enum.staffRole.teacher",
  front_desk: "enum.staffRole.frontDesk",
} as const;

export function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

export function isFrontDeskStaffRole(role: StaffRole) {
  return role === "front_desk";
}

export function isManagerStaffRole(role: StaffRole) {
  return role === "manager";
}

export function isTeacherAppRole(role: StaffRole) {
  return role === "teacher";
}

/** Can open My hours (front desk logins, admins, or any staff linked to a front desk profile). */
export function canAccessMyHours(
  role: StaffRole,
  teacherId: number | null | undefined,
) {
  return (
    role === "admin" ||
    isFrontDeskStaffRole(role) ||
    (teacherId != null && teacherId > 0)
  );
}

export function formatStaffRole(role: StaffRole, language: AppLanguage = "en") {
  return translate(language, STAFF_ROLE_KEYS[role]);
}

export function canCreateStaffRole(
  actorRole: StaffRole,
  targetRole: StaffRole,
): boolean {
  if (actorRole !== "admin") {
    return false;
  }

  return (
    targetRole === "admin" ||
    targetRole === "manager" ||
    targetRole === "teacher" ||
    targetRole === "front_desk"
  );
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

/** Paths front desk login accounts may open (plus nested routes). */
const FRONT_DESK_ALLOWED_PREFIXES = ["/my-hours", "/schedule", "/settings"];

export function frontDeskHomePath() {
  return "/my-hours";
}

export function canStaffAccessPath(role: StaffRole, pathname: string) {
  if (!isFrontDeskStaffRole(role)) {
    return true;
  }

  return FRONT_DESK_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
