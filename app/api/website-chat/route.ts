import { NextResponse } from "next/server";

import {
  isAllowedWebsiteChatOrigin,
  websiteChatCorsHeaders,
} from "@/lib/website-chat-cors";
import {
  clipText,
  isVisitorKey,
  WEBSITE_CHAT_MAX_BODY,
} from "@/lib/website-chat";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type MessageRow = {
  id: number;
  sender_type: "visitor" | "staff";
  body: string;
  created_at: string;
};

function json(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: websiteChatCorsHeaders(request),
  });
}

function getService() {
  try {
    return { supabase: createSupabaseServiceClient() };
  } catch {
    return {
      error: "Chat is temporarily unavailable. Please email or call the school.",
    };
  }
}

function serializeMessages(rows: MessageRow[]) {
  return rows.map((row) => ({
    id: row.id,
    from: row.sender_type,
    body: row.body,
    createdAt: row.created_at,
  }));
}

async function loadThread(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  visitorKey: string,
) {
  const { data: conversation, error: conversationError } = await supabase
    .from("website_chat_conversations")
    .select("id, visitor_name, visitor_email, visitor_phone, updated_at")
    .eq("visitor_key", visitorKey)
    .maybeSingle();

  if (conversationError) {
    return { error: conversationError.message };
  }
  if (!conversation) {
    return { missing: true as const };
  }

  const { data: messages, error: messagesError } = await supabase
    .from("website_chat_messages")
    .select("id, sender_type, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return { error: messagesError.message };
  }

  return {
    conversationId: conversation.id,
    conversation: {
      visitorKey,
      name: conversation.visitor_name,
      email: conversation.visitor_email,
      phone: conversation.visitor_phone,
      updatedAt: conversation.updated_at,
      messages: serializeMessages((messages ?? []) as MessageRow[]),
    },
  };
}

export async function OPTIONS(request: Request) {
  if (!isAllowedWebsiteChatOrigin(request)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: websiteChatCorsHeaders(request),
  });
}

export async function GET(request: Request) {
  if (!isAllowedWebsiteChatOrigin(request)) {
    return json(request, { error: "Not allowed." }, 403);
  }

  const visitorKey = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  if (!isVisitorKey(visitorKey)) {
    return json(request, { error: "Missing chat session." }, 400);
  }

  const service = getService();
  if ("error" in service) {
    return json(request, { error: service.error }, 503);
  }

  const result = await loadThread(service.supabase, visitorKey);
  if ("error" in result) {
    return json(request, { error: result.error }, 500);
  }
  if ("missing" in result) {
    return json(request, { error: "Chat session not found." }, 404);
  }
  return json(request, result.conversation);
}

export async function POST(request: Request) {
  if (!isAllowedWebsiteChatOrigin(request)) {
    return json(request, { error: "Not allowed." }, 403);
  }

  const service = getService();
  if ("error" in service) {
    return json(request, { error: service.error }, 503);
  }

  let payload: {
    visitorKey?: string;
    name?: string;
    email?: string;
    phone?: string;
    body?: string;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json(request, { error: "Invalid request." }, 400);
  }

  const body = clipText(String(payload.body ?? ""), WEBSITE_CHAT_MAX_BODY);
  if (!body) {
    return json(request, { error: "Please type a message." }, 400);
  }

  const visitorKey = String(payload.visitorKey ?? "").trim();
  if (visitorKey) {
    if (!isVisitorKey(visitorKey)) {
      return json(request, { error: "Invalid chat session." }, 400);
    }

    const existing = await loadThread(service.supabase, visitorKey);
    if ("error" in existing) {
      return json(request, { error: existing.error }, 500);
    }
    if ("missing" in existing) {
      return json(request, { error: "Chat session not found." }, 404);
    }

    const { error: insertError } = await service.supabase
      .from("website_chat_messages")
      .insert({
        conversation_id: existing.conversationId,
        sender_type: "visitor",
        body,
      });

    if (insertError) {
      return json(request, { error: insertError.message }, 500);
    }

    const refreshed = await loadThread(service.supabase, visitorKey);
    if ("error" in refreshed || "missing" in refreshed) {
      return json(request, { error: "Could not load messages." }, 500);
    }
    return json(request, refreshed.conversation);
  }

  const name = clipText(String(payload.name ?? ""), 80) || null;
  const email = clipText(String(payload.email ?? ""), 120) || null;
  const phone = clipText(String(payload.phone ?? ""), 40) || null;
  if (!email && !phone) {
    return json(
      request,
      { error: "Please include an email or phone number so we can reach you." },
      400,
    );
  }

  const { data: created, error: createError } = await service.supabase
    .from("website_chat_conversations")
    .insert({
      visitor_name: name,
      visitor_email: email,
      visitor_phone: phone,
    })
    .select("id, visitor_key")
    .single();

  if (createError || !created) {
    return json(
      request,
      { error: createError?.message || "Could not start chat." },
      500,
    );
  }

  const { error: messageError } = await service.supabase
    .from("website_chat_messages")
    .insert({
      conversation_id: created.id,
      sender_type: "visitor",
      body,
    });

  if (messageError) {
    return json(request, { error: messageError.message }, 500);
  }

  const thread = await loadThread(service.supabase, created.visitor_key);
  if ("error" in thread || "missing" in thread) {
    return json(request, { error: "Could not load messages." }, 500);
  }
  return json(request, thread.conversation, 201);
}
