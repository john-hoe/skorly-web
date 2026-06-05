import Link from "next/link";
import { getLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    body: string;
    home: string;
    schedule: string;
  }
> = {
  id: {
    eyebrow: "Halaman tidak ditemukan",
    title: "Link ini tidak tersedia",
    body: "Halaman yang kamu buka mungkin sudah dipindahkan, belum tersedia, atau alamatnya salah.",
    home: "Beranda Skorly",
    schedule: "Lihat jadwal",
  },
  vi: {
    eyebrow: "Không tìm thấy trang",
    title: "Liên kết này không còn khả dụng",
    body: "Trang bạn mở có thể đã được chuyển, chưa xuất bản hoặc địa chỉ không chính xác.",
    home: "Trang chủ Skorly",
    schedule: "Xem lịch thi đấu",
  },
  en: {
    eyebrow: "Page not found",
    title: "This link is not available",
    body: "The page may have moved, may not be published yet, or the address may be incorrect.",
    home: "Skorly home",
    schedule: "View schedule",
  },
  zh: {
    eyebrow: "页面未找到",
    title: "这个链接暂不可用",
    body: "该页面可能已移动、尚未发布，或地址输入有误。",
    home: "Skorly 首页",
    schedule: "查看赛程",
  },
};

const SCHEDULE_PATH: Record<Locale, string> = {
  id: "/id/jadwal",
  vi: "/vi/lich-thi-dau",
  en: "/en/schedule",
  zh: "/zh/saicheng",
};

function normalizeLocale(locale: string): Locale {
  return routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;
}

export default async function NotFound() {
  const locale = normalizeLocale(await getLocale());
  const copy = COPY[locale];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
        Skorly · {copy.eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
      <p className="mt-3 max-w-xl text-[var(--muted)]">{copy.body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/${locale}`}
          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {copy.home}
        </Link>
        <Link
          href={SCHEDULE_PATH[locale]}
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-sm font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {copy.schedule}
        </Link>
      </div>
    </div>
  );
}
