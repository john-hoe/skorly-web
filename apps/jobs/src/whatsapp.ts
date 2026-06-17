/**
 * 二期 M7 — WhatsApp Business Cloud API sender (Workers-compatible, fetch only).
 *
 * Two delivery modes:
 *  - Template message (default, required to message users outside the 24h
 *    customer-service window). Template must be pre-approved in the Meta
 *    Business account; its name is set via WHATSAPP_TEMPLATE and it is expected
 *    to take two body params: {{1}} = match label, {{2}} = unlock link.
 *  - Plain text fallback (only delivered inside a 24h session) — used when no
 *    template name is configured, mainly for local/dev testing.
 *
 * Everything is env-gated: with no token/phone-id the sender no-ops, so the
 * premium broadcast keeps working on email alone until WhatsApp is provisioned.
 */

function readEnv(): Record<string, string | undefined> {
  return (
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  );
}

export interface WhatsappConfig {
  token: string;
  phoneId: string;
  template?: string;
  apiVersion: string;
}

/** Returns config only when the minimum credentials are present. */
export function whatsappConfig(): WhatsappConfig | null {
  const env = readEnv();
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null;
  return {
    token,
    phoneId,
    template: env.WHATSAPP_TEMPLATE || undefined,
    apiVersion: env.WHATSAPP_API_VERSION || "v21.0",
  };
}

/** Meta expects E.164 digits without "+" or separators. */
function normalizeNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** WhatsApp template language code, derived from our locale. */
function langCode(locale: string): string {
  switch (locale) {
    case "id":
      return "id";
    case "vi":
      return "vi";
    case "zh":
      return "zh_CN";
    case "th":
      return "th";
    default:
      return "en";
  }
}

async function post(cfg: WhatsappConfig, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[whatsapp] send failed ${res.status}: ${text.slice(0, 200)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[whatsapp] send error", err);
    return false;
  }
}

/**
 * Send the pre-match premium plan notification to one recipient.
 * `match` is the "Home vs Away" label, `link` the on-site unlock URL.
 */
export async function sendPremiumWhatsapp(
  cfg: WhatsappConfig,
  to: string,
  locale: string,
  match: string,
  link: string,
): Promise<boolean> {
  const num = normalizeNumber(to);
  if (!num) return false;

  if (cfg.template) {
    return post(cfg, {
      messaging_product: "whatsapp",
      to: num,
      type: "template",
      template: {
        name: cfg.template,
        language: { code: langCode(locale) },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: match },
              { type: "text", text: link },
            ],
          },
        ],
      },
    });
  }

  // Fallback: plain text (24h session only).
  return post(cfg, {
    messaging_product: "whatsapp",
    to: num,
    type: "text",
    text: { preview_url: true, body: `⚽ ${match}\n${link}` },
  });
}
