"use client";

import { FooterMiniChase } from "./FooterMiniChase";
import { usePathname } from "next/navigation";

// The footer ad zone: only the one InlineAds block, where a page does not carry it itself.
// Not shown on the policy pages, nor to Plus and Premium members (data-ad-placement, lib/ad-free.ts).
const BANNER_FREE = ["/about", "/authors", "/contact", "/editorial-policy", "/methodology", "/privacy", "/terms"];

export function EbayWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-sans text-xl font-bold tracking-tight ${className}`} aria-label="eBay">
      <span className="text-[#e53238]">e</span>
      <span className="text-[#0064d2]">b</span>
      <span className="text-[#f5af02]">a</span>
      <span className="text-[#86b817]">y</span>
    </span>
  );
}

// The old footer leaderboards (an eBay box and a TCGplayer box, AdBox) are gone (owner,
// 2026-11-13: one subtle block per page). What stays is the zone that places the ONE
// InlineAds block on pages that do not mount it themselves (FooterMiniChase), and the
// policy-page exclusion.
export function FooterAds() {
  const pathname = usePathname() ?? "/";
  if (BANNER_FREE.some((r) => pathname === r || pathname.startsWith(`${r}/`))) return null;
  return (
    <div className="container-app flex flex-col items-center gap-3 pb-6 pt-10" data-ad-placement="footer">
      <FooterMiniChase pathname={pathname} />
    </div>
  );
}
