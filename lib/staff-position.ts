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
