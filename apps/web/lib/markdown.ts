import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Render trusted (AI-generated, server-side) markdown to HTML.
 * NOTE: content is produced by our own pipeline, not user input. If user-
 * generated markdown is ever rendered here, add sanitization (e.g. DOMPurify).
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
