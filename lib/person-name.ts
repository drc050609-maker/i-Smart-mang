export type StudentNameFields = {
  "first name": string;
  "last name": string | null;
};

export type TeacherNameFields = {
  first_name: string;
  last_name: string | null;
};

export function formatStudentName(student: StudentNameFields) {
  const first = student["first name"];
  const last = student["last name"];
  return last ? `${first} ${last}` : first;
}

export function formatTeacherName(teacher: TeacherNameFields) {
  const last = teacher.last_name;
  return last ? `${teacher.first_name} ${last}` : teacher.first_name;
}

function compareNames(nameA: string, nameB: string) {
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
}

export function compareStudentNames(
  a: StudentNameFields,
  b: StudentNameFields,
) {
  return compareNames(
    formatStudentName(a).toLowerCase(),
    formatStudentName(b).toLowerCase(),
  );
}

export function compareTeacherNames(
  a: TeacherNameFields,
  b: TeacherNameFields,
) {
  return compareNames(
    formatTeacherName(a).toLowerCase(),
    formatTeacherName(b).toLowerCase(),
  );
}

export function sortStudents<T extends StudentNameFields>(students: T[]) {
  return [...students].sort(compareStudentNames);
}

export function sortTeachers<T extends TeacherNameFields>(teachers: T[]) {
  return [...teachers].sort(compareTeacherNames);
}

export function filterStudentsByQuery<T extends StudentNameFields>(
  students: T[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return students;

  return students.filter((student) => {
    const fullName = formatStudentName(student).toLowerCase();
    const firstName = student["first name"].toLowerCase();
    const lastName = student["last name"]?.toLowerCase() ?? "";

    return (
      fullName.includes(normalizedQuery) ||
      firstName.includes(normalizedQuery) ||
      lastName.includes(normalizedQuery)
    );
  });
}

export function filterTeachersByQuery<T extends TeacherNameFields>(
  teachers: T[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return teachers;

  return teachers.filter((teacher) => {
    const fullName = formatTeacherName(teacher).toLowerCase();
    const firstName = teacher.first_name.toLowerCase();
    const lastName = teacher.last_name?.toLowerCase() ?? "";

    return (
      fullName.includes(normalizedQuery) ||
      firstName.includes(normalizedQuery) ||
      lastName.includes(normalizedQuery)
    );
  });
}
