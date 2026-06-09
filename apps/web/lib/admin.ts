import { notFound, redirect } from "next/navigation";
import { getRuntimeProfile, type RuntimeProfileView } from "./runtime-data";
import { getSessionUser } from "./supabase/server";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export interface AdminSession {
  user: SessionUser;
  profile: RuntimeProfileView;
}

export async function requireAdmin(): Promise<AdminSession> {
  const user = await getSessionUser({ includeDeactivated: true }).catch(() => null);
  if (!user) redirect("/id/masuk");

  const profile = await getRuntimeProfile(user.id).catch((error) => {
    console.warn("[admin] profile lookup failed", error);
    return null;
  });

  if (profile?.role !== "admin" || profile.deletedAt) notFound();
  return { user, profile };
}
