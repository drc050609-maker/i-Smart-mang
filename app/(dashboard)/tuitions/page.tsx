import { cookies } from "next/headers";

import {
  TuitionsTable,
  type TuitionClassRow,
} from "@/components/tuitions-table";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import { buildTuitionPricing } from "@/lib/tuition";
import { createClient } from "@/utils/supabase/server";

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type ClassRow = {
  id: number;
  subject: string;
  duration_minutes: number | null;
  lesson_type: string | null;
  class_track: string | null;
  is_active: boolean;
  single_price_cents: number | null;
  package_20_price_cents: number | null;
  package_50_price_cents: number | null;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function TuitionsPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.tuitions"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const { data: classes, error } = await supabase
    .from("classes")
    .select(
      `
      id,
      subject,
      duration_minutes,
      lesson_type,
      class_track,
      is_active,
      single_price_cents,
      package_20_price_cents,
      package_50_price_cents,
      teachers!classes_teacher_id_fkey ( first_name, last_name )
    `,
    )
    .eq("location_id", locationId)
    .order("subject");

  const tuitionRows: TuitionClassRow[] =
    (classes as ClassRow[] | null)?.map((classRow) => {
      const teacher = firstOrNull(classRow.teachers);

      return {
        id: classRow.id,
        subject: classRow.subject,
        duration_minutes: classRow.duration_minutes,
        lesson_type: classRow.lesson_type,
        class_track: classRow.class_track,
        is_active: classRow.is_active,
        teacher,
        pricing: buildTuitionPricing(
          classRow.duration_minutes,
          classRow.lesson_type,
          {
            single_price_cents: classRow.single_price_cents,
            package_20_price_cents: classRow.package_20_price_cents,
            package_50_price_cents: classRow.package_50_price_cents,
          },
        ),
      };
    }) ?? [];

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.tuitions")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.tuitionsSubtitle")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.tuitions"), message: error.message })}
        </p>
      ) : tuitionRows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("common.noClassesYet")}
        </p>
      ) : (
        <TuitionsTable classes={tuitionRows} />
      )}
    </div>
  );
}
