"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LeadsMonthSummaryDialog } from "@/components/leads-month-summary-dialog";
import { useLanguage } from "@/components/language-provider";
import type {
  LeadsOverviewCounts,
  LeadProspectRow,
  LeadsOverviewView,
} from "@/lib/leads-overview";

const tabs: {
  view: LeadsOverviewView;
  href: string;
  labelKey: "leads.tabAll" | "leads.tabInquiries" | "leads.tabTrials";
  countKey: keyof LeadsOverviewCounts;
}[] = [
  { view: "all", href: "/leads", labelKey: "leads.tabAll", countKey: "all" },
  {
    view: "inquiries",
    href: "/leads/inquiries",
    labelKey: "leads.tabInquiries",
    countKey: "inquiries",
  },
  {
    view: "trials",
    href: "/leads/trials",
    labelKey: "leads.tabTrials",
    countKey: "trials",
  },
];

function viewFromPathname(pathname: string): LeadsOverviewView {
  if (pathname.startsWith("/leads/inquiries")) return "inquiries";
  if (pathname.startsWith("/leads/trials")) return "trials";
  return "all";
}

export function LeadsSummaryTabs({
  counts,
  monthRows,
}: {
  counts: LeadsOverviewCounts;
  monthRows: LeadProspectRow[];
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const activeView = viewFromPathname(pathname);

  return (
    <div className="border-b border-gray-200 dark:border-white/10">
      <nav
        className="-mb-px flex gap-6 overflow-x-auto"
        aria-label={t("leads.summaryTabs")}
      >
        {tabs.map((tab) => {
          const isSelected = activeView === tab.view;
          const count = counts[tab.countKey];

          return (
            <Link
              key={tab.view}
              href={tab.href}
              aria-current={isSelected ? "page" : undefined}
              className={`shrink-0 border-b-2 px-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isSelected
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-300"
              }`}
            >
              {t(tab.labelKey)}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}

        <LeadsMonthSummaryDialog
          monthCount={counts.month}
          monthRows={monthRows}
        />
      </nav>
    </div>
  );
}
