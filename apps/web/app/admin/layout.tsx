import type { Metadata } from "next";
import { Inter, Noto_Sans_SC, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});
const notoSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sc",
});

const NAV = [
  { href: "/admin", label: "Overview", enabled: true },
  { href: "/admin/operations", label: "Operations", enabled: true },
  { href: "/admin/comments", label: "Comments", enabled: false },
  { href: "/admin/users", label: "Users", enabled: false },
  { href: "/admin/content", label: "Content", enabled: false },
  { href: "/admin/subscribers", label: "Subscribers", enabled: false },
  { href: "/admin/matches", label: "Matches", enabled: false },
  { href: "/admin/media", label: "Media", enabled: false },
];

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Admin | Skorly",
    template: "%s | Skorly Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const htmlClass = `${inter.variable} ${jakarta.variable} ${notoSc.variable}`;
  const displayName = admin.profile.displayName ?? admin.user.email ?? "Admin";

  return (
    <html lang="en" className={htmlClass}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="min-h-screen lg:flex">
          <aside className="border-b border-[var(--border)] bg-[var(--card)] lg:w-64 lg:border-b-0 lg:border-r">
            <div className="px-4 py-5">
              <Link href="/admin" className="text-xl font-black tracking-tight">
                Skor<span className="text-[var(--brand)]">ly</span>
              </Link>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">{displayName}</p>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
              {NAV.map((item) => (
                item.enabled ? (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={item.href}
                    className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] opacity-45"
                  >
                    {item.label}
                  </span>
                )
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
