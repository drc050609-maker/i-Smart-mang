"use client";

import { useMemo, useState, useTransition } from "react";

import { setStaffAccountActive } from "@/app/(dashboard)/settings/actions";
import { ActiveStatusBadge } from "@/components/active-status-badge";
import { ListSearchInput } from "@/components/list-search-input";
import { useLanguage } from "@/components/language-provider";
import type { AppLanguage } from "@/lib/language";
import { formatStaffRole, type StaffRole } from "@/lib/staff-role";
import {
  formatStaffLocation,
  type StaffLocation,
} from "@/lib/staff-location";

export type StaffAccountRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
  location: StaffLocation;
  is_active: boolean;
  created_at: string;
};

function formatCreatedAt(value: string, language: AppLanguage) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDisplayName(row: StaffAccountRow) {
  return row.full_name?.trim() || row.email;
}

function LocationBadge({
  location,
  language,
}: {
  location: StaffLocation;
  language: AppLanguage;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
      {formatStaffLocation(location, language)}
    </span>
  );
}

function RoleBadge({
  role,
  language,
}: {
  role: StaffRole;
  language: AppLanguage;
}) {
  const isAdmin = role === "admin";

  return (
    <span
      className={
        isAdmin
          ? "inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
          : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300"
      }
    >
      {formatStaffRole(role, language)}
    </span>
  );
}

function StaffActiveToggle({
  staffId,
  isActive,
  canManage,
  isSelf,
}: {
  staffId: string;
  isActive: boolean;
  canManage: boolean;
  isSelf: boolean;
}) {
  const { t } = useLanguage();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <ActiveStatusBadge isActive={isActive} />;
  }

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await setStaffAccountActive(staffId, !isActive);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending || (isSelf && isActive)}
        title={
          isSelf && isActive ? t("common.cannotDeactivateSelf") : undefined
        }
        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        {pending
          ? t("common.saving")
          : isActive
            ? t("common.deactivate")
            : t("common.activate")}
      </button>
      {error ? (
        <span className="max-w-40 text-right text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : (
        <ActiveStatusBadge isActive={isActive} />
      )}
    </div>
  );
}

export function StaffAccountsTable({
  accounts,
  currentStaffId,
  canManageAccounts,
  showLocation = false,
}: {
  accounts: StaffAccountRow[];
  currentStaffId: string;
  canManageAccounts: boolean;
  showLocation?: boolean;
}) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");

  const filteredAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return accounts;
    }

    return accounts.filter((account) => {
      const haystack = [
        account.email,
        account.full_name ?? "",
        formatStaffRole(account.role, language),
        formatStaffLocation(account.location, language),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [accounts, query, language]);

  return (
    <div className="mt-6 space-y-4">
      <ListSearchInput
        id="staffAccountsSearch"
        value={query}
        onChange={setQuery}
        placeholder={t("common.searchStaff")}
      />

      {filteredAccounts.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {accounts.length === 0
            ? t("common.noStaffAccounts")
            : t("common.noAccountsMatchSearch")}
        </p>
      ) : (
        <div className="mt-4 flow-root">
          <div className="-mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                    >
                      {t("common.name")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.email")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.role")}
                    </th>
                    {showLocation ? (
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        {t("common.campus")}
                      </th>
                    ) : null}
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.added")}
                    </th>
                    <th
                      scope="col"
                      className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                    >
                      {t("common.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                        {formatDisplayName(account)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {account.email}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap">
                        <RoleBadge role={account.role} language={language} />
                      </td>
                      {showLocation ? (
                        <td className="px-3 py-4 text-sm whitespace-nowrap">
                          <LocationBadge
                            location={account.location}
                            language={language}
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatCreatedAt(account.created_at, language)}
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                        <StaffActiveToggle
                          staffId={account.id}
                          isActive={account.is_active}
                          canManage={canManageAccounts}
                          isSelf={account.id === currentStaffId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        {filteredAccounts.length === accounts.length
          ? accounts.length === 1
            ? t("common.accountCount", { count: accounts.length })
            : t("common.accountCountPlural", { count: accounts.length })
          : t("common.countFilteredAccounts", {
              filtered: filteredAccounts.length,
              total: accounts.length,
            })}
      </p>
    </div>
  );
}
