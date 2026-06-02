"use server";

import { headers } from "next/headers";
import { updateProfile } from "@skorly/db";
import { createSupabaseServerClient, getSessionUser } from "./supabase/server";
import { verifyTurnstile } from "./turnstile";
import { rateLimit, clientIp } from "./ratelimit";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Optional success message key (e.g. "checkEmail"). */
  message?: string;
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://skorly.cc";
}

function callbackUrl(origin: string, locale: string, next: string): string {
  const target = `/${locale}${next}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(target)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Register with email + password. Sends a confirmation email. */
export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const locale = String(formData.get("locale") ?? "id");
  const consent = formData.get("consent") === "on" || formData.get("consent") === "true";
  const token = formData.get("cf-turnstile-response") as string | null;

  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalidEmail" };
  if (password.length < 8) return { ok: false, error: "weakPassword" };

  const h = await headers();
  const ip = clientIp(h);
  const rl = await rateLimit(`auth:signup:${ip}`, 5, 60 * 15);
  if (!rl.success) return { ok: false, error: "rateLimited" };

  if (!(await verifyTurnstile(token, ip))) return { ok: false, error: "captcha" };

  const origin = await getOrigin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(origin, locale, "/akun"),
      data: {
        display_name: displayName || email.split("@")[0],
        locale,
        consent_marketing: consent,
      },
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "checkEmail" };
}

/** Sign in with email + password. */
export async function signInAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const token = formData.get("cf-turnstile-response") as string | null;

  if (!EMAIL_RE.test(email) || !password) return { ok: false, error: "invalidCredentials" };

  const h = await headers();
  const ip = clientIp(h);
  const rl = await rateLimit(`auth:signin:${ip}`, 10, 60 * 10);
  if (!rl.success) return { ok: false, error: "rateLimited" };

  if (!(await verifyTurnstile(token, ip))) return { ok: false, error: "captcha" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "invalidCredentials" };
  return { ok: true };
}

/** Sign out the current user. */
export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true };
}

/** Send a password-reset email. */
export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const locale = String(formData.get("locale") ?? "id");
  const token = formData.get("cf-turnstile-response") as string | null;

  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalidEmail" };

  const h = await headers();
  const ip = clientIp(h);
  const rl = await rateLimit(`auth:forgot:${ip}`, 5, 60 * 15);
  if (!rl.success) return { ok: false, error: "rateLimited" };

  if (!(await verifyTurnstile(token, ip))) return { ok: false, error: "captcha" };

  const origin = await getOrigin();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl(origin, locale, "/atur-ulang-sandi"),
  });
  // Always report success (do not leak which emails exist).
  return { ok: true, message: "resetSent" };
}

/** Set a new password (requires the recovery session from the email link). */
export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "weakPassword" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "passwordUpdated" };
}

/** Update the signed-in user's editable profile fields. */
export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();
  const consent = formData.get("consent") === "on" || formData.get("consent") === "true";
  const favoriteTeamRaw = String(formData.get("favoriteTeamId") ?? "").trim();
  const favoriteTeamId = favoriteTeamRaw ? Number(favoriteTeamRaw) : null;

  await updateProfile(user.id, {
    displayName: displayName || null,
    whatsappNumber: whatsappNumber || null,
    favoriteTeamId: Number.isFinite(favoriteTeamId as number) ? favoriteTeamId : null,
    consentMarketing: consent,
  });

  // Keep auth metadata roughly in sync for OAuth display.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.updateUser({ data: { display_name: displayName || undefined } });

  return { ok: true, message: "profileSaved" };
}
