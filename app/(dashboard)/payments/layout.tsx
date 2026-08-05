import { PaymentsPageTabs } from "@/components/payments-page-tabs";
import { requireStaff } from "@/lib/auth";
import { createTranslator } from "@/lib/i18n";

export default async function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  const t = createTranslator(staff.preferred_language);

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {t("nav.payments")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("payments.subtitle")}
        </p>
      </div>

      <div className="mt-6">
        <PaymentsPageTabs />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
