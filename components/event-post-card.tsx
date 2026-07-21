"use client";

import { DeleteEventButton } from "@/components/delete-event-button";
import { EventMediaCarousel } from "@/components/event-media-carousel";
import { useLanguage } from "@/components/language-provider";
import {
  formatEventTimestamp,
  type EventPost,
} from "@/lib/event-media";

export function EventPostCard({ event }: { event: EventPost }) {
  const { language, t } = useLanguage();

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            IS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              iSmart {t("brand.musicSchool")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatEventTimestamp(event.created_at, language)}
            </p>
          </div>
        </div>
        <DeleteEventButton eventId={event.id} />
      </header>

      {event.media.length > 0 ? (
        <EventMediaCarousel media={event.media} />
      ) : null}

      <div className="space-y-2 px-4 py-3">
        {event.title ? (
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {event.title}
          </h2>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {event.body}
        </p>
      </div>
    </article>
  );
}
