"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  ALLOWED_EVENT_MEDIA_MIME_TYPES,
  EVENT_MEDIA_BUCKET,
  getMediaTypeFromMime,
  MAX_EVENT_MEDIA_FILE_BYTES,
  MAX_EVENT_MEDIA_FILES,
  type EventMediaType,
} from "@/lib/event-media";
import { createClient } from "@/utils/supabase/server";

export type EventActionState = {
  error?: string;
  success?: boolean;
};

function getServiceClient() {
  try {
    return { supabase: createSupabaseServiceClient() };
  } catch {
    return {
      error:
        "Server is missing Supabase credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function parseEventFields(formData: FormData) {
  const title = formData.get("title")?.toString().trim() ?? "";
  const body = formData.get("body")?.toString().trim() ?? "";

  return { title: title || null, body };
}

function parseMediaFiles(formData: FormData) {
  return formData
    .getAll("media")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function createEvent(
  _prevState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const { title, body } = parseEventFields(formData);
  const files = parseMediaFiles(formData);

  if (!body) {
    return { error: "Write a caption for this event." };
  }

  if (files.length > MAX_EVENT_MEDIA_FILES) {
    return {
      error: `You can upload up to ${String(MAX_EVENT_MEDIA_FILES)} files per post.`,
    };
  }

  for (const file of files) {
    if (file.size > MAX_EVENT_MEDIA_FILE_BYTES) {
      return { error: `${file.name} is too large. Max size is 50 MB.` };
    }

    if (
      !(ALLOWED_EVENT_MEDIA_MIME_TYPES as readonly string[]).includes(file.type)
    ) {
      return {
        error: `${file.name} is not a supported image or video format.`,
      };
    }
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const cookieStore = await cookies();
  const authClient = createClient(cookieStore);
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const { data: eventRow, error: eventError } = await client.supabase
    .from("events")
    .insert({
      title,
      body,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (eventError || !eventRow) {
    return { error: eventError?.message ?? "Could not create event." };
  }

  const mediaRows: {
    event_id: number;
    media_type: EventMediaType;
    storage_path: string;
    mime_type: string;
    sort_order: number;
  }[] = [];

  for (const [index, file] of files.entries()) {
    const mediaType = getMediaTypeFromMime(file.type);
    if (!mediaType) {
      await client.supabase.from("events").delete().eq("id", eventRow.id);
      return { error: `${file.name} is not a supported file type.` };
    }

    const storagePath = `${eventRow.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await client.supabase.storage
      .from(EVENT_MEDIA_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      await client.supabase.storage
        .from(EVENT_MEDIA_BUCKET)
        .remove(mediaRows.map((row) => row.storage_path));
      await client.supabase.from("events").delete().eq("id", eventRow.id);
      return { error: uploadError.message };
    }

    mediaRows.push({
      event_id: eventRow.id,
      media_type: mediaType,
      storage_path: storagePath,
      mime_type: file.type,
      sort_order: index,
    });
  }

  if (mediaRows.length > 0) {
    const { error: mediaError } = await client.supabase
      .from("event_media")
      .insert(mediaRows);

    if (mediaError) {
      await client.supabase.storage
        .from(EVENT_MEDIA_BUCKET)
        .remove(mediaRows.map((row) => row.storage_path));
      await client.supabase.from("events").delete().eq("id", eventRow.id);
      return { error: mediaError.message };
    }
  }

  revalidatePath("/events");
  return { success: true };
}

export async function deleteEvent(
  _prevState: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  const eventId = Number(formData.get("eventId"));

  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { error: "Invalid event." };
  }

  const client = getServiceClient();
  if ("error" in client) {
    return { error: client.error };
  }

  const { data: mediaRows, error: mediaLookupError } = await client.supabase
    .from("event_media")
    .select("storage_path")
    .eq("event_id", eventId);

  if (mediaLookupError) {
    return { error: mediaLookupError.message };
  }

  if (mediaRows?.length) {
    const { error: storageError } = await client.supabase.storage
      .from(EVENT_MEDIA_BUCKET)
      .remove(mediaRows.map((row) => row.storage_path));

    if (storageError) {
      return { error: storageError.message };
    }
  }

  const { error: deleteError } = await client.supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/events");
  return { success: true };
}
