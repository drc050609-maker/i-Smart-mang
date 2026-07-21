"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ActiveInactiveTabs,
  type ActiveTab,
} from "@/components/active-inactive-tabs";
import { ActiveStatusBadge } from "@/components/active-status-badge";
import { ListSearchInput } from "@/components/list-search-input";
import { MakeOfficialStudentDialog } from "@/components/make-official-student-dialog";
import { useLanguage } from "@/components/language-provider";
import {
  filterProspectsByQuery,
  type LeadProspectRow,
} from "@/lib/leads-overview";

function TypeBadge({ kind }: { kind: LeadProspectRow["kind"] }) {
  const { t } = useLanguage();

  if (kind === "trial") {
    return (
      <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/30">
        {t("leads.typeTrial")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/30">
      {t("leads.typeInquiry")}
    </span>
  );
}

function ContactBadge({
  needsFutureContact,
}: {
  needsFutureContact: boolean | null;
}) {
  const { t } = useLanguage();

  if (needsFutureContact === null) {
    return (
      <span className="text-gray-500 dark:text-gray-400">
        {t("common.notAvailable")}
      </span>
    );
  }

  if (needsFutureContact) {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30">
        {t("leads.needsFutureContact")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20 dark:bg-white/10 dark:text-gray-300 dark:ring-white/20">
      {t("leads.noFutureContactNeeded")}
    </span>
  );
}

function RowActions({ lead }: { lead: LeadProspectRow }) {
  const { t } = useLanguage();

  if (lead.kind === "trial") {
    return (
      <div className="space-y-1 text-right">
        <MakeOfficialStudentDialog
          kind="trial"
          studentId={lead.id}
          name={lead.name}
        />
        {lead.classId ? (
          <div>
            <Link
              href={`/classes/${lead.classId}`}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {t("common.viewClass")}
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  if (!lead.hasOfficialStudent) {
    return (
      <MakeOfficialStudentDialog
        kind="inquiry"
        leadId={lead.id}
        name={lead.name}
      />
    );
  }

  return (
    <Link
      href={lead.studentId ? `/students/${lead.studentId}` : lead.href}
      className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
    >
      {t("leads.viewStudent")}
    </Link>
  );
}

export function LeadsListTable({ leads }: { leads: LeadProspectRow[] }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");

  const activeCount = useMemo(
    () => leads.filter((lead) => lead.is_active).length,
    [leads],
  );
  const inactiveCount = leads.length - activeCount;

  const tabLeads = useMemo(
    () =>
      leads.filter((lead) =>
        activeTab === "active" ? lead.is_active : !lead.is_active,
      ),
    [leads, activeTab],
  );
  const filteredLeads = useMemo(
    () => filterProspectsByQuery(tabLeads, query),
    [tabLeads, query],
  );

  return (
    <div className="mt-6 space-y-4">
      <ActiveInactiveTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        entityLabel={t("nav.leads")}
      />

      <ListSearchInput
        id="leadsSearch"
        value={query}
        onChange={setQuery}
        placeholder={t("leads.searchPlaceholder")}
      />

      {filteredLeads.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {tabLeads.length === 0
            ? activeTab === "active"
              ? t("common.noActiveEntity", { entity: t("nav.leads") })
              : t("common.noInactiveEntity", { entity: t("nav.leads") })
            : t("common.noMatchSearch")}
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
                      {t("leads.type")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("leads.description")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.phone")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("leads.contact")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {t("common.active")}
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
                  {filteredLeads.map((lead) => (
                    <tr key={lead.key}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium sm:pl-0">
                        <Link
                          href={lead.href}
                          className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          {lead.name}
                        </Link>
                        {lead.email ? (
                          <div className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                            {lead.email}
                          </div>
                        ) : lead.subject ? (
                          <div className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                            {lead.subject}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap">
                        <TypeBadge kind={lead.kind} />
                      </td>
                      <td className="max-w-xs px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <p className="line-clamp-2 whitespace-pre-wrap">
                          {lead.description ?? t("common.notAvailable")}
                        </p>
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {lead.phone ?? t("common.notAvailable")}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap">
                        <ContactBadge needsFutureContact={lead.needsFutureContact} />
                      </td>
                      <td className="px-3 py-4 text-right text-sm whitespace-nowrap">
                        <ActiveStatusBadge isActive={lead.is_active} />
                      </td>
                      <td className="py-4 pr-4 pl-3 text-right text-sm whitespace-nowrap sm:pr-0">
                        <RowActions lead={lead} />
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
        {t("leads.countShown", {
          filtered: filteredLeads.length,
          total: tabLeads.length,
        })}
      </p>
    </div>
  );
}
