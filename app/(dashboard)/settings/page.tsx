import { ChangePasswordDialog } from "@/components/change-password-dialog";
import {
  CampusTrialPricingSection,
  type CampusPricingRow,
} from "@/components/campus-trial-pricing-section";
import { LanguageSettingsSection } from "@/components/language-settings-section";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { isStaffLocation, type StaffLocation } from "@/lib/staff-location";
import { isFrontDeskStaffRole } from "@/lib/staff-role";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function SettingsGeneralPage() {
  const currentStaff = await requireStaff();
  const isAdmin = currentStaff.role === "admin";
  const isFrontDesk = isFrontDeskStaffRole(currentStaff.role);
  const t = createTranslator(currentStaff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let campuses: CampusPricingRow[] = [];
  if (!isFrontDesk) {
    let campusesQuery = supabase
      .from("locations")
      .select("id, slug, name, trial_price_cents, trial_teacher_pay_cents")
      .eq("is_active", true)
      .order("name");

    if (!isAdmin) {
      campusesQuery = campusesQuery.eq("slug", currentStaff.location);
    }

    const { data: campusRows } = await campusesQuery;

    campuses = (campusRows ?? []).flatMap((row) => {
      if (!isStaffLocation(row.slug)) {
        return [];
      }

      return [
        {
          id: row.id,
          slug: row.slug as StaffLocation,
          name: row.name,
          trial_price_cents: row.trial_price_cents,
          trial_teacher_pay_cents: row.trial_teacher_pay_cents,
        },
      ];
    });
  }

  return (
    <div>
      <section className="rounded-lg border border-gray-200 p-4 dark:border-white/10">
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
    </div>
  );
}
