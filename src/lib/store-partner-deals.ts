// STORE PARTNER DEALS (2026-10-26, owner: "execute on all the recommended items").
// DECISIONS.md, "Store partner codes" (the same program as RiftCompare's).
//
// Store links earned nothing: eBay and TCGplayer pay us, the stores we compare do
// not. A store joins by giving us either or both of:
//
//   1. An EXCLUSIVE discount code for OP Compare visitors, shown as a chip on
//      that store's rows ("5% off · code OPC5"). The store issued it, so it
//      works, and its discount report counts the orders we sent, even on phones.
//   2. A COMMISSION parameter its affiliate app reads (Shopify Collabs,
//      UpPromote, GoAffPro, Refersion…). affiliateUrl() adds it, and the row
//      becomes a "Paid link".
//
// THE HARD RULE: a deal never changes a store's place in any comparison. Rows
// stay sorted by item price; the code is a label beside the price, never a
// discount applied to it. Nothing that ranks reads this file
// (tests/store-partner-deals.test.ts).
//
// A code shows only while it was checked at the store's checkout in the last
// CODE_RECHECK_DAYS days, and never on or after `until`. The watchdog warns a
// week before a code hides itself.
//
// Pure data, no imports: client components (the price tables) read it.

export interface StorePartnerDeal {
  /** Bare hostname of the store, no www (matched against every outbound link). */
  host: string;
  /** Display name, for the store page and the ops check. */
  name: string;
  /** ISO date the partnership started. */
  since: string;
  /** The exclusive code, exactly as typed at checkout. */
  code?: string;
  /** What it gives, in the store's words, short: "5% off singles". */
  offer?: string;
  /** ISO date someone last confirmed the code at the store's checkout. */
  checked?: string;
  /** ISO date the code ends (exclusive), if the store set one. */
  until?: string;
  /** The commission parameter the store's affiliate app reads. */
  ref?: { param: string; value: string };
}

// Empty until the first store signs. Add an entry per store; see
// docs/store-partners.md for the steps.
export const STORE_PARTNER_DEALS: StorePartnerDeal[] = [];

export const CODE_RECHECK_DAYS = 30;
const DAY = 86_400_000;

function hostOf(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function dealForHost(host: string | null | undefined, deals: readonly StorePartnerDeal[] = STORE_PARTNER_DEALS): StorePartnerDeal | null {
  if (!host) return null;
  const h = host.replace(/^www\./i, "").toLowerCase();
  return deals.find((d) => d.host === h) ?? null;
}

export interface ActiveStoreCode {
  code: string;
  offer: string;
  checked: string;
  name: string;
}

/** The code to show beside a link to this store, or null. */
export function activeStoreCode(
  href: string | null | undefined,
  now: Date = new Date(),
  deals: readonly StorePartnerDeal[] = STORE_PARTNER_DEALS,
): ActiveStoreCode | null {
  const d = dealForHost(hostOf(href), deals);
  if (!d?.code || !d.checked) return null;
  const checked = Date.parse(d.checked);
  if (!Number.isFinite(checked) || now.getTime() - checked > CODE_RECHECK_DAYS * DAY) return null;
  if (d.until && now.getTime() >= Date.parse(d.until)) return null;
  return { code: d.code, offer: d.offer ?? "Discount", checked: d.checked, name: d.name };
}

/** The store's commission rewrite of an outbound URL, or null when it has none. */
export function partnerRefUrl(u: URL, deals: readonly StorePartnerDeal[] = STORE_PARTNER_DEALS): string | null {
  const d = dealForHost(u.hostname, deals);
  if (!d?.ref) return null;
  const out = new URL(u.toString());
  out.searchParams.set(d.ref.param, d.ref.value);
  return out.toString();
}

/** Codes that stop showing within `days` (for the ops monitor). */
export function codesNeedingRecheck(
  now: Date = new Date(),
  days = 7,
  deals: readonly StorePartnerDeal[] = STORE_PARTNER_DEALS,
): { name: string; host: string; hidesOn: string }[] {
  const out: { name: string; host: string; hidesOn: string }[] = [];
  for (const d of deals) {
    if (!d.code || !d.checked) continue;
    const hides = Math.min(
      Date.parse(d.checked) + CODE_RECHECK_DAYS * DAY,
      d.until ? Date.parse(d.until) : Infinity,
    );
    if (Number.isFinite(hides) && hides - now.getTime() <= days * DAY) {
      out.push({ name: d.name, host: d.host, hidesOn: new Date(hides).toISOString().slice(0, 10) });
    }
  }
  return out;
}
