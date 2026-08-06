"use server";

import { getCurrentStaff } from "@/lib/auth";
import { canCreateStaffAtLocation, isStaffRole } from "@/lib/staff-role";
import { isStaffLocation } from "@/lib/staff-location";
import { parseAppLanguage } from "@/lib/language";
import { parseDollarsToCents } from "@/lib/money";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

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
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then Redeploy.",
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
  const teacherIdRaw = formData.get("teacherId")?.toString().trim() ?? "";
  const hourlyRateRaw = formData.get("hourlyRate")?.toString().trim() ?? "";

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
      error: "Only admins can create staff accounts.",
    };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  let teacherId: number | null = null;
  let createdNewTeacher = false;

  if (roleValue === "front_desk") {
    const { data: locationRow, error: locationError } = await client.supabase
      .from("locations")
      .select("id")
      .eq("slug", locationValue)
      .maybeSingle();

    if (locationError) {
      return { error: locationError.message };
    }
    if (!locationRow) {
      return { error: "Campus location could not be resolved." };
    }

    if (teacherIdRaw && teacherIdRaw !== "new") {
      const parsedTeacherId = Number(teacherIdRaw);
      if (!Number.isInteger(parsedTeacherId) || parsedTeacherId <= 0) {
        return { error: "Choose a valid front desk profile." };
      }

      const { data: teacher, error: teacherError } = await client.supabase
        .from("teachers")
        .select("id, position, location_id")
        .eq("id", parsedTeacherId)
        .maybeSingle();

      if (teacherError) {
        return { error: teacherError.message };
      }
      if (
        !teacher ||
        teacher.position !== "front_desk" ||
        teacher.location_id !== locationRow.id
      ) {
        return {
          error: "That front desk profile is not available for this campus.",
        };
      }

      const { data: linked } = await client.supabase
        .from("staff_accounts")
        .select("id")
        .eq("teacher_id", parsedTeacherId)
        .maybeSingle();

      if (linked) {
        return { error: "That front desk profile already has a login account." };
      }

      teacherId = parsedTeacherId;
    } else {
      if (!fullName) {
        return {
          error: "Name is required when creating a new front desk profile.",
        };
      }

      const rateParsed = parseDollarsToCents(hourlyRateRaw || null, {
        allowZero: true,
        fieldLabel: "Hourly rate",
      });
      if (!rateParsed.ok) {
        return { error: rateParsed.error };
      }

      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] ?? fullName;
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

      const { data: createdTeacher, error: createTeacherError } =
        await client.supabase
          .from("teachers")
          .insert({
            first_name: firstName,
            last_name: lastName,
            location_id: locationRow.id,
            position: "front_desk",
            hourly_rate_cents: rateParsed.cents,
            is_active: true,
          })
          .select("id")
          .single();

      if (createTeacherError || !createdTeacher) {
        return {
          error:
            createTeacherError?.message ??
            "Could not create the front desk profile.",
        };
      }

      teacherId = createdTeacher.id;
      createdNewTeacher = true;
    }
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
    teacher_id: teacherId,
    created_by: actor.id,
  });

  if (staffError) {
    await client.supabase.auth.admin.deleteUser(authUser.user.id);
    if (createdNewTeacher && teacherId) {
      await client.supabase.from("teachers").delete().eq("id", teacherId);
    }
    return { error: staffError.message };
  }

  revalidateStaffSettings();
  revalidatePath("/tutors");
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

export async function deleteStaffAccount(
  staffId: string,
): Promise<ActionState> {
  const actor = await getCurrentStaff();

  if (!actor || actor.role !== "admin") {
    return { error: "Only admins can delete staff accounts." };
  }

  if (actor.id === staffId) {
    return { error: "You cannot delete your own account." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: target, error: lookupError } = await client.supabase
    .from("staff_accounts")
    .select("id")
    .eq("id", staffId)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message };
  }

  if (!target) {
    return { error: "That staff account was not found." };
  }

  // Removes auth.users; staff_accounts row cascades so the email can be reused.
  const { error: deleteError } =
    await client.supabase.auth.admin.deleteUser(staffId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidateStaffSettings();
  return { success: true };
}

