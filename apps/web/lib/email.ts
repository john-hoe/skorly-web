/**
 * Minimal Resend email sender (REST, no SDK so it works on the Edge too).
 * Returns false when the provider is unavailable or rejects the message.
 */
const FROM = process.env.RESEND_FROM ?? "Skorly <noreply@skorly.cc>";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing; message not sent");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      console.warn("[email] provider rejected message", { status: res.status });
      return false;
    }
    return true;
  } catch {
    console.warn("[email] provider request failed");
    return false;
  }
}

const SHELL = (locale: string, body: string) => `<!doctype html>
<html lang="${locale}"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#16a34a,#064e3b);border-radius:16px;padding:24px;color:#fff">
      <div style="font-size:26px;font-weight:800">Skor<span style="color:#bbf7d0">ly</span></div>
    </div>
    <div style="background:#fff;border-radius:16px;padding:24px;margin-top:12px">
      ${body}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">skorly.cc · World Cup 2026</p>
  </div>
</body></html>`;

const OPT_IN: Record<string, { subject: string; lead: string; cta: string; foot: string }> = {
  id: {
    subject: "Konfirmasi langganan prediksi Skorly",
    lead: "Satu langkah lagi! Klik tombol di bawah untuk mengonfirmasi email kamu dan mulai menerima prediksi & analisis eksklusif Piala Dunia 2026.",
    cta: "Konfirmasi email saya",
    foot: "Kamu menerima email ini karena mendaftar di skorly.cc. Abaikan jika ini bukan kamu.",
  },
  en: {
    subject: "Confirm your Skorly predictions subscription",
    lead: "One more step! Click the button below to confirm your email and start receiving exclusive World Cup 2026 predictions & analysis.",
    cta: "Confirm my email",
    foot: "You received this because you signed up at skorly.cc. Ignore this email if it wasn't you.",
  },
  vi: {
    subject: "Xác nhận đăng ký dự đoán Skorly",
    lead: "Chỉ một bước nữa! Nhấn nút bên dưới để xác nhận email và bắt đầu nhận dự đoán & phân tích World Cup 2026 độc quyền.",
    cta: "Xác nhận email của tôi",
    foot: "Bạn nhận được email này vì đã đăng ký tại skorly.cc. Bỏ qua nếu không phải bạn.",
  },
  zh: {
    subject: "确认订阅 Skorly 预测方案",
    lead: "还差一步！点击下方按钮确认邮箱，即可开始接收 2026 世界杯独家预测与分析。",
    cta: "确认我的邮箱",
    foot: "你收到此邮件是因为在 skorly.cc 注册。如非本人操作请忽略。",
  },
};

export function optInEmail(locale: string, confirmUrl: string): { subject: string; html: string } {
  const c = OPT_IN[locale] ?? OPT_IN.en!;
  const html = SHELL(
    locale,
    `<p style="font-size:16px;line-height:1.6">${c.lead}</p>
     <p style="text-align:center;margin:24px 0">
       <a href="${confirmUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:10px">${c.cta}</a>
     </p>
     <p style="font-size:12px;color:#9ca3af">${c.foot}</p>`,
  );
  return { subject: c.subject, html };
}
