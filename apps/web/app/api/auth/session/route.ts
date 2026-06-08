import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getSessionUser();
  const response = NextResponse.json({
    authenticated: Boolean(user),
    userId: user?.id ?? null,
  });
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
