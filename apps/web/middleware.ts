import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// NOTE: kept as `middleware.ts` (not Next 16's `proxy.ts`) because the
// Cloudflare OpenNext adapter does not yet support Node-runtime proxy.ts.
// next-intl's middleware is Edge-compatible, so this runs fine.
export default createMiddleware(routing);

export const config = {
  // Match all paths except api, _next, _vercel, and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
