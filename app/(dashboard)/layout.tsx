import { cookies } from "next/headers";
import { after } from "next/server";

import { DashboardShell } from "@/components/dashboard-shell";
import { LanguageProvider } from "@/components/language-provider";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocation } from "@/lib/campus-location";
import { processDueClassSessions } from "@/lib/process-due-sessions";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await requireStaff();
  const activeCampus = await getActiveCampusLocation(staff);

  after(async () => {
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await processDueClassSessions(supabase, user?.id ?? null);
    } catch {
      // Auto-processing should not block the dashboard if it fails.
    }
  });

  return (
    <LanguageProvider initialLanguage={staff.preferred_language}>
      <DashboardShell
        staff={{
          fullName: staff.full_name,
          email: staff.email,
          role: staff.role,
          location: staff.location,
        }}
        activeCampus={activeCampus}
      >
        {children}
      </DashboardShell>
    </LanguageProvider>
  );
}
