import { Renderer, marked, type Tokens } from "marked";

marked.setOptions({ gfm: true, breaks: false });

interface RenderMarkdownOptions {
  /**
   * Shift heading levels when markdown is embedded under an existing page
   * heading hierarchy. Example: offset 2 turns h1 into h3.
   */
  headingOffset?: number;
  /** Remove a leading ATX/setext h1 when the page template renders its own h1. */
  stripLeadingH1?: boolean;
}

function stripLeadingH1(md: string): string {
  return md
    .replace(/^\s*#\s+[^\n]+(?:\n+|$)/, "")
    .replace(/^\s*[^\n]+\n=+\s*(?:\n+|$)/, "");
}

/**
 * Render trusted (AI-generated, server-side) markdown to HTML.
 * NOTE: content is produced by our own pipeline, not user input. If user-
 * generated markdown is ever rendered here, add sanitization (e.g. DOMPurify).
 */
export function renderMarkdown(
  md: string,
  options: RenderMarkdownOptions = {},
): string {
  const source = options.stripLeadingH1 ? stripLeadingH1(md) : md;
  const headingOffset = Math.max(0, options.headingOffset ?? 0);
  if (headingOffset === 0) {
    return marked.parse(source, { async: false }) as string;
  }

  const renderer = new Renderer();
  renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
    const shiftedDepth = Math.min(6, depth + headingOffset);
    return `<h${shiftedDepth}>${renderer.parser.parseInline(tokens)}</h${shiftedDepth}>\n`;
  };

  return marked.parse(source, { async: false, renderer }) as string;
}
