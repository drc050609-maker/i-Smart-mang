import { faker } from "@faker-js/faker";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { addMinutesToScheduleTime } from "@/lib/class-schedule";
import { inferClassTrackFromSubject } from "@/lib/class-track";
import type { Database } from "@/types/database.types";

/** Delete all rows in FK-safe order (children before parents). */
const CLEAR_TABLES_ORDER = [
  "enrollments",
  "addresses",
  "class_schedules",
  "classes",
  "students",
  "teachers",
  "rooms",
] as const satisfies ReadonlyArray<keyof Database["public"]["Tables"]>;

async function clearSeedTables(supabase: SupabaseClient<Database>): Promise<void> {
  console.log("Clearing existing rows (FK-safe order)…");

  for (const table of CLEAR_TABLES_ORDER) {
    const { error } = await supabase.from(table).delete().gte("id", 0);
    if (error) {
      throw new Error(`Cleanup failed on "${table}": ${error.message}`);
    }
  }

  console.log("Cleanup done.");
}

const ROOM_COUNT = 15;
const STUDENT_COUNT = 100;
/** One address per student; each row sets `student` FK to that student’s id. */
const ADDRESS_COUNT = STUDENT_COUNT;
const TEACHER_COUNT = 20;
const CLASS_COUNT = 20;
/** One enrollment per student — everyone is in at least one class. */
const ENROLLMENT_COUNT = STUDENT_COUNT;

/** Enough labels for `CLASS_COUNT` distinct offerings. */
const CLASS_DURATIONS_MINUTES = [30, 45, 60, 90] as const;

const CLASS_SUBJECTS = [
  "Singing / Voice",
  "Dance — Hip Hop",
  "Violin I",
  "Drums & Percussion",
  "Piano",
  "Guitar",
  "Cello",
  "Flute",
  "Ballet Fundamentals",
  "Jazz Ensemble",
  "Choir",
  "Music Theory",
  "Musical Theater",
  "Saxophone",
  "Ukulele",
  "Trumpet",
  "Clarinet",
  "Songwriting Lab",
  "Tap Dance",
  "World Rhythms & Dance",
] as const satisfies readonly [string, ...string[]];

type RoomInsert = Database["public"]["Tables"]["rooms"]["Insert"];
type AddressInsert = Database["public"]["Tables"]["addresses"]["Insert"];
type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
type TeacherInsert = Database["public"]["Tables"]["teachers"]["Insert"];
type ClassInsert = Database["public"]["Tables"]["classes"]["Insert"];
type ClassScheduleInsert =
  Database["public"]["Tables"]["class_schedules"]["Insert"];
type EnrollmentInsert = Database["public"]["Tables"]["enrollments"]["Insert"];

function buildAddressesForStudents(studentIds: number[]): AddressInsert[] {
  if (studentIds.length !== ADDRESS_COUNT) {
    throw new Error(
      `Expected ${String(ADDRESS_COUNT)} student ids for addresses, got ${String(studentIds.length)}.`,
    );
  }

  faker.seed(9999);

  return studentIds.map((studentId) => ({
    "street 1": faker.location.streetAddress(),
    "street 2":
      faker.helpers.maybe(() => faker.location.secondaryAddress(), {
        probability: 0.35,
      }) ?? null,
    city: "Brooklyn",
    state: "NY",
    "zip code": faker.location.zipCode("#####"),
    student: studentId,
  }));
}

function buildRooms(count: number): RoomInsert[] {
  faker.seed(8484);

  return Array.from({ length: count }, (_, i) => ({
    room_number: String(200 + i + 1),
    class_size: faker.number.int({ min: 8, max: 30 }),
  }));
}

function buildStudents(count: number): StudentInsert[] {
  faker.seed(42);

  return Array.from({ length: count }, () => ({
    "first name": faker.person.firstName(),
    "last name": faker.person.lastName(),
    dob: faker.date
      .birthdate({ min: 5, max: 18, mode: "age" })
      .toISOString()
      .slice(0, 10),
  }));
}

function buildTeachers(count: number): TeacherInsert[] {
  faker.seed(4242);

  return Array.from({ length: count }, () => ({
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    dob: faker.date
      .birthdate({ min: 25, max: 65, mode: "age" })
      .toISOString()
      .slice(0, 10),
    phone_number: faker.phone.number({ style: "international" }),
  }));
}

type ClassSeedRow = ClassInsert & {
  _scheduleDay: number;
  _scheduleStart: string;
  _scheduleEnd: string;
};

