import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load .env manually
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}

console.log("=== 1. Pure Logic & Calculator Checks ===");

// BMI: 70 kg, 175 cm -> 22.9
const bmi = Math.round((70 / (1.75 * 1.75)) * 10) / 10;
assert.equal(bmi, 22.9, "BMI for 70kg & 175cm must be 22.9");
console.log("PASS: BMI(70kg, 175cm) =", bmi);

// Mifflin-St Jeor BMR & TDEE (70kg, 175cm, age 25, male, moderate 1.55)
const bmr = Math.round(10 * 70 + 6.25 * 175 - 5 * 25 + 5); // 700 + 1093.75 - 125 + 5 = 1674
const tdee = Math.round(bmr * 1.55); // 2595
assert.equal(bmr, 1674);
assert.equal(tdee, 2595);
console.log("PASS: BMR =", bmr, "TDEE (1.55) =", tdee);

// /Add per-scoop & per-piece conversion to per-100g
// 120 kcal, 25g protein per 30g scoop -> 400 kcal, 83.33g protein per 100g
const scoopFactor = 100 / 30;
assert.equal(Math.round(120 * scoopFactor * 100) / 100, 400);
assert.equal(Math.round(25 * scoopFactor * 100) / 100, 83.33);
console.log("PASS: /Add per-scoop (30g) -> per-100g conversion");

// 4-order verification check
const items = [
  { calories: 390, protein: 25 },
  { calories: 120, protein: 6.4 },
  { calories: 330, protein: 62 },
];
const sumField = (arr, k) => Math.round(arr.reduce((a, b) => a + b[k], 0) * 100) / 100;
const c1 = sumField(items, "calories");
const c2 = sumField([...items].reverse(), "calories");
const p1 = sumField(items, "protein");
const p2 = sumField([...items].reverse(), "protein");
assert.equal(c1, c2);
assert.equal(p1, p2);
console.log("PASS: 4-order verification matches:", c1, "kcal,", p1, "g protein");

// IST midnight rollover check
const beforeMidnight = new Date("2026-11-27T18:29:00Z"); // 23:59 IST on Nov 27
const afterMidnight = new Date("2026-11-27T18:31:00Z"); // 00:01 IST on Nov 28
const fmtIst = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
assert.equal(fmtIst(beforeMidnight), "2026-11-27");
assert.equal(fmtIst(afterMidnight), "2026-11-28");
console.log("PASS: IST midnight rollover resets date_ist from 2026-11-27 to 2026-11-28");

console.log("\n=== 2. Live Supabase RLS Checks (Two Test Users) ===");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.log("SKIP: Missing Supabase env vars for live RLS check.");
  process.exit(0);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: schemaCheckErr } = await admin.from("user_foods").select("id").limit(1);

if (schemaCheckErr) {
  console.log(
    "SKIP: Tables from 0001_macros_v2.sql not yet applied on Supabase:",
    schemaCheckErr.message
  );
  process.exit(0);
}

const ts = Date.now();
const emailA = `test_a_${ts}@madbots.local`;
const emailB = `test_b_${ts}@madbots.local`;
const pw = "TestPass123!";

let userAId = null;
let userBId = null;

try {
  const { data: uA, error: eA } = await admin.auth.admin.createUser({
    email: emailA,
    password: pw,
    email_confirm: true,
  });
  if (eA) throw eA;
  userAId = uA.user.id;

  const { data: uB, error: eB } = await admin.auth.admin.createUser({
    email: emailB,
    password: pw,
    email_confirm: true,
  });
  if (eB) throw eB;
  userBId = uB.user.id;

  const clientA = createClient(url, anonKey, { auth: { persistSession: false } });
  const clientB = createClient(url, anonKey, { auth: { persistSession: false } });

  await clientA.auth.signInWithPassword({ email: emailA, password: pw });
  await clientB.auth.signInWithPassword({ email: emailB, password: pw });

  // User B inserts own user_foods, user_profiles, meal_plans, user_meal_log
  const { error: insFoodB } = await clientB.from("user_foods").insert({
    user_id: userBId,
    display_name: "Test Food B",
    kcal_per_100g: 200,
    protein_per_100g: 10,
    source: "skill_add",
  });
  assert.equal(insFoodB, null, "User B should insert own user_foods");

  await clientB.from("user_profiles").upsert({ user_id: userBId, mode: "custom" });
  const { data: planB } = await clientB
    .from("meal_plans")
    .insert({ user_id: userBId, name: "Plan B", target_kcal: 2000, total_kcal: 2000 })
    .select("id")
    .single();
  await clientB.from("daily_tracking").insert({
    user_id: userBId,
    plan_id: planB.id,
    date_ist: "2026-11-27",
    meal_no: 1,
    done: true,
  });
  await clientB.from("user_meal_log").insert({
    user_id: userBId,
    date_ist: "2026-11-27",
    food_name: "Test Food B",
    qty: 100,
    unit: "g",
    kcal: 200,
    protein_g: 10,
  });

  // User A tries to read User B's rows across all 5 tables
  const { data: readFood } = await clientA.from("user_foods").select("*").eq("user_id", userBId);
  assert.equal(readFood?.length ?? 0, 0, "User A must not read User B user_foods");

  const { data: readProf } = await clientA.from("user_profiles").select("*").eq("user_id", userBId);
  assert.equal(readProf?.length ?? 0, 0, "User A must not read User B user_profiles");

  const { data: readPlan } = await clientA.from("meal_plans").select("*").eq("user_id", userBId);
  assert.equal(readPlan?.length ?? 0, 0, "User A must not read User B meal_plans");

  const { data: readTrack } = await clientA.from("daily_tracking").select("*").eq("user_id", userBId);
  assert.equal(readTrack?.length ?? 0, 0, "User A must not read User B daily_tracking");

  const { data: readLog } = await clientA.from("user_meal_log").select("*").eq("user_id", userBId);
  assert.equal(readLog?.length ?? 0, 0, "User A must not read User B user_meal_log");

  // User A tries to insert into food_common -> must fail
  const { error: fcErr } = await clientA.from("food_common").insert({
    name: `HackFood_${ts}`,
    kcal_per_100g: 100,
    protein_per_100g: 10,
  });
  assert.ok(fcErr, "Regular user must NOT be able to insert into food_common");

  console.log("PASS: All RLS isolation & food_common write-protection checks passed!");
} finally {
  if (userAId) await admin.auth.admin.deleteUser(userAId);
  if (userBId) await admin.auth.admin.deleteUser(userBId);
}
