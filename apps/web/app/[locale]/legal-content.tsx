import type { Metadata } from "next";
import { type Locale } from "@/i18n/routing";
import { buildCanonicalMetadata } from "@/lib/seo";

type LegalKind = "privacy" | "terms";

interface LegalCopy {
  title: string;
  description: string;
  updated: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
}

const CONTACT = "business@skorly.cc";

const COPY: Record<LegalKind, Record<Locale, LegalCopy>> = {
  privacy: {
    en: {
      title: "Privacy Policy",
      description:
        "How Skorly collects, uses, and protects account, prediction, subscription, and analytics data.",
      updated: "Last updated: June 10, 2026",
      intro:
        "This policy explains how Skorly handles personal data when you read our public football content, create an account, save predictions, join mini leagues, subscribe to updates, or contact us.",
      sections: [
        {
          heading: "Data we collect",
          body: [
            "We collect account details such as email address and authentication identifiers when you sign up or log in.",
            "We collect prediction, bracket, mini-league, comment, subscription, consent, and notification data when you use those features.",
            "We may receive technical data such as IP address, device information, browser, locale, referral URL, and analytics events.",
          ],
        },
        {
          heading: "How we use data",
          body: [
            "We use data to operate Skorly, protect accounts, save predictions, deliver requested emails or notifications, measure site performance, and improve football content.",
            "We do not sell personal data. We use service providers only where needed for hosting, authentication, analytics, email, security, and database operations.",
          ],
        },
        {
          heading: "Advertising and cookies",
          body: [
            "Skorly shows advertising from Google AdSense to keep our content free. Google and its partners may use cookies or device identifiers to serve and measure ads.",
            "Unless you accept our consent banner, ads remain limited and non-personalized. You can review or change ad personalization at adssettings.google.com, and learn how Google uses data at policies.google.com/technologies/partner-sites.",
          ],
        },
        {
          heading: "Your choices",
          body: [
            "You can unsubscribe from marketing emails through the email link or contact us to request access, correction, or deletion where applicable.",
            `For privacy requests, contact ${CONTACT}.`,
          ],
        },
      ],
    },
    id: {
      title: "Kebijakan Privasi",
      description:
        "Cara Skorly mengumpulkan, memakai, dan melindungi data akun, prediksi, langganan, dan analitik.",
      updated: "Terakhir diperbarui: 10 Juni 2026",
      intro:
        "Kebijakan ini menjelaskan cara Skorly menangani data pribadi saat kamu membaca konten sepak bola, membuat akun, menyimpan prediksi, bergabung ke liga mini, berlangganan pembaruan, atau menghubungi kami.",
      sections: [
        {
          heading: "Data yang kami kumpulkan",
          body: [
            "Kami mengumpulkan detail akun seperti alamat email dan identitas autentikasi saat kamu mendaftar atau masuk.",
            "Kami mengumpulkan data prediksi, bagan, liga mini, komentar, langganan, persetujuan, dan notifikasi saat fitur tersebut digunakan.",
            "Kami dapat menerima data teknis seperti alamat IP, perangkat, browser, locale, URL rujukan, dan event analitik.",
          ],
        },
        {
          heading: "Cara kami menggunakan data",
          body: [
            "Kami menggunakan data untuk menjalankan Skorly, melindungi akun, menyimpan prediksi, mengirim email atau notifikasi yang diminta, mengukur performa situs, dan meningkatkan konten sepak bola.",
            "Kami tidak menjual data pribadi. Penyedia layanan hanya digunakan bila diperlukan untuk hosting, autentikasi, analitik, email, keamanan, dan operasi database.",
          ],
        },
        {
          heading: "Iklan dan cookie",
          body: [
            "Skorly menampilkan iklan dari Google AdSense agar konten tetap gratis. Google dan mitranya dapat menggunakan cookie atau pengenal perangkat untuk menayangkan dan mengukur iklan.",
            "Selama kamu belum menyetujui banner persetujuan, iklan tetap terbatas dan non-personal. Kamu bisa meninjau atau mengubah personalisasi iklan di adssettings.google.com, dan mempelajari cara Google memakai data di policies.google.com/technologies/partner-sites.",
          ],
        },
        {
          heading: "Pilihan kamu",
          body: [
            "Kamu dapat berhenti berlangganan email marketing melalui tautan di email atau menghubungi kami untuk meminta akses, koreksi, atau penghapusan jika berlaku.",
            `Untuk permintaan privasi, hubungi ${CONTACT}.`,
          ],
        },
      ],
    },
    vi: {
      title: "Chính sách bảo mật",
      description:
        "Cách Skorly thu thập, sử dụng và bảo vệ dữ liệu tài khoản, dự đoán, đăng ký nhận tin và phân tích.",
      updated: "Cập nhật lần cuối: 10 tháng 6, 2026",
      intro:
        "Chính sách này giải thích cách Skorly xử lý dữ liệu cá nhân khi bạn đọc nội dung bóng đá, tạo tài khoản, lưu dự đoán, tham gia mini league, đăng ký nhận tin hoặc liên hệ với chúng tôi.",
      sections: [
        {
          heading: "Dữ liệu chúng tôi thu thập",
          body: [
            "Chúng tôi thu thập thông tin tài khoản như email và mã định danh xác thực khi bạn đăng ký hoặc đăng nhập.",
            "Chúng tôi thu thập dữ liệu dự đoán, nhánh đấu, mini league, bình luận, đăng ký, đồng ý tiếp thị và thông báo khi bạn dùng các tính năng đó.",
            "Chúng tôi có thể nhận dữ liệu kỹ thuật như địa chỉ IP, thiết bị, trình duyệt, locale, URL giới thiệu và sự kiện phân tích.",
          ],
        },
        {
          heading: "Cách chúng tôi sử dụng dữ liệu",
          body: [
            "Chúng tôi dùng dữ liệu để vận hành Skorly, bảo vệ tài khoản, lưu dự đoán, gửi email hoặc thông báo bạn yêu cầu, đo hiệu năng trang và cải thiện nội dung bóng đá.",
            "Chúng tôi không bán dữ liệu cá nhân. Nhà cung cấp dịch vụ chỉ được dùng khi cần cho hosting, xác thực, phân tích, email, bảo mật và vận hành cơ sở dữ liệu.",
          ],
        },
        {
          heading: "Quảng cáo và cookie",
          body: [
            "Skorly hiển thị quảng cáo từ Google AdSense để giữ nội dung miễn phí. Google và các đối tác có thể dùng cookie hoặc mã định danh thiết bị để hiển thị và đo lường quảng cáo.",
            "Khi bạn chưa chấp nhận banner đồng ý, quảng cáo vẫn ở chế độ giới hạn và không cá nhân hóa. Bạn có thể xem hoặc thay đổi cá nhân hóa quảng cáo tại adssettings.google.com và tìm hiểu cách Google dùng dữ liệu tại policies.google.com/technologies/partner-sites.",
          ],
        },
        {
          heading: "Lựa chọn của bạn",
          body: [
            "Bạn có thể hủy nhận email marketing qua liên kết trong email hoặc liên hệ chúng tôi để yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu khi áp dụng.",
            `Đối với yêu cầu về quyền riêng tư, liên hệ ${CONTACT}.`,
          ],
        },
      ],
    },
    zh: {
      title: "隐私政策",
      description:
        "Skorly 如何收集、使用和保护账号、预测、订阅和分析数据。",
      updated: "最后更新：2026 年 6 月 10 日",
      intro:
        "本政策说明你在阅读足球内容、创建账号、保存预测、加入迷你联赛、订阅更新或联系我们时，Skorly 如何处理个人数据。",
      sections: [
        {
          heading: "我们收集的数据",
          body: [
            "当你注册或登录时，我们会收集邮箱地址和认证标识等账号信息。",
            "当你使用相关功能时，我们会收集预测、晋级图、迷你联赛、评论、订阅、同意记录和通知数据。",
            "我们可能接收 IP 地址、设备、浏览器、locale、来源 URL 和分析事件等技术数据。",
          ],
        },
        {
          heading: "我们如何使用数据",
          body: [
            "我们使用数据来运行 Skorly、保护账号、保存预测、发送你请求的邮件或通知、衡量网站性能，并改进足球内容。",
            "我们不出售个人数据。仅在托管、认证、分析、邮件、安全和数据库运营所需时使用服务提供商。",
          ],
        },
        {
          heading: "广告与 Cookie",
          body: [
            "Skorly 展示来自 Google AdSense 的广告，以保持内容免费。Google 及其合作伙伴可能使用 Cookie 或设备标识符来投放和衡量广告。",
            "在你接受同意横幅之前，广告将保持受限且非个性化。你可以在 adssettings.google.com 查看或更改广告个性化设置，并在 policies.google.com/technologies/partner-sites 了解 Google 如何使用数据。",
          ],
        },
        {
          heading: "你的选择",
          body: [
            "你可以通过邮件中的链接取消营销邮件，也可以联系我们，在适用情况下请求访问、更正或删除数据。",
            `隐私相关请求请联系 ${CONTACT}。`,
          ],
        },
      ],
    },
    th: {
      title: "นโยบายความเป็นส่วนตัว",
      description:
        "วิธีที่ Skorly เก็บ ใช้ และปกป้องข้อมูลบัญชี การทายผล การสมัครรับข่าวสาร และ analytics.",
      updated: "อัปเดตล่าสุด: 10 มิถุนายน 2026",
      intro:
        "นโยบายนี้อธิบายวิธีที่ Skorly จัดการข้อมูลส่วนบุคคลเมื่อคุณอ่านเนื้อหาฟุตบอล สร้างบัญชี บันทึกการทายผล เข้าร่วมมินิลีก สมัครรับอัปเดต หรือติดต่อเรา",
      sections: [
        {
          heading: "ข้อมูลที่เราเก็บ",
          body: [
            "เราเก็บรายละเอียดบัญชี เช่น อีเมลและตัวระบุการยืนยันตัวตนเมื่อคุณสมัครหรือเข้าสู่ระบบ",
            "เราเก็บข้อมูลการทายผล bracket มินิลีก ความคิดเห็น การสมัครรับข่าวสาร การยินยอม และการแจ้งเตือนเมื่อคุณใช้ฟีเจอร์เหล่านั้น",
            "เราอาจได้รับข้อมูลทางเทคนิค เช่น IP อุปกรณ์ เบราว์เซอร์ locale URL อ้างอิง และเหตุการณ์ analytics",
          ],
        },
        {
          heading: "เราใช้ข้อมูลอย่างไร",
          body: [
            "เราใช้ข้อมูลเพื่อให้บริการ Skorly ปกป้องบัญชี บันทึกการทายผล ส่งอีเมลหรือแจ้งเตือนที่คุณขอ วัดประสิทธิภาพเว็บไซต์ และปรับปรุงเนื้อหาฟุตบอล",
            "เราไม่ขายข้อมูลส่วนบุคคล เราใช้ผู้ให้บริการเฉพาะเมื่อจำเป็นสำหรับโฮสติ้ง การยืนยันตัวตน analytics อีเมล ความปลอดภัย และการดำเนินงานฐานข้อมูล",
          ],
        },
        {
          heading: "โฆษณาและคุกกี้",
          body: [
            "Skorly แสดงโฆษณาจาก Google AdSense เพื่อให้เนื้อหายังคงฟรี Google และพาร์ตเนอร์อาจใช้คุกกี้หรือตัวระบุอุปกรณ์เพื่อแสดงและวัดผลโฆษณา",
            "หากคุณยังไม่ยอมรับแบนเนอร์ความยินยอม โฆษณาจะอยู่ในโหมดจำกัดและไม่ปรับตามบุคคล คุณสามารถตรวจสอบหรือเปลี่ยนการปรับโฆษณาตามบุคคลได้ที่ adssettings.google.com และอ่านวิธีที่ Google ใช้ข้อมูลได้ที่ policies.google.com/technologies/partner-sites",
          ],
        },
        {
          heading: "ทางเลือกของคุณ",
          body: [
            "คุณสามารถยกเลิกการรับอีเมลการตลาดผ่านลิงก์ในอีเมล หรือติดต่อเราเพื่อขอเข้าถึง แก้ไข หรือลบข้อมูลตามที่กฎหมายรองรับ",
            `สำหรับคำขอด้านความเป็นส่วนตัว ติดต่อ ${CONTACT}`,
          ],
        },
      ],
    },
  },
  terms: {
    en: {
      title: "Terms of Service",
      description:
        "The terms for using Skorly's football content, predictions, accounts, subscriptions, and community features.",
      updated: "Last updated: June 4, 2026",
      intro:
        "These terms govern your use of Skorly. By using the site, you agree to use it lawfully and responsibly.",
      sections: [
        {
          heading: "Content and predictions",
          body: [
            "Skorly provides football news, previews, scores, predictions, and fan tools for informational and entertainment purposes.",
            "Predictions are not betting advice. Do not use Skorly as a gambling, financial, or professional decision-making service.",
          ],
        },
        {
          heading: "Accounts and community features",
          body: [
            "You are responsible for activity under your account and for keeping your login access secure.",
            "Do not post unlawful, abusive, misleading, spammy, or rights-infringing content. We may remove content or restrict access where needed.",
          ],
        },
        {
          heading: "Service availability",
          body: [
            "We aim to keep Skorly available and accurate, but football data, schedules, rights, and live information can change.",
            `For questions about these terms, contact ${CONTACT}.`,
          ],
        },
      ],
    },
    id: {
      title: "Syarat & Ketentuan",
      description:
        "Ketentuan penggunaan konten sepak bola, prediksi, akun, langganan, dan fitur komunitas Skorly.",
      updated: "Terakhir diperbarui: 4 Juni 2026",
      intro:
        "Ketentuan ini mengatur penggunaan Skorly. Dengan memakai situs ini, kamu setuju untuk menggunakannya secara sah dan bertanggung jawab.",
      sections: [
        {
          heading: "Konten dan prediksi",
          body: [
            "Skorly menyediakan berita sepak bola, pratinjau, skor, prediksi, dan alat untuk fans sebagai informasi dan hiburan.",
            "Prediksi bukan saran taruhan. Jangan gunakan Skorly sebagai layanan perjudian, finansial, atau pengambilan keputusan profesional.",
          ],
        },
        {
          heading: "Akun dan fitur komunitas",
          body: [
            "Kamu bertanggung jawab atas aktivitas di akunmu dan menjaga akses masuk tetap aman.",
            "Jangan mengirim konten ilegal, kasar, menyesatkan, spam, atau melanggar hak. Kami dapat menghapus konten atau membatasi akses bila diperlukan.",
          ],
        },
        {
          heading: "Ketersediaan layanan",
          body: [
            "Kami berupaya menjaga Skorly tetap tersedia dan akurat, tetapi data sepak bola, jadwal, hak siar, dan informasi live dapat berubah.",
            `Untuk pertanyaan tentang ketentuan ini, hubungi ${CONTACT}.`,
          ],
        },
      ],
    },
    vi: {
      title: "Điều khoản dịch vụ",
      description:
        "Điều khoản sử dụng nội dung bóng đá, dự đoán, tài khoản, đăng ký nhận tin và tính năng cộng đồng của Skorly.",
      updated: "Cập nhật lần cuối: 4 tháng 6, 2026",
      intro:
        "Các điều khoản này điều chỉnh việc bạn sử dụng Skorly. Khi sử dụng trang, bạn đồng ý dùng trang một cách hợp pháp và có trách nhiệm.",
      sections: [
        {
          heading: "Nội dung và dự đoán",
          body: [
            "Skorly cung cấp tin bóng đá, nhận định, tỉ số, dự đoán và công cụ dành cho người hâm mộ nhằm mục đích thông tin và giải trí.",
            "Dự đoán không phải lời khuyên cá cược. Không sử dụng Skorly như một dịch vụ cờ bạc, tài chính hoặc ra quyết định chuyên nghiệp.",
          ],
        },
        {
          heading: "Tài khoản và tính năng cộng đồng",
          body: [
            "Bạn chịu trách nhiệm cho hoạt động trong tài khoản của mình và việc giữ an toàn quyền truy cập đăng nhập.",
            "Không đăng nội dung bất hợp pháp, lạm dụng, gây hiểu lầm, spam hoặc vi phạm quyền. Chúng tôi có thể xóa nội dung hoặc hạn chế truy cập khi cần.",
          ],
        },
        {
          heading: "Tính sẵn có của dịch vụ",
          body: [
            "Chúng tôi cố gắng giữ Skorly luôn sẵn sàng và chính xác, nhưng dữ liệu bóng đá, lịch thi đấu, bản quyền và thông tin trực tiếp có thể thay đổi.",
            `Nếu có câu hỏi về các điều khoản này, liên hệ ${CONTACT}.`,
          ],
        },
      ],
    },
    zh: {
      title: "服务条款",
      description:
        "使用 Skorly 足球内容、预测、账号、订阅和社区功能的条款。",
      updated: "最后更新：2026 年 6 月 4 日",
      intro:
        "这些条款适用于你对 Skorly 的使用。使用本站即表示你同意以合法、负责的方式使用。",
      sections: [
        {
          heading: "内容和预测",
          body: [
            "Skorly 提供足球新闻、前瞻、比分、预测和球迷工具，用于信息和娱乐目的。",
            "预测不是博彩建议。请勿将 Skorly 作为赌博、金融或专业决策服务使用。",
          ],
        },
        {
          heading: "账号和社区功能",
          body: [
            "你需要对账号下的活动负责，并保护登录访问安全。",
            "请勿发布违法、辱骂、误导、垃圾信息或侵权内容。必要时我们可能移除内容或限制访问。",
          ],
        },
        {
          heading: "服务可用性",
          body: [
            "我们会尽力保持 Skorly 可用且准确，但足球数据、赛程、版权和实时信息可能变化。",
            `如对这些条款有疑问，请联系 ${CONTACT}。`,
          ],
        },
      ],
    },
    th: {
      title: "ข้อกำหนดการใช้งาน",
      description:
        "ข้อกำหนดสำหรับการใช้เนื้อหาฟุตบอล การทายผล บัญชี การสมัครรับข่าวสาร และฟีเจอร์ชุมชนของ Skorly.",
      updated: "อัปเดตล่าสุด: 4 มิถุนายน 2026",
      intro:
        "ข้อกำหนดนี้ควบคุมการใช้ Skorly ของคุณ เมื่อใช้เว็บไซต์ คุณตกลงว่าจะใช้งานอย่างถูกกฎหมายและรับผิดชอบ",
      sections: [
        {
          heading: "เนื้อหาและการคาดการณ์",
          body: [
            "Skorly ให้ข่าวฟุตบอล พรีวิว สกอร์ การคาดการณ์ และเครื่องมือสำหรับแฟนบอลเพื่อข้อมูลและความบันเทิง",
            "การคาดการณ์ไม่ใช่คำแนะนำทางการเงินหรือการตัดสินใจแบบมืออาชีพ และไม่ควรใช้เป็นบริการสำหรับกิจกรรมเสี่ยงโชค",
          ],
        },
        {
          heading: "บัญชีและฟีเจอร์ชุมชน",
          body: [
            "คุณรับผิดชอบกิจกรรมภายใต้บัญชีของคุณและต้องรักษาการเข้าสู่ระบบให้ปลอดภัย",
            "ห้ามโพสต์เนื้อหาผิดกฎหมาย ล่วงละเมิด ทำให้เข้าใจผิด สแปม หรือละเมิดสิทธิ์ เราอาจลบเนื้อหาหรือจำกัดการเข้าถึงเมื่อจำเป็น",
          ],
        },
        {
          heading: "ความพร้อมใช้งานของบริการ",
          body: [
            "เราพยายามให้ Skorly พร้อมใช้งานและถูกต้อง แต่ข้อมูลฟุตบอล ตารางแข่งขัน สิทธิ์ถ่ายทอด และข้อมูลสดอาจเปลี่ยนได้",
            `หากมีคำถามเกี่ยวกับข้อกำหนดนี้ ติดต่อ ${CONTACT}`,
          ],
        },
      ],
    },
  },
};

export function legalMetadata(kind: LegalKind, locale: string): Metadata {
  const copy = COPY[kind][locale as Locale] ?? COPY[kind].id;
  const href = kind === "privacy" ? "/privacy" : "/terms";
  return {
    title: copy.title,
    description: copy.description,
    ...buildCanonicalMetadata(href, locale),
  };
}

export function LegalDocument({
  kind,
  locale,
}: {
  kind: LegalKind;
  locale: string;
}) {
  const copy = COPY[kind][locale as Locale] ?? COPY[kind].id;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-[var(--brand)]">Skorly</p>
        <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.updated}</p>
        <p className="max-w-2xl text-[var(--muted)]">{copy.intro}</p>
      </header>

      <div className="mt-8 space-y-7">
        {copy.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="leading-7 text-[var(--muted)]">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
