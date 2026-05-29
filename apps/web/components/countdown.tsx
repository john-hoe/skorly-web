"use client";

import { useEffect, useState } from "react";

const KICKOFF = new Date("2026-06-11T19:00:00Z").getTime();

function diff() {
  const ms = Math.max(0, KICKOFF - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s };
}

export function Countdown({ label }: { label: string }) {
  const [t, setT] = useState(diff());
  useEffect(() => {
    const id = setInterval(() => setT(diff()), 1000);
    return () => clearInterval(id);
  }, []);

  const cells: [number, string][] = [
    [t.d, "Hari"],
    [t.h, "Jam"],
    [t.m, "Menit"],
    [t.s, "Detik"],
  ];

  if (KICKOFF - Date.now() <= 0) return null;

  return (
    <div className="text-center">
      <p className="text-sm uppercase tracking-wide text-white/80">{label}</p>
      <div className="mt-2 flex justify-center gap-3">
        {cells.map(([v, l]) => (
          <div key={l} className="min-w-14 rounded-lg bg-white/15 px-3 py-2 backdrop-blur">
            <div className="text-2xl font-bold tabular-nums text-white">
              {String(v).padStart(2, "0")}
            </div>
            <div className="text-[10px] uppercase text-white/70">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
