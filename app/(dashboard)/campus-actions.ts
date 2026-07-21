"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import {
  ACTIVE_CAMPUS_COOKIE,
} from "@/lib/campus-location";
import { isStaffLocation, type StaffLocation } from "@/lib/staff-location";

export async function setActiveCampus(location: StaffLocation) {
  await requireAdmin();

  if (!isStaffLocation(location)) {
    return { error: "Invalid campus." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CAMPUS_COOKIE, location, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
