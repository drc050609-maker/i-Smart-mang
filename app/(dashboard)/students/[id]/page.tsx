import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import type { ClassOption } from "@/components/class-multi-combobox";
import type { StudentOption } from "@/components/student-combobox";
import { StudentDetailEditor } from "@/components/student-detail-editor";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { sortClassesBySubject } from "@/lib/class-list";
import {
  getStudentTotalClassesTaken,
  loadStudentClassHistory,
  summarizeStudentClassesTaken,
} from "@/lib/student-attendance-history";
import { compareStudentNames, formatTeacherName } from "@/lib/person-name";
import {
  buildStudentClassCreditRows,
  findTodayScheduleId,
  formatSessionDate,
  type StudentClassBalance,
} from "@/lib/class-session-credits";
import {
  STUDENT_RECEIPT_BUCKET,
  type StudentReceiptRow,
  type StudentReceiptView,
} from "@/lib/student-receipt";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isPhoneOwnerRole } from "@/lib/phone-owner";

import type { Database } from "@/types/database.types";

type Student = Database["public"]["Tables"]["students"]["Row"];
type Address = Database["public"]["Tables"]["addresses"]["Row"];
type PhoneContact = Database["public"]["Tables"]["student_phone_contacts"]["Row"];

type TeacherEmbed = {
  first_name: string;
  last_name: string | null;
};

type RoomEmbed = {
  room_number: string;
};

type ClassEmbed = {
  id: number;
  subject: string;
  teachers: TeacherEmbed | TeacherEmbed[] | null;
  rooms: RoomEmbed | RoomEmbed[] | null;
};

