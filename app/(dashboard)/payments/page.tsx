import { cookies } from "next/headers";

import {
  ClassPaymentsSection,
  type PayableClassRow,
  type PaymentHistoryRow,
} from "@/components/class-payments-section";
import type { StudentOption } from "@/components/student-combobox";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocationId } from "@/lib/campus-location";
import { createTranslator } from "@/lib/i18n";
import { buildTuitionPricing } from "@/lib/tuition";
import type { PaymentPlan } from "@/lib/payment-plan";
import { createClient } from "@/utils/supabase/server";

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type ClassRow = {
  id: number;
  subject: string;
  teacher_id: number | null;
  duration_minutes: number | null;
  lesson_type: string | null;
  class_track: string | null;
  is_active: boolean;
  single_price_cents: number | null;
  package_20_price_cents: number | null;
  package_50_price_cents: number | null;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
};

type PaymentRow = {
  id: number;
  paid_at: string;
  payment_plan: PaymentPlan;
  amount_cents: number;
  effective_amount_cents: number | null;
  session_count: number;
  status: import("@/lib/payment-status").PaymentStatus;
  students: {
    id: number;
    "first name": string;
    "last name": string | null;
  } | {
    id: number;
    "first name": string;
    "last name": string | null;
  }[] | null;
  classes: {
    subject: string;
  } | {
    subject: string;
  }[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function PaymentsPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const locationId = await getActiveCampusLocationId(supabase, staff);

  if (!locationId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("nav.payments"),
          message: "Campus location could not be resolved.",
        })}
      </p>
    );
  }

  const [
    { data: classes, error: classesError },
    { data: students, error: studentsError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        teacher_id,
        duration_minutes,
        lesson_type,
        class_track,
        is_active,
        single_price_cents,
        package_20_price_cents,
        package_50_price_cents,
        teachers!classes_teacher_id_fkey ( first_name, last_name )
      `,
      )
      .eq("is_active", true)
      .eq("location_id", locationId)
      .order("subject"),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true)
      .eq("location_id", locationId)
      .order("first name"),
    supabase
      .from("class_payments")
      .select(
        `
        id,
        paid_at,
        payment_plan,
        amount_cents,
        effective_amount_cents,
        session_count,
        status,
        students!inner ( id, "first name", "last name", location_id ),
        classes ( subject )
      `,
      )
      .eq("students.location_id", locationId)
      .order("paid_at", { ascending: false })
      .limit(50),
  ]);

  const payableClasses: PayableClassRow[] =
    (classes as ClassRow[] | null)?.map((classRow) => ({
      id: classRow.id,
      subject: classRow.subject,
      teacher_id: classRow.teacher_id,
      duration_minutes: classRow.duration_minutes,
      lesson_type: classRow.lesson_type,
      class_track: classRow.class_track,
      teacher: firstOrNull(classRow.teachers),
      pricing: buildTuitionPricing(
        classRow.duration_minutes,
        classRow.lesson_type,
        {
          single_price_cents: classRow.single_price_cents,
          package_20_price_cents: classRow.package_20_price_cents,
          package_50_price_cents: classRow.package_50_price_cents,
        },
      ),
    })) ?? [];

  const studentOptions: StudentOption[] =
    (students as StudentOption[] | null) ?? [];

  const recentPayments: PaymentHistoryRow[] =
    (payments as PaymentRow[] | null)
      ?.map((payment) => {
        const student = firstOrNull(payment.students);
        const classRow = firstOrNull(payment.classes);

        if (!student || !classRow) return null;

        return {
          id: payment.id,
          paid_at: payment.paid_at,
          payment_plan: payment.payment_plan,
          amount_cents: payment.amount_cents,
          effective_amount_cents:
            payment.effective_amount_cents ?? payment.amount_cents,
          session_count: payment.session_count,
          status: payment.status,
          student,
          classSubject: classRow.subject,
        };
      })
      .filter((row): row is PaymentHistoryRow => row !== null) ?? [];

  const error = classesError ?? studentsError ?? paymentsError;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.payments")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("common.paymentsSubtitle")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.payments"), message: error.message })}
        </p>
      ) : (
        <ClassPaymentsSection
          classes={payableClasses}
          students={studentOptions}
          recentPayments={recentPayments}
        />
      )}
    </div>
  );
}
