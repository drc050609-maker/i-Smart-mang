import { cookies } from "next/headers";

import type { StaffAccount } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isStaffLocation,
  type StaffLocation,
} from "@/lib/staff-location";
import type { Database } from "@/types/database.types";

export type CampusLocation = {
  id: number;
  slug: string;
  name: string;
};

type DbClient = SupabaseClient<Database>;

export const ACTIVE_CAMPUS_COOKIE = "ismart_active_campus";

export function formatCampusLocationName(
  location: CampusLocation | null | undefined,
) {
  return location?.name ?? "—";
}

export function parseLocationId(value: FormDataEntryValue | null) {
  if (!value || value.toString().trim() === "") {
    return null;
  }

  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return undefined;
  }

  return id;
}

/** Map staff campus enum → locations.slug */
export function staffLocationToSlug(location: StaffLocation) {
  return location;
}

/**
 * Campus currently shown in the dashboard.
 * Managers are locked to their assigned campus.
 * Admins can switch via cookie (Brooklyn / Staten Island).
 */
export async function getActiveCampusLocation(
  staff: Pick<StaffAccount, "role" | "location">,
): Promise<StaffLocation> {
  if (staff.role !== "admin") {
    return staff.location;
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_CAMPUS_COOKIE)?.value;
  if (raw && isStaffLocation(raw)) {
    return raw;
  }

  return staff.location;
}

export async function getCampusByStaffLocation(
  supabase: DbClient,
  location: StaffLocation,
): Promise<CampusLocation | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, slug, name")
    .eq("slug", staffLocationToSlug(location))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getCampusLocationId(
  supabase: DbClient,
  location: StaffLocation,
): Promise<number | null> {
  const campus = await getCampusByStaffLocation(supabase, location);
  return campus?.id ?? null;
}

/** Resolve the active campus id for the signed-in staff member. */
export async function getActiveCampusLocationId(
  supabase: DbClient,
  staff: Pick<StaffAccount, "role" | "location">,
): Promise<number | null> {
  const location = await getActiveCampusLocation(staff);
  return getCampusLocationId(supabase, location);
}
