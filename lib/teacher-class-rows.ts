import type { ReusableClassRow } from "@/lib/find-reusable-class";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Classes owned by this teacher (classes.teacher_id).
 * Co-teacher links are not included: the calendar and schedule add flow key
 * off the owner, so reusing another teacher's class would hide new students.
 */
export async function loadTeacherClassRows(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  teacherId: number,
  locationId: number,
): Promise<{ error: string | null; classes: ReusableClassRow[] }> {
  const { data: ownedRows, error: ownedError } = await supabase
    .from("classes")
    .select("id, subject, duration_minutes, lesson_type")
    .eq("teacher_id", teacherId)
    .eq("location_id", locationId)
    .eq("is_active", true)
    .order("subject");

  if (ownedError) {
    return { error: ownedError.message, classes: [] };
  }

  return {
    error: null,
    classes: (ownedRows ?? []).map((row) => ({
      id: row.id,
      subject: row.subject,
      duration_minutes: row.duration_minutes,
      lesson_type: row.lesson_type,
    })),
  };
}
