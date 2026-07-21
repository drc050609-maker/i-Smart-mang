"use client";

import { useMemo, useState } from "react";

import { AddStaffAccountDialog } from "@/components/add-staff-account-dialog";
import { useLanguage } from "@/components/language-provider";
import { StaffAccountsTable, type StaffAccountRow } from "@/components/staff-accounts-table";
import { StaffLocationTabs } from "@/components/staff-location-tabs";
import { formatStaffLocationLabel } from "@/lib/staff-location";
import type { StaffLocation } from "@/lib/staff-location";
import type { StaffRole } from "@/lib/staff-role";

export function StaffAccountsSection({
  accounts,
  currentStaffId,
  currentStaffRole,
  currentStaffLocation,
  canManageAccounts,
}: {
  accounts: StaffAccountRow[];
  currentStaffId: string;
  currentStaffRole: StaffRole;
  currentStaffLocation: StaffLocation;
  canManageAccounts: boolean;
}) {
  const { language, t } = useLanguage();
  const isAdmin = currentStaffRole === "admin";
  const [activeLocation, setActiveLocation] = useState<StaffLocation>(
    isAdmin ? "brooklyn" : currentStaffLocation,
  );

  const locationCounts = useMemo(() => {
    return {
      brooklyn: accounts.filter((account) => account.location === "brooklyn")
        .length,
      staten_island: accounts.filter(
        (account) => account.location === "staten_island",
      ).length,
    };
  }, [accounts]);

  const locationAccounts = useMemo(
    () => accounts.filter((account) => account.location === activeLocation),
    [accounts, activeLocation],
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {isAdmin ? (
          <StaffLocationTabs
            activeLocation={activeLocation}
            onChange={setActiveLocation}
            counts={locationCounts}
          />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.showingStaffFor", {
              location: formatStaffLocationLabel(activeLocation, language),
            })}
          </p>
        )}

        {canManageAccounts ? (
          <AddStaffAccountDialog defaultLocation={activeLocation} />
        ) : null}
      </div>

      {isAdmin && activeLocation === "staten_island" ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("common.statenIslandManagerHelp")}
        </p>
      ) : null}

      <StaffAccountsTable
        accounts={locationAccounts}
        currentStaffId={currentStaffId}
        canManageAccounts={canManageAccounts}
        showLocation={isAdmin}
      />
    </div>
  );
}
