"use client";

import { useEffect, useState } from "react";
import type { ChaseTile } from "@/lib/listing-panel";
import { MiniChaseAds } from "./MiniChaseAds";

// Pages that already carry the full chase strips (EbayChase), and pages that
// are not for shopping (accounts, admin, sign-in). Everywhere else gets the
// small pair above the footer's text ads (owner, 2026-10-29).
const OWN = [/^\/$/, /^\/(au|uk|ca|eu|sg)\/?$/, /^\/(sealed|sets|price-guide|movers|market)\/?$/, /^\/card\//, /^\/blog\/./, /^\/guides\/./];
const NOT_SHOPPING = /^\/(account|admin|login|dashboard|profile|portfolio|watching|watchlist|unsubscribe|alerts|c|premium|support|feedback)(\/|$)/;

export function footerMiniAllowed(pathname: string): boolean {
  return !OWN.some((r) => r.test(pathname)) && !NOT_SHOPPING.test(pathname);
}

export function FooterMiniChase({ pathname }: { pathname: string }) {
  const allowed = footerMiniAllowed(pathname);
  const [tiles, setTiles] = useState<ChaseTile[]>([]);
  useEffect(() => {
    if (!allowed || tiles.length) return;
    let live = true;
    fetch("/api/chase")
      .then((r) => (r.ok ? r.json() : []))
      .then((t: ChaseTile[]) => live && Array.isArray(t) && setTiles(t))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [allowed, tiles.length]);
  if (!allowed || !tiles.length) return null;
  return <MiniChaseAds tiles={tiles} page={`footer${pathname.split("/").slice(0, 2).join("-") || ""}`} className="w-full max-w-3xl" />;
}
