import type { Database } from "@/types/database.types";
import type { TranslationKey } from "@/lib/i18n";

export type StaffPosition = Database["public"]["Enums"]["staff_position"];

export const STAFF_POSITIONS = ["teacher", "front_desk"] as const satisfies readonly StaffPosition[];

export function isStaffPosition(value: string): value is StaffPosition {
  return (STAFF_POSITIONS as readonly string[]).includes(value);
}

export function staffPositionLabelKey(position: StaffPosition): TranslationKey {
  return position === "front_desk"
    ? "staffPosition.frontDesk"
    : "staffPosition.teacher";
}

export function isFrontDesk(position: StaffPosition | string | null | undefined) {
  return position === "front_desk";
}

/** Pay for a logged day: hours × rate_cents, rounded to nearest cent. */
export function frontDeskDayPayCents(hours: number, rateCents: number) {
  return Math.round(Number(hours) * rateCents);
}

/** Parse "HH:MM" or "HH:MM:SS" into total minutes from midnight (fractional seconds included). */
export function timeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }
  return hours * 60 + minutes + seconds / 60;
}

/** Whole minutes between clock-in and clock-out (same day). */
export function workedMinutesBetween(clockIn: string, clockOut: string) {
  const start = timeToMinutes(clockIn);
  const end = timeToMinutes(clockOut);
  if (start == null || end == null || end <= start) return null;
  return Math.round(end - start);
}

export function minutesToHoursDecimal(totalMinutes: number) {
  return Math.round((totalMinutes / 60) * 100) / 100;
}

export function formatWorkedDuration(totalMinutes: number) {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return { hours, minutes, totalMinutes: safe };
}

/** Display "HH:MM" from DB time strings. */
export function formatClockTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}
