import { SettingsPageTabs } from "@/components/settings-page-tabs";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  const isAdmin = staff.role === "admin";
  const t = createTranslator(staff.preferred_language);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isAdmin ? t("settings.subtitleAdmin") : t("settings.subtitleSelf")}
        </p>
      </div>

      <div className="mt-6">
        <SettingsPageTabs isAdmin={isAdmin} />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