function buildClasses(
  teacherIds: number[],
  roomIds: number[],
  count: number,
): ClassSeedRow[] {
  if (count > CLASS_SUBJECTS.length) {
    throw new Error(
      `CLASS_COUNT ${String(count)} exceeds subject list (${String(CLASS_SUBJECTS.length)}).`,
    );
  }
  if (teacherIds.length < count) {
    throw new Error(
      `Need at least ${String(count)} teachers for ${String(count)} classes, got ${String(teacherIds.length)}.`,
    );
  }
  if (roomIds.length < 1) {
    throw new Error("Need at least one room for classes.");
  }

  faker.seed(7777);

  const subjects = CLASS_SUBJECTS as readonly string[];
  const scheduleDays = [0, 1, 2, 3, 4, 5, 6] as const;
  const scheduleStarts = ["09:00:00", "10:00:00", "11:00:00", "14:00:00"] as const;
  const scheduleEnds = ["10:00:00", "11:00:00", "12:00:00", "15:00:00"] as const;
  const lessonTypes = ["private", "group", "trial"] as const;

  return Array.from({ length: count }, (_, i) => {
    const scheduleIndex = i % scheduleStarts.length;
    const isChoir = subjects[i] === "Choir";

    return {
      subject: subjects[i],
      teacher_id: teacherIds[i],
      room_id: roomIds[i % roomIds.length],
      duration_minutes:
        CLASS_DURATIONS_MINUTES[i % CLASS_DURATIONS_MINUTES.length],
      lesson_type: lessonTypes[i % lessonTypes.length],
      class_track: inferClassTrackFromSubject(subjects[i]),
      _scheduleDay: isChoir ? 0 : scheduleDays[i % scheduleDays.length],
      _scheduleStart: isChoir ? "10:00:00" : scheduleStarts[scheduleIndex],
      _scheduleEnd: isChoir ? "11:00:00" : scheduleEnds[scheduleIndex],
    };
  });
}

function buildClassSchedules(
  classes: Array<{
    id: number;
    subject: string;
    duration_minutes: number | null;
    _scheduleDay: number;
    _scheduleStart: string;
    _scheduleEnd: string;
  }>,
): ClassScheduleInsert[] {
  const schedules: ClassScheduleInsert[] = [];

  for (const classRow of classes) {
    schedules.push({
      class_id: classRow.id,
      is_recurring: true,
      schedule_day_of_week: classRow._scheduleDay,
      schedule_start_time: classRow._scheduleStart,
      schedule_end_time: classRow._scheduleEnd,
    });

    if (classRow.subject === "Piano") {
      const secondDay = (classRow._scheduleDay + 2) % 7;
      const secondStart = "16:00:00";
      const secondEnd =
        addMinutesToScheduleTime(secondStart, classRow.duration_minutes ?? 60) ??
        "17:00:00";

      schedules.push({
        class_id: classRow.id,
        is_recurring: true,
        schedule_day_of_week: secondDay,
        schedule_start_time: secondStart,
        schedule_end_time: secondEnd,
      });
    }
  }

  return schedules;
}

function buildEnrollments(
  studentIds: number[],
  classIds: number[],
  count: number,
): EnrollmentInsert[] {
  if (studentIds.length !== count) {
    throw new Error(
      `Expected ${String(count)} student ids for enrollments, got ${String(studentIds.length)}.`,
    );
  }
  if (classIds.length < 1) {
    throw new Error("Need at least one class for enrollments.");
  }

  faker.seed(3333);
  const today = new Date().toISOString().slice(0, 10);

  return studentIds.map((studentId, i) => ({
    "class id": classIds[i % classIds.length],
    "student id": studentId,
    created_date: today,
    is_active: true,
    updated_date: today,
  }));
}

