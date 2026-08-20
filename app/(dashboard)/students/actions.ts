"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { deactivateClassesWithNoActiveEnrollments } from "@/lib/class-active";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_STARTING_CLASS_CREDITS,
  parseClassCreditCount,
  parseStartingClassCredits,
} from "@/lib/class-session-credits";
import { isPhoneOwnerRole, type PhoneOwnerRole } from "@/lib/phone-owner";
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

export type SaveStudentDetailsState = ActionState;

type SaveStudentDetailsPayload = {
  firstName: string;
  lastName: string | null;
  dob: string | null;
  isActive: boolean;
  notes: string | null;
  experience: string | null;
  startingClassCredits: number;
  gender: "male" | "female" | null;
  parentName: string | null;
  trialTimePreference: "weekday" | "weekend" | null;
  phones: Array<{
    id: number | null;
    phoneNumber: string;
    ownerRole: PhoneOwnerRole;
    ownerName: string | null;
    isPrimary: boolean;
  }>;
  deletedPhoneIds: number[];
  addresses: Array<{
    id: number | null;
    street1: string;
    street2: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  }>;
  deletedAddressIds: number[];
  enrollments: Array<{
    id: number;
    gradeLevel: string | null;
    isActive: boolean;
  }>;
  removedEnrollmentIds: number[];
  newClassIds: number[];
  credits: Array<{
    classId: number;
    sessionsTotal: number;
    sessionsRemaining: number;
    sessionsUsed: number;
    absenceCount: number;
  }>;
  receiptNotes: Array<{
    id: number;
    note: string | null;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown) {
  const text = asString(value).trim();
  return text ? text : null;
}

function asBoolean(value: unknown) {
  return value === true;
}

function asIdArray(value: unknown) {
  if (!Array.isArray(value)) return null;
  const ids: number[] = [];
  for (const item of value) {
    const id = Number(item);
    if (!Number.isInteger(id) || id <= 0) return null;
    ids.push(id);
  }
  return ids;
}

function parseDobValue(value: unknown) {
  const raw = asString(value).trim();
  if (!raw) return { ok: true as const, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { ok: false as const, error: "Enter a valid date of birth." };
  }
  return { ok: true as const, value: raw };
}

function parseSaveStudentDetailsPayload(
  raw: unknown,
): { error: string } | { payload: SaveStudentDetailsPayload } {
  const data = asRecord(raw);
  if (!data) {
    return { error: "Invalid student details." };
  }

  const firstName = asString(data.firstName).trim();
  if (!firstName) {
    return { error: "First name is required." };
  }

  const dob = parseDobValue(data.dob);
  if (!dob.ok) {
    return { error: dob.error };
  }

  const startingClassCredits = parseStartingClassCredits(
    String(data.startingClassCredits ?? ""),
  );
  if (startingClassCredits === null) {
    return {
      error: "Starting class sessions must be a whole number from 0 to 500.",
    };
  }

  const genderRaw = asString(data.gender).trim();
  let gender: "male" | "female" | null = null;
  if (genderRaw === "male" || genderRaw === "female") {
    gender = genderRaw;
  } else if (genderRaw) {
    return { error: "Select male or female, or leave gender blank." };
  }

  const trialRaw = asString(data.trialTimePreference).trim();
  let trialTimePreference: "weekday" | "weekend" | null = null;
  if (trialRaw === "weekday" || trialRaw === "weekend") {
    trialTimePreference = trialRaw;
  } else if (trialRaw) {
    return { error: "Select weekday or weekend, or leave trial time blank." };
  }

  if (!Array.isArray(data.phones)) {
    return { error: "Invalid phone list." };
  }

  const phones: SaveStudentDetailsPayload["phones"] = [];
  for (const item of data.phones) {
    const phone = asRecord(item);
    if (!phone) return { error: "Invalid phone contact." };
    const phoneNumber = asString(phone.phoneNumber).trim();
    const ownerRole = asString(phone.ownerRole).trim();
    if (!phoneNumber) {
      return { error: "Phone number is required." };
    }
    if (!isPhoneOwnerRole(ownerRole)) {
      return { error: "Select whose phone this is." };
    }
    const id = phone.id == null ? null : Number(phone.id);
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      return { error: "Invalid phone contact." };
    }
    phones.push({
      id,
      phoneNumber,
      ownerRole,
      ownerName: asNullableString(phone.ownerName),
      isPrimary: asBoolean(phone.isPrimary),
    });
  }

  if (!Array.isArray(data.addresses)) {
    return { error: "Invalid address list." };
  }

  const addresses: SaveStudentDetailsPayload["addresses"] = [];
  for (const item of data.addresses) {
    const address = asRecord(item);
    if (!address) return { error: "Invalid address." };
    const street1 = asString(address.street1).trim();
    if (!street1) {
      return { error: "Street address is required." };
    }
    const zipCode = asNullableString(address.zipCode);
    const zipError = validateZipCode(zipCode);
    if (zipError) {
      return { error: zipError };
    }
    const id = address.id == null ? null : Number(address.id);
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      return { error: "Invalid address." };
    }
    addresses.push({
      id,
      street1,
      street2: asNullableString(address.street2),
      city: asNullableString(address.city),
      state: asNullableString(address.state),
      zipCode,
    });
  }

  const deletedPhoneIds = asIdArray(data.deletedPhoneIds);
  const deletedAddressIds = asIdArray(data.deletedAddressIds);
  const removedEnrollmentIds = asIdArray(data.removedEnrollmentIds);
  const newClassIds = asIdArray(data.newClassIds);
  if (
    !deletedPhoneIds ||
    !deletedAddressIds ||
    !removedEnrollmentIds ||
    !newClassIds
  ) {
    return { error: "Invalid student details." };
  }

  if (!Array.isArray(data.enrollments)) {
    return { error: "Invalid class list." };
  }

  const enrollments: SaveStudentDetailsPayload["enrollments"] = [];
  for (const item of data.enrollments) {
    const enrollment = asRecord(item);
    if (!enrollment) return { error: "Invalid enrollment." };
    const id = Number(enrollment.id);
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Invalid enrollment." };
    }
    enrollments.push({
      id,
      gradeLevel: asNullableString(enrollment.gradeLevel),
      isActive: asBoolean(enrollment.isActive),
    });
  }

  if (!Array.isArray(data.credits)) {
    return { error: "Invalid class credits." };
  }

  const credits: SaveStudentDetailsPayload["credits"] = [];
  for (const item of data.credits) {
    const credit = asRecord(item);
    if (!credit) return { error: "Invalid class credits." };
    const classId = Number(credit.classId);
    const sessionsTotal = parseClassCreditCount(
      String(credit.sessionsTotal ?? ""),
    );
    const sessionsRemaining = parseClassCreditCount(
      String(credit.sessionsRemaining ?? ""),
    );
    const sessionsUsed = parseClassCreditCount(
      String(credit.sessionsUsed ?? ""),
    );
    const absenceCount = parseClassCreditCount(
      String(credit.absenceCount ?? ""),
    );
    if (!Number.isInteger(classId) || classId <= 0) {
      return { error: "Invalid class credits." };
    }
    if (
      sessionsTotal === null ||
      sessionsRemaining === null ||
      sessionsUsed === null ||
      absenceCount === null
    ) {
      return {
        error: "Enter whole numbers from 0 to 9999 for every credit field.",
      };
    }
    credits.push({
      classId,
      sessionsTotal,
      sessionsRemaining,
      sessionsUsed,
      absenceCount,
    });
  }

  if (!Array.isArray(data.receiptNotes)) {
    return { error: "Invalid receipts." };
  }

  const receiptNotes: SaveStudentDetailsPayload["receiptNotes"] = [];
  for (const item of data.receiptNotes) {
    const receipt = asRecord(item);
    if (!receipt) return { error: "Invalid receipts." };
    const id = Number(receipt.id);
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Invalid receipts." };
    }
    receiptNotes.push({
      id,
      note: asNullableString(receipt.note),
    });
  }

  return {
    payload: {
      firstName,
      lastName: asNullableString(data.lastName),
      dob: dob.value,
      isActive: asBoolean(data.isActive),
      notes: asNullableString(data.notes),
      experience: asNullableString(data.experience),
      startingClassCredits,
      gender,
      parentName: asNullableString(data.parentName),
      trialTimePreference,
      phones,
      deletedPhoneIds,
      addresses,
      deletedAddressIds,
      enrollments,
      removedEnrollmentIds,
      newClassIds,
      credits,
      receiptNotes,
    },
  };
}

