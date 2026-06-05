import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            background: #f8faf9;
            color: #10251a;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .not-found-shell {
            width: min(100% - 32px, 768px);
            min-height: 100vh;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 64px 0;
          }

          .not-found-eyebrow {
            margin: 0;
            color: #0f8a4f;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .not-found-title {
            margin: 12px 0 0;
            font-size: clamp(32px, 8vw, 48px);
            line-height: 1.05;
          }

          .not-found-body {
            max-width: 620px;
            margin: 12px 0 0;
            color: #506055;
            line-height: 1.6;
          }

          .not-found-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            margin-top: 32px;
          }

          .not-found-card h2 {
            margin: 0;
            font-size: 18px;
          }

          .not-found-card p {
            margin: 8px 0 14px;
            color: #506055;
            font-size: 14px;
            line-height: 1.55;
          }

          .not-found-link {
            display: inline-flex;
            min-height: 44px;
            align-items: center;
            border-radius: 8px;
            background: #0f8a4f;
            padding: 0 16px;
            color: white;
            font-size: 14px;
            font-weight: 700;
            text-decoration: none;
          }

          @media (max-width: 640px) {
            .not-found-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </head>
      <body>
        <main className="not-found-shell">
          <p className="not-found-eyebrow">
            Skorly · Page not found
          </p>
          <h1 className="not-found-title">
            This link is not available
          </h1>
          <p className="not-found-body">
            The page may have moved, may not be published yet, or the address may be incorrect.
          </p>
          <div className="not-found-grid">
            <section className="not-found-card">
              <h2>Halaman tidak ditemukan</h2>
              <p>
                Link ini tidak tersedia. Halaman yang kamu buka mungkin sudah dipindahkan.
              </p>
              <Link className="not-found-link" href="/id">
                Beranda Skorly
              </Link>
            </section>
            <section className="not-found-card">
              <h2>Không tìm thấy trang</h2>
              <p>
                Liên kết này không còn khả dụng. Trang bạn mở có thể đã được chuyển.
              </p>
              <Link className="not-found-link" href="/vi">
                Trang chủ Skorly
              </Link>
            </section>
            <section className="not-found-card">
              <h2>Page not found</h2>
              <p>
                This link is not available. Return to Skorly or open the match schedule.
              </p>
              <Link className="not-found-link" href="/en">
                Skorly home
              </Link>
            </section>
            <section className="not-found-card">
              <h2>页面未找到</h2>
              <p>
                这个链接暂不可用。该页面可能已移动、尚未发布，或地址输入有误。
              </p>
              <Link className="not-found-link" href="/zh">
                Skorly 首页
              </Link>
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
