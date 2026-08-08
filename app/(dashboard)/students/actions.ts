"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { deactivateClassesWithNoActiveEnrollments } from "@/lib/class-active";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_STARTING_CLASS_CREDITS,
  parseStartingClassCredits,
} from "@/lib/class-session-credits";
import { isPhoneOwnerRole } from "@/lib/phone-owner";
import {
  isStudentReceiptMimeType,
  MAX_STUDENT_RECEIPT_FILE_BYTES,
  STUDENT_RECEIPT_BUCKET,
} from "@/lib/student-receipt";

export type CreatedStudent = {
  id: number;
  "first name": string;
  "last name": string | null;
};

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type CreateStudentState = ActionState & {
  student?: CreatedStudent;
};

export async function createStudent(
  _prevState: CreateStudentState,
  formData: FormData,
): Promise<CreateStudentState> {
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim() || null;
  const dob = formData.get("dob")?.toString().trim() || null;
  const startingClassCredits = parseStartingClassCredits(
    formData.get("startingClassCredits"),
  );

  if (!firstName) {
    return { error: "First name is required." };
  }

  if (startingClassCredits === null) {
    return { error: "Starting class sessions must be a whole number from 0 to 500." };
  }

  const staff = await requireStaff();

  let supabase;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return {
      error:
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then Redeploy.",
    };
  }

  const locationId = await getActiveCampusLocationId(supabase, staff);
  if (!locationId) {
    return { error: "Campus location could not be resolved." };
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      "first name": firstName,
      "last name": lastName,
      dob,
      starting_class_credits: startingClassCredits,
      location_id: locationId,
    })
    .select('id, "first name", "last name"')
    .single();

  if (studentError) {
    return { error: studentError.message };
  }

  revalidatePath("/students");
  revalidatePath("/classes", "layout");
  return {
    success: true,
    student: {
      id: student.id,
      "first name": student["first name"],
      "last name": student["last name"],
    },
  };
}

export type EnrollStudentInClassesState = ActionState;

