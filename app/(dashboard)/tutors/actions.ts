"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type CreatedTeacher = {
  id: number;
  first_name: string;
  last_name: string | null;
};

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type CreateTeacherState = ActionState & {
  teacher?: CreatedTeacher;
};
export type UpdateTeacherState = ActionState;
export type UpdateTeacherClassesState = ActionState;

function revalidateTeacher(teacherId: number) {
  revalidatePath("/tutors");
  revalidatePath(`/tutors/${teacherId}`);
}

function revalidateTeacherClasses(teacherId: number) {
  revalidateTeacher(teacherId);
  revalidatePath("/classes");
  revalidatePath("/tutors", "layout");
  revalidatePath("/classes", "layout");
}

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

function parseTeacherFields(formData: FormData) {
  return {
    firstName: formData.get("firstName")?.toString().trim(),
    lastName: formData.get("lastName")?.toString().trim() || null,
    dob: formData.get("dob")?.toString().trim() || null,
    phoneNumber: formData.get("phoneNumber")?.toString().trim() || null,
  };
}

export async function createTeacher(
  _prevState: CreateTeacherState,
  formData: FormData,
): Promise<CreateTeacherState> {
  const { firstName, lastName, dob, phoneNumber } = parseTeacherFields(formData);

  if (!firstName) {
    return { error: "First name is required." };
  }

  const staff = await requireStaff();
  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const locationId = await getActiveCampusLocationId(
    client.supabase,
    staff,
  );
  if (!locationId) {
    return { error: "Campus location could not be resolved." };
  }

  const { data: teacher, error: teacherError } = await client.supabase
    .from("teachers")
    .insert({
      first_name: firstName,
      last_name: lastName,
      dob,
      phone_number: phoneNumber,
      location_id: locationId,
    })
    .select("id, first_name, last_name")
    .single();

  if (teacherError) {
    return { error: teacherError.message };
  }

  revalidatePath("/tutors");
  revalidatePath("/classes", "layout");
  return {
    success: true,
    teacher: {
      id: teacher.id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
    },
  };
}

export async function updateTeacher(
  _prevState: UpdateTeacherState,
  formData: FormData,
): Promise<UpdateTeacherState> {
  const teacherId = Number(formData.get("teacherId"));
  const { firstName, lastName, dob, phoneNumber } = parseTeacherFields(formData);

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  if (!firstName) {
    return { error: "First name is required." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: teacherError } = await client.supabase
    .from("teachers")
    .update({
      first_name: firstName,
      last_name: lastName,
      dob,
      phone_number: phoneNumber,
    })
    .eq("id", teacherId);

  if (teacherError) {
    return { error: teacherError.message };
  }

  revalidateTeacher(teacherId);
  return { success: true };
}

function parseClassIds(formData: FormData) {
  return formData
    .getAll("classIds")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export async function updateTeacherClasses(
  _prevState: UpdateTeacherClassesState,
  formData: FormData,
): Promise<UpdateTeacherClassesState> {
  const teacherId = Number(formData.get("teacherId"));
  const classIds = parseClassIds(formData);

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: currentClasses, error: currentError } = await client.supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", teacherId);

  if (currentError) {
    return { error: currentError.message };
  }

  const currentIds = new Set((currentClasses ?? []).map((row) => row.id));
  const nextIds = new Set(classIds);
  const toUnassign = [...currentIds].filter((id) => !nextIds.has(id));
  const toAssign = [...nextIds].filter((id) => !currentIds.has(id));

  if (toUnassign.length > 0) {
    const { error: unassignError } = await client.supabase
      .from("classes")
      .update({ teacher_id: null })
      .eq("teacher_id", teacherId)
      .in("id", toUnassign);

    if (unassignError) {
      return { error: unassignError.message };
    }
  }

  if (toAssign.length > 0) {
    const { error: assignError } = await client.supabase
      .from("classes")
      .update({ teacher_id: teacherId })
      .in("id", toAssign);

    if (assignError) {
      return { error: assignError.message };
    }
  }

  revalidateTeacherClasses(teacherId);
  return { success: true };
}

export async function unassignTeacherClass(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teacherId = Number(formData.get("teacherId"));
  const classId = Number(formData.get("classId"));

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  if (!Number.isInteger(classId) || classId <= 0) {
    return { error: "Invalid class." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: unassignError } = await client.supabase
    .from("classes")
    .update({ teacher_id: null })
    .eq("id", classId)
    .eq("teacher_id", teacherId);

  if (unassignError) {
    return { error: unassignError.message };
  }

  revalidateTeacherClasses(teacherId);
  return { success: true };
}

export async function updateTeacherActive(
  formData: FormData,
): Promise<ActionState> {
  const teacherId = Number(formData.get("teacherId"));
  const isActive = formData.get("isActive") === "true";

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: teacherError } = await client.supabase
    .from("teachers")
    .update({ is_active: isActive })
    .eq("id", teacherId);

  if (teacherError) {
    return { error: teacherError.message };
  }

  revalidateTeacher(teacherId);
  revalidatePath("/classes", "layout");
  return { success: true };
}
