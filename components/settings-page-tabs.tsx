"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/language-provider";

export type SettingsPageTab = "general" | "staff" | "teachers";

const tabs: {
  id: SettingsPageTab;
  href: string;
  labelKey:
    | "settings.tabGeneral"
    | "settings.tabStaff"
    | "settings.tabTeachers";
  adminOnly?: boolean;
}[] = [
  {
    id: "general",
    href: "/settings",
    labelKey: "settings.tabGeneral",
  },
  {
    id: "staff",
    href: "/settings/staff",
    labelKey: "settings.tabStaff",
    adminOnly: true,
  },
  {
    id: "teachers",
    href: "/settings/teachers",
    labelKey: "settings.tabTeachers",
    adminOnly: true,
  },
];

function tabFromPathname(pathname: string): SettingsPageTab {
  if (pathname.startsWith("/settings/teachers")) return "teachers";
  if (pathname.startsWith("/settings/staff")) return "staff";
  return "general";
}

export function SettingsPageTabs({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const activeTab = tabFromPathname(pathname);
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  if (visibleTabs.length <= 1) {
    return null;
  }

  return (
    <nav
      className="-mb-px flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-white/10"
      aria-label={t("settings.tabsAria")}
    >
      {visibleTabs.map((tab) => {
        const isSelected = activeTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isSelected ? "page" : undefined}
            className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              isSelected
                ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-300"
            }`}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
