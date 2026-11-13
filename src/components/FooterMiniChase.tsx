"use client";

import { InlineAds } from "./InlineAds";

// Pages that carry the in-page ad block themselves, the articles (/blog, /guides: no new block there) and pages that are not for
// shopping (accounts, admin, sign-in). Every other page gets the one block above the footer's text ads (owner, 2026-11-13: one
// horizontal native block, replacing the side rails and the small pair).
const OWN = [/^\/$/, /^\/(au|uk|ca|eu|sg)\/?$/, /^\/(sealed|sets|price-guide|movers|market|browse)(\/.*)?$/, /^\/card\//, /^\/blog(\/|$)/, /^\/guides(\/|$)/];
const NOT_SHOPPING = /^\/(account|admin|login|dashboard|profile|portfolio|watching|watchlist|unsubscribe|alerts|c|premium|support|feedback)(\/|$)/;

export function footerMiniAllowed(pathname: string): boolean {
  return !OWN.some((r) => r.test(pathname)) && !NOT_SHOPPING.test(pathname);
}

export function FooterMiniChase({ pathname }: { pathname: string }) {
  if (!footerMiniAllowed(pathname)) return null;
  return <InlineAds page={`footer${pathname.split("/").slice(0, 2).join("-") || ""}`} className="w-full" />;
}
