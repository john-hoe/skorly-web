"use client";

import { useEffect, useRef, useState } from "react";

type Kind = "tweet" | "youtube" | "other";

function classify(url: string): { kind: Kind; id?: string } {
  // X / Twitter status
  const tw = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i);
  if (tw) return { kind: "tweet", id: tw[1] };
  // YouTube watch / youtu.be / shorts
  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { kind: "youtube", id: yt[1] };
  return { kind: "other" };
}

declare global {
  interface Window {
    twttr?: { widgets?: { load?: (el?: HTMLElement) => void } };
  }
}

/**
 * Renders an embed for an official tweet or YouTube video. Lazy: only mounts
 * when scrolled near. Degrades to a plain link if the source can't be embedded
 * or is later removed.
 */
export function SocialEmbed({ url }: { url: string }) {
  const { kind, id } = classify(url);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (visible && kind === "tweet") {
      const existing = document.getElementById("twitter-wjs");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "twitter-wjs";
        s.src = "https://platform.twitter.com/widgets.js";
        s.async = true;
        document.body.appendChild(s);
      } else {
        window.twttr?.widgets?.load?.(ref.current ?? undefined);
      }
    }
  }, [visible, kind]);

  return (
    <div ref={ref} className="my-6">
      {!visible ? (
        <div className="h-40 rounded-xl border border-[var(--border)] bg-[var(--card)] animate-pulse" />
      ) : kind === "youtube" && id ? (
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="YouTube video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : kind === "tweet" ? (
        <blockquote
          className="twitter-tweet mx-0 max-w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-6 break-words"
          data-dnt="true"
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[var(--brand)] underline break-all"
          >
            {url}
          </a>
        </blockquote>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-[var(--brand)] underline break-all"
        >
          {url}
        </a>
      )}
    </div>
  );
}
