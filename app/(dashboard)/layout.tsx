import { DashboardShell } from "@/components/dashboard-shell";
import { LanguageProvider } from "@/components/language-provider";
import { requireStaff } from "@/lib/auth";
import { getActiveCampusLocation } from "@/lib/campus-location";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const staff = await requireStaff();
  const activeCampus = await getActiveCampusLocation(staff);

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
