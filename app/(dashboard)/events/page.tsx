import { cookies } from "next/headers";

import { CreateEventDialog } from "@/components/create-event-dialog";
import { EventPostCard } from "@/components/event-post-card";
import {
  getEventMediaPublicUrl,
  sortEventMedia,
  type EventPost,
} from "@/lib/event-media";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/server";

type EventMediaEmbed = {
  id: number;
  event_id: number;
  media_type: string;
  storage_path: string;
  mime_type: string | null;
  sort_order: number;
};

type EventRow = {
  id: number;
  title: string | null;
  body: string;
  created_at: string;
  event_media: EventMediaEmbed | EventMediaEmbed[] | null;
};

function listOrEmpty<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function EventsPage() {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: events, error } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      body,
      created_at,
      event_media (
        id,
        event_id,
        media_type,
        storage_path,
        mime_type,
        sort_order
      )
    `,
    )
    .order("created_at", { ascending: false });

  const eventPosts: EventPost[] =
    (events as EventRow[] | null)?.map((event) => ({
      id: event.id,
      title: event.title,
      body: event.body,
      created_at: event.created_at,
      media: sortEventMedia(listOrEmpty(event.event_media)).map((item) => ({
        id: item.id,
        event_id: item.event_id,
        media_type: item.media_type as "image" | "video",
        storage_path: item.storage_path,
        mime_type: item.mime_type,
        sort_order: item.sort_order,
        public_url: getEventMediaPublicUrl(item.storage_path),
      })),
    })) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {t("nav.events")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("common.eventsSubtitle")}
          </p>
        </div>
        <CreateEventDialog />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {t("common.error.loadFailed", { entity: t("nav.events"), message: error.message })}
        </p>
      ) : null}

      {!error && eventPosts.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-white/15">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {t("common.noPostsYet")}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t("common.createFirstEvent")}
          </p>
          <div className="mt-6 flex justify-center">
            <CreateEventDialog />
          </div>
        </div>
      ) : null}

      {eventPosts.length > 0 ? (
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-8">
          {eventPosts.map((event) => (
            <EventPostCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
