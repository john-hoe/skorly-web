import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// All content pages are prerendered (SSG) at build time. The static-assets cache
// serves them straight from the bundled assets, so the Worker never touches the
// database at runtime. Re-run the build to publish new/updated content.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
