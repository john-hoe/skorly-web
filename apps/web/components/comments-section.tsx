"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Turnstile } from "@/components/auth/turnstile";
import {
  loadComments,
  postComment,
  likeComment,
  flagComment,
} from "@/lib/comment-actions";
import type { CommentView, CommentTarget } from "@skorly/db";

interface Props {
  target: CommentTarget;
}

export function CommentsSection({ target }: Props) {
  const t = useTranslations("comments");
  const [auth, setAuth] = useState(false);
  const [items, setItems] = useState<CommentView[] | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const refresh = () =>
    loadComments(target).then((res) => {
      setAuth(res.auth);
      setItems(res.comments);
    });

  useEffect(() => {
    let active = true;
    loadComments(target).then((res) => {
      if (!active) return;
      setAuth(res.auth);
      setItems(res.comments);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roots = (items ?? []).filter((c) => c.parentId == null);
  const repliesOf = (id: number) => (items ?? []).filter((c) => c.parentId === id);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{t("title")}</h2>

      {auth ? (
        <CommentForm target={target} onPosted={refresh} />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          <span className="text-[var(--muted)]">{t("loginCta")} </span>
          <Link href="/masuk" className="font-semibold text-[var(--brand)]">
            {t("login")}
          </Link>
        </div>
      )}

      {items === null ? (
        <div className="h-20 animate-pulse rounded-xl bg-[var(--card)]" aria-hidden />
      ) : roots.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("empty")}</p>
      ) : (
        <ul className="space-y-4">
          {roots.map((c) => (
            <li key={c.id} className="space-y-3">
              <CommentItem comment={c} auth={auth} onChange={refresh} onReply={() => setReplyTo(c.id)} />
              {repliesOf(c.id).length > 0 && (
                <ul className="ml-6 space-y-3 border-l border-[var(--border)] pl-4">
                  {repliesOf(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentItem comment={r} auth={auth} onChange={refresh} />
                    </li>
                  ))}
                </ul>
              )}
              {auth && replyTo === c.id && (
                <div className="ml-6 pl-4">
                  <CommentForm
                    target={target}
                    parentId={c.id}
                    reply
                    onPosted={() => {
                      setReplyTo(null);
                      refresh();
                    }}
                    onCancel={() => setReplyTo(null)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentForm({
  target,
  parentId = null,
  reply = false,
  onPosted,
  onCancel,
}: {
  target: CommentTarget;
  parentId?: number | null;
  reply?: boolean;
  onPosted: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("comments");
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = formRef.current
      ? (new FormData(formRef.current).get("cf-turnstile-response") as string | null)
      : null;
    startTransition(async () => {
      const res = await postComment({ target, body, parentId, turnstileToken: token });
      if (res.ok) {
        setBody("");
        onPosted();
      } else {
        setError(t(`errors.${res.error}` as never));
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={reply ? t("replyPlaceholder") : t("placeholder")}
        rows={reply ? 2 : 3}
        maxLength={2000}
        required
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm focus:border-[var(--brand)] focus:outline-none"
      />
      <Turnstile />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || body.trim().length < 2}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {pending ? t("posting") : t("post")}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  auth,
  onChange,
  onReply,
}: {
  comment: CommentView;
  auth: boolean;
  onChange: () => void;
  onReply?: () => void;
}) {
  const t = useTranslations("comments");
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likes, setLikes] = useState(comment.likeCount);
  const [reported, setReported] = useState(false);
  const [, startTransition] = useTransition();

  const name = comment.authorName?.trim() || "Skorly";
  const initial = name.charAt(0).toUpperCase();

  function like() {
    if (!auth) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    startTransition(async () => {
      const res = await likeComment(comment.id);
      if (!res.ok) {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
      } else {
        setLiked(res.liked);
      }
    });
  }

  function report() {
    setReported(true);
    startTransition(async () => {
      await flagComment(comment.id);
      onChange();
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2">
        {comment.authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comment.authorAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">
            {initial}
          </span>
        )}
        <span className="text-sm font-semibold">{name}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--muted)]">
        <button
          type="button"
          onClick={like}
          disabled={!auth}
          className={`hover:text-[var(--brand)] disabled:cursor-not-allowed ${liked ? "font-semibold text-[var(--brand)]" : ""}`}
        >
          ♥ {likes > 0 ? likes : ""} {t("like")}
        </button>
        {auth && onReply && (
          <button type="button" onClick={onReply} className="hover:text-[var(--brand)]">
            {t("reply")}
          </button>
        )}
        <button
          type="button"
          onClick={report}
          disabled={reported}
          className="ml-auto hover:text-red-500 disabled:opacity-60"
        >
          {reported ? t("reported") : t("report")}
        </button>
      </div>
    </div>
  );
}
