"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { LEAD_STATUSES, type LeadStatus } from "@/lib/lead";
import {
  getCampusLocationId,
} from "@/lib/campus-location";
import {
  parseStartingClassCredits,
} from "@/lib/class-session-credits";
import { isStaffLocation, type StaffLocation } from "@/lib/staff-location";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/utils/supabase/server";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type ServiceSupabase = SupabaseClient<Database>;

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type CreateLeadState = ActionState & {
  leadId?: number;
};

export type ConvertLeadChildState = ActionState & {
  studentId?: number;
};

function formatStudentExperience(
  background: string | null | undefined,
  experience: string | null | undefined,
) {
  const parts = [background?.trim(), experience?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

async function syncLeadStatusAfterConversion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: number,
) {
  const [{ data: children, error: childrenError }, { data: lead, error: leadError }] =
    await Promise.all([
      supabase
        .from("lead_children")
        .select("id, student_id")
        .eq("lead_id", leadId),
      supabase.from("leads").select("status").eq("id", leadId).maybeSingle(),
    ]);

  if (childrenError || leadError || !lead) {
    return;
  }

  const childRows = children ?? [];
  if (childRows.length === 0) {
    return;
  }

  const convertedCount = childRows.filter((child) => child.student_id !== null).length;
  if (convertedCount === 0) {
    return;
  }

  const nextStatus: LeadStatus =
    convertedCount === childRows.length ? "enrolled" : "contacted";

  if (lead.status === nextStatus) {
    return;
  }

  await supabase.from("leads").update({ status: nextStatus }).eq("id", leadId);
}

async function copyLeadAddressToStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: number,
  lead: {
    street_1: string | null;
    street_2: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
  },
) {
  const street1 = lead.street_1?.trim();
  if (!street1) {
    return;
  }

  const { count, error: countError } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("student", studentId);

  if (countError || (count ?? 0) > 0) {
    return;
  }

  await supabase.from("addresses").insert({
    student: studentId,
    "street 1": street1,
    "street 2": lead.street_2?.trim() || null,
    city: lead.city?.trim() || null,
    state: lead.state?.trim() || null,
    "zip code": lead.zip_code?.trim() || null,
  });
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : null;
}

function parseLeadStatus(value: FormDataEntryValue | null): LeadStatus | null {
  const status = value?.toString().trim();
  if (!status || !LEAD_STATUSES.includes(status as LeadStatus)) {
    return null;
  }
  return status as LeadStatus;
}

function parseLocation(value: FormDataEntryValue | null): StaffLocation | null {
  const location = value?.toString().trim();
  if (!location) return null;
  return isStaffLocation(location) ? location : null;
}

function revalidateLeadLists() {
  revalidatePath("/leads");
  revalidatePath("/leads/inquiries");
  revalidatePath("/leads/trials");
}

function revalidateLead(leadId: number) {
  revalidateLeadLists();
  revalidatePath(`/leads/${leadId}`);
}

async function getAuthenticatedClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." } as const;
  }

  return { supabase, userId: user.id } as const;
}

