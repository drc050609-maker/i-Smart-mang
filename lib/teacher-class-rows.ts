import type { ReusableClassRow } from "@/lib/find-reusable-class";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function loadTeacherClassRows(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  teacherId: number,
  locationId: number,
): Promise<{ error: string | null; classes: ReusableClassRow[] }> {
  const [{ data: linkedRows, error: linkedError }, { data: ownedRows, error: ownedError }] =
    await Promise.all([
      supabase
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", teacherId),
      supabase
        .from("classes")
        .select("id, subject, duration_minutes, lesson_type")
        .eq("teacher_id", teacherId)
        .eq("location_id", locationId)
        .eq("is_active", true),
    ]);

  if (linkedError) {
    return { error: linkedError.message, classes: [] };
  }
  if (ownedError) {
    return { error: ownedError.message, classes: [] };
  }

  const linkedIds = [
    ...new Set(
      (linkedRows ?? [])
        .map((row) => row.class_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];

  let linkedClasses: typeof ownedRows = [];
  if (linkedIds.length > 0) {
    const { data, error } = await supabase
      .from("classes")
      .select("id, subject, duration_minutes, lesson_type")
      .in("id", linkedIds)
      .eq("location_id", locationId)
      .eq("is_active", true);
    if (error) {
      return { error: error.message, classes: [] };
    }
    linkedClasses = data ?? [];
  }

  const byId = new Map<number, ReusableClassRow>();
  for (const row of [...(ownedRows ?? []), ...(linkedClasses ?? [])]) {
    byId.set(row.id, {
      id: row.id,
      subject: row.subject,
      duration_minutes: row.duration_minutes,
      lesson_type: row.lesson_type,
    });
  }

  return {
    error: null,
    classes: [...byId.values()].sort((a, b) => a.subject.localeCompare(b.subject)),
  };
}