type EnrollmentEmbed = {
  id: number;
  is_active: boolean | null;
  created_date: string | null;
  grade_level: string | null;
  classes: ClassEmbed | ClassEmbed[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function classFromEnrollment(enrollment: EnrollmentEmbed): ClassEmbed | null {
  return firstOrNull(enrollment.classes);
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const studentId = Number(id);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    notFound();
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      'id, "first name", "last name", dob, experience, gender, parent_name, trial_time_preference, is_active, location_id, starting_class_credits, notes',
    )
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) {
    throw new Error(`Could not load student: ${studentError.message}`);
  }

  if (!student) {
    redirect("/students");
  }

  const [
    { data: addresses, error: addressError },
    { data: phones, error: phonesError },
    { data: receipts, error: receiptsError },
    { data: enrollments, error: enrollmentError },
    { data: allClasses, error: allClassesError },
    { data: balances, error: balancesError },
    { data: classSchedules, error: schedulesError },
    { data: allStudents, error: allStudentsError },
  ] = await Promise.all([
    supabase
      .from("addresses")
      .select('id, "street 1", "street 2", city, state, "zip code"')
      .eq("student", studentId)
      .order("id"),
    supabase
      .from("student_phone_contacts")
      .select("id, phone_number, owner_role, owner_name, is_primary")
      .eq("student_id", studentId)
      .order("is_primary", { ascending: false })
      .order("sort_order")
      .order("id"),
    supabase
      .from("student_receipts")
      .select("id, student_id, storage_path, file_name, mime_type, note, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select(
        `
        id,
        is_active,
        created_date,
        grade_level,
        classes (
          id,
          subject,
          teachers!classes_teacher_id_fkey ( first_name, last_name ),
          rooms ( room_number )
        )
      `,
      )
      .eq("student id", studentId),
    supabase
      .from("classes")
      .select(
        `
        id,
        subject,
        teachers!classes_teacher_id_fkey ( first_name, last_name )
      `,
      )
      .eq("is_active", true),
    supabase
      .from("student_class_balances")
      .select(
        "student_id, class_id, sessions_total, sessions_remaining, sessions_used, absence_count",
      )
      .eq("student_id", studentId),
    supabase
      .from("class_schedules")
      .select(
        "id, class_id, is_recurring, schedule_day_of_week, schedule_date, schedule_start_time, schedule_end_time",
      ),
    supabase
      .from("students")
      .select('id, "first name", "last name"')
      .eq("is_active", true),
  ]);

  const { rows: attendanceHistoryRows, error: attendanceHistoryError } =
    await loadStudentClassHistory(supabase, studentId);

  const balanceRows = (balances as StudentClassBalance[] | null) ?? [];
  const sessionsUsedFromBalances = balanceRows.reduce(
    (total, balance) => total + balance.sessions_used,
    0,
  );
  const totalClassesTaken = getStudentTotalClassesTaken(
    attendanceHistoryRows,
    sessionsUsedFromBalances,
  );
  const classesTakenByClass = summarizeStudentClassesTaken(attendanceHistoryRows);

  const studentRow = student as Student;
  const addressRows = (addresses as Address[] | null) ?? [];
  const phoneRows = (phones as PhoneContact[] | null) ?? [];
  const receiptRows = (receipts as StudentReceiptRow[] | null) ?? [];

  let receiptViews: StudentReceiptView[] = receiptRows.map((receipt) => ({
    ...receipt,
    url: null,
  }));

  if (receiptRows.length > 0) {
    try {
      const service = createSupabaseServiceClient();
      receiptViews = await Promise.all(
        receiptRows.map(async (receipt) => {
          const { data: signed, error: signedError } = await service.storage
            .from(STUDENT_RECEIPT_BUCKET)
            .createSignedUrl(receipt.storage_path, 60 * 60);
          return {
            ...receipt,
            url:
              !signedError && signed?.signedUrl ? signed.signedUrl : null,
          };
        }),
      );
    } catch (error) {
      console.error("Could not create receipt signed URLs:", error);
    }
  }

  const enrollmentRows = [...((enrollments as EnrollmentEmbed[] | null) ?? [])].sort(
    (a, b) => {
      const classA = classFromEnrollment(a);
      const classB = classFromEnrollment(b);
      if (!classA || !classB) return 0;
      return classA.subject.localeCompare(classB.subject, undefined, {
        sensitivity: "base",
      });
    },
  );
  const enrolledClassIds = new Set(
    enrollmentRows
      .map((enrollment) => classFromEnrollment(enrollment)?.id)
      .filter((id): id is number => typeof id === "number"),
  );
  type ClassRow = {
    id: number;
    subject: string;
    teachers: TeacherEmbed | TeacherEmbed[] | null;
  };
  const availableClasses: ClassOption[] = sortClassesBySubject(
    ((allClasses as ClassRow[] | null) ?? [])
      .filter((classRow) => !enrolledClassIds.has(classRow.id))
      .map((classRow) => ({
        id: classRow.id,
        subject: classRow.subject,
        teacher: firstOrNull(classRow.teachers),
      })),
  );

  const today = formatSessionDate(new Date());
  const scheduleIdByClass = new Map<number, number | null>();

  for (const classId of enrolledClassIds) {
    scheduleIdByClass.set(
      classId,
      findTodayScheduleId(
        (classSchedules as Parameters<typeof findTodayScheduleId>[0] | null) ??
          [],
        classId,
        today,
      ),
    );
  }

  const creditRows = buildStudentClassCreditRows(
    enrollmentRows
      .map((enrollment) => {
        const classRow = classFromEnrollment(enrollment);
        if (!classRow) return null;
        return { classId: classRow.id, subject: classRow.subject };
      })
      .filter((row): row is { classId: number; subject: string } => row !== null),
    balanceRows,
    scheduleIdByClass,
    studentId,
  );

  type StudentListRow = {
    id: number;
    "first name": string;
    "last name": string | null;
  };
  const studentOptions: StudentOption[] = [...((allStudents as StudentListRow[] | null) ?? [])]
    .sort(compareStudentNames)
    .map((row) => ({
      id: row.id,
      "first name": row["first name"],
      "last name": row["last name"],
    }));

  return (
    <StudentDetailEditor
      student={{
        id: studentRow.id,
        firstName: studentRow["first name"],
        lastName: studentRow["last name"],
        dob: studentRow.dob,
        experience: studentRow.experience,
        gender: studentRow.gender,
        parentName: studentRow.parent_name,
        trialTimePreference: studentRow.trial_time_preference,
        isActive: studentRow.is_active,
        startingClassCredits: studentRow.starting_class_credits,
        notes: studentRow.notes,
      }}
      phones={phoneRows.map((phone) => ({
        id: phone.id,
        phoneNumber: phone.phone_number,
        ownerRole: isPhoneOwnerRole(phone.owner_role)
          ? phone.owner_role
          : "other",
        ownerName: phone.owner_name,
        isPrimary: phone.is_primary,
      }))}
      addresses={addressRows.map((address) => ({
        id: address.id,
        street1: address["street 1"],
        street2: address["street 2"],
        city: address.city,
        state: address.state,
        zipCode: address["zip code"],
      }))}
      enrollments={enrollmentRows.flatMap((enrollment) => {
        const classRow = classFromEnrollment(enrollment);
        if (!classRow) return [];
        const teacher = firstOrNull(classRow.teachers);
        const room = firstOrNull(classRow.rooms);
        return [
          {
            id: enrollment.id,
            classId: classRow.id,
            subject: classRow.subject,
            teacherName: teacher ? formatTeacherName(teacher) : null,
            roomNumber: room?.room_number ?? null,
            gradeLevel: enrollment.grade_level,
            isActive: enrollment.is_active !== false,
          },
        ];
      })}
      availableClasses={availableClasses}
      creditRows={creditRows}
      studentOptions={studentOptions}
      receipts={receiptViews}
      totalClassesTaken={totalClassesTaken}
      classesTakenByClass={classesTakenByClass}
      attendanceHistoryRows={attendanceHistoryRows}
      attendanceHistoryError={attendanceHistoryError}
      phonesError={phonesError?.message ?? null}
      addressError={addressError?.message ?? null}
      enrollmentError={enrollmentError?.message ?? null}
      allClassesError={allClassesError?.message ?? null}
      creditsError={
        balancesError?.message ??
        schedulesError?.message ??
        allStudentsError?.message ??
        null
      }
      receiptsError={receiptsError?.message ?? null}
    />
  );
}
