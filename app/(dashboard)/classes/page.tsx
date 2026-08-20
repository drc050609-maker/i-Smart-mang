import { cookies } from "next/headers";

import {
  AddClassDialog,
  type RoomOption,
  type TeacherOption,
} from "@/components/add-class-dialog";
import { ClassesListTable } from "@/components/classes-list-table";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { isCatalogTrialClass } from "@/lib/class-lesson-type";
import { isFrontDeskStaffRole } from "@/lib/staff-role";
import { listKnownClassSubjects } from "@/lib/class-subject";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";
import type { ClassSearchRow } from "@/lib/class-list";
import { sortTeachers } from "@/lib/person-name";
import { listPriceSheetSubjects } from "@/lib/tuition-price-sheet";

type TeacherEmbed = {
  id?: number;
  first_name: string;
  last_name: string | null;
  is_active?: boolean | null;
};

type RoomEmbed = {
  id?: number;
  room_number: string;
  class_size?: number;
};

type ClassTeacherLink = {
  class_id: number;
  teacher_id: number;
  teachers:
    | { id: number; first_name: string; last_name: string | null; is_active: boolean }
    | { id: number; first_name: string; last_name: string | null; is_active: boolean }[]
    | null;
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
  trial_format: string | null;
  class_track: string | null;
  is_active: boolean;
  teacher_id: number | null;
  room_id: number | null;
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
    { data: classTeacherLinks },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(
        `
      id,
      subject,
      duration_minutes,
      lesson_type,
      trial_format,
      class_track,
      is_active,
      teacher_id,
      room_id,
      teachers!classes_teacher_id_fkey ( id, first_name, last_name, is_active ),
      rooms ( id, room_number, class_size ),
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
      .eq("position", "teacher")
      .eq("location_id", locationId)
      .order("first_name"),
    supabase
      .from("rooms")
      .select("id, room_number, class_size")
      .eq("location_id", locationId)
      .order("room_number"),
    supabase
      .from("class_teachers")
      .select(
        `
        class_id,
        teacher_id,
        teachers ( id, first_name, last_name, is_active ),
        classes!inner ( location_id )
      `,
      )
      .eq("classes.location_id", locationId),
  ]);

  const teacherOptions = sortTeachers((teachers as TeacherOption[] | null) ?? []);
  const roomOptions = (rooms as RoomOption[] | null) ?? [];
  const teachersByClassId = new Map<number, TeacherOption[]>();
  for (const link of (classTeacherLinks as ClassTeacherLink[] | null) ?? []) {
    const linked = firstOrNull(link.teachers);
    if (!linked || linked.is_active === false) continue;
    const current = teachersByClassId.get(link.class_id) ?? [];
    if (current.some((teacher) => teacher.id === linked.id)) continue;
    teachersByClassId.set(link.class_id, [
      ...current,
      {
        id: linked.id,
        first_name: linked.first_name,
        last_name: linked.last_name,
      },
    ]);
  }

  const subjectOptions = listKnownClassSubjects([
    ...listPriceSheetSubjects(),
    ...((classes as ClassWithDetails[] | null)?.map((row) => row.subject) ?? []),
  ]);
  const classRows: ClassSearchRow[] =
    (classes as ClassWithDetails[] | null)
      ?.filter((classRow) => !isCatalogTrialClass(classRow))
      .map((classRow) => {
      const teacherEmbed = firstOrNull(classRow.teachers);
      const ownerTeacher =
        teacherEmbed &&
        teacherEmbed.is_active !== false &&
        teacherEmbed.id != null
          ? {
              id: teacherEmbed.id,
              first_name: teacherEmbed.first_name,
              last_name: teacherEmbed.last_name,
            }
          : null;
      const room = firstOrNull(classRow.rooms);
      const assignedFromJoin = teachersByClassId.get(classRow.id) ?? [];
      const assignedTeachers =
        assignedFromJoin.length > 0
          ? assignedFromJoin
          : ownerTeacher
            ? [ownerTeacher]
            : [];

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
        trial_format: classRow.trial_format,
        class_track: classRow.class_track,
        is_active: classRow.is_active,
        teacher: assignedTeachers[0] ?? ownerTeacher,
        assignedTeachers,
        room_id: classRow.room_id,
        room_number: room?.room_number ?? null,
        room_class_size: room?.class_size ?? null,
      };
    }) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.classes")}
        </h1>
        <AddClassDialog
          teachers={teacherOptions}
          rooms={roomOptions}
          subjects={subjectOptions}
        />
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

      {classRows.length > 0 ? (
        <ClassesListTable
          classes={classRows}
          teachers={teacherOptions}
          rooms={roomOptions}
          canDelete={!isFrontDeskStaffRole(staff.role)}
        />
      ) : null}
    </div>
  );
}
