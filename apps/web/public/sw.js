/* Skorly service worker — Web Push notifications and navigation fallback. */

const OFFLINE_COPY = {
  id: {
    title: "Skorly sedang offline",
    body: "Koneksi terputus. Coba kembali saat online atau buka halaman utama yang sudah pernah dimuat.",
    home: "Kembali ke beranda",
  },
  vi: {
    title: "Skorly đang ngoại tuyến",
    body: "Kết nối đang gián đoạn. Hãy thử lại khi có mạng hoặc quay về trang chủ đã mở trước đó.",
    home: "Về trang chủ",
  },
  en: {
    title: "Skorly is offline",
    body: "Your connection is unavailable. Try again when you are back online or return to the home page.",
    home: "Back to home",
  },
  zh: {
    title: "Skorly 当前离线",
    body: "网络连接不可用。恢复联网后请重试，或返回已访问过的首页。",
    home: "返回首页",
  },
};

function localeFromUrl(url) {
  try {
    const first = new URL(url).pathname.split("/").filter(Boolean)[0];
    return Object.prototype.hasOwnProperty.call(OFFLINE_COPY, first) ? first : "id";
  } catch (_e) {
    return "id";
  }
}

function offlineFallback(url) {
  const locale = localeFromUrl(url);
  const copy = OFFLINE_COPY[locale] || OFFLINE_COPY.id;
  const homeHref = `/${locale}`;
  return `<!doctype html>
<html lang="${locale === "zh" ? "zh-Hans" : locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${copy.title} | Skorly</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8faf9;color:#10251a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{width:min(100% - 32px,560px);padding:32px 0}
.brand{font-size:14px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0f8a4f}
h1{margin:12px 0 8px;font-size:clamp(28px,8vw,44px);line-height:1.05}
p{margin:0 0 20px;color:#506055;line-height:1.6}
a{display:inline-flex;min-height:44px;align-items:center;border-radius:8px;background:#0f8a4f;padding:0 18px;color:#fff;font-weight:700;text-decoration:none}
</style>
</head>
<body>
<main>
<div class="brand">Skorly</div>
<h1>${copy.title}</h1>
<p>${copy.body}</p>
<a href="${homeHref}">${copy.home}</a>
</main>
</body>
</html>`;
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(
      () =>
        new Response(offlineFallback(request.url), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        })
    )
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: "Skorly", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Skorly";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
        return undefined;
      })
  );
});
