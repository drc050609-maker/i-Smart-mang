import { cookies } from "next/headers";

import {
  StudentPurchasesSection,
  type PurchaseHistoryRow,
} from "@/components/student-purchases-section";
import type { StudentOption } from "@/components/student-combobox";
import { requireStaff } from "@/lib/auth";
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

export default async function PurchasesPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [
    { data: students, error: studentsError },
    { data: purchases, error: purchasesError },
  ] = await Promise.all([
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true)
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
        students ( id, "first name", "last name" )
      `,
      )
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

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.purchases")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.purchasesSubtitle")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.purchases"), message: error.message })}
        </p>
      ) : (
        <StudentPurchasesSection
          students={studentOptions}
          recentPurchases={recentPurchases}
        />
      )}
    </div>
  );
}
