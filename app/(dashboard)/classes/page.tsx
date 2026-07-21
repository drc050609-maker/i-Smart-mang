import { cookies } from "next/headers";

import {
  AddClassDialog,
  type RoomOption,
  type TeacherOption,
} from "@/components/add-class-dialog";
import { ClassesListTable } from "@/components/classes-list-table";
import { TrialClassDialog } from "@/components/trial-class-dialog";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";
import type { ClassSearchRow } from "@/lib/class-list";
import { formatTeacherName, sortTeachers } from "@/lib/person-name";
import { TRIAL_CLASS_SUBJECTS } from "@/lib/trial-class";

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type RoomEmbed = {
  room_number: string;
};

type ClassScheduleEmbed = {
  id: number;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
};

type ClassWithDetails = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  lesson_type: string | null;
  class_track: string | null;
  is_active: boolean;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
  class_schedules: ClassScheduleEmbed | ClassScheduleEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function listOrEmpty<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function ClassesPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.classes"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const [
    { data: classes, error },
    { data: teachers },
    { data: rooms },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(
        `
      id,
      subject,
      duration_minutes,
      lesson_type,
      class_track,
      is_active,
      teachers!classes_teacher_id_fkey ( first_name, last_name ),
      rooms ( room_number ),
      class_schedules (
        id,
        is_recurring,
        schedule_day_of_week,
        schedule_date,
        schedule_start_time,
        schedule_end_time
      )
    `,
      )
      .eq("location_id", locationId),
    supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .eq("location_id", locationId)
      .order("first_name"),
    supabase
      .from("rooms")
      .select("id, room_number, class_size")
      .eq("location_id", locationId)
      .order("room_number"),
  ]);

  const teacherOptions = sortTeachers((teachers as TeacherOption[] | null) ?? []);
  const trialTeachers = teacherOptions.map((teacher) => ({
    id: teacher.id,
    name: formatTeacherName(teacher),
  }));
  const roomOptions = (rooms as RoomOption[] | null) ?? [];
  const classRows: ClassSearchRow[] =
    (classes as ClassWithDetails[] | null)?.map((classRow) => {
      const teacher = firstOrNull(classRow.teachers);
      const room = firstOrNull(classRow.rooms);

      return {
        id: classRow.id,
        subject: classRow.subject,
        duration_minutes: classRow.duration_minutes,
        schedules: listOrEmpty(classRow.class_schedules).map((schedule) => ({
          is_recurring: schedule.is_recurring,
          schedule_day_of_week: schedule.schedule_day_of_week,
          schedule_date: schedule.schedule_date,
          schedule_start_time: schedule.schedule_start_time,
          schedule_end_time: schedule.schedule_end_time,
        })),
        lesson_type: classRow.lesson_type,
        class_track: classRow.class_track,
        is_active: classRow.is_active,
        teacher,
        room_number: room?.room_number ?? null,
      };
    }) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.classes")}
        </h1>
        <div className="flex items-center gap-3">
          <TrialClassDialog
            subjects={[...TRIAL_CLASS_SUBJECTS]}
            teachers={trialTeachers}
          />
          <AddClassDialog teachers={teacherOptions} rooms={roomOptions} />
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.classes"), message: error.message })}
        </p>
      ) : null}

      {!error && classRows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.empty.runSeed", { entity: t("nav.classes").toLowerCase() })}
        </p>
      ) : null}

      {classRows.length > 0 ? <ClassesListTable classes={classRows} /> : null}
    </div>
  );
}
