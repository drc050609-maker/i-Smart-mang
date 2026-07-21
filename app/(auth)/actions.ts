"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";

export type SignInState = {
  error?: string;
};

export async function signInStaff(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const { data: staff } = await supabase
    .from("staff_accounts")
    .select("id, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!staff?.is_active) {
    await supabase.auth.signOut();
    return { error: "This account is not authorized for the admin console." };
  }

  redirect("/");
}

export async function signOutStaff() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}
