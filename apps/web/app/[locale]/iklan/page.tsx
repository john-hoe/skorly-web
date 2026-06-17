import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { buildCanonicalMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const CONTACT = "business@skorly.cc";

interface MediaKitCopy {
  title: string;
  description: string;
  intro: string;
  audienceHeading: string;
  audience: string[];
  productsHeading: string;
  products: { name: string; desc: string }[];
  whyHeading: string;
  why: string[];
  ctaHeading: string;
  ctaBody: string;
  ctaButton: string;
  note: string;
}

/**
 * Self-contained 4-locale copy (no message-catalog churn for a single page).
 * Numbers stay deliberately round/qualitative; concrete traffic screenshots go
 * in the outreach email, not on a public page competitors can read.
 */
const COPY: Record<string, MediaKitCopy> = {
  en: {
    title: "Advertise with Skorly",
    description:
      "Reach football fans across Indonesia, Vietnam, Thailand and the Philippines during World Cup 2026 — display, sponsored content and newsletter placements.",
    intro:
      "Skorly is a football news and predictions platform covering World Cup 2026 in five languages (Bahasa Indonesia, Tiếng Việt, English, 中文, ไทย). We combine automated live scores, daily original news, AI-assisted match analysis and a prediction game that keeps fans coming back every match day.",
    audienceHeading: "Our audience",
    audience: [
      "Football fans in Indonesia, Vietnam, Thailand and the Philippines — four of the most football-obsessed markets in Southeast Asia.",
      "Native-language coverage: every article ships in 5 languages with consistent facts.",
      "High-intent match-day traffic: schedules, live scores, predictions and recaps.",
      "1,000+ original articles, growing daily through the tournament.",
    ],
    productsHeading: "What we offer",
    products: [
      { name: "Display placements", desc: "Standard IAB display via Google-certified serving, brand-safe environment, no gambling ads." },
      { name: "Sponsored content", desc: "Original articles or match-day features written around your brand, clearly labelled, in up to 5 languages." },
      { name: "Newsletter & push", desc: "Sponsorship slots in our match-day email digest and web push notifications." },
      { name: "Custom packages", desc: "Bracket-challenge sponsorship, prediction-league prizes, social co-branding." },
    ],
    whyHeading: "Why now",
    why: [
      "World Cup 2026 (June 11 – July 19) is the single biggest football traffic event in Southeast Asia.",
      "After the tournament we continue with the European season, transfer windows and local leagues — your placement doesn't expire with the final.",
    ],
    ctaHeading: "Get the media kit",
    ctaBody:
      "Email us for current traffic numbers, audience splits and rate card. We reply within 24 hours.",
    ctaButton: "Email " + CONTACT,
    note: "We do not accept gambling, betting-odds or piracy-related advertising in any market.",
  },
  id: {
    title: "Beriklan di Skorly",
    description:
      "Jangkau penggemar sepak bola di Indonesia, Vietnam, Thailand, dan Filipina selama Piala Dunia 2026 — display, konten bersponsor, dan slot newsletter.",
    intro:
      "Skorly adalah platform berita dan prediksi sepak bola yang meliput Piala Dunia 2026 dalam lima bahasa (Bahasa Indonesia, Tiếng Việt, English, 中文, ไทย). Kami menggabungkan skor langsung otomatis, berita orisinal harian, analisis pertandingan berbasis AI, dan game prediksi yang membuat fans kembali setiap hari pertandingan.",
    audienceHeading: "Audiens kami",
    audience: [
      "Penggemar sepak bola di Indonesia, Vietnam, Thailand, dan Filipina — empat pasar paling gila bola di Asia Tenggara.",
      "Liputan dalam bahasa lokal: setiap artikel terbit dalam 5 bahasa dengan fakta yang konsisten.",
      "Trafik hari pertandingan dengan intensi tinggi: jadwal, skor langsung, prediksi, dan hasil.",
      "1.000+ artikel orisinal, terus bertambah setiap hari selama turnamen.",
    ],
    productsHeading: "Yang kami tawarkan",
    products: [
      { name: "Penempatan display", desc: "Display IAB standar melalui penayangan bersertifikat Google, lingkungan brand-safe, tanpa iklan judi." },
      { name: "Konten bersponsor", desc: "Artikel orisinal atau fitur hari pertandingan seputar brand kamu, berlabel jelas, hingga 5 bahasa." },
      { name: "Newsletter & push", desc: "Slot sponsor di email digest hari pertandingan dan notifikasi web push kami." },
      { name: "Paket khusus", desc: "Sponsor tantangan bagan, hadiah liga prediksi, co-branding media sosial." },
    ],
    whyHeading: "Kenapa sekarang",
    why: [
      "Piala Dunia 2026 (11 Juni – 19 Juli) adalah event trafik sepak bola terbesar di Asia Tenggara.",
      "Setelah turnamen kami lanjut ke musim Eropa, bursa transfer, dan liga lokal — penempatanmu tidak berakhir bersama final.",
    ],
    ctaHeading: "Minta media kit",
    ctaBody:
      "Email kami untuk angka trafik terkini, pembagian audiens, dan rate card. Kami balas dalam 24 jam.",
    ctaButton: "Email " + CONTACT,
    note: "Kami tidak menerima iklan judi, odds taruhan, atau konten bajakan di pasar mana pun.",
  },
  vi: {
    title: "Quảng cáo cùng Skorly",
    description:
      "Tiếp cận người hâm mộ bóng đá tại Indonesia, Việt Nam, Thái Lan và Philippines trong World Cup 2026 — display, bài viết tài trợ và vị trí newsletter.",
    intro:
      "Skorly là nền tảng tin tức và dự đoán bóng đá đưa tin World Cup 2026 bằng năm ngôn ngữ (Bahasa Indonesia, Tiếng Việt, English, 中文, ไทย). Chúng tôi kết hợp tỷ số trực tiếp tự động, tin tức gốc hằng ngày, phân tích trận đấu hỗ trợ bởi AI và trò chơi dự đoán giữ chân người hâm mộ mỗi ngày thi đấu.",
    audienceHeading: "Khán giả của chúng tôi",
    audience: [
      "Người hâm mộ bóng đá tại Indonesia, Việt Nam, Thái Lan và Philippines — bốn thị trường cuồng bóng đá nhất Đông Nam Á.",
      "Nội dung bằng ngôn ngữ bản địa: mỗi bài viết phát hành bằng 5 ngôn ngữ với dữ kiện nhất quán.",
      "Lưu lượng ngày thi đấu với ý định cao: lịch đấu, tỷ số trực tiếp, dự đoán và kết quả.",
      "Hơn 1.000 bài viết gốc, tăng mỗi ngày trong suốt giải đấu.",
    ],
    productsHeading: "Chúng tôi cung cấp",
    products: [
      { name: "Vị trí display", desc: "Display chuẩn IAB qua hệ thống phân phối được Google chứng nhận, môi trường an toàn thương hiệu, không quảng cáo cờ bạc." },
      { name: "Bài viết tài trợ", desc: "Bài viết gốc hoặc nội dung ngày thi đấu xoay quanh thương hiệu của bạn, gắn nhãn rõ ràng, tối đa 5 ngôn ngữ." },
      { name: "Newsletter & push", desc: "Vị trí tài trợ trong email digest ngày thi đấu và thông báo web push." },
      { name: "Gói tùy chỉnh", desc: "Tài trợ thử thách nhánh đấu, giải thưởng league dự đoán, đồng thương hiệu trên mạng xã hội." },
    ],
    whyHeading: "Tại sao là bây giờ",
    why: [
      "World Cup 2026 (11/6 – 19/7) là sự kiện lưu lượng bóng đá lớn nhất Đông Nam Á.",
      "Sau giải đấu, chúng tôi tiếp tục với mùa giải châu Âu, kỳ chuyển nhượng và các giải trong nước — vị trí của bạn không hết hạn cùng trận chung kết.",
    ],
    ctaHeading: "Nhận media kit",
    ctaBody:
      "Email cho chúng tôi để nhận số liệu lưu lượng hiện tại, cơ cấu khán giả và bảng giá. Phản hồi trong 24 giờ.",
    ctaButton: "Email " + CONTACT,
    note: "Chúng tôi không nhận quảng cáo cờ bạc, tỷ lệ cược hay nội dung vi phạm bản quyền ở bất kỳ thị trường nào.",
  },
  zh: {
    title: "在 Skorly 投放广告",
    description:
      "2026 世界杯期间触达印尼、越南、泰国、菲律宾的足球用户——展示广告、品牌内容与 Newsletter 赞助位。",
    intro:
      "Skorly 是覆盖 2026 世界杯的足球资讯与竞猜平台，以五种语言（印尼语、越南语、英语、中文、泰语）发布内容。我们提供自动化实时比分、每日原创新闻、AI 辅助赛事分析，以及让用户每个比赛日都回访的竞猜玩法。",
    audienceHeading: "我们的受众",
    audience: [
      "印尼、越南、泰国、菲律宾的足球迷——东南亚最狂热的四个足球市场。",
      "母语级内容：每篇文章以 5 种语言同步发布，事实一致。",
      "高意图比赛日流量：赛程、实时比分、竞猜与赛果。",
      "1000+ 篇原创文章，赛事期间每日增长。",
    ],
    productsHeading: "合作形式",
    products: [
      { name: "展示广告位", desc: "标准 IAB 展示位，经 Google 认证投放，品牌安全环境，不接博彩广告。" },
      { name: "品牌内容", desc: "围绕你的品牌定制原创文章或比赛日专题，明确标注，最多 5 种语言。" },
      { name: "Newsletter 与推送", desc: "比赛日邮件摘要与 Web Push 通知中的赞助位。" },
      { name: "定制方案", desc: "晋级图挑战冠名、竞猜联赛奖品赞助、社交媒体联合品牌。" },
    ],
    whyHeading: "为什么是现在",
    why: [
      "2026 世界杯（6 月 11 日 – 7 月 19 日）是东南亚最大的足球流量事件。",
      "赛事结束后我们将继续覆盖欧洲赛季、转会窗与本地联赛——你的投放不会随决赛结束。",
    ],
    ctaHeading: "获取 Media Kit",
    ctaBody: "邮件联系我们获取最新流量数据、受众构成与刊例价，24 小时内回复。",
    ctaButton: "发邮件至 " + CONTACT,
    note: "我们在任何市场都不接受博彩、赔率或盗版相关广告。",
  },
  th: {
    title: "ลงโฆษณากับ Skorly",
    description:
      "เข้าถึงแฟนบอลในอินโดนีเซีย เวียดนาม ไทย และฟิลิปปินส์ช่วงฟุตบอลโลก 2026 ผ่าน display, sponsored content และ newsletter.",
    intro:
      "Skorly คือแพลตฟอร์มข่าวและคาดการณ์ฟุตบอลที่ครอบคลุมฟุตบอลโลก 2026 ในห้าภาษา (Bahasa Indonesia, Tiếng Việt, English, 中文, ไทย) เรารวมผลบอลสดอัตโนมัติ ข่าวต้นฉบับรายวัน บทวิเคราะห์แมตช์ที่ช่วยด้วย AI และเกมทายผลที่ทำให้แฟนบอลกลับมาทุกวันแข่งขัน",
    audienceHeading: "กลุ่มผู้ชมของเรา",
    audience: [
      "แฟนบอลในอินโดนีเซีย เวียดนาม ไทย และฟิลิปปินส์ — สี่ตลาดฟุตบอลที่มีความสนใจสูงในเอเชียตะวันออกเฉียงใต้",
      "คอนเทนต์ภาษาท้องถิ่น: ทุกบทความเผยแพร่ใน 5 ภาษาโดยรักษาข้อเท็จจริงให้สอดคล้องกัน",
      "ทราฟฟิกวันแข่งขันที่มีเจตนาชัดเจน: ตารางบอล ผลบอลสด การคาดการณ์ และสรุปผล",
      "บทความต้นฉบับมากกว่า 1,000 ชิ้น และเพิ่มต่อเนื่องตลอดทัวร์นาเมนต์",
    ],
    productsHeading: "สิ่งที่เรานำเสนอ",
    products: [
      { name: "ตำแหน่ง display", desc: "ตำแหน่ง display มาตรฐาน IAB ผ่านการเสิร์ฟที่ได้รับการรับรองจาก Google ในสภาพแวดล้อม brand-safe ไม่มีโฆษณาเสี่ยงโชค" },
      { name: "Sponsored content", desc: "บทความต้นฉบับหรือฟีเจอร์วันแข่งขันรอบแบรนด์ของคุณ ติดป้ายชัดเจน สูงสุด 5 ภาษา" },
      { name: "Newsletter & push", desc: "สล็อตสปอนเซอร์ในอีเมลสรุปวันแข่งขันและ web push notification" },
      { name: "แพ็กเกจเฉพาะ", desc: "สปอนเซอร์ bracket challenge รางวัลลีกทายผล และ co-branding บนโซเชียล" },
    ],
    whyHeading: "ทำไมต้องตอนนี้",
    why: [
      "ฟุตบอลโลก 2026 (11 มิถุนายน – 19 กรกฎาคม) คือเหตุการณ์ทราฟฟิกฟุตบอลที่ใหญ่ที่สุดของเอเชียตะวันออกเฉียงใต้",
      "หลังทัวร์นาเมนต์ เราจะต่อด้วยฤดูกาลยุโรป ตลาดซื้อขาย และลีกท้องถิ่น ตำแหน่งของคุณจึงไม่จบพร้อมนัดชิง",
    ],
    ctaHeading: "ขอ media kit",
    ctaBody:
      "อีเมลหาเราเพื่อรับตัวเลขทราฟฟิกล่าสุด สัดส่วนผู้ชม และ rate card เราตอบกลับภายใน 24 ชั่วโมง",
    ctaButton: "อีเมล " + CONTACT,
    note: "เราไม่รับโฆษณาเสี่ยงโชค ข้อมูลชวนเสี่ยง หรือเนื้อหาเกี่ยวกับการละเมิดลิขสิทธิ์ในทุกตลาด",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = COPY[locale] ?? COPY.en!;
  return {
    title: c.title,
    description: c.description,
    ...buildCanonicalMetadata("/iklan", locale),
  };
}

export default async function AdvertisePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = COPY[locale] ?? COPY.en!;
  const mailto = `mailto:${CONTACT}?subject=${encodeURIComponent("Skorly advertising inquiry")}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        <p className="mt-2 leading-7 text-[var(--muted)]">{c.intro}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{c.audienceHeading}</h2>
        <ul className="space-y-2">
          {c.audience.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{c.productsHeading}</h2>
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          {c.products.map((p) => (
            <li key={p.name} className="px-4 py-3">
              <div className="font-medium">{p.name}</div>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{p.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{c.whyHeading}</h2>
        <ul className="space-y-2">
          {c.why.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6"
            >
              {line}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
        <h2 className="text-xl font-bold">{c.ctaHeading}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{c.ctaBody}</p>
        <a
          href={mailto}
          className="mt-4 inline-block rounded-xl bg-[var(--brand)] px-6 py-3 font-semibold text-white transition hover:opacity-90"
        >
          {c.ctaButton}
        </a>
      </section>

      <p className="text-center text-xs text-[var(--muted)]">{c.note}</p>
    </div>
  );
}
