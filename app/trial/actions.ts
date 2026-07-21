"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  TRIAL_CLASS_SUBJECTS,
  type TrialClassSubject,
} from "@/lib/trial-class";

export type BookTrialClassState = {
  error?: string;
  success?: boolean;
  studentId?: number;
  classId?: number;
};

function getServiceClient() {
  try {
    return { supabase: createSupabaseServiceClient() };
  } catch {
    return {
      error:
        "Trial signup is temporarily unavailable. Please contact the school.",
    };
  }
}

function parseDate(value: FormDataEntryValue | null) {
  const date = value?.toString().trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return undefined;
  }
  return date;
}

function parseTime(value: FormDataEntryValue | null) {
  const time = value?.toString().trim();
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return undefined;
  }
  return `${time}:00`;
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : null;
}

function parseTeacherId(value: FormDataEntryValue | null) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return undefined;
  }
  return id;
}

function parseSubject(value: FormDataEntryValue | null) {
  const subject = value?.toString().trim();
  if (!subject) {
    return undefined;
  }

  if (!TRIAL_CLASS_SUBJECTS.includes(subject as TrialClassSubject)) {
    return null;
  }

  return subject as TrialClassSubject;
}

function revalidateTrialBooking(classId: number, studentId: number) {
  revalidatePath("/trial");
  revalidatePath("/schedule");
  revalidatePath("/classes");
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/leads");
  revalidatePath("/leads/inquiries");
  revalidatePath("/leads/trials");
  revalidatePath("/payments");
  revalidatePath("/tutors", "layout");
  revalidatePath("/statements");
}

export async function bookTrialClass(
  _prevState: BookTrialClassState,
  formData: FormData,
): Promise<BookTrialClassState> {
  const firstName = formData.get("firstName")?.toString().trim();
  const lastName = parseOptionalText(formData.get("lastName"));
  const dob = parseDate(formData.get("dob"));
  const experience = parseOptionalText(formData.get("experience"));
  const subject = parseSubject(formData.get("subject"));
  const teacherId = parseTeacherId(formData.get("teacherId"));
  const scheduleDate = parseDate(formData.get("scheduleDate"));
  const scheduleStartTime = parseTime(formData.get("scheduleStartTime"));
  const parentPhone = parseOptionalText(formData.get("parentPhone"));
  const parentEmail = parseOptionalText(formData.get("parentEmail"));

  if (!firstName) {
    return { error: "Student first name is required." };
  }

  if (subject === undefined) {
    return { error: "Select a subject." };
  }

  if (subject === null) {
    return { error: "Invalid subject." };
  }

  if (teacherId === undefined) {
    return { error: "Select a teacher." };
  }

  if (!scheduleDate) {
    return { error: "Select a date for the trial class." };
  }

  if (!scheduleStartTime) {
    return { error: "Select a start time." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(`${scheduleDate}T00:00:00`);

  if (selectedDate < today) {
    return { error: "Trial class date must be today or in the future." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data, error } = await client.supabase.rpc("book_trial_class", {
    p_first_name: firstName,
    p_last_name: lastName ?? undefined,
    p_dob: dob ?? undefined,
    p_experience: experience ?? undefined,
    p_subject: subject,
    p_teacher_id: teacherId,
    p_schedule_date: scheduleDate,
    p_schedule_start_time: scheduleStartTime,
    p_parent_phone: parentPhone ?? undefined,
    p_parent_email: parentEmail ?? undefined,
  });

  if (error) {
    return { error: error.message };
  }

  const row = data?.[0];
  if (!row) {
    return { error: "Trial class could not be booked. Please try again." };
  }

  revalidateTrialBooking(row.class_id, row.student_id);

  return {
    success: true,
    studentId: row.student_id,
    classId: row.class_id,
  };
}
