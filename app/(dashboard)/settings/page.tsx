import { ChangePasswordDialog } from "@/components/change-password-dialog";
import {
  CampusTrialPricingSection,
  type CampusPricingRow,
} from "@/components/campus-trial-pricing-section";
import { LanguageSettingsSection } from "@/components/language-settings-section";
import { StaffAccountsSection } from "@/components/staff-accounts-section";
import { type StaffAccountRow } from "@/components/staff-accounts-table";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { isStaffLocation } from "@/lib/staff-location";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function SettingsPage() {
  const currentStaff = await requireStaff();
  const isAdmin = currentStaff.role === "admin";
  const t = createTranslator(currentStaff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let staffRows: StaffAccountRow[] = [];
  let staffError: { message: string } | null = null;

  if (isAdmin) {
    const { data: accounts, error } = await supabase
      .from("staff_accounts")
      .select("id, email, full_name, role, location, is_active, created_at")
      .order("created_at", { ascending: false });

    staffRows = (accounts ?? []) as StaffAccountRow[];
    staffError = error;
  }

  let campusesQuery = supabase
    .from("locations")
    .select("id, slug, name, trial_price_cents, trial_teacher_pay_cents")
    .eq("is_active", true)
    .order("name");

  if (!isAdmin) {
    campusesQuery = campusesQuery.eq("slug", currentStaff.location);
  }

  const { data: campusRows } = await campusesQuery;

  const campuses: CampusPricingRow[] = (campusRows ?? []).flatMap((row) => {
    if (!isStaffLocation(row.slug)) {
      return [];
    }

    return [
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        trial_price_cents: row.trial_price_cents,
        trial_teacher_pay_cents: row.trial_teacher_pay_cents,
      },
    ];
  });

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isAdmin ? t("settings.subtitleAdmin") : t("settings.subtitleSelf")}
        </p>
      </div>

      <section className="mt-8 rounded-lg border border-gray-200 p-4 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("settings.yourAccount")}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("settings.signedInAs")} {currentStaff.email}
            </p>
          </div>
          <ChangePasswordDialog email={currentStaff.email} />
        </div>
      </section>

      <LanguageSettingsSection
        preferredLanguage={currentStaff.preferred_language}
      />

      {campuses.length > 0 ? (
        <CampusTrialPricingSection campuses={campuses} />
      ) : null}

      {isAdmin ? (
        <>
          <h2 className="mt-10 text-lg font-semibold text-gray-900 dark:text-white">
            {t("settings.staffAccounts")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("settings.staffAccountsDescription")}
          </p>

          {staffError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              {t("common.couldNotLoadStaff", { message: staffError.message })}
            </p>
          ) : null}

          {!staffError ? (
            <StaffAccountsSection
              accounts={staffRows}
              currentStaffId={currentStaff.id}
              currentStaffRole={currentStaff.role}
              currentStaffLocation={currentStaff.location}
              canManageAccounts
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
