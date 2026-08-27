"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/language-provider";

const tabs = [
  {
    href: "/chat",
    labelKey: "chat.tabWebsite" as const,
    match: (pathname: string) => pathname === "/chat",
  },
  {
    href: "/chat/teachers",
    labelKey: "chat.tabTeachers" as const,
    match: (pathname: string) => pathname.startsWith("/chat/teachers"),
  },
];

export function ChatPageTabs() {
  const { t } = useLanguage();
  const pathname = usePathname();

  return (
    <nav
      className="-mb-px flex gap-6 overflow-x-auto border-b border-gray-200 dark:border-white/10"
      aria-label={t("chat.tabsAria")}
    >
      {tabs.map((tab) => {
        const isSelected = tab.match(pathname);

        return (
          <Link
            key={tab.href}
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
