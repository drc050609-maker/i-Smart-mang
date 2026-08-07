export const STUDENT_RECEIPT_BUCKET = "student-receipts";

export const ALLOWED_STUDENT_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

/** 10 MB — matches the storage bucket limit. */
export const MAX_STUDENT_RECEIPT_FILE_BYTES = 10 * 1024 * 1024;

export type StudentReceiptRow = {
  id: number;
  student_id: number;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  note: string | null;
  created_at: string;
};

export type StudentReceiptView = StudentReceiptRow & {
  url: string | null;
};

export function isStudentReceiptMimeType(mimeType: string) {
  return (ALLOWED_STUDENT_RECEIPT_MIME_TYPES as readonly string[]).includes(
    mimeType,
  );
}

export function formatReceiptUploadedAt(
  isoDate: string,
  language: "en" | "zh" = "en",
) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Date(isoDate).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
