import type { Database } from "@/types/database.types";
import type { TranslationKey } from "@/lib/i18n";

export type PhoneOwnerRole = Database["public"]["Enums"]["phone_owner_role"];

export const PHONE_OWNER_ROLES = [
  "self",
  "mother",
  "father",
  "grandmother",
  "grandfather",
  "guardian",
  "aunt",
  "uncle",
  "sibling",
  "other",
] as const satisfies readonly PhoneOwnerRole[];

export function isPhoneOwnerRole(value: string): value is PhoneOwnerRole {
  return (PHONE_OWNER_ROLES as readonly string[]).includes(value);
}

export function phoneOwnerRoleLabelKey(
  role: PhoneOwnerRole,
): TranslationKey {
  switch (role) {
    case "self":
      return "phoneOwner.self";
    case "mother":
      return "phoneOwner.mother";
    case "father":
      return "phoneOwner.father";
    case "grandmother":
      return "phoneOwner.grandmother";
    case "grandfather":
      return "phoneOwner.grandfather";
    case "guardian":
      return "phoneOwner.guardian";
    case "aunt":
      return "phoneOwner.aunt";
    case "uncle":
      return "phoneOwner.uncle";
    case "sibling":
      return "phoneOwner.sibling";
    case "other":
      return "phoneOwner.other";
  }
}
