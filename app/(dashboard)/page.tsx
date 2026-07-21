import Link from "next/link";
import { cookies } from "next/headers";

import { AdminCampusSwitcher } from "@/components/admin-campus-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardLiveClasses } from "@/components/dashboard-live-classes";
import { DashboardUpcomingClasses } from "@/components/dashboard-upcoming-classes";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocation, getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import {
  buildLiveClassItems,
  buildUpcomingTodayClassItems,
} from "@/lib/live-classes";
import { formatTeacherName } from "@/lib/person-name";
import { createClient } from "@/utils/supabase/server";

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type RoomEmbed = {
  room_number: string;
};

type ClassEmbed = {
  id: number;
  subject: string;
  is_active: boolean;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
};

type ScheduleRow = {
  id: number;
  class_id: number;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
  classes: ClassEmbed | ClassEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const quickLinks = [
  { href: "/students", titleKey: "nav.students" as const },
  { href: "/tutors", titleKey: "nav.tutors" as const },
  { href: "/classes", titleKey: "nav.classes" as const },
];

export default async function Home() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const activeCampus = await getActiveCampusLocation(staff);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <div>
        <header className="border-b border-gray-200 pb-6 dark:border-white/10">
          <AdminCampusSwitcher
            activeCampus={activeCampus}
            canSwitch={staff.role === "admin"}
          />
          <h1 className="sr-only">iSmart Music Center</h1>
          <BrandLogo className="mt-2 h-auto w-full max-w-xs rounded-sm bg-white" />
        </header>
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", {
            entity: t("nav.dashboard"),
            message: "Campus location could not be resolved.",
          })}
        </p>
      </div>
    );
  }

  const [
    { data: scheduleRows },
    { count: studentCount },
    { count: tutorCount },
    { count: classCount },
  ] = await Promise.all([
    supabase
      .from("class_schedules")
      .select(
        `
        id,
        class_id,
        is_recurring,
        schedule_day_of_week,
        schedule_date,
        schedule_start_time,
        schedule_end_time,
        classes!inner (
          id,
          subject,
          is_active,
          location_id,
          teachers!classes_teacher_id_fkey ( first_name, last_name ),
          rooms ( room_number )
        )
      `,
      )
      .eq("classes.location_id", locationId)
      .order("schedule_start_time"),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("is_active", true),
    supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("is_active", true),
    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("is_active", true),
  ]);

  const normalizedSchedules = ((scheduleRows as ScheduleRow[] | null) ?? []).map(
    (row) => {
      const classRow = firstOrNull(row.classes);

      return {
        id: row.id,
        class_id: row.class_id,
        is_recurring: row.is_recurring,
        schedule_day_of_week: row.schedule_day_of_week,
        schedule_date: row.schedule_date,
        schedule_start_time: row.schedule_start_time,
        schedule_end_time: row.schedule_end_time,
        classes: classRow
          ? {
              id: classRow.id,
              subject: classRow.subject,
              is_active: classRow.is_active,
              teachers: firstOrNull(classRow.teachers),
              rooms: firstOrNull(classRow.rooms),
            }
          : null,
      };
    },
  );

  const liveClasses = buildLiveClassItems(normalizedSchedules, formatTeacherName);
  const upcomingClasses = buildUpcomingTodayClassItems(
    normalizedSchedules,
    formatTeacherName,
  );

  const counts: Record<(typeof quickLinks)[number]["href"], number> = {
    "/students": studentCount ?? 0,
    "/tutors": tutorCount ?? 0,
    "/classes": classCount ?? 0,
  };

  return (
    <div>
      <header className="border-b border-gray-200 pb-6 dark:border-white/10">
        <AdminCampusSwitcher
          activeCampus={activeCampus}
          canSwitch={staff.role === "admin"}
        />
        <h1 className="sr-only">iSmart Music Center</h1>
        <BrandLogo className="mt-2 h-auto w-full max-w-xs rounded-sm bg-white" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t("common.todaysOverview")}
        </p>
      </header>

      <nav aria-label={t("common.quickLinks")} className="mt-8">
        <ul className="grid gap-3 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-white/10 dark:bg-gray-900/40 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t(item.titleKey)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {counts[item.href]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DashboardLiveClasses classes={liveClasses} />
        <DashboardUpcomingClasses classes={upcomingClasses} />
      </div>
    </div>
  );
}
