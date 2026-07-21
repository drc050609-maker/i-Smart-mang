import { cookies } from "next/headers";

import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadsListTable } from "@/components/leads-list-table";
import { LeadsSummaryTabs } from "@/components/leads-summary-tabs";
import { TrialClassDialog } from "@/components/trial-class-dialog";
import { requireStaff } from "@/lib/auth";
import {
  getActiveCampusLocation,
  getActiveCampusLocationId,
} from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import {
  countProspects,
  filterProspectsByView,
  filterProspectsThisMonth,
  loadLeadProspects,
  type LeadsOverviewView,
} from "@/lib/leads-overview";
import { formatTeacherName, sortTeachers } from "@/lib/person-name";
import { TRIAL_CLASS_SUBJECTS } from "@/lib/trial-class";
import { createClient } from "@/utils/supabase/server";

export async function LeadsOverviewPage({
  view,
}: {
  view: LeadsOverviewView;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const activeCampus = await getActiveCampusLocation(staff);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  const [{ rows, error }, { data: teachers }] = await Promise.all([
    loadLeadProspects(supabase, {
      campus: activeCampus,
      locationId,
    }),
    locationId
      ? supabase
          .from("teachers")
          .select("id, first_name, last_name")
          .eq("is_active", true)
          .eq("location_id", locationId)
          .order("first_name")
      : Promise.resolve({ data: null }),
  ]);

  const counts = countProspects(rows);
  const monthRows = filterProspectsThisMonth(rows);
  const visibleRows = filterProspectsByView(rows, view);
  const trialTeachers = sortTeachers(teachers ?? []).map((teacher) => ({
    id: teacher.id,
    name: formatTeacherName(teacher),
  }));

  const emptyMessage =
    view === "inquiries"
      ? t("leads.emptyInquiries")
      : view === "trials"
        ? t("leads.emptyTrials")
        : t("leads.empty");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t("nav.leads")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("leads.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TrialClassDialog
            subjects={[...TRIAL_CLASS_SUBJECTS]}
            teachers={trialTeachers}
            triggerStyle="button"
          />
          <AddLeadDialog defaultLocation={activeCampus} />
        </div>
      </div>

      <div className="mt-6">
        <LeadsSummaryTabs counts={counts} monthRows={monthRows} />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", {
            entity: t("nav.leads"),
            message: error,
          })}
        </p>
      ) : null}

      {!error && visibleRows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </p>
      ) : null}

      {visibleRows.length > 0 ? <LeadsListTable leads={visibleRows} /> : null}
    </div>
  );
}
