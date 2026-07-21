"use client";

import Link from "next/link";
import { useState } from "react";

import { ConvertLeadChildDialog } from "@/components/convert-lead-child-dialog";
import { DeleteLeadChildButton } from "@/components/delete-lead-child-button";
import { EditLeadChildDialog } from "@/components/edit-lead-child-dialog";
import { useLanguage } from "@/components/language-provider";
import { formatLeadChildName, type LeadChild } from "@/lib/lead";
import type { AppLanguage } from "@/lib/language";

function formatDob(dob: string | null, language: AppLanguage, notAvailable: string) {
  if (!dob) return notAvailable;
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Date(`${dob}T00:00:00`).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LeadChildrenSection({
  leadId,
  children,
}: {
  leadId: number;
  children: LeadChild[];
}) {
  const { language, t } = useLanguage();
  const [editingChild, setEditingChild] = useState<LeadChild | null>(null);

  if (children.length === 0) {
    return (
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        {t("leads.noChildren")}
      </p>
    );
  }

  return (
    <>
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
                    {t("common.dateOfBirth")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {t("leads.background")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {t("leads.experience")}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {t("common.student")}
                  </th>
                  <th
                    scope="col"
                    className="py-3.5 pr-4 pl-3 text-right text-sm font-semibold text-gray-900 sm:pr-0 dark:text-white"
                  >
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {children.map((child) => {
                  const isConverted = Boolean(child.student_id);

                  return (
                    <tr key={child.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium text-gray-900 sm:pl-0 dark:text-white">
                        {formatLeadChildName(child)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {formatDob(child.dob, language, t("common.notAvailable"))}
                      </td>
                      <td className="max-w-xs px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <p className="line-clamp-3 whitespace-pre-wrap">
                          {child.background?.trim() || t("common.notAvailable")}
                        </p>
                      </td>
                      <td className="max-w-xs px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <p className="line-clamp-3 whitespace-pre-wrap">
                          {child.experience?.trim() || t("common.notAvailable")}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap">
                        {isConverted && child.student_id ? (
                          <Link
                            href={`/students/${child.student_id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {t("leads.viewStudent")}
                          </Link>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">
                            {t("leads.notYetStudent")}
                          </span>
                        )}
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                        <div className="flex flex-wrap justify-end gap-2">
                          {isConverted ? null : (
                            <ConvertLeadChildDialog leadId={leadId} child={child} />
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingChild(child)}
                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {t("common.edit")}
                          </button>
                          {!isConverted ? (
                            <DeleteLeadChildButton
                              leadId={leadId}
                              childId={child.id}
                              childName={formatLeadChildName(child)}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingChild ? (
        <EditLeadChildDialog
          leadId={leadId}
          child={editingChild}
          open={Boolean(editingChild)}
          onClose={() => setEditingChild(null)}
        />
      ) : null}
    </>
  );
}
