import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-medium text-white">
      {children}
    </span>
  );
}
