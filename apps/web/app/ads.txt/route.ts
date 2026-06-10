export const dynamic = "force-static";

/**
 * Serves /ads.txt for Google AdSense once NEXT_PUBLIC_ADSENSE_CLIENT is set
 * (e.g. "ca-pub-1234567890123456"). Returns 404 until then so the file never
 * ships with a placeholder publisher id.
 */
export function GET(): Response {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  if (!client) {
    return new Response("Not found", { status: 404 });
  }

  // ads.txt expects the bare publisher id (pub-...), not the ca- tag prefix.
  const publisherId = client.replace(/^ca-/, "");
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
