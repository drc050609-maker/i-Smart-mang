import { createSupabaseServiceClient } from "@/lib/supabase/service";

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const email = readArg("--email")?.trim().toLowerCase();
  const password = readArg("--password");
  const fullName = readArg("--name")?.trim() || null;
  const role = readArg("--role")?.trim() ?? "admin";
  const location = readArg("--location")?.trim() ?? "brooklyn";

  if (!email || !password) {
    console.error(
      "Usage: npm run create-admin -- --email you@example.com --password 'your-password' [--name 'Full Name'] [--role admin|manager] [--location brooklyn|staten_island]",
    );
    process.exit(1);
  }

  if (role !== "admin" && role !== "manager") {
    console.error("Role must be admin or manager.");
    process.exit(1);
  }

  if (location !== "brooklyn" && location !== "staten_island") {
    console.error("Location must be brooklyn or staten_island.");
    process.exit(1);
  }

  const supabase = createSupabaseServiceClient();

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role, location },
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });

  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? "Could not create auth user.");
  }

  const { error: staffError } = await supabase.from("staff_accounts").insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    role,
    location,
  });

  if (staffError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(staffError.message);
  }

  console.log(`Created ${role} account for ${email} at ${location}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