function parseClassIds(formData: FormData) {
  return formData
    .getAll("classIds")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function revalidateStudentEnrollments(studentId: number, classIds: number[]) {
  revalidateStudent(studentId);
  revalidatePath("/classes");
  revalidatePath("/classes", "layout");
  revalidatePath("/tutors", "layout");
  for (const classId of classIds) {
    revalidatePath(`/classes/${classId}`);
  }
}

export async function enrollStudentInClasses(
  _prevState: EnrollStudentInClassesState,
  formData: FormData,
): Promise<EnrollStudentInClassesState> {
  const studentId = Number(formData.get("studentId"));
  const classIds = parseClassIds(formData);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (classIds.length === 0) {
    return { error: "Select at least one class." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: existingEnrollments, error: existingError } =
    await client.supabase
      .from("enrollments")
      .select('"class id"')
      .eq("student id", studentId)
      .in("class id", classIds);

  if (existingError) {
    return { error: existingError.message };
  }

  const enrolledClassIds = new Set(
    (existingEnrollments ?? [])
      .map((row) => row["class id"])
      .filter((id): id is number => typeof id === "number"),
  );
  const newClassIds = classIds.filter((id) => !enrolledClassIds.has(id));

  if (newClassIds.length === 0) {
    return { error: "This student is already enrolled in the selected classes." };
  }

  const { data: studentRow, error: studentError } = await client.supabase
    .from("students")
    .select("starting_class_credits")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    return { error: studentError.message };
  }

  const creditCount =
    studentRow?.starting_class_credits ?? DEFAULT_STARTING_CLASS_CREDITS;

  const today = new Date().toISOString().slice(0, 10);
  const { error: enrollmentError } = await client.supabase
    .from("enrollments")
    .insert(
      newClassIds.map((classId) => ({
        "class id": classId,
        "student id": studentId,
        created_date: today,
        is_active: true,
        updated_date: today,
      })),
    );

  if (enrollmentError) {
    return { error: enrollmentError.message };
  }

  for (const classId of newClassIds) {
    if (creditCount <= 0) {
      continue;
    }

    const { error: creditsError } = await client.supabase.rpc(
      "add_student_class_credits",
      {
        p_student_id: studentId,
        p_class_id: classId,
        p_count: creditCount,
      },
    );

    if (creditsError) {
      return { error: creditsError.message };
    }
  }

  revalidateStudentEnrollments(studentId, newClassIds);
  return { success: true };
}

export type CreateStudentAddressState = ActionState;

export type UpdateStudentAddressState = ActionState;

export type UpdateStudentDobState = ActionState;

export type UpdateStudentNameState = ActionState;

export type UpdateStudentNotesState = ActionState;

function revalidateStudent(studentId: number) {
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
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

function parseAddressFields(formData: FormData) {
  return {
    street1: formData.get("street1")?.toString().trim(),
    street2: formData.get("street2")?.toString().trim() || null,
    city: formData.get("city")?.toString().trim() || null,
    state: formData.get("state")?.toString().trim() || null,
    zipCode: formData.get("zipCode")?.toString().trim() || null,
  };
}

function validateZipCode(zipCode: string | null) {
  if (!zipCode) return null;

  const digits = zipCode.replace(/\D/g, "");
  if (digits.length > 5) {
    return "ZIP code must be 5 digits or fewer.";
  }

  return null;
}

export async function createStudentAddress(
  _prevState: CreateStudentAddressState,
  formData: FormData,
): Promise<CreateStudentAddressState> {
  const studentId = Number(formData.get("studentId"));
  const { street1, street2, city, state, zipCode } = parseAddressFields(formData);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!street1) {
    return { error: "Street address is required." };
  }

  const zipError = validateZipCode(zipCode);
  if (zipError) {
    return { error: zipError };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: addressError } = await client.supabase.from("addresses").insert({
    "street 1": street1,
    "street 2": street2,
    city,
    state,
    "zip code": zipCode,
    student: studentId,
  });

  if (addressError) {
    return { error: addressError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export async function updateStudentAddress(
  _prevState: UpdateStudentAddressState,
  formData: FormData,
): Promise<UpdateStudentAddressState> {
  const studentId = Number(formData.get("studentId"));
  const addressId = Number(formData.get("addressId"));
  const { street1, street2, city, state, zipCode } = parseAddressFields(formData);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(addressId) || addressId <= 0) {
    return { error: "Invalid address." };
  }

  if (!street1) {
    return { error: "Street address is required." };
  }

  const zipError = validateZipCode(zipCode);
  if (zipError) {
    return { error: zipError };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: addressError } = await client.supabase
    .from("addresses")
    .update({
      "street 1": street1,
      "street 2": street2,
      city,
      state,
      "zip code": zipCode,
    })
    .eq("id", addressId)
    .eq("student", studentId);

  if (addressError) {
    return { error: addressError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export async function deleteStudentAddress(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const addressId = Number(formData.get("addressId"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(addressId) || addressId <= 0) {
    return { error: "Invalid address." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: addressError } = await client.supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("student", studentId);

  if (addressError) {
    return { error: addressError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export type CreateStudentPhoneContactState = ActionState;
export type UpdateStudentPhoneContactState = ActionState;

function parsePhoneFields(formData: FormData) {
  return {
    phoneNumber: formData.get("phoneNumber")?.toString().trim() ?? "",
    ownerRole: formData.get("ownerRole")?.toString().trim() ?? "",
    ownerName: formData.get("ownerName")?.toString().trim() || null,
    isPrimary: formData.get("isPrimary") === "true",
  };
}

export async function createStudentPhoneContact(
  _prevState: CreateStudentPhoneContactState,
  formData: FormData,
): Promise<CreateStudentPhoneContactState> {
  const studentId = Number(formData.get("studentId"));
  const { phoneNumber, ownerRole, ownerName, isPrimary } =
    parsePhoneFields(formData);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!phoneNumber) {
    return { error: "Phone number is required." };
  }

  if (!isPhoneOwnerRole(ownerRole)) {
    return { error: "Select whose phone this is." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  if (isPrimary) {
    await client.supabase
      .from("student_phone_contacts")
      .update({ is_primary: false })
      .eq("student_id", studentId)
      .eq("is_primary", true);
  }

  const { error: phoneError } = await client.supabase
    .from("student_phone_contacts")
    .insert({
      student_id: studentId,
      phone_number: phoneNumber,
      owner_role: ownerRole,
      owner_name: ownerName,
      is_primary: isPrimary,
    });

  if (phoneError) {
    return { error: phoneError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export async function updateStudentPhoneContact(
  _prevState: UpdateStudentPhoneContactState,
  formData: FormData,
): Promise<UpdateStudentPhoneContactState> {
  const studentId = Number(formData.get("studentId"));
  const phoneId = Number(formData.get("phoneId"));
  const { phoneNumber, ownerRole, ownerName, isPrimary } =
    parsePhoneFields(formData);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(phoneId) || phoneId <= 0) {
    return { error: "Invalid phone contact." };
  }

  if (!phoneNumber) {
    return { error: "Phone number is required." };
  }

  if (!isPhoneOwnerRole(ownerRole)) {
    return { error: "Select whose phone this is." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  if (isPrimary) {
    await client.supabase
      .from("student_phone_contacts")
      .update({ is_primary: false })
      .eq("student_id", studentId)
      .eq("is_primary", true)
      .neq("id", phoneId);
  }

  const { error: phoneError } = await client.supabase
    .from("student_phone_contacts")
    .update({
      phone_number: phoneNumber,
      owner_role: ownerRole,
      owner_name: ownerName,
      is_primary: isPrimary,
    })
    .eq("id", phoneId)
    .eq("student_id", studentId);

  if (phoneError) {
    return { error: phoneError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export async function deleteStudentPhoneContact(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const phoneId = Number(formData.get("phoneId"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!Number.isInteger(phoneId) || phoneId <= 0) {
    return { error: "Invalid phone contact." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: phoneError } = await client.supabase
    .from("student_phone_contacts")
    .delete()
    .eq("id", phoneId)
    .eq("student_id", studentId);

  if (phoneError) {
    return { error: phoneError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export async function updateStudentDob(
  _prevState: UpdateStudentDobState,
  formData: FormData,
): Promise<UpdateStudentDobState> {
  const studentId = Number(formData.get("studentId"));
  const dob = formData.get("dob")?.toString().trim() || null;

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: studentError } = await client.supabase
    .from("students")
    .update({ dob })
    .eq("id", studentId);

  if (studentError) {
    return { error: studentError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export async function updateStudentNotes(
  _prevState: UpdateStudentNotesState,
  formData: FormData,
): Promise<UpdateStudentNotesState> {
  const studentId = Number(formData.get("studentId"));
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: studentError } = await client.supabase
    .from("students")
    .update({ notes })
    .eq("id", studentId);

  if (studentError) {
    return { error: studentError.message };
  }

  revalidateStudent(studentId);
  revalidatePath("/schedule");
  return { success: true };
}

export async function updateStudentName(
  _prevState: UpdateStudentNameState,
  formData: FormData,
): Promise<UpdateStudentNameState> {
  const studentId = Number(formData.get("studentId"));
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = formData.get("lastName")?.toString().trim() || null;

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!firstName) {
    return { error: "First name is required." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: studentError } = await client.supabase
    .from("students")
    .update({
      "first name": firstName,
      "last name": lastName,
    })
    .eq("id", studentId);

  if (studentError) {
    return { error: studentError.message };
  }

  revalidateStudent(studentId);
  revalidatePath("/classes", "layout");
  return { success: true };
}

export type UpdateEnrollmentGradeState = ActionState;

export async function updateEnrollmentGradeLevel(
  _prevState: UpdateEnrollmentGradeState,
  formData: FormData,
): Promise<UpdateEnrollmentGradeState> {
  const enrollmentId = Number(formData.get("enrollmentId"));
  const studentId = Number(formData.get("studentId"));
  const preset = formData.get("gradePreset")?.toString().trim() ?? "";
  const custom = formData.get("gradeCustom")?.toString().trim() ?? "";

  let gradeLevel: string | null = null;
  if (preset === "__custom__" || (!preset && custom)) {
    gradeLevel = custom || null;
  } else if (preset) {
    gradeLevel = preset;
  }

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return { error: "Invalid enrollment." };
  }

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error } = await client.supabase
    .from("enrollments")
    .update({ grade_level: gradeLevel })
    .eq("id", enrollmentId)
    .eq("student id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidateStudent(studentId);
  revalidatePath("/tutors", "layout");
  return { success: true };
}

export async function deleteStudent(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: enrollments, error: enrollmentsLookupError } =
    await client.supabase
      .from("enrollments")
      .select('"class id"')
      .eq("student id", studentId);

  if (enrollmentsLookupError) {
    return { error: enrollmentsLookupError.message };
  }

  const classIds = [
    ...new Set(
      (enrollments ?? [])
        .map((row) => row["class id"])
        .filter((id): id is number => typeof id === "number"),
    ),
  ];

  const { data: receipts, error: receiptsLookupError } = await client.supabase
    .from("student_receipts")
    .select("storage_path")
    .eq("student_id", studentId);

  if (receiptsLookupError) {
    return { error: receiptsLookupError.message };
  }

  const receiptPaths = (receipts ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  if (receiptPaths.length > 0) {
    await client.supabase.storage
      .from(STUDENT_RECEIPT_BUCKET)
      .remove(receiptPaths);
  }

  const { error: enrollmentError } = await client.supabase
    .from("enrollments")
    .delete()
    .eq("student id", studentId);

  if (enrollmentError) {
    return { error: enrollmentError.message };
  }

  const syncError = await deactivateClassesWithNoActiveEnrollments(
    client.supabase,
    classIds,
  );

  if (syncError) {
    return { error: syncError };
  }

  const { error: studentError } = await client.supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (studentError) {
    return { error: studentError.message };
  }

  revalidatePath("/students");
  revalidatePath("/classes", "layout");
  revalidatePath("/schedule");
  return { success: true };
}

export async function updateStudentActive(
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const isActive = formData.get("isActive") === "true";

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { error: studentError } = await client.supabase
    .from("students")
    .update({ is_active: isActive })
    .eq("id", studentId);

  if (studentError) {
    return { error: studentError.message };
  }

  if (!isActive) {
    const { data: enrollments, error: enrollmentsError } = await client.supabase
      .from("enrollments")
      .select('"class id"')
      .eq("student id", studentId);

    if (enrollmentsError) {
      return { error: enrollmentsError.message };
    }

    const classIds = [
      ...new Set(
        (enrollments ?? [])
          .map((row) => row["class id"])
          .filter((id): id is number => typeof id === "number"),
      ),
    ];

    const syncError = await deactivateClassesWithNoActiveEnrollments(
      client.supabase,
      classIds,
    );

    if (syncError) {
      return { error: syncError };
    }
  }

  revalidateStudent(studentId);
  revalidatePath("/classes", "layout");
  return { success: true };
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function uploadStudentReceipt(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const note = formData.get("note")?.toString().trim() || null;
  const file = formData.get("receipt");

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a receipt photo to upload." };
  }

  if (!isStudentReceiptMimeType(file.type)) {
    return { error: "Receipt must be an image (JPEG, PNG, WebP, GIF, or HEIC)." };
  }

  if (file.size > MAX_STUDENT_RECEIPT_FILE_BYTES) {
    return { error: "Receipt photo is too large. Max size is 10 MB." };
  }

  const staff = await requireStaff();
  const client = getServiceClient();
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

  const storagePath = `${studentId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await client.supabase.storage
    .from(STUDENT_RECEIPT_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: insertError } = await client.supabase
    .from("student_receipts")
    .insert({
      student_id: studentId,
      storage_path: storagePath,
      file_name: file.name.slice(0, 200),
      mime_type: file.type || null,
      note,
      uploaded_by: staff.id,
    });

  if (insertError) {
    await client.supabase.storage
      .from(STUDENT_RECEIPT_BUCKET)
      .remove([storagePath]);
    return { error: insertError.message };
  }

  revalidateStudent(studentId);
  return { success: true };
}

export async function deleteStudentReceipt(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const studentId = Number(formData.get("studentId"));
  const receiptId = Number(formData.get("receiptId"));

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }
  if (!Number.isInteger(receiptId) || receiptId <= 0) {
    return { error: "Invalid receipt." };
  }

  await requireStaff();
  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: existing, error: loadError } = await client.supabase
    .from("student_receipts")
    .select("id, storage_path")
    .eq("id", receiptId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (loadError) {
    return { error: loadError.message };
  }
  if (!existing) {
    return { error: "Receipt not found." };
  }

  const { error: deleteError } = await client.supabase
    .from("student_receipts")
    .delete()
    .eq("id", receiptId)
    .eq("student_id", studentId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (existing.storage_path) {
    await client.supabase.storage
      .from(STUDENT_RECEIPT_BUCKET)
      .remove([existing.storage_path]);
  }

  revalidateStudent(studentId);
  return { success: true };
}
