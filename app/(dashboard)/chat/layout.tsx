import { ChatPageTabs } from "@/components/chat-page-tabs";
import { requireAdmin } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";
import { WEBSITE_CHAT_VISIBLE } from "@/lib/website-chat-feature";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireAdmin();
  const t = createTranslator(staff.preferred_language);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("chat.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t(WEBSITE_CHAT_VISIBLE ? "chat.pageSubtitle" : "chat.subtitle")}
        </p>
      </div>

      {WEBSITE_CHAT_VISIBLE ? (
        <div className="mt-6">
          <ChatPageTabs />
        </div>
      ) : null}

      <div className="mt-6">{children}</div>
    </div>
  );
}
