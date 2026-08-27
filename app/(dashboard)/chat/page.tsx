import {
  AdminWebsiteChatPanel,
  type WebsiteChatConversationOption,
  type WebsiteChatMessageRow,
} from "@/components/admin-website-chat-panel";
import { requireAdmin } from "@/lib/auth";
import { WebsiteChatGodaddyHint } from "@/components/website-chat-godaddy-hint";
import { createTranslator } from "@/lib/i18n";
import { WEBSITE_CHAT_VISIBLE } from "@/lib/website-chat-feature";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function WebsiteChatPage() {
  if (!WEBSITE_CHAT_VISIBLE) {
    redirect("/chat/teachers");
  }

  const staff = await requireAdmin();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: conversationRows } = await supabase
    .from("website_chat_conversations")
    .select("id, visitor_name, visitor_email, visitor_phone, updated_at")
    .order("updated_at", { ascending: false });

  const conversationIds = (conversationRows ?? []).map((row) => row.id);
  type MessageRow = {
    id: number;
    conversation_id: number;
    sender_type: "visitor" | "staff";
    body: string;
    created_at: string;
  };
  let messageRows: MessageRow[] = [];
  if (conversationIds.length > 0) {
    const { data } = await supabase
      .from("website_chat_messages")
      .select("id, conversation_id, sender_type, body, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });
    messageRows = data ?? [];
  }

  const messagesByConversation = new Map<number, MessageRow[]>();
  for (const message of messageRows) {
    const list = messagesByConversation.get(message.conversation_id) ?? [];
    list.push(message);
    messagesByConversation.set(message.conversation_id, list);
  }

  const conversations: WebsiteChatConversationOption[] = (
    conversationRows ?? []
  ).map((row) => {
    const msgs = messagesByConversation.get(row.id) ?? [];
    const last = msgs[msgs.length - 1] ?? null;
    const contact = [row.visitor_email, row.visitor_phone]
      .filter(Boolean)
      .join(" · ");
    return {
      id: row.id,
      visitorName:
        row.visitor_name?.trim() || t("chat.visitorAnonymous"),
      contact: contact || null,
      updatedAt: row.updated_at,
      messageCount: msgs.length,
      lastMessagePreview: last?.body ?? null,
    };
  });

  const messages: WebsiteChatMessageRow[] = messageRows.map((message) => ({
    id: message.id,
    conversationId: message.conversation_id,
    senderType: message.sender_type,
    body: message.body,
    createdAt: message.created_at,
  }));

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {t("chat.websiteSubtitle")}
      </p>
      <WebsiteChatGodaddyHint />
      <AdminWebsiteChatPanel conversations={conversations} messages={messages} />
    </div>
  );
}
