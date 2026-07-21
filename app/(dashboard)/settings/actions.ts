"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getCurrentStaff } from "@/lib/auth";
import { canCreateStaffAtLocation, isStaffRole } from "@/lib/staff-role";
import { isStaffLocation } from "@/lib/staff-location";
import { parseAppLanguage } from "@/lib/language";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type CreateStaffAccountState = ActionState;
export type ChangePasswordState = ActionState;

function getServiceClient() {
  try {
    return { supabase: createSupabaseServiceClient() };
  } catch {
    return {
      error:
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }
}

function revalidateStaffSettings() {
  revalidatePath("/settings");
}

export async function createStaffAccount(
  _prevState: CreateStaffAccountState,
  formData: FormData,
): Promise<CreateStaffAccountState> {
  const actor = await getCurrentStaff();

  if (!actor) {
    return { error: "You must be signed in." };
  }

  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("fullName")?.toString().trim() || null;
  const roleValue = formData.get("role")?.toString();
  const locationValue = formData.get("location")?.toString();

  if (!email) {
    return { error: "Email is required." };
  }

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (!roleValue || !isStaffRole(roleValue)) {
    return { error: "Choose a valid role." };
  }

  if (!locationValue || !isStaffLocation(locationValue)) {
    return { error: "Choose a valid campus." };
  }

  if (!canCreateStaffAtLocation(actor.role, roleValue, locationValue)) {
    if (roleValue === "admin" && locationValue !== "brooklyn") {
      return {
        error: "Admin accounts can only be created for Brooklyn iSmart.",
      };
    }

    return {
      error: "Only admins can create manager accounts.",
    };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: authUser, error: authError } =
    await client.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: roleValue, location: locationValue },
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });

  if (authError || !authUser.user) {
    return {
      error: authError?.message ?? "Could not create the account.",
    };
  }

  const { error: staffError } = await client.supabase.from("staff_accounts").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    role: roleValue,
    location: locationValue,
    created_by: actor.id,
  });

  if (staffError) {
    await client.supabase.auth.admin.deleteUser(authUser.user.id);
    return { error: staffError.message };
  }

  revalidateStaffSettings();
  return { success: true };
}

export async function setStaffAccountActive(
  staffId: string,
  isActive: boolean,
): Promise<ActionState> {
  const actor = await getCurrentStaff();

  if (!actor || actor.role !== "admin") {
    return { error: "Only admins can change account status." };
  }

  if (actor.id === staffId && !isActive) {
    return { error: "You cannot deactivate your own account." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error } = await client.supabase
    .from("staff_accounts")
    .update({ is_active: isActive })
    .eq("id", staffId);

  if (error) {
    return { error: error.message };
  }

  revalidateStaffSettings();
  return { success: true };
}

export async function changeStaffPassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const staff = await getCurrentStaff();

  if (!staff) {
    return { error: "You must be signed in." };
  }

  const currentPassword = formData.get("currentPassword")?.toString();
  const newPassword = formData.get("newPassword")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  if (currentPassword === newPassword) {
    return { error: "New password must be different from your current password." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: staff.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updateStaffLanguage(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await getCurrentStaff();

  if (!staff) {
    return { error: "You must be signed in." };
  }

  const language = parseAppLanguage(formData.get("language"));

  if (!language) {
    return { error: "Choose a valid language." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.rpc("set_staff_preferred_language", {
    p_language: language,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}
