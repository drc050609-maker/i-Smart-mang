import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { DeleteLeadButton } from "@/components/delete-lead-button";
import { EditLeadDialog } from "@/components/edit-lead-dialog";
import { LeadActiveToggle } from "@/components/lead-active-toggle";
import { MakeOfficialStudentDialog } from "@/components/make-official-student-dialog";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import {
  formatLeadAddress,
  formatParentName,
} from "@/lib/lead";
import { formatStaffLocationLabel } from "@/lib/staff-location";
import { createClient } from "@/utils/supabase/server";

import type { Database } from "@/types/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

function formatDateTime(
  value: string,
  language: import("@/lib/language").AppLanguage,
) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const { id } = await params;
  const leadId = Number(id);

  if (!Number.isInteger(leadId) || leadId <= 0) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    throw new Error(`Could not load lead: ${leadError.message}`);
  }

  if (!lead) {
    notFound();
  }

  const leadRow = lead as Lead;
  const addressLines = formatLeadAddress(leadRow);
  const studentName = formatParentName(leadRow);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/leads"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          ← {t("common.back")} {t("nav.leads")}
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {studentName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {leadRow.needs_future_contact
              ? t("leads.needsFutureContact")
              : t("leads.noFutureContactNeeded")}{" "}
            · {t("common.id")} {leadRow.id}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {leadRow.student_id ? (
            <Link
              href={`/students/${leadRow.student_id}`}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400"
            >
              {t("leads.viewStudent")}
            </Link>
          ) : (
            <MakeOfficialStudentDialog
              kind="inquiry"
              leadId={leadRow.id}
              name={studentName}
            />
          )}
          <EditLeadDialog lead={leadRow} />
          <DeleteLeadButton leadId={leadRow.id} parentName={studentName} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-900/40">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t("leads.studentInfo")}
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {t("common.name")}
              </dt>
              <dd className="mt-1 text-gray-900 dark:text-white">{studentName}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {t("common.phone")}
              </dt>
              <dd className="mt-1 text-gray-900 dark:text-white">
                <a
                  href={`tel:${leadRow.phone_number}`}
                  className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  {leadRow.phone_number}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {t("common.email")}
              </dt>
              <dd className="mt-1 text-gray-900 dark:text-white">
                {leadRow.email ? (
                  <a
                    href={`mailto:${leadRow.email}`}
                    className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                  >
                    {leadRow.email}
                  </a>
                ) : (
                  t("common.notAvailable")
                )}
              </dd>
            </div>
            {leadRow.location ? (
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">
                  {t("common.campus")}
                </dt>
                <dd className="mt-1 text-gray-900 dark:text-white">
                  {formatStaffLocationLabel(leadRow.location, staff.preferred_language)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {t("leads.contact")}
              </dt>
              <dd className="mt-1 text-gray-900 dark:text-white">
                {leadRow.needs_future_contact
                  ? t("leads.needsFutureContact")
                  : t("leads.noFutureContactNeeded")}
              </dd>
            </div>
            <div>
              <LeadActiveToggle leadId={leadRow.id} isActive={leadRow.is_active} />
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-900/40">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t("leads.address")}
          </h2>
          {addressLines.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t("common.noAddresses")}
            </p>
          ) : (
            <address className="mt-4 space-y-1 text-sm not-italic text-gray-900 dark:text-white">
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2 dark:border-white/10 dark:bg-gray-900/40">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t("leads.description")}
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
            {leadRow.description?.trim() || t("leads.noDescription")}
          </p>
        </section>
      </div>

      <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
        {t("leads.createdAt", {
          date: formatDateTime(leadRow.created_at, staff.preferred_language),
        })}
        {" · "}
        {t("leads.updatedAt", {
          date: formatDateTime(leadRow.updated_at, staff.preferred_language),
        })}
      </p>
    </div>
  );
}
