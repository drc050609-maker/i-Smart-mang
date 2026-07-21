import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Trial Class — iSmart Music School",
  description:
    "Schedule a 45-minute one-on-one trial lesson at iSmart Music School in Brooklyn, NY. $25 per trial class.",
};

export default function TrialLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full flex-1 bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  );
}