export async function seed(): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await clearSeedTables(supabase);

  const rooms = buildRooms(ROOM_COUNT);
  console.log(`Inserting ${ROOM_COUNT} rooms…`);
  const { data: roomRows, error: roomError } = await supabase
    .from("rooms")
    .insert(rooms)
    .select("id");

  if (roomError) {
    throw new Error(`Room seed failed: ${roomError.message}`);
  }
  console.log(`Inserted ${roomRows?.length ?? 0} rooms.`);

  if (!roomRows?.length || roomRows.length !== ROOM_COUNT) {
    throw new Error(
      `Expected ${String(ROOM_COUNT)} rooms before classes, got ${String(roomRows?.length ?? 0)}.`,
    );
  }

  const students = buildStudents(STUDENT_COUNT);
  console.log(`Inserting ${STUDENT_COUNT} students…`);
  const { data: studentRows, error: studentError } = await supabase
    .from("students")
    .insert(students)
    .select("id");

  if (studentError) {
    throw new Error(`Student seed failed: ${studentError.message}`);
  }
  console.log(`Inserted ${studentRows?.length ?? 0} students.`);

  if (!studentRows?.length || studentRows.length !== STUDENT_COUNT) {
    throw new Error(
      `Expected ${String(STUDENT_COUNT)} student ids for addresses, got ${String(studentRows?.length ?? 0)}.`,
    );
  }

  const studentIds = studentRows.map((r) => r.id);
  const addresses = buildAddressesForStudents(studentIds);
  console.log(
    `Inserting ${String(addresses.length)} addresses (one per student, student FK set)…`,
  );
  const { data: addressRows, error: addressError } = await supabase
    .from("addresses")
    .insert(addresses)
    .select("id");

  if (addressError) {
    throw new Error(`Address seed failed: ${addressError.message}`);
  }
  const addrN = addressRows?.length ?? 0;
  if (addrN !== ADDRESS_COUNT) {
    throw new Error(
      `Expected ${String(ADDRESS_COUNT)} addresses inserted, got ${String(addrN)}.`,
    );
  }
  console.log(`Inserted ${String(addrN)} addresses.`);

  const teachers = buildTeachers(TEACHER_COUNT);
  console.log(`Inserting ${TEACHER_COUNT} teachers…`);
  const { data: teacherRows, error: teacherError } = await supabase
    .from("teachers")
    .insert(teachers)
    .select("id");

  if (teacherError) {
    throw new Error(`Teacher seed failed: ${teacherError.message}`);
  }
  const teacherN = teacherRows?.length ?? 0;
  if (teacherN !== TEACHER_COUNT) {
    throw new Error(
      `Expected ${String(TEACHER_COUNT)} teachers, got ${String(teacherN)}.`,
    );
  }
  console.log(`Inserted ${String(teacherN)} teachers.`);

  const classRows = buildClasses(
    teacherRows.map((r) => r.id),
    roomRows.map((r) => r.id),
    CLASS_COUNT,
  );
  console.log(
    `Inserting ${String(CLASS_COUNT)} classes (each linked to one teacher + one room)…`,
  );
  const { data: insertedClasses, error: classError } = await supabase
    .from("classes")
    .insert(
      classRows.map(
        ({ _scheduleDay, _scheduleStart, _scheduleEnd, ...classInsert }) =>
          classInsert,
      ),
    )
    .select("id, subject, duration_minutes");

  if (classError) {
    throw new Error(`Class seed failed: ${classError.message}`);
  }
  const classN = insertedClasses?.length ?? 0;
  if (classN !== CLASS_COUNT) {
    throw new Error(
      `Expected ${String(CLASS_COUNT)} classes inserted, got ${String(classN)}.`,
    );
  }
  console.log(`Inserted ${String(classN)} classes.`);

  const scheduleRows = buildClassSchedules(
    insertedClasses.map((classRow, index) => ({
      id: classRow.id,
      subject: classRow.subject,
      duration_minutes: classRow.duration_minutes,
      _scheduleDay: classRows[index]!._scheduleDay,
      _scheduleStart: classRows[index]!._scheduleStart,
      _scheduleEnd: classRows[index]!._scheduleEnd,
    })),
  );
  console.log(`Inserting ${String(scheduleRows.length)} class schedules…`);
  const { data: insertedSchedules, error: scheduleError } = await supabase
    .from("class_schedules")
    .insert(scheduleRows)
    .select("id");

  if (scheduleError) {
    throw new Error(`Class schedule seed failed: ${scheduleError.message}`);
  }
  console.log(`Inserted ${String(insertedSchedules?.length ?? 0)} schedules.`);

  const enrollmentRows = buildEnrollments(
    studentIds,
    insertedClasses.map((r) => r.id),
    ENROLLMENT_COUNT,
  );
  console.log(
    `Inserting ${String(ENROLLMENT_COUNT)} enrollments (each student → one class; classes round-robin)…`,
  );
  const { data: enrollmentIns, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(enrollmentRows)
    .select("id");

  if (enrollmentError) {
    throw new Error(`Enrollment seed failed: ${enrollmentError.message}`);
  }
  const enrN = enrollmentIns?.length ?? 0;
  if (enrN !== ENROLLMENT_COUNT) {
    throw new Error(
      `Expected ${String(ENROLLMENT_COUNT)} enrollments inserted, got ${String(enrN)}.`,
    );
  }
  console.log(`Inserted ${String(enrN)} enrollments.`);
}

async function main(): Promise<void> {
  await seed();
  console.log("Seed finished.");
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
