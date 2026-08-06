import { cookies } from "next/headers";

import { ScheduleCalendarLoader } from "@/components/schedule-calendar-loader";
import type { ScheduleStudent, ScheduleTeacher } from "@/lib/schedule-calendar";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import { sortTeachers } from "@/lib/person-name";
import {
  fetchTeacherScheduleCounts,
  loadScheduleCalendarEvents,
  pickBusiestTeacherId,
} from "@/lib/schedule-load";
import { createClient } from "@/utils/supabase/server";

const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      return { data: rows, error: error.message };
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return { data: rows, error: null };
}

export default async function SchedulePage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.schedule"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const [
    { data: teachers, error: teachersError },
    { data: students, error: studentsError },
    { data: teacherCounts, error: countsError },
  ] = await Promise.all([
    fetchAllRows<{
      id: number;
      first_name: string;
      last_name: string | null;
    }>((from, to) =>
      supabase
        .from("teachers")
        .select("id, first_name, last_name")
        .eq("is_active", true)
        .eq("position", "teacher")
        .eq("location_id", locationId)
        .order("first_name")
        .range(from, to),
    ),
    fetchAllRows<ScheduleStudent>((from, to) =>
      supabase
        .from("students")
        .select('id, "first name", "last name"')
        .eq("is_active", true)
        .eq("location_id", locationId)
        .order("first name")
        .range(from, to),
    ),
    fetchTeacherScheduleCounts(supabase, locationId),
  ]);

  const busiestTeacherId = pickBusiestTeacherId(teacherCounts);
  const initialTeacherIds = busiestTeacherId != null ? [busiestTeacherId] : [];

  const {
    events: initialEvents,
    exceptions: initialExceptions,
    error: eventsError,
  } = await loadScheduleCalendarEvents(
    supabase,
    locationId,
    initialTeacherIds.length > 0 ? initialTeacherIds : null,
  );

  const error =
    teachersError ?? studentsError ?? countsError ?? eventsError ?? null;

  const teacherOptions: ScheduleTeacher[] = sortTeachers(
    teachers.map((teacher) => ({
      ...teacher,
      class_count: teacherCounts.get(teacher.id) ?? 0,
    })),
  );

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.schedule")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.scheduleSubtitle")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", {
            entity: t("nav.schedule"),
            message: error,
          })}
        </p>
      ) : (
        <ScheduleCalendarLoader
          teachers={teacherOptions}
          students={students}
          initialTeacherIds={initialTeacherIds}
          initialEvents={initialEvents}
          initialExceptions={initialExceptions}
        />
      )}
    </div>
  );
}
