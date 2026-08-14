import { StaffAccountsSection } from "@/components/staff-accounts-section";
import { type StaffAccountRow } from "@/components/staff-accounts-table";
import { requireAdmin } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { isStaffLocation, type StaffLocation } from "@/lib/staff-location";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function SettingsTeachersPage() {
  const currentStaff = await requireAdmin();
  const t = createTranslator(currentStaff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: accounts, error: staffError } = await supabase
    .from("staff_accounts")
    .select("id, email, full_name, role, location, is_active, created_at, teacher_id")
    .eq("role", "teacher")
    .order("created_at", { ascending: false });

  let staffRows: StaffAccountRow[] = (accounts ?? []).map((account) => ({
    id: account.id,
    email: account.email,
    full_name: account.full_name,
    role: account.role,
    location: account.location,
    is_active: account.is_active,
    created_at: account.created_at,
    teacher_id: account.teacher_id,
    linked_teacher_name: null,
  })) as StaffAccountRow[];

  const linkedTeacherIds = [
    ...new Set(
      (accounts ?? [])
        .map((account) => account.teacher_id)
        .filter((id): id is number => id != null),
    ),
  ];

  if (linkedTeacherIds.length > 0) {
    const { data: linkedTeachers } = await supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .in("id", linkedTeacherIds);

    const nameById = new Map(
      (linkedTeachers ?? []).map((teacher) => [
        teacher.id,
        [teacher.first_name, teacher.last_name].filter(Boolean).join(" "),
      ]),
    );

    staffRows = staffRows.map((row) => ({
      ...row,
      linked_teacher_name:
        row.teacher_id != null ? (nameById.get(row.teacher_id) ?? null) : null,
    }));
  }

  const linkedTeacherIdSet = new Set(linkedTeacherIds);

  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, hourly_rate_cents, locations ( slug )")
    .eq("position", "teacher")
    .eq("is_active", true)
    .order("first_name");

  const teacherProfiles = (teachers ?? []).flatMap((teacher) => {
    if (linkedTeacherIdSet.has(teacher.id)) {
      return [];
    }
    const locationEmbed = Array.isArray(teacher.locations)
      ? teacher.locations[0]
      : teacher.locations;
    const slug = locationEmbed?.slug;
    if (!slug || !isStaffLocation(slug)) {
      return [];
    }
    return [
      {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        location_slug: slug as StaffLocation,
        hourly_rate_cents: teacher.hourly_rate_cents,
      },
    ];
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t("settings.teacherAccounts")}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("settings.teacherAccountsDescription")}
      </p>

      {staffError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.couldNotLoadStaff", { message: staffError.message })}
        </p>
      ) : (
        <StaffAccountsSection
          accounts={staffRows}
          currentStaffId={currentStaff.id}
          currentStaffRole={currentStaff.role}
          currentStaffLocation={currentStaff.location}
          canManageAccounts
          teacherProfiles={teacherProfiles}
          mode="teachers"
        />
      )}
    </div>
  );
}