export async function adminSetStaffPassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const actor = await getCurrentStaff();

  if (!actor || actor.role !== "admin") {
    return { error: "Only admins can reset staff passwords." };
  }

  const staffId = formData.get("staffId")?.toString().trim();
  const newPassword = formData.get("newPassword")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!staffId) {
    return { error: "Invalid staff account." };
  }

  if (actor.id === staffId) {
    return {
      error: "Use Change password on your account to update your own password.",
    };
  }

  if (!newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: target, error: lookupError } = await client.supabase
    .from("staff_accounts")
    .select("id, role")
    .eq("id", staffId)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError.message };
  }

  if (!target) {
    return { error: "That staff account was not found." };
  }

  if (target.role !== "manager" && target.role !== "front_desk") {
    return { error: "Admins can only reset manager or front desk passwords." };
  }

  const { error: updateError } =
    await client.supabase.auth.admin.updateUserById(staffId, {
      password: newPassword,
    });

  if (updateError) {
    return { error: updateError.message };
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

export async function linkFrontDeskAccountToTeacher(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getCurrentStaff();
  if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
    return { error: "Only admins and managers can link front desk accounts." };
  }

  const staffId = formData.get("staffId")?.toString().trim();
  const teacherId = Number(formData.get("teacherId"));

  if (!staffId) {
    return { error: "Choose a front desk account." };
  }
  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid front desk profile." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: teacher, error: teacherError } = await client.supabase
    .from("teachers")
    .select("id, position, location_id, locations ( slug )")
    .eq("id", teacherId)
    .maybeSingle();

  if (teacherError) {
    return { error: teacherError.message };
  }
  if (!teacher || teacher.position !== "front_desk") {
    return { error: "That teacher is not a front desk profile." };
  }

  const locationEmbed = Array.isArray(teacher.locations)
    ? teacher.locations[0]
    : teacher.locations;
  const teacherLocationSlug = locationEmbed?.slug;

  if (
    actor.role === "manager" &&
    teacherLocationSlug &&
    teacherLocationSlug !== actor.location
  ) {
    return { error: "You can only link accounts for your campus." };
  }

  const { data: account, error: accountError } = await client.supabase
    .from("staff_accounts")
    .select("id, role, teacher_id, location")
    .eq("id", staffId)
    .maybeSingle();

  if (accountError) {
    return { error: accountError.message };
  }
  if (!account || account.role !== "front_desk") {
    return { error: "Choose a front desk login account." };
  }

  if (actor.role === "manager" && account.location !== actor.location) {
    return { error: "You can only link accounts for your campus." };
  }

  if (account.teacher_id != null && account.teacher_id !== teacherId) {
    return {
      error:
        "That login is already linked to another front desk profile. Unlink it first.",
    };
  }

  const { data: existingLink } = await client.supabase
    .from("staff_accounts")
    .select("id")
    .eq("teacher_id", teacherId)
    .neq("id", staffId)
    .maybeSingle();

  if (existingLink) {
    return {
      error: "This front desk profile already has a linked login account.",
    };
  }

  const { error } = await client.supabase
    .from("staff_accounts")
    .update({ teacher_id: teacherId })
    .eq("id", staffId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath(`/tutors/${teacherId}`);
  revalidatePath("/my-hours");
  return { success: true };
}

export async function unlinkFrontDeskAccountFromTeacher(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getCurrentStaff();
  if (!actor || (actor.role !== "admin" && actor.role !== "manager")) {
    return { error: "Only admins and managers can unlink front desk accounts." };
  }

  const staffId = formData.get("staffId")?.toString().trim();
  const teacherId = Number(formData.get("teacherId"));

  if (!staffId) {
    return { error: "Invalid staff account." };
  }
  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid front desk profile." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  if (actor.role === "manager") {
    const { data: teacher } = await client.supabase
      .from("teachers")
      .select("id, locations ( slug )")
      .eq("id", teacherId)
      .maybeSingle();

    const locationEmbed = Array.isArray(teacher?.locations)
      ? teacher?.locations[0]
      : teacher?.locations;
    if (locationEmbed?.slug && locationEmbed.slug !== actor.location) {
      return { error: "You can only unlink accounts for your campus." };
    }

    const { data: account } = await client.supabase
      .from("staff_accounts")
      .select("id, location")
      .eq("id", staffId)
      .maybeSingle();

    if (account && account.location !== actor.location) {
      return { error: "You can only unlink accounts for your campus." };
    }
  }

  const { error } = await client.supabase
    .from("staff_accounts")
    .update({ teacher_id: null })
    .eq("id", staffId)
    .eq("teacher_id", teacherId)
    .eq("role", "front_desk");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath(`/tutors/${teacherId}`);
  revalidatePath("/my-hours");
  return { success: true };
}
