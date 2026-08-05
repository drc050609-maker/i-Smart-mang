import { cookies } from "next/headers";

import {
  StudentPurchasesSection,
  type PurchaseHistoryRow,
} from "@/components/student-purchases-section";
import type { StudentOption } from "@/components/student-combobox";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";

type PurchaseRow = {
  id: number;
  purchased_at: string;
  description: string;
  amount_cents: number;
  effective_amount_cents: number | null;
  students:
    | {
        id: number;
        "first name": string;
        "last name": string | null;
      }
    | {
        id: number;
        "first name": string;
        "last name": string | null;
      }[]
    | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function PaymentsPurchasesPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("payments.tabPurchases"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const [
    { data: students, error: studentsError },
    { data: purchases, error: purchasesError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true)
      .eq("location_id", locationId)
      .order("first name"),
    supabase
      .from("student_purchases")
      .select(
        `
        id,
        purchased_at,
        description,
        amount_cents,
        effective_amount_cents,
        students!inner ( id, "first name", "last name", location_id )
      `,
      )
      .eq("students.location_id", locationId)
      .order("purchased_at", { ascending: false })
      .limit(50),
  ]);

  const studentOptions: StudentOption[] =
    (students as StudentOption[] | null) ?? [];

  const recentPurchases: PurchaseHistoryRow[] =
    (purchases as PurchaseRow[] | null)
      ?.map((purchase) => {
        const student = firstOrNull(purchase.students);
        if (!student) return null;

        return {
          id: purchase.id,
          purchased_at: purchase.purchased_at,
          description: purchase.description,
          amount_cents: purchase.amount_cents,
          effective_amount_cents:
            purchase.effective_amount_cents ?? purchase.amount_cents,
          student,
        };
      })
      .filter((row): row is PurchaseHistoryRow => row !== null) ?? [];

  const error = studentsError ?? purchasesError;

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("payments.tabPurchases"),
          message: error.message,
        })}
      </p>
    );
  }

  return (
    <StudentPurchasesSection
      students={studentOptions}
      recentPurchases={recentPurchases}
    />
  );
}
