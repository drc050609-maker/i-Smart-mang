export const TEACHER_RESUME_BUCKET = "teacher-resumes";

export const ALLOWED_TEACHER_RESUME_MIME_TYPES = ["application/pdf"] as const;

/** 10 MB — matches the storage bucket limit. */
export const MAX_TEACHER_RESUME_FILE_BYTES = 10 * 1024 * 1024;

export function isTeacherResumeMimeType(mimeType: string) {
  return (ALLOWED_TEACHER_RESUME_MIME_TYPES as readonly string[]).includes(
    mimeType,
  );
}
