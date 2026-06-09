import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeData = vi.hoisted(() => ({
  getRuntimeAdminCommentModerationItems: vi.fn(),
}));

vi.mock("next/link", async () => {
  const react = await vi.importActual<typeof import("react")>("react");
  return {
    default: function MockLink({
      children,
      href,
      ...props
    }: {
      children: React.ReactNode;
      href: string;
      [key: string]: unknown;
    }) {
      return react.createElement("a", { href, ...props }, children);
    },
  };
});

vi.mock("@/lib/admin-actions", () => ({
  reviewAdminCommentReports: vi.fn(),
  setAdminCommentHidden: vi.fn(),
}));

vi.mock("@/lib/runtime-data", () => ({
  getRuntimeAdminCommentModerationItems: runtimeData.getRuntimeAdminCommentModerationItems,
}));

const { default: AdminCommentsPage } = await import("./page");

function textContent(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(" ");
  if (React.isValidElement(node)) {
    if (typeof node.type === "function") {
      const Component = node.type as (props: unknown) => React.ReactNode;
      return textContent(Component(node.props));
    }
    return textContent((node.props as { children?: unknown }).children);
  }
  return "";
}

describe("AdminCommentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an explicit failure state instead of an empty queue when loading fails", async () => {
    runtimeData.getRuntimeAdminCommentModerationItems.mockRejectedValue(
      new Error("column comment_reports.reviewed_at does not exist"),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const element = await AdminCommentsPage({ searchParams: Promise.resolve({}) });
    const text = textContent(element);

    expect(text).toContain("Moderation queue unavailable");
    expect(text).toContain("Unable to load reported comments right now");
    expect(text).not.toContain("No comments to review");
    expect(warn).toHaveBeenCalledWith(
      "[admin] comment moderation query failed",
      expect.any(Error),
    );

    warn.mockRestore();
  });
});
