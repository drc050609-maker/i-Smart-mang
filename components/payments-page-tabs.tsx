"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/components/language-provider";

export type PaymentsPageTab = "payments" | "purchases";

const tabs: {
  id: PaymentsPageTab;
  href: string;
  labelKey: "payments.tabPayments" | "payments.tabPurchases";
}[] = [
  {
    id: "payments",
    href: "/payments",
    labelKey: "payments.tabPayments",
  },
  {
    id: "purchases",
    href: "/payments/purchases",
    labelKey: "payments.tabPurchases",
  },
];

function tabFromPathname(pathname: string): PaymentsPageTab {
  if (pathname.startsWith("/payments/purchases")) return "purchases";
  return "payments";
}

export function PaymentsPageTabs() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const activeTab = tabFromPathname(pathname);

  return (
    <nav
      className="-mb-px flex gap-6 overflow-x-auto border-b border-violet-100/70 dark:border-white/10"
      aria-label={t("payments.tabsAria")}
    >
      {tabs.map((tab) => {
        const isSelected = activeTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isSelected ? "page" : undefined}
            className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              isSelected
                ? "border-violet-600 text-violet-700 dark:border-violet-400 dark:text-violet-300"
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
