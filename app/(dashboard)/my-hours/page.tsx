import { cookies } from "next/headers";

import { FrontDeskHoursSection } from "@/components/front-desk-hours-section";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { formatTeacherName } from "@/lib/person-name";
import { isFrontDeskStaffRole } from "@/lib/staff-role";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function MyHoursPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);

  if (!isFrontDeskStaffRole(staff.role)) {
    redirect(staff.teacher_id ? `/tutors/${staff.teacher_id}` : "/tutors");
  }

  if (!staff.teacher_id) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("common.myHoursTitle")}
        </h1>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.frontDeskProfileMissing")}
        </p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, hourly_rate_cents, position")
    .eq("id", staff.teacher_id)
    .maybeSingle();

  if (teacherError || !teacher || teacher.position !== "front_desk") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("common.myHoursTitle")}
        </h1>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {teacherError?.message ?? t("common.frontDeskProfileMissing")}
        </p>
      </div>
    );
  }

  const { data: logs } = await supabase
    .from("front_desk_hour_logs")
    .select("id, work_date, clock_in, clock_out, hours, rate_cents, notes")
    .eq("teacher_id", teacher.id)
    .order("work_date", { ascending: false });

  const hourLogs = (logs ?? []).map((log) => ({
    ...log,
    hours: Number(log.hours),
  }));

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("common.myHoursTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatTeacherName(teacher)} · {t("common.myHoursSubtitle")}
        </p>
      </div>

      <FrontDeskHoursSection
        teacherId={teacher.id}
        hourlyRateCents={teacher.hourly_rate_cents}
        logs={hourLogs}
      />
    </div>
  );
}
