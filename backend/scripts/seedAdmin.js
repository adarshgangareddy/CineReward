require("dotenv").config();

const { getSupabase } = require("../config/supabase");
const { hashSecret } = require("../utils/passwordHash");

async function seedAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[Seed Admin] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");
    process.exit(1);
  }

  const email = (process.env.ADMIN_SEED_EMAIL || "adarshavg08@gmail.com").trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD || "Gangareddy@123";
  const name = process.env.ADMIN_SEED_NAME || "Adarsh Super Admin";
  const username = process.env.ADMIN_SEED_USERNAME || "adarshadmin";

  const db = getSupabase();
  const passwordHash = await hashSecret(password);

  const { data: existing } = await db
    .from("users")
    .select("id, email, role")
    .eq("email", email)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error } = await db
      .from("users")
      .update({
        name,
        username,
        password: passwordHash,
        role: "super_admin",
      })
      .eq("id", existing[0].id);
    if (error) throw error;
    console.log(`[Seed Admin] Updated existing admin user: ${email} (role: super_admin, Argon2d hashed)`);
  } else {
    const { error } = await db.from("users").insert({
      name,
      username,
      email,
      password: passwordHash,
      coins: 0,
      role: "super_admin",
    });
    if (error) throw error;
    console.log(`[Seed Admin] Inserted admin user: ${email} (role: super_admin, Argon2d hashed)`);
  }

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("[Seed Admin] Failed:", err.message);
  process.exit(1);
});
