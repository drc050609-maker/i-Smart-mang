import {
  AdminTeacherChatPanel,
  type ChatConversationOption,
  type ChatMessageRow,
  type ChatTeacherOption,
} from "@/components/admin-teacher-chat-panel";
import { requireAdmin } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { WEBSITE_CHAT_VISIBLE } from "@/lib/website-chat-feature";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

type StudentEmbed = {
  id: number;
  "first name": string;
  "last name": string | null;
};

type ConversationRow = {
  id: number;
  teacher_id: number;
  student_id: number;
  updated_at: string;
  students: StudentEmbed | StudentEmbed[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function personName(first: string, last: string | null) {
  return [first, last].filter(Boolean).join(" ") || `Student`;
}

export default async function TeacherChatPage() {
  const staff = await requireAdmin();
  const t = createTranslator(staff.preferred_language);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: teacherAccounts } = await supabase
    .from("staff_accounts")
    .select("id, email, full_name, teacher_id")
    .eq("role", "teacher")
    .eq("is_active", true)
    .not("teacher_id", "is", null)
    .order("full_name");

  const teacherIds = [
    ...new Set(
      (teacherAccounts ?? [])
        .map((account) => account.teacher_id)
        .filter((id): id is number => id != null),
    ),
  ];

  let conversationRows: ConversationRow[] = [];
  let messageRows: {
    id: number;
    conversation_id: number;
    sender_type: "teacher" | "student";
    body: string;
    created_at: string;
  }[] = [];

  if (teacherIds.length > 0) {
    const { data: conversations } = await supabase
      .from("chat_conversations")
      .select(
        `
        id,
        teacher_id,
        student_id,
        updated_at,
        students (
          id,
          "first name",
          "last name"
        )
      `,
      )
      .in("teacher_id", teacherIds)
      .order("updated_at", { ascending: false });

    conversationRows = (conversations ?? []) as ConversationRow[];

    const conversationIds = conversationRows.map((row) => row.id);
    if (conversationIds.length > 0) {
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("id, conversation_id, sender_type, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true });

      messageRows = messages ?? [];
    }
  }

  const messagesByConversation = new Map<number, typeof messageRows>();
  for (const message of messageRows) {
    const list = messagesByConversation.get(message.conversation_id) ?? [];
    list.push(message);
    messagesByConversation.set(message.conversation_id, list);
  }

  const conversations: ChatConversationOption[] = conversationRows.map(
    (row) => {
      const student = one(row.students);
      const msgs = messagesByConversation.get(row.id) ?? [];
      const last = msgs[msgs.length - 1] ?? null;
      return {
        id: row.id,
        teacherId: row.teacher_id,
        studentId: row.student_id,
        studentName: student
          ? personName(student["first name"], student["last name"])
          : `Student #${row.student_id}`,
        updatedAt: row.updated_at,
        messageCount: msgs.length,
        lastMessagePreview: last?.body ?? null,
      };
    },
  );

  const conversationCountByTeacher = new Map<number, number>();
  for (const conversation of conversations) {
    conversationCountByTeacher.set(
      conversation.teacherId,
      (conversationCountByTeacher.get(conversation.teacherId) ?? 0) + 1,
    );
  }

  const teachers: ChatTeacherOption[] = (teacherAccounts ?? []).flatMap(
    (account) => {
      if (account.teacher_id == null) return [];
      return [
        {
          teacherId: account.teacher_id,
          staffId: account.id,
          name: account.full_name?.trim() || account.email,
          email: account.email,
          conversationCount:
            conversationCountByTeacher.get(account.teacher_id) ?? 0,
        },
      ];
    },
  );

  const messages: ChatMessageRow[] = messageRows.map((message) => ({
    id: message.id,
    conversationId: message.conversation_id,
    senderType: message.sender_type,
    body: message.body,
    createdAt: message.created_at,
  }));

  return (
    <div>
      {WEBSITE_CHAT_VISIBLE ? (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {t("chat.subtitle")}
        </p>
      ) : null}
      <AdminTeacherChatPanel
        teachers={teachers}
        conversations={conversations}
        messages={messages}
      />
    </div>
  );
}
