// Google AdSense, OPTIONAL (RiftCompare's lib/adsense.ts without its build-halting
// assertion). OP Compare has no AdSense account: everything here is derived from
// ONE env var, NEXT_PUBLIC_ADSENSE_CLIENT_ID, and with it unset or malformed the
// site simply runs its first-party house promos. It NEVER throws, in production
// or anywhere else; approving AdSense for opcompare.app is the owner's call.
//
// The id is public by design (it ships in the page HTML), but it is written only
// in env files, never as a literal in src/. NEXT_PUBLIC_ is inlined at build
// time, so the value reads the same on the server, in route handlers and in
// client components (ads.txt and the ad units must agree byte for byte).

/** AdSense client ids are "ca-pub-" plus exactly 16 digits. */
export const ADSENSE_CLIENT_ID_PATTERN = /^ca-pub-\d{16}$/;

/** A valid publisher id from a raw env value, else null. */
export function parseAdsenseClientId(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim();
  return ADSENSE_CLIENT_ID_PATTERN.test(v) ? v : null;
}

// A static member expression, so Next's build-time inliner can substitute it.
const CLIENT_ID = parseAdsenseClientId(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);

export const ADSENSE_CLIENT_ID: string | null = CLIENT_ID;
export const ADSENSE_CONFIGURED = CLIENT_ID != null;
/** An AdSense display unit id: digits only (the console's data-ad-slot), or nothing. */
export function parseAdUnitId(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim();
  return /^\d{6,12}$/.test(v) ? v : null;
}

// Guides and explainers only (owner, 2026-11-19; DECISIONS.md "Display ads on guides
// and explainers only"). A real unit fills ONLY the article slot (ArticleView: /guides/*
// and /blog/*), and only when BOTH the publisher id and the guide unit's id are set.
// Every other slot (card, price guide, movers, market) is a house promo whatever is set:
// no display ad ever sits on a page people buy from, an account page or Premium.
// Kill switch: unset NEXT_PUBLIC_ADSENSE_GUIDE_SLOT in Vercel; the next release is ad-free.
export const GUIDE_AD_UNIT_ID: string | null = parseAdUnitId(process.env.NEXT_PUBLIC_ADSENSE_GUIDE_SLOT);
export const GUIDE_AD_SLOTS: readonly string[] = ["article"];

/** Whether a slot may hold a real AdSense unit in this build. */
export function realUnitFor(slot: string, clientId: string | null = CLIENT_ID, unitId: string | null = GUIDE_AD_UNIT_ID): string | null {
  if (!clientId || !unitId) return null;
  return GUIDE_AD_SLOTS.includes(slot) ? unitId : null;
}

/** True when any slot can hold a real unit (the guide unit is configured). */
export const AD_UNITS_ENABLED = CLIENT_ID != null && GUIDE_AD_UNIT_ID != null;

/** The ads.txt body for a publisher id (Google's seller line), or null without one. */
export function adsTxtBody(clientId: string | null): string | null {
  if (!clientId) return null;
  return `google.com, ${clientId.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
}

/** The pagead loader script URL for a publisher id. */
export function adsenseLoaderSrc(clientId: string): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
}
