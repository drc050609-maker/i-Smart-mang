"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireAdmin } from "@/lib/auth";
import { clipText, WEBSITE_CHAT_MAX_BODY } from "@/lib/website-chat";
import { createClient } from "@/utils/supabase/server";

export async function sendWebsiteChatReply(
  conversationId: number,
  rawBody: string,
) {
  const staff = await requireAdmin();
  const body = clipText(rawBody, WEBSITE_CHAT_MAX_BODY);
  if (!Number.isFinite(conversationId) || conversationId <= 0) {
    return { error: "Missing conversation." };
  }
  if (!body) {
    return { error: "Please type a reply." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from("website_chat_messages").insert({
    conversation_id: conversationId,
    sender_type: "staff",
    staff_id: staff.id,
    body,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chat");
  return { success: true };
}
