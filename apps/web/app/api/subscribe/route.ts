import { NextResponse } from "next/server";

/**
 * Lead-capture endpoint. Skeleton for Phase 0 Day 11.
 * TODO: validate input (zod), Turnstile check, rate-limit per IP (Upstash),
 * insert into `subscribers` (Drizzle), trigger Resend double opt-in + PDF link.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, consent } = body ?? {};

    if (!email || typeof email !== "string" || !consent) {
      return NextResponse.json(
        { ok: false, error: "email and consent are required" },
        { status: 400 }
      );
    }

    // TODO Day 11: persist + send email. For now acknowledge so the UI flow works.
    return NextResponse.json({ ok: true, pending: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid request" },
      { status: 400 }
    );
  }
}
