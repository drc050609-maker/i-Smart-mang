"use client";

import { useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import type { AppLanguage } from "@/lib/language";

export type ChatTeacherOption = {
  teacherId: number;
  staffId: string;
  name: string;
  email: string;
  conversationCount: number;
};

export type ChatConversationOption = {
  id: number;
  teacherId: number;
  studentId: number;
  studentName: string;
  updatedAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
};

export type ChatMessageRow = {
  id: number;
  conversationId: number;
  senderType: "teacher" | "student";
  body: string;
  createdAt: string;
};

function formatWhen(value: string, language: AppLanguage) {
  const locale = language === "zh" ? "zh-CN" : "en-US";
  return new Date(value).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminTeacherChatPanel({
  teachers,
  conversations,
  messages,
}: {
  teachers: ChatTeacherOption[];
  conversations: ChatConversationOption[];
  messages: ChatMessageRow[];
}) {
  const { t, language } = useLanguage();
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(
    teachers[0]?.teacherId ?? null,
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);

  const teacherConversations = useMemo(
    () =>
      conversations
        .filter((row) => row.teacherId === selectedTeacherId)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [conversations, selectedTeacherId],
  );

  const activeMessages = useMemo(
    () =>
      messages
        .filter((row) => row.conversationId === selectedConversationId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [messages, selectedConversationId],
  );

  const selectedConversation = teacherConversations.find(
    (row) => row.id === selectedConversationId,
  );

  function selectTeacher(teacherId: number) {
    setSelectedTeacherId(teacherId);
    setSelectedConversationId(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_260px_minmax(0,1fr)]">
      <section className="rounded-lg border border-gray-200 dark:border-white/10">
        <div className="border-b border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">
          {t("chat.pickTeacher")}
        </div>
        {teachers.length === 0 ? (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
            {t("chat.noTeachers")}
          </p>
        ) : (
          <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100 dark:divide-white/10">
            {teachers.map((teacher) => {
              const selected = teacher.teacherId === selectedTeacherId;
              return (
                <li key={teacher.teacherId}>
                  <button
                    type="button"
                    onClick={() => selectTeacher(teacher.teacherId)}
                    className={`w-full px-3 py-3 text-left transition-colors ${
                      selected
                        ? "bg-indigo-50 dark:bg-indigo-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {teacher.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {teacher.email}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t("chat.conversationCount", {
                        count: teacher.conversationCount,
                      })}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-white/10">
        <div className="border-b border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">
          {t("chat.pickConversation")}
        </div>
        {!selectedTeacherId ? (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
            {t("chat.selectTeacherHint")}
          </p>
        ) : teacherConversations.length === 0 ? (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
            {t("chat.noConversations")}
          </p>
        ) : (
          <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100 dark:divide-white/10">
            {teacherConversations.map((conversation) => {
              const selected = conversation.id === selectedConversationId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full px-3 py-3 text-left transition-colors ${
                      selected
                        ? "bg-indigo-50 dark:bg-indigo-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {conversation.studentName}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                      {conversation.lastMessagePreview ||
                        t("chat.messageCount", {
                          count: conversation.messageCount,
                        })}
                    </div>
                    <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {t("chat.lastActive", {
                        when: formatWhen(conversation.updatedAt, language),
                      })}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex min-h-[420px] flex-col rounded-lg border border-gray-200 dark:border-white/10">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-white/10">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {selectedConversation
              ? selectedConversation.studentName
              : t("chat.selectConversationHint")}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!selectedConversationId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("chat.selectConversationHint")}
            </p>
          ) : activeMessages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("chat.noMessages")}
            </p>
          ) : (
            activeMessages.map((message) => {
              const fromTeacher = message.senderType === "teacher";
              return (
                <div
                  key={message.id}
                  className={`flex ${fromTeacher ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      fromTeacher
                        ? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                        : "bg-indigo-600 text-white dark:bg-indigo-500"
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-medium opacity-70">
                      {fromTeacher
                        ? t("chat.fromTeacher")
                        : t("chat.fromStudent")}{" "}
                      · {formatWhen(message.createdAt, language)}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {message.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
