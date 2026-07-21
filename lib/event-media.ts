import { translate } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/language";

export const EVENT_MEDIA_BUCKET = "event-media";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ALLOWED_EVENT_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const;

export const MAX_EVENT_MEDIA_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_EVENT_MEDIA_FILES = 10;

export type EventMediaType = "image" | "video";

export type EventMediaItem = {
  id: number;
  event_id: number;
  media_type: EventMediaType;
  storage_path: string;
  mime_type: string | null;
  sort_order: number;
  public_url: string;
};

export type EventPost = {
  id: number;
  title: string | null;
  body: string;
  created_at: string;
  media: EventMediaItem[];
};

export function getMediaTypeFromMime(mimeType: string): EventMediaType | null {
  if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return "image";
  }

  if ((ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return "video";
  }

  return null;
}

export function getEventMediaPublicUrl(storagePath: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return storagePath;
  }

  return `${baseUrl}/storage/v1/object/public/${EVENT_MEDIA_BUCKET}/${storagePath}`;
}

export const NEW_EVENT_WINDOW_DAYS = 7;

export function isEventNew(isoDate: string, now: Date = new Date()) {
  const created = new Date(isoDate);
  const diffMs = now.getTime() - created.getTime();
  return diffMs < NEW_EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export function formatEventTimestamp(
  isoDate: string,
  language: AppLanguage = "en",
) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return translate(language, "time.justNow");
  }

  if (diffMinutes < 60) {
    return translate(language, "time.minutesAgo", { count: diffMinutes });
  }

  if (diffHours < 24) {
    return translate(language, "time.hoursAgo", { count: diffHours });
  }

  if (diffDays < 7) {
    return translate(language, "time.daysAgo", { count: diffDays });
  }

  const locale = language === "zh" ? "zh-CN" : "en-US";
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function sortEventMedia<T extends { sort_order: number; id: number }>(
  media: T[],
) {
  return [...media].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return a.id - b.id;
  });
}
