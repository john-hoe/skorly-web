import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MatchCard } from "@/components/match-card";
import { buildCanonicalMetadata, pageSeoDescription, pageSeoTitle } from "@/lib/seo";
import {
  getRuntimeGroupNames,
  getRuntimeUpcomingFixtures,
  type RuntimeFixtureView,
} from "@/lib/runtime-data";

// This hub performs live DB reads. Keep it out of SSG so one stalled Supabase
// query cannot fail the production build's static generation worker.
export const dynamic = "force-dynamic";

const HUB_DATA_TIMEOUT_MS = 10_000;

async function withHubDataTimeout<T>(
  label: string,
  work: Promise<T>,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(
        `[world-cup-hub] ${label} exceeded ${HUB_DATA_TIMEOUT_MS}ms; rendering fallback data.`
      );
      resolve(fallback);
    }, HUB_DATA_TIMEOUT_MS);
    if (timer && typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
  });

  try {
    return await Promise.race([
      work.catch((error) => {
        console.warn(`[world-cup-hub] ${label} failed; rendering fallback data.`, error);
        return fallback;
      }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: pageSeoTitle(locale, "worldCup"),
    description: pageSeoDescription(locale, "worldCup"),
    ...buildCanonicalMetadata("/piala-dunia-2026", locale),
  };
}

export default async function WorldCupHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [groups, fixtures] = await Promise.all([
    withHubDataTimeout<string[]>("getGroupNames", getRuntimeGroupNames(), []),
    withHubDataTimeout<RuntimeFixtureView[]>("getUpcomingFixtures", getRuntimeUpcomingFixtures(8), []),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.worldCup")}</h1>
        <p className="mt-1 text-[var(--muted)]">{t("home.heroSubtitle")}</p>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("nav.groups")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {groups.map((g) => {
            const letter = g.replace("Group ", "");
            return (
              <Link
                key={g}
                href={{ pathname: "/piala-dunia-2026/grup/[group]", params: { group: letter.toLowerCase() } }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center transition hover:border-[var(--brand)]"
              >
                <span className="text-xs text-[var(--muted)]">{t("nav.groups")}</span>
                <p className="text-2xl font-bold text-[var(--brand)]">{letter}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("home.upcomingMatches")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {fixtures.map((f) => (
            <MatchCard key={f.id} fixture={f} />
          ))}
        </div>
      </section>
    </div>
  );
}
