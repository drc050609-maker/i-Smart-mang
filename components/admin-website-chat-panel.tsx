"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { sendWebsiteChatReply } from "@/app/(dashboard)/chat/actions";
import { useLanguage } from "@/components/language-provider";
import type { AppLanguage } from "@/lib/language";

export type WebsiteChatConversationOption = {
  id: number;
  visitorName: string;
  contact: string | null;
  updatedAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
};

export type WebsiteChatMessageRow = {
  id: number;
  conversationId: number;
  senderType: "visitor" | "staff";
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

export function AdminWebsiteChatPanel({
  conversations,
  messages,
}: {
  conversations: WebsiteChatConversationOption[];
  messages: WebsiteChatMessageRow[];
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(
    conversations[0]?.id ?? null,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      selectedId != null &&
      !conversations.some((row) => row.id === selectedId)
    ) {
      setSelectedId(conversations[0]?.id ?? null);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [router]);

  const activeMessages = useMemo(
    () =>
      messages
        .filter((row) => row.conversationId === selectedId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [messages, selectedId],
  );

  const selected = conversations.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [selectedId, activeMessages.length]);

  function sendReply() {
    if (selectedId == null) return;
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const result = await sendWebsiteChatReply(selectedId, body);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <section className="rounded-lg border border-gray-200 dark:border-white/10">
        <div className="border-b border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">
          {t("chat.pickConversation")}
        </div>
        {conversations.length === 0 ? (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
            {t("chat.noWebsiteConversations")}
          </p>
        ) : (
          <ul className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100 dark:divide-white/10">
            {conversations.map((conversation) => {
              const selectedRow = conversation.id === selectedId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full px-3 py-3 text-left transition-colors ${
                      selectedRow
                        ? "bg-indigo-50 dark:bg-indigo-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {conversation.visitorName}
                    </div>
                    {conversation.contact ? (
                      <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {conversation.contact}
                      </div>
                    ) : null}
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
            {selected ? selected.visitorName : t("chat.selectConversationHint")}
          </div>
          {selected?.contact ? (
            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {selected.contact}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!selectedId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("chat.websiteEmptyHint")}
            </p>
          ) : activeMessages.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("chat.noMessages")}
            </p>
          ) : (
            activeMessages.map((message) => {
              const fromStaff = message.senderType === "staff";
              return (
                <div
                  key={message.id}
                  className={`flex ${fromStaff ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      fromStaff
                        ? "bg-indigo-600 text-white dark:bg-indigo-500"
                        : "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-medium opacity-70">
                      {fromStaff ? t("chat.fromStaff") : t("chat.fromVisitor")}{" "}
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
          <div ref={bottomRef} />
        </div>

        {selectedId ? (
          <form
            className="border-t border-gray-200 p-3 dark:border-white/10"
            onSubmit={(event) => {
              event.preventDefault();
              sendReply();
            }}
          >
            {error ? (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400">
                {error === "Please type a reply."
                  ? t("chat.replyPlaceholder")
                  : t("chat.replyError")}
              </p>
            ) : null}
            <div className="flex gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                placeholder={t("chat.replyPlaceholder")}
                className="min-h-[44px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendReply();
                  }
                }}
              />
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {pending ? t("chat.sendingReply") : t("chat.sendReply")}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
