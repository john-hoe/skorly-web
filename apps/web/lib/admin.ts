import { notFound, redirect } from "next/navigation";
import { getProfile, type ProfileView } from "@skorly/db";
import { getSessionUser } from "./supabase/server";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export interface AdminSession {
  user: SessionUser;
  profile: ProfileView;
}

export async function requireAdmin(): Promise<AdminSession> {
  const user = await getSessionUser().catch(() => null);
  if (!user) redirect("/id/masuk");

  const profile = await getProfile(user.id).catch((error) => {
    console.warn("[admin] profile lookup failed", error);
    return null;
  });

  if (profile?.role !== "admin") notFound();
  return { user, profile };
}
