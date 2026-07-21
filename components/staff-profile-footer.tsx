"use client";

import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

import { signOutStaff } from "@/app/(auth)/actions";
import { useLanguage } from "@/components/language-provider";
import { formatStaffRole, type StaffRole } from "@/lib/staff-role";
import {
  formatStaffLocationLabel,
  type StaffLocation,
} from "@/lib/staff-location";

export function StaffProfileFooter({
  fullName,
  email,
  role,
  location,
}: {
  fullName: string | null;
  email: string;
  role: StaffRole;
  location: StaffLocation;
}) {
  const { language, t } = useLanguage();
  const displayName = fullName?.trim() || email;
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="-mx-6 mt-auto border-t border-gray-200 px-6 py-3 dark:border-white/10">
      <div className="flex items-center gap-x-4 text-sm/6 font-semibold text-gray-900 dark:text-white">
        <span className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-white/10 dark:text-indigo-300">
          {initials || "IS"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate">{displayName}</p>
          <p className="truncate text-xs font-normal text-gray-500 dark:text-gray-400">
            {role === "admin"
              ? formatStaffRole(role, language)
              : `${formatStaffRole(role, language)} · ${formatStaffLocationLabel(location, language)}`}
          </p>
        </div>
      </div>
      <form action={signOutStaff} className="mt-3">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <ArrowRightOnRectangleIcon aria-hidden="true" className="size-4" />
          {t("common.signOut")}
        </button>
      </form>
    </div>
  );
}
