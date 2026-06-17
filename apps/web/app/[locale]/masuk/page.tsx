import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/supabase/server";

function safeNextPath(value: string | undefined, locale: string): string | null {
  if (!value) return null;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;

  const url = new URL(decoded, "https://skorly.local");
  if (url.origin !== "https://skorly.local") return null;
  if (url.pathname === `/${locale}/masuk`) return null;
  if (url.pathname !== `/${locale}` && !url.pathname.startsWith(`/${locale}/`)) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("login.title"), robots: { index: false, follow: false } };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  const { error, next } = await searchParams;
  setRequestLocale(locale);

  const nextPath = safeNextPath(next, locale);
  const user = await getSessionUser();
  if (user) redirect(nextPath ?? `/${locale}/akun`);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <LoginForm locale={locale} initialError={error ? "auth" : undefined} nextPath={nextPath} />
    </div>
  );
}
