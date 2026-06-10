import type { Metadata } from "next";
import { Inter, Noto_Sans_SC, Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { PwaRegister } from "@/components/pwa-register";
import { SITE_LOGO_URL, SITE_NAME, SITE_URL, OG_LOCALE } from "@/lib/seo";
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
const gaId = process.env.NEXT_PUBLIC_GA_ID;
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

const HTML_LANG: Record<Locale, string> = {
  id: "id",
  vi: "vi",
  en: "en",
  zh: "zh-Hans",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Skorly — World Cup 2026 news, previews & predictions",
      template: "%s | Skorly",
    },
    description:
      "World Cup 2026 football news, match previews, predictions, group analysis and schedule.",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale] ?? "id_ID",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Skorly — World Cup 2026 news, previews & predictions",
        },
      ],
    },
    twitter: { card: "summary_large_image", images: ["/og.png"] },
    // AdSense site-ownership verification (meta tag method); server-rendered
    // so Google's verifier sees it without executing JS.
    other: adsenseClient ? { "google-adsense-account": adsenseClient } : undefined,
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const htmlClass = `${inter.variable} ${jakarta.variable} ${notoSc.variable}`;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO_URL,
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
  };

  return (
    <html lang={HTML_LANG[locale as Locale]} className={htmlClass}>
      <body
        className={`min-h-screen flex flex-col ${locale === "zh" ? "font-zh" : ""}`}
      >
        <JsonLd data={[orgLd, siteLd]} />
        <PwaRegister />
        <NextIntlClientProvider>
          <AnalyticsProvider
            gaId={gaId}
            posthogKey={posthogKey}
            posthogHost={posthogHost}
            adsenseClient={adsenseClient}
          />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
