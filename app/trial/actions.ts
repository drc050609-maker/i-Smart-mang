"use server";

import { revalidatePath } from "next/cache";

import { parseTypedTime } from "@/lib/class-schedule";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { parseTrialFormat } from "@/lib/class-lesson-type";
import {
  parseTrialFeeUsd,
  TRIAL_CLASS_PRICE_USD,
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
  return parseTypedTime(value?.toString()) ?? undefined;
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
  const gender = parseOptionalText(formData.get("gender"));
  const parentName = parseOptionalText(formData.get("parentName"));
  const address = parseOptionalText(formData.get("address"));
  const trialTimePreference = parseOptionalText(
    formData.get("trialTimePreference"),
  );
  const durationRaw = formData.get("durationMinutes")?.toString().trim() ?? "";
  const durationMinutes =
    durationRaw === "" ? undefined : Number(durationRaw);
  const trialFormat = parseTrialFormat(formData.get("trialFormat"));
  const trialFeeUsd = parseTrialFeeUsd(formData.get("trialFeeUsd"));

  if (!firstName) {
    return { error: "Student first name is required." };
  }

  if (gender && gender !== "male" && gender !== "female") {
    return { error: "Select male or female." };
  }

  if (
    trialTimePreference &&
    trialTimePreference !== "weekday" &&
    trialTimePreference !== "weekend"
  ) {
    return { error: "Select weekday or weekend." };
  }

  if (
    durationMinutes !== undefined &&
    (!Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 180)
  ) {
    return { error: "Duration must be between 15 and 180 minutes." };
  }

  if (!trialFormat) {
    return { error: "Select 1-to-1 or group class." };
  }

  if (trialFeeUsd === null) {
    return { error: "Select a trial fee of $25 or $0." };
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
    return { error: "Enter a start time such as 3:30 PM." };
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
    p_gender: gender ?? undefined,
    p_parent_name: parentName ?? undefined,
    p_address: address ?? undefined,
    p_trial_time_preference: trialTimePreference ?? undefined,
    p_duration_minutes: durationMinutes,
    p_trial_format: trialFormat,
    p_trial_price_cents: (trialFeeUsd ?? TRIAL_CLASS_PRICE_USD) * 100,
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
