"use client";

import { useEffect, useState } from "react";
import { activeStoreCode } from "@/lib/store-partner-deals";

// A store partner's exclusive discount code, beside that store's price
// (DECISIONS.md, "Store partner codes", 2026-10-26). A LABEL, never a discount
// applied to the price or a reason to re-rank. Renders nothing for a store
// without a live, recently checked code. Decided after mount: whether a code is
// live depends on today's date, and the pages around it are cached for hours.
export function StoreCodeChip({ href, className }: { href: string | null | undefined; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const c = mounted ? activeStoreCode(href) : null;
  if (!c) return null;
  const checked = new Date(c.checked).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(c.code).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }}
      className={`rounded border border-dashed border-amber-400/50 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-400/20 ${className ?? ""}`}
      title={`Exclusive ${c.name} code for OP Compare visitors: ${c.offer}. Checked at the store's checkout on ${checked}. The price shown is before the code. Tap to copy.`}
    >
      {copied ? "Copied ✓" : `${c.offer} · code ${c.code}`}
    </button>
  );
}
