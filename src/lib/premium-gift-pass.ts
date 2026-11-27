// THE 3-DAY PREMIUM PASS EMAIL, OP Compare's copy (owner, 2026-11-27: "send like batches separately per website to all of
// these registered users who aren't premium … really clearly outline the features for premium, and then give them like a
// 3-day pass"). RiftCompare sends it for the shared-Premium sites (its lib/premium-gift-pass.ts); OP Compare has its own
// accounts and Stripe, so it sends its own, script-side from GitHub Actions like every OP email. DECISIONS.md 2026-11-27.
//
// The email IS the pass: just before each send the account gets 3 days of Premium (premiumUntil, extend-only, no card) and a
// Counter row gp3:<id>; a refused send is put back as it was. Hard constants, not env: sends stop 1 Dec 2026 12:00 UTC.
//
// Pure: no database here (lib/premium-gift-pass-server.ts sends and grants).
import { createHmac, timingSafeEqual } from "node:crypto";
import { MAILING_ADDRESS } from "./mailing-address";
import { SITE_NAME } from "./site";

export const GIFT_PASS = {
  key: "gp3",
  campaign: "premium-pass-3day-2026-11",
  days: 3,
  sendUntil: Date.UTC(2026, 11, 1, 12),
  /** An account emailed by us in the last 72 hours is left for a later batch. */
  quietHours: 72,
} as const;

/** OP mail shares its provider's daily allowance with price alerts: a batch never takes most of it. */
export const GIFT_DEFAULT_BATCH = 60;
export const GIFT_MAX_BATCH = 90;

export function giftPassOpen(now: number = Date.now()): boolean {
  return now < GIFT_PASS.sendUntil;
}
export function giftPassCounterKey(userId: string): string {
  return `${GIFT_PASS.key}:${userId}`;
}
/** The Counter row that records an address's opt-out from OP Compare news (no address leaves the database). */
export function giftOptOutKey(email: string): string {
  return `${GIFT_PASS.key}-optout:${email.trim().toLowerCase()}`;
}
export function giftPassUntil(from: number, currentUntil: number | null): number {
  const end = from + GIFT_PASS.days * 86_400_000;
  return currentUntil !== null && currentUntil > end ? currentUntil : end;
}

// ── The opt-out link: the address, signed (EMAIL_LINK_SECRET, its own label), so no token table is needed ────────────

