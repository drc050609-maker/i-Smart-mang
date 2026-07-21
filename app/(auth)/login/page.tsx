import type { Metadata } from "next";
import { AdminSignIn } from "@/components/admin-sign-in";

export const metadata: Metadata = {
  title: "Sign in — iSmart Admin",
  description: "Sign in to the iSmart Music School admin console.",
};

export default function LoginPage() {
  return <AdminSignIn />;
}
