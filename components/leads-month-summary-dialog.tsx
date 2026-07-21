"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useLanguage } from "@/components/language-provider";
import type { LeadProspectRow } from "@/lib/leads-overview";

export function LeadsMonthSummaryDialog({
  monthCount,
  monthRows,
}: {
  monthCount: number;
  monthRows: LeadProspectRow[];
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const inquiryCount = monthRows.filter((row) => row.kind === "inquiry").length;
  const trialCount = monthRows.filter((row) => row.kind === "trial").length;

  const monthLabel = new Date().toLocaleDateString(
    language === "zh" ? "zh-CN" : "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium whitespace-nowrap text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-300"
      >
        {t("leads.tabThisMonth")}
        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-400">
          {monthCount}
        </span>
      </button>

      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/50 transition-opacity duration-200 ease-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 sm:my-8 sm:w-full sm:max-w-2xl sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-900 dark:outline dark:-outline-offset-1 dark:outline-white/10"
            >
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">{t("common.close")}</span>
                  <XMarkIcon aria-hidden="true" className="size-6" />
                </button>
              </div>

              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {t("leads.monthSummaryTitle", { month: monthLabel })}
              </DialogTitle>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t("leads.monthSummarySubtitle", {
                  total: monthCount,
                  inquiries: inquiryCount,
                  trials: trialCount,
                })}
              </p>

              <dl className="mt-5 grid grid-cols-3 gap-3">
                {[
                  [t("common.total"), monthCount],
                  [t("leads.typeInquiry"), inquiryCount],
                  [t("leads.typeTrial"), trialCount],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg bg-gray-50 px-3 py-3 text-center dark:bg-white/5"
                  >
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {label}
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {monthRows.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  {t("leads.emptyThisMonth")}
                </p>
              ) : (
                <ul className="mt-6 max-h-96 divide-y divide-gray-100 overflow-y-auto pr-1 dark:divide-white/10">
                  {monthRows.map((row) => (
                    <li
                      key={row.key}
                      className="py-4 first:pt-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={row.href}
                          onClick={() => setOpen(false)}
                          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          {row.name}
                        </Link>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(row.created_at).toLocaleDateString(
                            language === "zh" ? "zh-CN" : "en-US",
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {row.kind === "trial"
                          ? t("leads.typeTrial")
                          : t("leads.typeInquiry")}
                        {row.subject ? ` · ${row.subject}` : null}
                      </p>

                      {row.phone || row.email ? (
                        <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                          {row.phone ? (
                            <div className="flex min-w-0 gap-1.5">
                              <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                                {t("common.phone")}:
                              </dt>
                              <dd className="min-w-0 truncate">
                                <a
                                  href={`tel:${row.phone}`}
                                  className="text-gray-900 hover:text-indigo-600 dark:text-gray-200 dark:hover:text-indigo-400"
                                >
                                  {row.phone}
                                </a>
                              </dd>
                            </div>
                          ) : null}
                          {row.email ? (
                            <div className="flex min-w-0 gap-1.5">
                              <dt className="shrink-0 text-gray-500 dark:text-gray-400">
                                {t("common.email")}:
                              </dt>
                              <dd className="min-w-0 truncate">
                                <a
                                  href={`mailto:${row.email}`}
                                  className="text-gray-900 hover:text-indigo-600 dark:text-gray-200 dark:hover:text-indigo-400"
                                >
                                  {row.email}
                                </a>
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      ) : null}

                      {row.description ? (
                        <p className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300">
                          {row.kind === "trial"
                            ? row.description
                            : `${t("common.description")}: ${row.description}`}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/10 dark:hover:bg-white/20"
                >
                  {t("common.close")}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
