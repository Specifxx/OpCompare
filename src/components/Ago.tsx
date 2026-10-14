"use client";

import { useEffect, useState } from "react";
import { ago } from "@/lib/format";

// "3h ago" that stays true on a cached page. The server (and the first client
// render, so hydration matches) counts from `now`, the moment the page was
// rendered; after mount it counts from the visitor's clock. An ISR page can be
// hours old when it is served, and "updated 2h ago" frozen into it would be
// wrong for the rest of its life.
export function Ago({ at, now }: { at: string; now: number }) {
  const [t, setT] = useState(now);
  useEffect(() => setT(Date.now()), []);
  return <>{ago(at, t)}</>;
}
