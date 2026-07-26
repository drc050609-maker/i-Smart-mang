"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  isTeacherResumeMimeType,
  MAX_TEACHER_RESUME_FILE_BYTES,
  TEACHER_RESUME_BUCKET,
} from "@/lib/teacher-resume";

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
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then Redeploy.",
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

  const { error: unlinkError } = await client.supabase
    .from("class_teachers")
    .delete()
    .eq("class_id", classId)
    .eq("teacher_id", teacherId);

  if (unlinkError) {
    return { error: unlinkError.message };
  }

  const { data: classRow } = await client.supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .maybeSingle();

  if (classRow?.teacher_id === teacherId) {
    const { data: remaining } = await client.supabase
      .from("class_teachers")
      .select("teacher_id")
      .eq("class_id", classId)
      .order("is_primary", { ascending: false })
      .limit(1);

    const nextPrimaryId = remaining?.[0]?.teacher_id ?? null;

    const { error: unassignError } = await client.supabase
      .from("classes")
      .update({ teacher_id: nextPrimaryId })
      .eq("id", classId)
      .eq("teacher_id", teacherId);

    if (unassignError) {
      return { error: unassignError.message };
    }

    if (nextPrimaryId != null) {
      await client.supabase
        .from("class_teachers")
        .update({ is_primary: true })
        .eq("class_id", classId)
        .eq("teacher_id", nextPrimaryId);
    }
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

  // Inactive teachers should not remain on classes or appear in assign pickers.
  if (!isActive) {
    const unassignError = await removeTeacherFromAllClasses(
      client.supabase,
      teacherId,
    );
    if (unassignError) {
      return { error: unassignError };
    }
  }

  revalidateTeacher(teacherId);
  revalidatePath("/classes", "layout");
  revalidatePath("/schedule");
  return { success: true };
}

async function removeTeacherFromAllClasses(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  teacherId: number,
) {
  const { data: linkedClasses, error: linkedError } = await supabase
    .from("class_teachers")
    .select("class_id")
    .eq("teacher_id", teacherId);

  if (linkedError) {
    return linkedError.message;
  }

  const classIds = [
    ...new Set((linkedClasses ?? []).map((row) => row.class_id)),
  ];

  const { data: primaryClasses, error: primaryError } = await supabase
    .from("classes")
    .select("id")
    .eq("teacher_id", teacherId);

  if (primaryError) {
    return primaryError.message;
  }

  for (const row of primaryClasses ?? []) {
    if (!classIds.includes(row.id)) {
      classIds.push(row.id);
    }
  }

  if (classIds.length === 0) {
    return null;
  }

  const { error: deleteError } = await supabase
    .from("class_teachers")
    .delete()
    .eq("teacher_id", teacherId);

  if (deleteError) {
    return deleteError.message;
  }

  for (const classId of classIds) {
    const { data: classRow, error: classLoadError } = await supabase
      .from("classes")
      .select("teacher_id")
      .eq("id", classId)
      .maybeSingle();

    if (classLoadError) {
      return classLoadError.message;
    }

    if (classRow?.teacher_id !== teacherId) {
      continue;
    }

    const { data: remainingRows, error: remainingError } = await supabase
      .from("class_teachers")
      .select("teacher_id, is_primary, teachers ( is_active )")
      .eq("class_id", classId);

    if (remainingError) {
      return remainingError.message;
    }

    const activeRemaining = (remainingRows ?? [])
      .filter((row) => {
        const teacher = Array.isArray(row.teachers)
          ? row.teachers[0]
          : row.teachers;
        return teacher?.is_active === true;
      })
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));

    const nextPrimaryId = activeRemaining[0]?.teacher_id ?? null;

    const { error: updateError } = await supabase
      .from("classes")
      .update({ teacher_id: nextPrimaryId })
      .eq("id", classId);

    if (updateError) {
      return updateError.message;
    }

    if (nextPrimaryId != null) {
      await supabase
        .from("class_teachers")
        .update({ is_primary: true })
        .eq("class_id", classId)
        .eq("teacher_id", nextPrimaryId);
    }
  }

  return null;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function uploadTeacherResume(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teacherId = Number(formData.get("teacherId"));
  const file = formData.get("resume");

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF resume to upload." };
  }

  if (!isTeacherResumeMimeType(file.type)) {
    return { error: "Resume must be a PDF file." };
  }

  if (file.size > MAX_TEACHER_RESUME_FILE_BYTES) {
    return { error: "Resume is too large. Max size is 10 MB." };
  }

  await requireStaff();
  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: existing, error: loadError } = await client.supabase
    .from("teachers")
    .select("resume_path")
    .eq("id", teacherId)
    .maybeSingle();

  if (loadError) {
    return { error: loadError.message };
  }
  if (!existing) {
    return { error: "Tutor not found." };
  }

  const storagePath = `${teacherId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await client.supabase.storage
    .from(TEACHER_RESUME_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: updateError } = await client.supabase
    .from("teachers")
    .update({
      resume_path: storagePath,
      resume_file_name: file.name.slice(0, 200),
    })
    .eq("id", teacherId);

  if (updateError) {
    await client.supabase.storage
      .from(TEACHER_RESUME_BUCKET)
      .remove([storagePath]);
    return { error: updateError.message };
  }

  if (existing.resume_path && existing.resume_path !== storagePath) {
    await client.supabase.storage
      .from(TEACHER_RESUME_BUCKET)
      .remove([existing.resume_path]);
  }

  revalidateTeacher(teacherId);
  return { success: true };
}

export async function removeTeacherResume(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teacherId = Number(formData.get("teacherId"));

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid tutor." };
  }

  await requireStaff();
  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: existing, error: loadError } = await client.supabase
    .from("teachers")
    .select("resume_path")
    .eq("id", teacherId)
    .maybeSingle();

  if (loadError) {
    return { error: loadError.message };
  }
  if (!existing) {
    return { error: "Tutor not found." };
  }

  const { error: updateError } = await client.supabase
    .from("teachers")
    .update({
      resume_path: null,
      resume_file_name: null,
    })
    .eq("id", teacherId);

  if (updateError) {
    return { error: updateError.message };
  }

  if (existing.resume_path) {
    await client.supabase.storage
      .from(TEACHER_RESUME_BUCKET)
      .remove([existing.resume_path]);
  }

  revalidateTeacher(teacherId);
  return { success: true };
}
