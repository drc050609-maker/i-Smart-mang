"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireStaff, type StaffAccount } from "@/lib/auth";
import {
  isValidStatementMonth,
  revalidateStatementMonthPaths,
} from "@/lib/statements";
import { isFrontDeskStaffRole } from "@/lib/staff-role";
import { createClient } from "@/utils/supabase/server";

export type FrontDeskPaycheckActionState = {
  error?: string;
  success?: boolean;
};

function assertCanSubmitFrontDeskPay(
  staff: StaffAccount,
  teacherId: number,
): string | null {
  if (isFrontDeskStaffRole(staff.role) && staff.teacher_id !== teacherId) {
    return "You can only submit pay for your own front desk profile.";
  }
  return null;
}

export async function recordFrontDeskPaycheck(
  _prevState: FrontDeskPaycheckActionState,
  formData: FormData,
): Promise<FrontDeskPaycheckActionState> {
  const teacherId = Number(formData.get("teacherId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    return { error: "Invalid staff profile." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Invalid year." };
  }

  if (!isValidStatementMonth(month)) {
    return { error: "Invalid month." };
  }

  const staff = await requireStaff();
  const accessError = assertCanSubmitFrontDeskPay(staff, teacherId);
  if (accessError) {
    return { error: accessError };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to submit hours to statements." };
  }

  const { error } = await supabase.rpc("record_front_desk_paycheck", {
    p_teacher_id: teacherId,
    p_year: year,
    p_month: month,
    p_created_by: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/tutors/${teacherId}`);
  revalidatePath("/my-hours");

  for (const path of revalidateStatementMonthPaths(year, month)) {
    revalidatePath(path);
  }

  return { success: true };
}