function getServiceClient():
  | { supabase: ServiceSupabase }
  | { error: string } {
  try {
    return { supabase: createSupabaseServiceClient() };
  } catch {
    return {
      error:
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }
}

async function requireStaffForWrite(): Promise<
  | { supabase: ServiceSupabase; userId: string }
  | { error: string }
> {
  const auth = await getAuthenticatedClient();
  if ("error" in auth) {
    return auth;
  }

  const db = getServiceClient();
  if ("error" in db) {
    return db;
  }

  return { supabase: db.supabase, userId: auth.userId };
}

export async function createLead(
  _prevState: CreateLeadState,
  formData: FormData,
): Promise<CreateLeadState> {
  const parentFirstName = formData.get("parentFirstName")?.toString().trim();
  const parentLastName = parseOptionalText(formData.get("parentLastName"));
  const phoneNumber = formData.get("phoneNumber")?.toString().trim();
  const email = parseOptionalText(formData.get("email"));
  const street1 = parseOptionalText(formData.get("street1"));
  const street2 = parseOptionalText(formData.get("street2"));
  const city = parseOptionalText(formData.get("city"));
  const state = parseOptionalText(formData.get("state"));
  const zipCode = parseOptionalText(formData.get("zipCode"));
  const description = parseOptionalText(formData.get("description"));
  const needsFutureContact = formData.get("needsFutureContact") === "true";
  const location = parseLocation(formData.get("location"));

  if (!parentFirstName) {
    return { error: "Student first name is required." };
  }

  if (!phoneNumber) {
    return { error: "Phone number is required." };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: lead, error: leadError } = await client.supabase
    .from("leads")
    .insert({
      parent_first_name: parentFirstName,
      parent_last_name: parentLastName,
      phone_number: phoneNumber,
      email,
      street_1: street1,
      street_2: street2,
      city,
      state,
      zip_code: zipCode,
      description,
      needs_future_contact: needsFutureContact,
      location,
      created_by: client.userId,
    })
    .select("id")
    .single();

  if (leadError) {
    return { error: leadError.message };
  }

  revalidateLeadLists();
  return { success: true, leadId: lead.id };
}

export async function updateLead(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leadId = Number(formData.get("leadId"));
  const parentFirstName = formData.get("parentFirstName")?.toString().trim();
  const parentLastName = parseOptionalText(formData.get("parentLastName"));
  const phoneNumber = formData.get("phoneNumber")?.toString().trim();
  const email = parseOptionalText(formData.get("email"));
  const street1 = parseOptionalText(formData.get("street1"));
  const street2 = parseOptionalText(formData.get("street2"));
  const city = parseOptionalText(formData.get("city"));
  const state = parseOptionalText(formData.get("state"));
  const zipCode = parseOptionalText(formData.get("zipCode"));
  const description = parseOptionalText(formData.get("description"));
  const needsFutureContact = formData.get("needsFutureContact") === "true";
  const location = parseLocation(formData.get("location"));

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  if (!parentFirstName) {
    return { error: "Student first name is required." };
  }

  if (!phoneNumber) {
    return { error: "Phone number is required." };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: updateError } = await client.supabase
    .from("leads")
    .update({
      parent_first_name: parentFirstName,
      parent_last_name: parentLastName,
      phone_number: phoneNumber,
      email,
      street_1: street1,
      street_2: street2,
      city,
      state,
      zip_code: zipCode,
      description,
      needs_future_contact: needsFutureContact,
      location,
    })
    .eq("id", leadId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateLead(leadId);
  return { success: true };
}

export async function updateLeadActive(formData: FormData): Promise<ActionState> {
  const leadId = Number(formData.get("leadId"));
  const isActive = formData.get("isActive") === "true";

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: updateError } = await client.supabase
    .from("leads")
    .update({ is_active: isActive })
    .eq("id", leadId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateLead(leadId);
  return { success: true };
}

export async function deleteLead(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leadId = Number(formData.get("leadId"));

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: deleteError } = await client.supabase
    .from("leads")
    .delete()
    .eq("id", leadId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidateLeadLists();
  return { success: true };
}

export async function createLeadChild(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const leadId = Number(formData.get("leadId"));
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = parseOptionalText(formData.get("lastName"));
  const dob = parseOptionalText(formData.get("dob"));
  const background = parseOptionalText(formData.get("background"));
  const experience = parseOptionalText(formData.get("experience"));

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  if (!firstName) {
    return { error: "Child first name is required." };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { count, error: countError } = await client.supabase
    .from("lead_children")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId);

  if (countError) {
    return { error: countError.message };
  }

  const { error: insertError } = await client.supabase.from("lead_children").insert({
    lead_id: leadId,
    first_name: firstName,
    last_name: lastName,
    dob,
    background,
    experience,
    sort_order: count ?? 0,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidateLead(leadId);
  return { success: true };
}

export async function updateLeadChild(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const childId = Number(formData.get("childId"));
  const leadId = Number(formData.get("leadId"));
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = parseOptionalText(formData.get("lastName"));
  const dob = parseOptionalText(formData.get("dob"));
  const background = parseOptionalText(formData.get("background"));
  const experience = parseOptionalText(formData.get("experience"));

  if (!Number.isInteger(childId) || childId <= 0) {
    return { error: "Invalid child." };
  }

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  if (!firstName) {
    return { error: "Child first name is required." };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: updateError } = await client.supabase
    .from("lead_children")
    .update({
      first_name: firstName,
      last_name: lastName,
      dob,
      background,
      experience,
    })
    .eq("id", childId)
    .eq("lead_id", leadId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateLead(leadId);
  return { success: true };
}

export async function deleteLeadChild(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const childId = Number(formData.get("childId"));
  const leadId = Number(formData.get("leadId"));

  if (!Number.isInteger(childId) || childId <= 0) {
    return { error: "Invalid child." };
  }

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: deleteError } = await client.supabase
    .from("lead_children")
    .delete()
    .eq("id", childId)
    .eq("lead_id", leadId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidateLead(leadId);
  return { success: true };
}

export async function convertLeadChildToStudent(
  _prevState: ConvertLeadChildState,
  formData: FormData,
): Promise<ConvertLeadChildState> {
  const leadId = Number(formData.get("leadId"));
  const childId = Number(formData.get("childId"));
  const startingClassCredits = parseStartingClassCredits(
    formData.get("startingClassCredits"),
  );

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  if (!Number.isInteger(childId) || childId <= 0) {
    return { error: "Invalid child." };
  }

  if (startingClassCredits === null) {
    return {
      error: "Starting class sessions must be a whole number from 0 to 500.",
    };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const [{ data: lead, error: leadError }, { data: child, error: childError }] =
    await Promise.all([
      client.supabase.from("leads").select("*").eq("id", leadId).maybeSingle(),
      client.supabase
        .from("lead_children")
        .select("id, first_name, last_name, dob, background, experience, student_id")
        .eq("id", childId)
        .eq("lead_id", leadId)
        .maybeSingle(),
    ]);

  if (leadError) {
    return { error: leadError.message };
  }

  if (!lead) {
    return { error: "Lead not found." };
  }

  if (childError) {
    return { error: childError.message };
  }

  if (!child) {
    return { error: "Child not found on this lead." };
  }

  if (child.student_id) {
    return { error: "This child is already an official student." };
  }

  const locationId = lead.location
    ? await getCampusLocationId(client.supabase, lead.location)
    : null;

  const { data: student, error: studentError } = await client.supabase
    .from("students")
    .insert({
      "first name": child.first_name,
      "last name": child.last_name,
      dob: child.dob,
      experience: formatStudentExperience(child.background, child.experience),
      starting_class_credits: startingClassCredits,
      is_active: true,
      location_id: locationId,
    })
    .select('id, "first name", "last name"')
    .single();

  if (studentError) {
    return { error: studentError.message };
  }

  const convertedAt = new Date().toISOString();
  const { error: linkError } = await client.supabase
    .from("lead_children")
    .update({
      student_id: student.id,
      converted_at: convertedAt,
    })
    .eq("id", childId)
    .eq("lead_id", leadId)
    .is("student_id", null);

  if (linkError) {
    await client.supabase.from("students").delete().eq("id", student.id);
    return { error: linkError.message };
  }

  await copyLeadAddressToStudent(client.supabase, student.id, lead);
  await syncLeadStatusAfterConversion(client.supabase, leadId);

  if (!lead.student_id) {
    await client.supabase
      .from("leads")
      .update({ student_id: student.id })
      .eq("id", leadId)
      .is("student_id", null);
  }

  revalidateLead(leadId);
  revalidatePath("/students");
  revalidatePath(`/students/${student.id}`);
  revalidatePath("/classes", "layout");

  return { success: true, studentId: student.id };
}

export async function makeLeadOfficialStudent(
  _prevState: ConvertLeadChildState,
  formData: FormData,
): Promise<ConvertLeadChildState> {
  const leadId = Number(formData.get("leadId"));
  const dob = parseOptionalText(formData.get("dob"));
  const startingClassCredits = parseStartingClassCredits(
    formData.get("startingClassCredits"),
  );

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  if (startingClassCredits === null) {
    return {
      error: "Starting class sessions must be a whole number from 0 to 500.",
    };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: lead, error: leadError } = await client.supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    return { error: leadError.message };
  }

  if (!lead) {
    return { error: "Lead not found." };
  }

  if (lead.student_id) {
    return { error: "This lead is already an official student." };
  }

  const locationId = lead.location
    ? await getCampusLocationId(client.supabase, lead.location)
    : null;

  const { data: student, error: studentError } = await client.supabase
    .from("students")
    .insert({
      "first name": lead.parent_first_name,
      "last name": lead.parent_last_name,
      dob,
      experience: lead.description,
      starting_class_credits: startingClassCredits,
      is_active: true,
      location_id: locationId,
    })
    .select("id")
    .single();

  if (studentError) {
    return { error: studentError.message };
  }

  const { error: linkError } = await client.supabase
    .from("leads")
    .update({
      student_id: student.id,
      needs_future_contact: false,
      status: "enrolled",
    })
    .eq("id", leadId)
    .is("student_id", null);

  if (linkError) {
    await client.supabase.from("students").delete().eq("id", student.id);
    return { error: linkError.message };
  }

  await copyLeadAddressToStudent(client.supabase, student.id, lead);

  revalidateLead(leadId);
  revalidatePath("/students");
  revalidatePath(`/students/${student.id}`);
  revalidatePath("/classes", "layout");

  return { success: true, studentId: student.id };
}

export async function makeTrialStudentOfficial(
  _prevState: ConvertLeadChildState,
  formData: FormData,
): Promise<ConvertLeadChildState> {
  const studentId = Number(formData.get("studentId"));
  const startingClassCredits = parseStartingClassCredits(
    formData.get("startingClassCredits"),
  );

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (startingClassCredits === null) {
    return {
      error: "Starting class sessions must be a whole number from 0 to 500.",
    };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: student, error: studentError } = await client.supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    return { error: studentError.message };
  }

  if (!student) {
    return { error: "Student not found." };
  }

  const { error: updateError } = await client.supabase
    .from("students")
    .update({
      starting_class_credits: startingClassCredits,
      is_active: true,
    })
    .eq("id", studentId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidateLeadLists();
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/classes", "layout");

  return { success: true, studentId };
}

export async function convertAllLeadChildrenToStudents(
  _prevState: ConvertLeadChildState,
  formData: FormData,
): Promise<ConvertLeadChildState> {
  const leadId = Number(formData.get("leadId"));
  const startingClassCredits = parseStartingClassCredits(
    formData.get("startingClassCredits"),
  );

  if (!Number.isInteger(leadId) || leadId <= 0) {
    return { error: "Invalid lead." };
  }

  if (startingClassCredits === null) {
    return {
      error: "Starting class sessions must be a whole number from 0 to 500.",
    };
  }

  const client = await requireStaffForWrite();
  if ("error" in client) {
    return { error: client.error };
  }

  const [{ data: lead, error: leadError }, { data: children, error: childrenError }] =
    await Promise.all([
      client.supabase.from("leads").select("*").eq("id", leadId).maybeSingle(),
      client.supabase
        .from("lead_children")
        .select("id, first_name, last_name, dob, background, experience, student_id")
        .eq("lead_id", leadId)
        .order("sort_order")
        .order("id"),
    ]);

  if (leadError) {
    return { error: leadError.message };
  }

  if (!lead) {
    return { error: "Lead not found." };
  }

  if (childrenError) {
    return { error: childrenError.message };
  }

  const pendingChildren = (children ?? []).filter((child) => !child.student_id);

  if (pendingChildren.length === 0) {
    return { error: "All children on this lead are already official students." };
  }

  const locationId = lead.location
    ? await getCampusLocationId(client.supabase, lead.location)
    : null;

  let lastStudentId: number | undefined;

  for (const child of pendingChildren) {
    const { data: student, error: studentError } = await client.supabase
      .from("students")
      .insert({
        "first name": child.first_name,
        "last name": child.last_name,
        dob: child.dob,
        experience: formatStudentExperience(child.background, child.experience),
        starting_class_credits: startingClassCredits,
        is_active: true,
        location_id: locationId,
      })
      .select("id")
      .single();

    if (studentError) {
      return { error: studentError.message };
    }

    const { error: linkError } = await client.supabase
      .from("lead_children")
      .update({
        student_id: student.id,
        converted_at: new Date().toISOString(),
      })
      .eq("id", child.id)
      .eq("lead_id", leadId)
      .is("student_id", null);

    if (linkError) {
      await client.supabase.from("students").delete().eq("id", student.id);
      return { error: linkError.message };
    }

    await copyLeadAddressToStudent(client.supabase, student.id, lead);
    lastStudentId = student.id;
  }

  await syncLeadStatusAfterConversion(client.supabase, leadId);

  revalidateLead(leadId);
  revalidatePath("/students");
  if (lastStudentId) {
    revalidatePath(`/students/${lastStudentId}`);
  }
  revalidatePath("/classes", "layout");

  return { success: true, studentId: lastStudentId };
}
