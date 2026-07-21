import { formatParentName } from "@/lib/lead";
import { formatStudentName } from "@/lib/person-name";
import type { StaffLocation } from "@/lib/staff-location";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadProspectKind = "inquiry" | "trial";

export type LeadsOverviewView = "all" | "inquiries" | "trials";

export type LeadProspectRow = {
  key: string;
  kind: LeadProspectKind;
  id: number;
  href: string;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  needsFutureContact: boolean | null;
  is_active: boolean;
  created_at: string;
  subject: string | null;
  classId: number | null;
  studentId: number | null;
  hasOfficialStudent: boolean;
};

export type LeadsOverviewCounts = {
  all: number;
  month: number;
  inquiries: number;
  trials: number;
};

type DbClient = SupabaseClient<Database>;

type LeadRow = {
  id: number;
  parent_first_name: string;
  parent_last_name: string | null;
  phone_number: string;
  email: string | null;
  description: string | null;
  needs_future_contact: boolean;
  is_active: boolean;
  created_at: string;
  student_id: number | null;
};

type TrialEnrollmentRow = {
  created_date: string | null;
  is_active: boolean | null;
  students:
    | {
        id: number;
        "first name": string;
        "last name": string | null;
        is_active: boolean;
        experience: string | null;
        location_id: number | null;
      }
    | {
        id: number;
        "first name": string;
        "last name": string | null;
        is_active: boolean;
        experience: string | null;
        location_id: number | null;
      }[]
    | null;
  classes:
    | {
        id: number;
        subject: string;
        lesson_type: string | null;
        location_id: number | null;
        class_schedules:
          | { schedule_date: string | null }
          | { schedule_date: string | null }[]
          | null;
      }
    | {
        id: number;
        subject: string;
        lesson_type: string | null;
        location_id: number | null;
        class_schedules:
          | { schedule_date: string | null }
          | { schedule_date: string | null }[]
          | null;
      }[]
    | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function inquiryFromLead(lead: LeadRow): LeadProspectRow {
  return {
    key: `inquiry-${lead.id}`,
    kind: "inquiry",
    id: lead.id,
    href: `/leads/${lead.id}`,
    name: formatParentName(lead),
    phone: lead.phone_number,
    email: lead.email,
    description: lead.description?.trim() || null,
    needsFutureContact: lead.needs_future_contact,
    is_active: lead.is_active,
    created_at: lead.created_at,
    subject: null,
    classId: null,
    studentId: lead.student_id,
    hasOfficialStudent: Boolean(lead.student_id),
  };
}

function trialFromEnrollment(row: TrialEnrollmentRow): LeadProspectRow | null {
  const student = firstOrNull(row.students);
  const classRow = firstOrNull(row.classes);
  if (!student || !classRow) return null;

  const schedule = firstOrNull(classRow.class_schedules);
  const createdAt =
    schedule?.schedule_date?.slice(0, 10) ??
    row.created_date?.slice(0, 10) ??
    new Date().toISOString().slice(0, 10);

  return {
    key: `trial-${student.id}-${classRow.id}`,
    kind: "trial",
    id: student.id,
    href: `/students/${student.id}`,
    name: formatStudentName(student),
    phone: null,
    email: null,
    description: student.experience?.trim() || classRow.subject,
    needsFutureContact: null,
    is_active: student.is_active,
    created_at: `${createdAt}T00:00:00.000Z`,
    subject: classRow.subject,
    classId: classRow.id,
    studentId: student.id,
    hasOfficialStudent: false,
  };
}

export function getCurrentMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  };
}

function isInCurrentMonth(isoOrDate: string, range = getCurrentMonthRange()) {
  const key = isoOrDate.slice(0, 10);
  return key >= range.startDate && key < range.endDate;
}

export function filterProspectsByView(
  rows: LeadProspectRow[],
  view: LeadsOverviewView,
) {
  return rows.filter((row) => {
    if (view === "inquiries") return row.kind === "inquiry";
    if (view === "trials") return row.kind === "trial";
    return true;
  });
}

export function filterProspectsThisMonth(rows: LeadProspectRow[]) {
  const range = getCurrentMonthRange();
  return rows.filter((row) => isInCurrentMonth(row.created_at, range));
}

export function countProspects(rows: LeadProspectRow[]): LeadsOverviewCounts {
  const range = getCurrentMonthRange();
  return {
    all: rows.length,
    month: rows.filter((row) => isInCurrentMonth(row.created_at, range)).length,
    inquiries: rows.filter((row) => row.kind === "inquiry").length,
    trials: rows.filter((row) => row.kind === "trial").length,
  };
}

export function filterProspectsByQuery(rows: LeadProspectRow[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.name,
      row.phone ?? "",
      row.email ?? "",
      row.description ?? "",
      row.subject ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function sortProspects(rows: LeadProspectRow[]) {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function loadLeadProspects(
  supabase: DbClient,
  {
    campus,
    locationId,
  }: {
    campus: StaffLocation;
    locationId: number | null;
  },
): Promise<{ rows: LeadProspectRow[]; error: string | null }> {
  const [{ data: leads, error: leadsError }, { data: trialEnrollments, error: trialsError }] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          `
          id,
          parent_first_name,
          parent_last_name,
          phone_number,
          email,
          description,
          needs_future_contact,
          is_active,
          created_at,
          student_id
        `,
        )
        .eq("location", campus)
        .order("created_at", { ascending: false }),
      locationId
        ? supabase
            .from("enrollments")
            .select(
              `
              created_date,
              is_active,
              students!inner (
                id,
                "first name",
                "last name",
                is_active,
                experience,
                location_id
              ),
              classes!inner (
                id,
                subject,
                lesson_type,
                location_id,
                class_schedules ( schedule_date )
              )
            `,
            )
            .eq("classes.lesson_type", "trial")
            .eq("classes.location_id", locationId)
            .not("student id", "is", null)
        : Promise.resolve({ data: null, error: null }),
    ]);

  const error = leadsError?.message ?? trialsError?.message ?? null;

  const inquiryRows =
    (leads as LeadRow[] | null)?.map(inquiryFromLead) ?? [];

  const trialRows =
    ((trialEnrollments as TrialEnrollmentRow[] | null) ?? [])
      .map(trialFromEnrollment)
      .filter((row): row is LeadProspectRow => row !== null);

  return {
    rows: sortProspects([...inquiryRows, ...trialRows]),
    error,
  };
}
