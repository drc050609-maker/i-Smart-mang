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
import type { PaymentClassSchedule } from "@/lib/payment-class-picker";
import { resolveTuitionPricingForClass } from "@/lib/tuition-price-sheet";
import type { PaymentPlan } from "@/lib/payment-plan";
import { createClient } from "@/utils/supabase/server";

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
  is_active?: boolean | null;
};

type ClassScheduleEmbed = {
  id: number;
  is_recurring: boolean;
  schedule_day_of_week: number | null;
  schedule_date: string | null;
  schedule_start_time: string;
  schedule_end_time: string;
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
  class_schedules: ClassScheduleEmbed | ClassScheduleEmbed[] | null;
};

type PaymentRow = {
  id: number;
  paid_at: string;
  payment_plan: PaymentPlan;
  amount_cents: number;
  effective_amount_cents: number | null;
  session_count: number;
  status: import("@/lib/payment-status").PaymentStatus;
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
  classes:
    | {
        id: number;
        subject: string;
        lesson_type: string | null;
      }
    | {
        id: number;
        subject: string;
        lesson_type: string | null;
      }[]
    | null;
  notes: string | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function listOrEmpty<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toPaymentSchedules(
  schedules: ClassScheduleEmbed | ClassScheduleEmbed[] | null,
): PaymentClassSchedule[] {
  return listOrEmpty(schedules).map((schedule) => ({
    id: schedule.id,
    is_recurring: schedule.is_recurring,
    schedule_day_of_week: schedule.schedule_day_of_week,
    schedule_date: schedule.schedule_date,
    schedule_start_time: schedule.schedule_start_time,
    schedule_end_time: schedule.schedule_end_time,
  }));
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
          entity: t("payments.tabPayments"),
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
        teachers!classes_teacher_id_fkey ( first_name, last_name, is_active ),
        class_schedules (
          id,
          is_recurring,
          schedule_day_of_week,
          schedule_date,
          schedule_start_time,
          schedule_end_time
        )
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
        classes ( id, subject, lesson_type ),
        notes
      `,
      )
      .eq("students.location_id", locationId)
      .order("paid_at", { ascending: false })
      .limit(50),
  ]);

  const payableClasses: PayableClassRow[] =
    (classes as ClassRow[] | null)?.map((classRow) => {
      const teacherEmbed = firstOrNull(classRow.teachers);
      const teacher =
        teacherEmbed && teacherEmbed.is_active !== false ? teacherEmbed : null;

      return {
        id: classRow.id,
        subject: classRow.subject,
        teacher_id: teacher ? classRow.teacher_id : null,
        duration_minutes: classRow.duration_minutes,
        lesson_type: classRow.lesson_type,
        class_track: classRow.class_track,
        teacher,
        schedules: toPaymentSchedules(classRow.class_schedules),
        pricing: resolveTuitionPricingForClass(
          {
            subject: classRow.subject,
            duration_minutes: classRow.duration_minutes,
            lesson_type: classRow.lesson_type,
          },
          {
            single_price_cents: classRow.single_price_cents,
            package_20_price_cents: classRow.package_20_price_cents,
            package_50_price_cents: classRow.package_50_price_cents,
          },
        ),
      };
    }) ?? [];

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
          classId: classRow.id,
          classLessonType: classRow.lesson_type,
          notes: payment.notes,
        };
      })
      .filter((row): row is PaymentHistoryRow => row !== null) ?? [];

  const error = classesError ?? studentsError ?? paymentsError;

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {t("common.error.loadFailed", {
          entity: t("payments.tabPayments"),
          message: error.message,
        })}
      </p>
    );
  }

  return (
    <ClassPaymentsSection
      classes={payableClasses}
      students={studentOptions}
      recentPayments={recentPayments}
    />
  );
}
