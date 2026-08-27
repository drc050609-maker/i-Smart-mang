import { cookies } from "next/headers";
import { after } from "next/server";

import { DashboardShell } from "@/components/dashboard-shell";
import { LanguageProvider } from "@/components/language-provider";
import { requireStaff } from "@/lib/auth";
import {
  getActiveCampusLocation,
  getActiveCampusLocationId,
} from "@/lib/campus-location";
import { processDueClassSessionsIfNeeded } from "@/lib/process-due-sessions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await requireStaff();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const [activeCampus, activeCampusId] = await Promise.all([
    getActiveCampusLocation(staff),
    getActiveCampusLocationId(supabase, staff),
  ]);

  after(async () => {
    try {
      // Service role skips RLS so this catch-up does not compete with page queries.
      const service = createSupabaseServiceClient();
      await processDueClassSessionsIfNeeded(
        service,
        staff.id,
        activeCampusId,
      );
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
          teacherId: staff.teacher_id,
        }}
        activeCampus={activeCampus}
      >
        {children}
      </DashboardShell>
    </LanguageProvider>
  );
}
