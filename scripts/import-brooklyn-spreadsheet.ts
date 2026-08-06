/**
 * Sync Brooklyn campus teachers + students from 学员资料 spreadsheet export.
 *
 * Usage:
 *   npm run import:brooklyn-spreadsheet
 *   npm run import:brooklyn-spreadsheet -- --apply
 *
 * Default is dry-run. --apply writes to Brooklyn only (location_id = 1).
 *
 * Source: scripts/data/brooklyn-spreadsheet.json
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { inferClassTrackFromSubject } from "@/lib/class-track";
import {
  DEFAULT_GRADE_LEVEL,
  resolveGradeTier,
  type GradeLevelOption,
} from "@/lib/class-subject";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const BK_LOCATION_ID = 1;
const APPLY = process.argv.includes("--apply");
const DATA_PATH = join(
  process.cwd(),
  "scripts/data/brooklyn-spreadsheet.json",
);

type SheetTeacher = {
  first_name: string;
  last_name: string | null;
  notes: string;
  sheet_labels: string[];
  subjects: string[];
};

type SheetStudent = {
  seq: number | null;
  raw_name: string;
  first_name: string;
  last_name: string | null;
  dob: string | null;
  phone: string | null;
  experience: string | null;
  teacher_raw: string | null;
  teacher_first: string | null;
  teacher_last: string | null;
  subject_zh: string | null;
  subject: string | null;
  status: string | null;
  is_active: boolean;
  grade_level: string | null;
  reg_date: string | null;
  purchased: number | null;
  remaining: number | null;
};

type Payload = {
  location_id: number;
  teachers: SheetTeacher[];
  students: SheetStudent[];
  stats: Record<string, number>;
};

type DbTeacher = {
  id: number;
  first_name: string;
  last_name: string | null;
  notes: string | null;
  is_active: boolean;
};

type DbStudent = {
  id: number;
  "first name": string;
  "last name": string | null;
  dob: string | null;
  is_active: boolean;
  experience: string | null;
};

type DbClass = {
  id: number;
  subject: string;
  teacher_id: number | null;
  is_active: boolean;
  lesson_type: string | null;
};

function personKey(firstName: string, lastName: string | null) {
  return `${firstName} ${lastName ?? ""}`.trim().toLowerCase();
}

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function lessonTypeForSubject(subject: string): "private" | "group" {
  const groupish = [
    "Band",
    "Choir",
    "Chinese Dance",
    "Jazz Dance",
    "Dance — Hip Hop",
    "Model / Catwalk",
    "Art",
  ];
  return groupish.includes(subject) ? "group" : "private";
}

function buildTeacherIndex(teachers: DbTeacher[]) {
  const byFull = new Map<string, DbTeacher>();
  const byFirst = new Map<string, DbTeacher[]>();
  for (const t of teachers) {
    byFull.set(personKey(t.first_name, t.last_name), t);
    // Also index by first name alone and by last name when it is a nickname (Ben)
    const first = norm(t.first_name);
    const list = byFirst.get(first) ?? [];
    list.push(t);
    byFirst.set(first, list);
    if (t.last_name) {
      const ln = norm(t.last_name);
      const lnList = byFirst.get(ln) ?? [];
      lnList.push(t);
      byFirst.set(ln, lnList);
    }
  }
  return { byFull, byFirst };
}

function findTeacher(
  index: ReturnType<typeof buildTeacherIndex>,
  first: string,
  last: string | null,
): DbTeacher | null {
  const full = index.byFull.get(personKey(first, last));
  if (full) return full;
  // Ben -> 金浩 Ben
  if (last) {
    const byLast = index.byFirst.get(norm(last));
    if (byLast?.length === 1) return byLast[0]!;
  }
  const byFirst = index.byFirst.get(norm(first));
  if (byFirst?.length === 1) return byFirst[0]!;
  if (byFirst && byFirst.length > 1) {
    // Prefer exact first_name match ignoring last
    const exact = byFirst.find((t) => norm(t.first_name) === norm(first));
    return exact ?? byFirst[0]!;
  }
  return null;
}

function buildStudentIndex(students: DbStudent[]) {
  const byFull = new Map<string, DbStudent[]>();
  const byFirst = new Map<string, DbStudent[]>();
  const byCompact = new Map<string, DbStudent[]>();

  const add = (map: Map<string, DbStudent[]>, key: string, s: DbStudent) => {
    if (!key) return;
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  };

  for (const s of students) {
    const full = personKey(s["first name"], s["last name"]);
    add(byFull, full, s);
    add(byFirst, norm(s["first name"]), s);
    const compact = `${s["first name"]}${s["last name"] ?? ""}`
      .replace(/\s+/g, "")
      .toLowerCase();
    add(byCompact, compact, s);
    // also first+last reversed compact for messy calendar names
    if (s["last name"]) {
      add(
        byCompact,
        `${s["last name"]}${s["first name"]}`.replace(/\s+/g, "").toLowerCase(),
        s,
      );
    }
  }
  return { byFull, byFirst, byCompact };
}

function uniqueStudents(list: DbStudent[]): DbStudent[] {
  const seen = new Set<number>();
  return list.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

function findStudentCandidates(
  index: ReturnType<typeof buildStudentIndex>,
  first: string,
  last: string | null,
): DbStudent[] {
  const full = personKey(first, last);
  const fromFull = index.byFull.get(full) ?? [];
  if (fromFull.length) return uniqueStudents(fromFull);

  const compact = `${first}${last ?? ""}`.replace(/\s+/g, "").toLowerCase();
  const fromCompact = index.byCompact.get(compact) ?? [];
  if (fromCompact.length) return uniqueStudents(fromCompact);

  if (last) {
    // DB has first only matching sheet first+last
    const firstOnly = (index.byFirst.get(norm(first)) ?? []).filter(
      (s) => !s["last name"],
    );
    if (firstOnly.length === 1) return firstOnly;
  }

  const byFirst = index.byFirst.get(norm(first)) ?? [];
  if (!last) {
    // Prefer unique first-only records; else all with that first name
    const firstOnly = byFirst.filter((s) => !s["last name"]);
    if (firstOnly.length === 1) return firstOnly;
    if (byFirst.length === 1) return byFirst;
  } else {
    // Match same last name
    const sameLast = byFirst.filter(
      (s) => norm(s["last name"]) === norm(last),
    );
    if (sameLast.length) return uniqueStudents(sameLast);
  }

  return uniqueStudents(byFirst);
}

async function main() {
  const payload = JSON.parse(readFileSync(DATA_PATH, "utf8")) as Payload;
  console.log("Brooklyn spreadsheet sync preview");
  console.log(JSON.stringify(payload.stats, null, 2));
  console.log(
    `Teachers in sheet: ${payload.teachers.map((t) => `${t.first_name}${t.last_name ? ` ${t.last_name}` : ""} (${t.subjects.join("/")})`).join("; ")}`,
  );

  const supabase = createSupabaseServiceClient();

  const { data: dbTeachers, error: teachersErr } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, notes, is_active")
    .eq("location_id", BK_LOCATION_ID);
  if (teachersErr) throw new Error(teachersErr.message);

  const { data: dbStudents, error: studentsErr } = await supabase
    .from("students")
    .select('id, "first name", "last name", dob, is_active, experience')
    .eq("location_id", BK_LOCATION_ID);
  if (studentsErr) throw new Error(studentsErr.message);

  const { data: dbClasses, error: classesErr } = await supabase
    .from("classes")
    .select("id, subject, teacher_id, is_active, lesson_type")
    .eq("location_id", BK_LOCATION_ID);
  if (classesErr) throw new Error(classesErr.message);

  const { data: dbEnrollments, error: enrErr } = await supabase
    .from("enrollments")
    .select('id, "student id", "class id", grade_level, is_active, classes!inner ( location_id )')
    .eq("classes.location_id", BK_LOCATION_ID);
  if (enrErr) throw new Error(enrErr.message);

  let teacherIndex = buildTeacherIndex((dbTeachers ?? []) as DbTeacher[]);
  let studentIndex = buildStudentIndex((dbStudents ?? []) as DbStudent[]);
  const classes = [...((dbClasses ?? []) as DbClass[])];
  const enrollments = [...(dbEnrollments ?? [])] as Array<{
    id: number;
    "student id": number | null;
    "class id": number;
    grade_level: string | null;
    is_active: boolean | null;
  }>;

  const teacherIdByCanon = new Map<string, number>();
  const teachersCreated: string[] = [];
  const teachersUpdated: string[] = [];

  // --- Teachers ---
  for (const sheetTeacher of payload.teachers) {
    const key = personKey(sheetTeacher.first_name, sheetTeacher.last_name);
    let existing = findTeacher(
      teacherIndex,
      sheetTeacher.first_name,
      sheetTeacher.last_name,
    );

    // Special: Ben maps to 金浩
    if (!existing && sheetTeacher.last_name === "Ben") {
      existing = findTeacher(teacherIndex, "金浩", "Ben");
    }

    if (existing) {
      teacherIdByCanon.set(key, existing.id);
      const noteNeeds =
        !existing.notes ||
        !existing.notes.includes("Teaches:") ||
        sheetTeacher.subjects.some((s) => !existing!.notes!.includes(s));
      if (noteNeeds || !existing.is_active) {
        teachersUpdated.push(
          `${sheetTeacher.first_name}#${existing.id}${!existing.is_active ? " (reactivate? keep)" : ""}`,
        );
        if (APPLY) {
          const mergedNotes = existing.notes?.includes("Teaches:")
            ? existing.notes
            : [existing.notes, sheetTeacher.notes].filter(Boolean).join(" | ");
          const { error } = await supabase
            .from("teachers")
            .update({
              notes: mergedNotes || sheetTeacher.notes,
              // Keep existing is_active; sheet may list departed teachers
            })
            .eq("id", existing.id);
          if (error) {
            throw new Error(`Update teacher ${key}: ${error.message}`);
          }
        }
      }
      continue;
    }

    teachersCreated.push(
      `${sheetTeacher.first_name}${sheetTeacher.last_name ? ` ${sheetTeacher.last_name}` : ""} → ${sheetTeacher.subjects.join(", ")}`,
    );
    if (APPLY) {
      const { data, error } = await supabase
        .from("teachers")
        .insert({
          first_name: sheetTeacher.first_name,
          last_name: sheetTeacher.last_name,
          notes: sheetTeacher.notes,
          is_active: true,
          location_id: BK_LOCATION_ID,
        })
        .select("id, first_name, last_name, notes, is_active")
        .single();
      if (error) throw new Error(`Create teacher ${key}: ${error.message}`);
      teacherIdByCanon.set(key, data.id);
      const list = (dbTeachers ?? []) as DbTeacher[];
      list.push(data as DbTeacher);
      teacherIndex = buildTeacherIndex(list);
    } else {
      // dry-run placeholder negative id
      teacherIdByCanon.set(key, -1);
    }
  }

  // Refresh teacher index after creates for class matching in dry-run we fake
  if (APPLY) {
    const { data: refreshed } = await supabase
      .from("teachers")
      .select("id, first_name, last_name, notes, is_active")
      .eq("location_id", BK_LOCATION_ID);
    teacherIndex = buildTeacherIndex((refreshed ?? []) as DbTeacher[]);
    for (const sheetTeacher of payload.teachers) {
      const key = personKey(sheetTeacher.first_name, sheetTeacher.last_name);
      const found = findTeacher(
        teacherIndex,
        sheetTeacher.first_name,
        sheetTeacher.last_name,
      );
      if (found) teacherIdByCanon.set(key, found.id);
    }
  }

  // --- Classes keyed by teacher+subject ---
  function findClass(teacherId: number, subject: string): DbClass | null {
    const matches = classes.filter(
      (c) =>
        c.teacher_id === teacherId &&
        norm(c.subject) === norm(subject) &&
        c.is_active,
    );
    if (matches.length) return matches[0]!;
    const inactive = classes.find(
      (c) =>
        c.teacher_id === teacherId && norm(c.subject) === norm(subject),
    );
    return inactive ?? null;
  }

  const classesCreated: string[] = [];
  async function ensureClass(
    teacherId: number,
    subject: string,
  ): Promise<number | null> {
    if (teacherId < 0) return null;
    const existing = findClass(teacherId, subject);
    if (existing) return existing.id;
    classesCreated.push(`teacher#${teacherId} / ${subject}`);
    if (!APPLY) return null;
    const { data, error } = await supabase
      .from("classes")
      .insert({
        subject,
        teacher_id: teacherId,
        duration_minutes: 45,
        lesson_type: lessonTypeForSubject(subject),
        class_track: inferClassTrackFromSubject(subject),
        is_active: true,
        location_id: BK_LOCATION_ID,
      })
      .select("id, subject, teacher_id, is_active, lesson_type")
      .single();
    if (error) {
      throw new Error(`Create class ${subject} teacher ${teacherId}: ${error.message}`);
    }
    classes.push(data as DbClass);
    await supabase.from("class_teachers").upsert({
      class_id: data.id,
      teacher_id: teacherId,
      is_primary: true,
    });
    return data.id;
  }

  // Pre-ensure classes for each teacher/subject pair
  for (const sheetTeacher of payload.teachers) {
    const key = personKey(sheetTeacher.first_name, sheetTeacher.last_name);
    const tid = teacherIdByCanon.get(key);
    if (tid == null) continue;
    for (const subject of sheetTeacher.subjects) {
      await ensureClass(tid, subject);
    }
  }

  // Enrollment lookup: studentId|classId
  const enrollmentByPair = new Map<string, (typeof enrollments)[number]>();
  for (const e of enrollments) {
    if (e["student id"] == null) continue;
    enrollmentByPair.set(`${e["student id"]}|${e["class id"]}`, e);
  }

  // Teacher enrollments for disambiguation
  const studentIdsByTeacherId = new Map<number, Set<number>>();
  for (const e of enrollments) {
    if (e["student id"] == null) continue;
    const cls = classes.find((c) => c.id === e["class id"]);
    if (!cls?.teacher_id) continue;
    const set = studentIdsByTeacherId.get(cls.teacher_id) ?? new Set();
    set.add(e["student id"]);
    studentIdsByTeacherId.set(cls.teacher_id, set);
  }

  const studentsCreated: string[] = [];
  const studentsUpdated: string[] = [];
  const studentsMatched: string[] = [];
  const studentsAmbiguous: string[] = [];
  const enrollmentsCreated: string[] = [];
  const enrollmentsUpdated: string[] = [];
  const creditsGranted: string[] = [];

  // Deduplicate sheet rows by student identity, merge multiple teacher/subject enrollments
  type MergedStudent = {
    first_name: string;
    last_name: string | null;
    dob: string | null;
    experience: string | null;
    is_active: boolean;
    rows: SheetStudent[];
  };

  const mergedByKey = new Map<string, MergedStudent>();
  for (const row of payload.students) {
    if (!row.first_name) continue;
    const key = personKey(row.first_name, row.last_name);
    const existing = mergedByKey.get(key);
    if (!existing) {
      mergedByKey.set(key, {
        first_name: row.first_name,
        last_name: row.last_name,
        dob: row.dob,
        experience: row.experience,
        is_active: row.is_active,
        rows: [row],
      });
    } else {
      existing.rows.push(row);
      // Active if any row is 在读
      existing.is_active = existing.is_active || row.is_active;
      if (!existing.dob && row.dob) existing.dob = row.dob;
      if (!existing.last_name && row.last_name) existing.last_name = row.last_name;
      if (row.experience) {
        if (!existing.experience) existing.experience = row.experience;
        else if (!existing.experience.includes(row.experience.slice(0, 40))) {
          existing.experience = `${existing.experience} | ${row.experience}`;
        }
      }
    }
  }

  for (const merged of mergedByKey.values()) {
    let candidates = findStudentCandidates(
      studentIndex,
      merged.first_name,
      merged.last_name,
    );

    // Disambiguate via teacher when multiple candidates
    if (candidates.length > 1) {
      const teacherIds = new Set<number>();
      for (const row of merged.rows) {
        if (!row.teacher_first) continue;
        const t = findTeacher(
          teacherIndex,
          row.teacher_first,
          row.teacher_last,
        );
        if (t) teacherIds.add(t.id);
      }
      const narrowed = candidates.filter((s) =>
        [...teacherIds].some((tid) =>
          studentIdsByTeacherId.get(tid)?.has(s.id),
        ),
      );
      if (narrowed.length === 1) candidates = narrowed;
      else if (narrowed.length > 1) candidates = narrowed;
    }

    // Prefer candidate with matching last name when sheet has last
    if (candidates.length > 1 && merged.last_name) {
      const withLast = candidates.filter(
        (s) => norm(s["last name"]) === norm(merged.last_name),
      );
      if (withLast.length === 1) candidates = withLast;
    }

    // Prefer first-only DB record when sheet has last and one first-only exists
    if (candidates.length > 1 && merged.last_name) {
      const firstOnly = candidates.filter((s) => !s["last name"]);
      if (firstOnly.length === 1) candidates = firstOnly;
    }

    let studentId: number | null = null;

    if (candidates.length > 1) {
      studentsAmbiguous.push(
        `${merged.first_name} ${merged.last_name ?? ""} → [${candidates.map((c) => `${c.id}:${c["first name"]} ${c["last name"] ?? ""}`).join(", ")}]`,
      );
      // Prefer a candidate already enrolled with this sheet teacher.
      const teacherIds = new Set<number>();
      for (const row of merged.rows) {
        if (!row.teacher_first) continue;
        const t = findTeacher(
          teacherIndex,
          row.teacher_first,
          row.teacher_last,
        );
        if (t) teacherIds.add(t.id);
      }
      const withTeacher = candidates.filter((s) =>
        [...teacherIds].some((tid) =>
          studentIdsByTeacherId.get(tid)?.has(s.id),
        ),
      );
      if (withTeacher.length === 1) {
        studentId = withTeacher[0]!.id;
        studentsMatched.push(
          `${merged.first_name} ${merged.last_name ?? ""} → #${studentId} (ambiguous pick)`,
        );
      } else {
        // Different last name / unclear match — create a new student instead of wrong merge.
        candidates = [];
      }
    }

    if (candidates.length === 1 && studentId == null) {
      studentId = candidates[0]!.id;
      studentsMatched.push(
        `${merged.first_name} ${merged.last_name ?? ""} → #${studentId}`,
      );
    }

    if (studentId == null) {
      studentsCreated.push(
        `${merged.first_name} ${merged.last_name ?? ""} (${merged.is_active ? "active" : "inactive"})`,
      );
      if (APPLY) {
        const { data, error } = await supabase
          .from("students")
          .insert({
            "first name": merged.first_name,
            "last name": merged.last_name,
            dob:
              merged.dob && /^\d{4}-\d{2}-\d{2}$/.test(merged.dob)
                ? merged.dob
                : null,
            experience: merged.experience,
            is_active: merged.is_active,
            location_id: BK_LOCATION_ID,
          })
          .select('id, "first name", "last name", dob, is_active, experience')
          .single();
        if (error) {
          console.error(
            `Create student ${merged.first_name} failed: ${error.message}`,
          );
          continue;
        }
        studentId = data.id;
        const list = (dbStudents ?? []) as DbStudent[];
        list.push(data as DbStudent);
        studentIndex = buildStudentIndex(list);
      } else {
        continue;
      }
    }

    if (studentId == null) continue;

    const existingStudent =
      candidates.length === 1
        ? candidates[0]!
        : ((dbStudents ?? []) as DbStudent[]).find((s) => s.id === studentId);

    if (existingStudent && APPLY) {
      const patch: Record<string, unknown> = {};
      if (!existingStudent.dob && merged.dob && /^\d{4}-\d{2}-\d{2}$/.test(merged.dob)) {
        patch.dob = merged.dob;
      }
      if (
        !existingStudent["last name"] &&
        merged.last_name &&
        merged.last_name.trim()
      ) {
        patch["last name"] = merged.last_name;
      }
      if (merged.experience) {
        const cur = existingStudent.experience ?? "";
        if (!cur.includes("Contact:") && merged.experience.includes("Contact:")) {
          patch.experience = cur
            ? `${merged.experience} | ${cur}`
            : merged.experience;
        } else if (!cur && merged.experience) {
          patch.experience = merged.experience;
        }
      }
      // Sync active flag from sheet aggregate (在读 wins if any class active)
      if (existingStudent.is_active !== merged.is_active) {
        patch.is_active = merged.is_active;
      }
      if (Object.keys(patch).length > 0) {
        studentsUpdated.push(
          `#${studentId} ${merged.first_name}: ${Object.keys(patch).join(",")}`,
        );
        const { error } = await supabase
          .from("students")
          .update(patch)
          .eq("id", studentId);
        if (error) {
          console.error(
            `Update student ${studentId} failed: ${error.message}`,
          );
        }
      }
    } else if (existingStudent && !APPLY) {
      const wouldUpdate: string[] = [];
      if (!existingStudent.dob && merged.dob) wouldUpdate.push("dob");
      if (!existingStudent["last name"] && merged.last_name) {
        wouldUpdate.push("last_name");
      }
      if (merged.experience && !existingStudent.experience) {
        wouldUpdate.push("experience");
      }
      if (existingStudent.is_active !== merged.is_active) {
        wouldUpdate.push("is_active");
      }
      if (wouldUpdate.length) {
        studentsUpdated.push(
          `#${studentId} ${merged.first_name}: ${wouldUpdate.join(",")}`,
        );
      }
    }

    // Enrollments per sheet row (teacher + subject)
    for (const row of merged.rows) {
      if (!row.teacher_first || !row.subject) continue;
      const teacher = findTeacher(
        teacherIndex,
        row.teacher_first,
        row.teacher_last,
      );
      const teacherId =
        teacher?.id ??
        teacherIdByCanon.get(
          personKey(row.teacher_first, row.teacher_last),
        );
      if (teacherId == null || teacherId < 0) continue;

      const classId = await ensureClass(teacherId, row.subject);
      if (classId == null) continue;

      const pairKey = `${studentId}|${classId}`;
      const existingEnr = enrollmentByPair.get(pairKey);
      const grade: GradeLevelOption = row.grade_level
        ? resolveGradeTier(row.grade_level)
        : DEFAULT_GRADE_LEVEL;

      if (!existingEnr) {
        enrollmentsCreated.push(
          `student#${studentId} → ${row.subject} / teacher#${teacherId}`,
        );
        if (APPLY) {
          const { data, error } = await supabase
            .from("enrollments")
            .insert({
              "student id": studentId,
              "class id": classId,
              is_active: row.is_active,
              created_date: row.reg_date,
              grade_level: grade,
            })
            .select("id")
            .single();
          if (error) {
            throw new Error(
              `Enrollment student ${studentId} class ${classId}: ${error.message}`,
            );
          }
          enrollmentByPair.set(pairKey, {
            id: data.id,
            "student id": studentId,
            "class id": classId,
            grade_level: grade,
            is_active: row.is_active,
          });

          // Grant remaining credits only for brand-new enrollments when sheet has remaining > 0
          if (row.remaining != null && row.remaining > 0) {
            const { error: creditErr } = await supabase.rpc(
              "grant_student_class_credits",
              {
                p_student_id: studentId,
                p_class_id: classId,
                p_credits: row.remaining,
                p_reason: "Brooklyn spreadsheet import (remaining hours)",
              },
            );
            if (creditErr) {
              throw new Error(
                `Credits student ${studentId}: ${creditErr.message}`,
              );
            }
            creditsGranted.push(
              `student#${studentId} class#${classId} +${row.remaining}`,
            );
          }
        }
      } else {
        const patch: Record<string, unknown> = {};
        if (
          row.grade_level &&
          (!existingEnr.grade_level ||
            existingEnr.grade_level === DEFAULT_GRADE_LEVEL) &&
          grade !== DEFAULT_GRADE_LEVEL
        ) {
          patch.grade_level = grade;
        }
        if (existingEnr.is_active !== row.is_active) {
          patch.is_active = row.is_active;
        }
        if (Object.keys(patch).length > 0) {
          enrollmentsUpdated.push(
            `enr#${existingEnr.id}: ${Object.keys(patch).join(",")}`,
          );
          if (APPLY) {
            const { error } = await supabase
              .from("enrollments")
              .update(patch)
              .eq("id", existingEnr.id);
            if (error) {
              throw new Error(
                `Update enrollment ${existingEnr.id}: ${error.message}`,
              );
            }
          }
        }
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Teachers to create (${teachersCreated.length}):`);
  for (const t of teachersCreated) console.log(`  + ${t}`);
  console.log(`Teachers to update notes (${teachersUpdated.length})`);
  console.log(`Classes to create (${classesCreated.length}):`);
  for (const c of classesCreated.slice(0, 40)) console.log(`  + ${c}`);
  if (classesCreated.length > 40) {
    console.log(`  … ${classesCreated.length - 40} more`);
  }
  console.log(`Students matched: ${studentsMatched.length}`);
  console.log(`Students to create (${studentsCreated.length}):`);
  for (const s of studentsCreated.slice(0, 60)) console.log(`  + ${s}`);
  if (studentsCreated.length > 60) {
    console.log(`  … ${studentsCreated.length - 60} more`);
  }
  console.log(`Students to update (${studentsUpdated.length})`);
  console.log(`Ambiguous (skipped or best-effort): ${studentsAmbiguous.length}`);
  for (const a of studentsAmbiguous.slice(0, 30)) console.log(`  ? ${a}`);
  console.log(`Enrollments to create: ${enrollmentsCreated.length}`);
  console.log(`Enrollments to update: ${enrollmentsUpdated.length}`);
  console.log(`Credits to grant (new enrollments only): ${creditsGranted.length}`);

  if (!APPLY) {
    console.log(
      "\nDry-run only. Re-run with --apply to write Brooklyn data.",
    );
    return;
  }

  console.log("\nDone. Brooklyn spreadsheet sync applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
