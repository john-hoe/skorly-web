/**
 * Retry wrapper for build-time DB reads on fully static pages. The session
 * pooler can transiently refuse connections while parallel SSG workers are
 * busy (EMAXCONNSESSION); backing off and retrying rides it out. If all
 * attempts fail the error propagates and the build fails loudly — better a
 * failed deploy (previous good build stays live) than a baked empty page.
 */
export async function withBuildRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[build-retry] ${label} attempt ${attempt}/${attempts} failed:`, error);
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
      }
    }
  }
  throw lastError;
}