export async function saveStudentDetails(
  _prevState: SaveStudentDetailsState,
  formData: FormData,
): Promise<SaveStudentDetailsState> {
  const studentId = Number(formData.get("studentId"));
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: "Invalid student." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(formData.get("payload")?.toString() ?? "");
  } catch {
    return { error: "Invalid student details." };
  }

  const parsed = parseSaveStudentDetailsPayload(parsedJson);
  if ("error" in parsed) {
    return parsed;
  }

  const { payload } = parsed;
  await requireStaff();

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: existingStudent, error: existingError } = await client.supabase
    .from("students")
    .select("id, is_active")
    .eq("id", studentId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }
  if (!existingStudent) {
    return { error: "Student not found." };
  }

  const { error: studentError } = await client.supabase
    .from("students")
    .update({
      "first name": payload.firstName,
      "last name": payload.lastName,
      dob: payload.dob,
      is_active: payload.isActive,
      notes: payload.notes,
      experience: payload.experience,
      starting_class_credits: payload.startingClassCredits,
      gender: payload.gender,
      parent_name: payload.parentName,
      trial_time_preference: payload.trialTimePreference,
    })
    .eq("id", studentId);

  if (studentError) {
    return { error: studentError.message };
  }

  if (payload.deletedPhoneIds.length > 0) {
    const { error } = await client.supabase
      .from("student_phone_contacts")
      .delete()
      .eq("student_id", studentId)
      .in("id", payload.deletedPhoneIds);
    if (error) return { error: error.message };
  }

  const primaryPhone = payload.phones.find((phone) => phone.isPrimary) ?? null;
  if (primaryPhone) {
    const { error } = await client.supabase
      .from("student_phone_contacts")
      .update({ is_primary: false })
      .eq("student_id", studentId)
      .eq("is_primary", true);
    if (error) return { error: error.message };
  }

  for (const phone of payload.phones) {
    const fields = {
      phone_number: phone.phoneNumber,
      owner_role: phone.ownerRole,
      owner_name: phone.ownerName,
      is_primary: phone.isPrimary,
    };
    if (phone.id) {
      const { error } = await client.supabase
        .from("student_phone_contacts")
        .update(fields)
        .eq("id", phone.id)
        .eq("student_id", studentId);
      if (error) return { error: error.message };
    } else {
      const { error } = await client.supabase.from("student_phone_contacts").insert({
        student_id: studentId,
        ...fields,
      });
      if (error) return { error: error.message };
    }
  }

  if (payload.deletedAddressIds.length > 0) {
    const { error } = await client.supabase
      .from("addresses")
      .delete()
      .eq("student", studentId)
      .in("id", payload.deletedAddressIds);
    if (error) return { error: error.message };
  }

  for (const address of payload.addresses) {
    const fields = {
      "street 1": address.street1,
      "street 2": address.street2,
      city: address.city,
      state: address.state,
      "zip code": address.zipCode,
    };
    if (address.id) {
      const { error } = await client.supabase
        .from("addresses")
        .update(fields)
        .eq("id", address.id)
        .eq("student", studentId);
      if (error) return { error: error.message };
    } else {
      const { error } = await client.supabase.from("addresses").insert({
        student: studentId,
        ...fields,
      });
      if (error) return { error: error.message };
    }
  }

  const removedEnrollmentSet = new Set(payload.removedEnrollmentIds);
  const classIdsToSync = new Set<number>();

  if (payload.removedEnrollmentIds.length > 0) {
    const { data: removedRows, error: removedLookupError } =
      await client.supabase
        .from("enrollments")
        .select('id, "class id"')
        .eq("student id", studentId)
        .in("id", payload.removedEnrollmentIds);

    if (removedLookupError) {
      return { error: removedLookupError.message };
    }

    for (const row of removedRows ?? []) {
      if (typeof row["class id"] === "number") {
        classIdsToSync.add(row["class id"]);
      }
    }

    const { error } = await client.supabase
      .from("enrollments")
      .delete()
      .eq("student id", studentId)
      .in("id", payload.removedEnrollmentIds);
    if (error) return { error: error.message };
  }

  for (const enrollment of payload.enrollments) {
    if (removedEnrollmentSet.has(enrollment.id)) continue;
    const { error } = await client.supabase
      .from("enrollments")
      .update({
        grade_level: enrollment.gradeLevel,
        is_active: enrollment.isActive,
      })
      .eq("id", enrollment.id)
      .eq("student id", studentId);
    if (error) return { error: error.message };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (payload.newClassIds.length > 0) {
    const { data: existingEnrollments, error: existingEnrollError } =
      await client.supabase
        .from("enrollments")
        .select('"class id"')
        .eq("student id", studentId)
        .in("class id", payload.newClassIds);

    if (existingEnrollError) {
      return { error: existingEnrollError.message };
    }

    const alreadyEnrolled = new Set(
      (existingEnrollments ?? [])
        .map((row) => row["class id"])
        .filter((id): id is number => typeof id === "number"),
    );
    const classIdsToInsert = payload.newClassIds.filter(
      (classId) => !alreadyEnrolled.has(classId),
    );

    if (classIdsToInsert.length > 0) {
      const { error: insertError } = await client.supabase.from("enrollments").insert(
        classIdsToInsert.map((classId) => ({
          "class id": classId,
          "student id": studentId,
          created_date: today,
          is_active: true,
          updated_date: today,
        })),
      );
      if (insertError) return { error: insertError.message };

      for (const classId of classIdsToInsert) {
        classIdsToSync.add(classId);
        if (payload.startingClassCredits <= 0) continue;
        const { error: creditsError } = await client.supabase.rpc(
          "add_student_class_credits",
          {
            p_student_id: studentId,
            p_class_id: classId,
            p_count: payload.startingClassCredits,
          },
        );
        if (creditsError) return { error: creditsError.message };
      }
    }
  }

  for (const credit of payload.credits) {
    const { error } = await client.supabase.from("student_class_balances").upsert(
      {
        student_id: studentId,
        class_id: credit.classId,
        sessions_total: credit.sessionsTotal,
        sessions_remaining: credit.sessionsRemaining,
        sessions_used: credit.sessionsUsed,
        absence_count: credit.absenceCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,class_id" },
    );
    if (error) return { error: error.message };
    classIdsToSync.add(credit.classId);
  }

  for (const receipt of payload.receiptNotes) {
    const { error } = await client.supabase
      .from("student_receipts")
      .update({ note: receipt.note })
      .eq("id", receipt.id)
      .eq("student_id", studentId);
    if (error) return { error: error.message };
  }

  if (!payload.isActive || classIdsToSync.size > 0) {
    const { data: remainingEnrollments, error: remainingError } =
      await client.supabase
        .from("enrollments")
        .select('"class id"')
        .eq("student id", studentId);

    if (remainingError) {
      return { error: remainingError.message };
    }

    for (const row of remainingEnrollments ?? []) {
      if (typeof row["class id"] === "number") {
        classIdsToSync.add(row["class id"]);
      }
    }

    const syncError = await deactivateClassesWithNoActiveEnrollments(
      client.supabase,
      [...classIdsToSync],
    );
    if (syncError) {
      return { error: syncError };
    }
  }

  revalidateStudent(studentId);
  revalidatePath("/classes", "layout");
  revalidatePath("/tutors", "layout");
  revalidatePath("/schedule");
  revalidatePath("/payments");
  revalidatePath("/attendance");
  for (const classId of classIdsToSync) {
    revalidatePath(`/classes/${classId}`);
  }

  return { success: true };
}
