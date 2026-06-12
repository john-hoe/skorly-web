/**
 * One-time seeding of the AI predictor accounts: creates a confirmed Supabase
 * auth user + profile row per persona (idempotent — skips existing), then
 * runs one round of predictions so surfaces aren't empty.
 *
 * Usage:
 *   pnpm tsx --env-file=.env apps/jobs/scripts/seed-ai-predictors.ts
 */
import { randomUUID } from "node:crypto";
import { ensureProfile, getProfileIdsByEmails } from "@skorly/db";
import { AI_PERSONAS, makeAiPredictions } from "../src/ai-predictions";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function adminCreateUser(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      email_confirm: true,
      // Random throwaway password; these accounts are never logged into.
      password: randomUUID() + randomUUID(),
      user_metadata: { ai_bot: true },
    }),
  });
  const body = (await res.json()) as { id?: string; msg?: string; error_code?: string };
  if (res.ok && body.id) return body.id;

  // Already registered → look the user up.
  if (res.status === 422 || body.error_code === "email_exists") {
    const lookup = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const data = (await lookup.json()) as { users?: Array<{ id: string; email: string }> };
    const hit = data.users?.find((u) => u.email === email);
    if (hit) return hit.id;
  }
  throw new Error(`auth user creation failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
}

async function main() {
  const existing = new Set(
    (await getProfileIdsByEmails(AI_PERSONAS.map((p) => p.email))).map((r) => r.email),
  );

  for (const persona of AI_PERSONAS) {
    if (existing.has(persona.email)) {
      console.log(`[skip] ${persona.displayName} already seeded`);
      continue;
    }
    const userId = await adminCreateUser(persona.email);
    await ensureProfile({
      id: userId,
      email: persona.email,
      displayName: persona.displayName,
      locale: "en",
    });
    console.log(`[seeded] ${persona.displayName} (${userId})`);
  }

  console.log("\nRunning first prediction round...");
  const result = await makeAiPredictions();
  console.log(result);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
