import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { StaffRole } from "@/lib/staff-role";
import type { StaffLocation } from "@/lib/staff-location";
import type { AppLanguage } from "@/lib/language";
import { DEFAULT_APP_LANGUAGE, isAppLanguage } from "@/lib/language";
import { createClient } from "@/utils/supabase/server";

export type StaffAccount = {
  id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  location: StaffLocation;
  is_active: boolean;
  preferred_language: AppLanguage;
  created_at: string;
  created_by: string | null;
};

export async function getCurrentStaff(): Promise<StaffAccount | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: staff } = await supabase
    .from("staff_accounts")
    .select(
      "id, email, full_name, role, location, is_active, preferred_language, created_at, created_by",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!staff?.is_active) {
    return null;
  }

  return {
    ...(staff as Omit<StaffAccount, "preferred_language">),
    preferred_language: isAppLanguage(staff.preferred_language)
      ? staff.preferred_language
      : DEFAULT_APP_LANGUAGE,
  };
}

export async function requireStaff(): Promise<StaffAccount> {
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect("/login");
  }

  return staff;
}

export async function requireAdmin(): Promise<StaffAccount> {
  const staff = await requireStaff();

  if (staff.role !== "admin") {
    redirect("/settings");
  }

  return staff;
}
