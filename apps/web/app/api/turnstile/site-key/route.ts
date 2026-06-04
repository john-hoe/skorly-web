import { NextResponse } from "next/server";

export function GET(): NextResponse {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? process.env.TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return NextResponse.json({ ok: false, error: "notConfigured" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, siteKey });
}