const LABEL = "op-compare/gift-pass-optout/v1";
function key(env: Record<string, string | undefined> = process.env): Buffer {
  const secret = env.EMAIL_LINK_SECRET ?? "";
  if (secret.length < 32) throw new Error("EMAIL_LINK_SECRET is not set (32+ characters): the opt-out link cannot be signed");
  return createHmac("sha256", Buffer.from(secret)).update(LABEL).digest();
}
export function signOptOut(email: string, env?: Record<string, string | undefined>): string {
  const e = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${e}.${createHmac("sha256", key(env)).update(e).digest("base64url")}`;
}
export function verifyOptOut(token: string | null | undefined, env?: Record<string, string | undefined>): string | null {
  if (typeof token !== "string" || token.length > 600) return null;
  const [e, sig] = token.split(".");
  if (!e || !sig) return null;
  let want: Buffer;
  try {
    want = createHmac("sha256", key(env)).update(e).digest();
  } catch {
    return null;
  }
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  const email = Buffer.from(e, "base64url").toString("utf8");
  return email.includes("@") && email.length <= 254 ? email : null;
}

// ── Who gets one ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface GiftUserRow {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  premiumUntil: Date | null;
  emailVerified: Date | null;
  googleId: string | null;
  welcomeEmailSentAt: Date | null;
}

export interface GiftAudience {
  sent: number;
  excluded: { paying: number; admins: number; unverified: number; optedOut: number; recent: number };
  pending: { id: string; email: string; displayName: string; currentUntil: number | null }[];
}

/** Newest first (the rows arrive that way). Never paying, admins, unverified addresses, opted out (OP news or alert email), or twice. */
export function giftAudience(rows: GiftUserRow[], opts: { optedOut: Set<string>; sent: Set<string>; now?: number }): GiftAudience {
  const now = opts.now ?? Date.now();
  const ex = { paying: 0, admins: 0, unverified: 0, optedOut: 0, recent: 0 };
  let sent = 0;
  const pending: GiftAudience["pending"] = [];
  const seen = new Set<string>();
  for (const u of rows) {
    const k = u.email.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (u.isAdmin) {
      ex.admins++;
      continue;
    }
    if (opts.sent.has(u.id)) {
      sent++;
      continue;
    }
    if (u.premiumUntil && u.premiumUntil.getTime() > now) {
      ex.paying++;
      continue;
    }
    if (!u.emailVerified && !u.googleId) {
      ex.unverified++;
      continue;
    }
    if (opts.optedOut.has(k)) {
      ex.optedOut++;
      continue;
    }
    if (u.welcomeEmailSentAt && now - u.welcomeEmailSentAt.getTime() < GIFT_PASS.quietHours * 3_600_000) {
      ex.recent++;
      continue;
    }
    pending.push({ id: u.id, email: u.email, displayName: u.displayName, currentUntil: u.premiumUntil ? u.premiumUntil.getTime() : null });
  }
  return { sent, excluded: ex, pending };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── The email ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** OP Compare Premium, as /premium's tier table states it (lib/plans.ts TIER_COMPARISON, premium column). */
export const GIFT_FEATURES: { title: string; line: string; path: string }[] = [
  { title: "Every deal in Deal Finder", line: "Cards selling below TCGplayer market right now, the full list, including only your cards.", path: "/tools/deal-finder" },
  { title: "Best Basket", line: "The cheapest store-by-store plan for a deck or your watchlist, postage included.", path: "/tools/best-basket" },
  { title: "Unlimited target-price alerts and sealed watches", line: "An email when a card hits your price, or sealed is back in stock.", path: "/watching" },
  { title: "Deck price watch", line: "An alert when a deck's delivered total drops.", path: "/watching" },
  { title: "Full Rising Cards and Demand Finder", line: "The cards players search for and open most, before the price moves.", path: "/tools/rising" },
  { title: "No ads, no limits", line: "No ads on any page, and no watchlist or portfolio limit.", path: "/" },
];

const COLOR = "#d62828";

export function giftEndDay(until: number): string {
  return new Date(until).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).replace(/^(\w+), (\w+) (\d+)$/, "$1 $3 $2");
}

export function buildGiftPassEmail(o: { siteUrl: string; displayName: string; until: number; unsubUrl: string }): { subject: string; html: string; text: string; headers: Record<string, string> } {
  const link = (path: string, content: string) => {
    const u = new URL(path, o.siteUrl);
    u.searchParams.set("utm_source", "email");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", GIFT_PASS.campaign);
    u.searchParams.set("utm_content", content);
    return u.toString();
  };
  const first = o.displayName.includes("@") ? "" : (o.displayName.trim().split(/\s+/)[0] ?? "");
  const hi = first ? `Hi ${first},` : "Hi there,";
  const endDay = giftEndDay(o.until);
  const signIn = link("/login", "sign-in");
  const keep = link("/premium", "keep");
  const subject = `Your 3-day ${SITE_NAME} Premium pass is on`;
  const rows = GIFT_FEATURES.map(
    (f) => `<tr><td style="padding:10px 0;border-top:1px solid #eef0f3;vertical-align:top" width="26"><div style="width:18px;height:18px;border-radius:9px;background:${COLOR};color:#fff;font-size:12px;line-height:18px;text-align:center;font-weight:700">&#10003;</div></td>
      <td style="padding:10px 0;border-top:1px solid #eef0f3"><a href="${escapeHtml(link(f.path, "feature"))}" style="font-size:15px;font-weight:700;color:#111827;text-decoration:none">${escapeHtml(f.title)}</a>
      <div style="font-size:13px;line-height:1.5;color:#4b5563;margin-top:2px">${escapeHtml(f.line)}</div></td></tr>`,
  ).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">Free until ${escapeHtml(endDay)}. No card, nothing to cancel.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 8px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:540px;background:#ffffff;border:1px solid #e3e6ea;border-radius:14px">
      <tr><td style="padding:24px 28px 0;font-size:20px;font-weight:800;color:${COLOR}">${escapeHtml(SITE_NAME)}</td></tr>
      <tr><td style="padding:18px 28px 0"><div style="display:inline-block;background:${COLOR};color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px">3-day Premium pass</div>
        <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;color:#111827">Premium is on, free, until ${escapeHtml(endDay)}</h1></td></tr>
      <tr><td style="padding:12px 28px 0;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(hi)} thanks for being part of ${escapeHtml(SITE_NAME)}. We've switched on every Premium feature on your account for the next 3 days, just in time for the Black Friday sales. There's no card to add and nothing to cancel: on ${escapeHtml(endDay)} it simply stops.</td></tr>
      <tr><td style="padding:20px 28px 4px"><a href="${escapeHtml(signIn)}" style="display:inline-block;background:${COLOR};color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:9px">Sign in and use your pass</a>
        <div style="margin-top:8px;font-size:12px;color:#6b7280">Sign in with this email address and Premium is already there.</div></td></tr>
      <tr><td style="padding:22px 28px 0"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">What your pass unlocks</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${rows}</table></td></tr>
      <tr><td style="padding:18px 28px 0"><div style="background:#f9fafb;border:1px solid #eef0f3;border-radius:10px;padding:14px 16px;font-size:13px;line-height:1.6;color:#374151"><strong style="color:#111827">Want to keep it?</strong> Premium is US$4.99 a month, or US$39.99 a year (US$3.33 a month). <a href="${escapeHtml(keep)}" style="color:${COLOR};font-weight:700">See the plans</a>. If you'd rather not, do nothing: your free account stays exactly as it was.</div></td></tr>
      <tr><td style="padding:20px 28px 22px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280">You're getting this because you have a ${escapeHtml(SITE_NAME)} account. It's a one-off: we won't email you about this pass again. <a href="${escapeHtml(o.unsubUrl)}" style="color:#4b5563">Unsubscribe from ${escapeHtml(SITE_NAME)} news</a><br/>${escapeHtml(SITE_NAME)} · ${escapeHtml(MAILING_ADDRESS)}</td></tr>
    </table></td></tr></table></body></html>`;
  const text = [
    `${SITE_NAME}: your 3-day Premium pass is on`,
    "",
    hi,
    `Thanks for being part of ${SITE_NAME}. Every Premium feature is on for your account, free, until ${endDay}. No card to add and nothing to cancel: on ${endDay} it simply stops.`,
    "",
    `Sign in with this email address and use it: ${signIn}`,
    "",
    "What your pass unlocks:",
    ...GIFT_FEATURES.map((f) => `- ${f.title}: ${f.line}`),
    "",
    `Want to keep it? Premium is US$4.99 a month, or US$39.99 a year (US$3.33 a month): ${keep}`,
    "If you'd rather not, do nothing: your free account stays exactly as it was.",
    "",
    `Unsubscribe from ${SITE_NAME} news: ${o.unsubUrl}`,
    `${SITE_NAME} · ${MAILING_ADDRESS}`,
  ].join("\n");
  return { subject, html, text, headers: { "List-Unsubscribe": `<${o.unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}
