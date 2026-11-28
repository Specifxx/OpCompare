// The 3-day pass email's database and mail half (rules in lib/premium-gift-pass.ts). Script-side: scripts/premium-gift-pass.ts
// in GitHub Actions sends. Script-side only: nothing under src/app imports it (pages use lib/premium-gift-pass-access.ts).
import { prisma } from "./db";
import { getLastEmailError, isBrevoEnabled, isEmailEnabled, sendEmail, sendEmailBrevo } from "./email";
import { SITE_URL } from "./site";
import {
  GIFT_DEFAULT_BATCH,
  GIFT_MAX_BATCH,
  GIFT_PASS,
  buildGiftPassEmail,
  giftAudience,
  giftPassCounterKey,
  giftPassOpen,
  giftPassUntil,
  signOptOut,
  type GiftAudience,
} from "./premium-gift-pass";

export interface GiftRunResult {
  ok: boolean;
  error?: string;
  dryRun: boolean;
  open: boolean;
  sentBefore?: number;
  excluded?: GiftAudience["excluded"];
  pending?: number;
  sent?: number;
  failed?: number;
  remaining?: number;
  errors?: string[];
}

async function loadOptedOut(): Promise<Set<string>> {
  const [mutes, outs] = await Promise.all([
    prisma.alertMute.findMany({ select: { email: true } }),
    prisma.counter.findMany({ where: { key: { startsWith: `${GIFT_PASS.key}-optout:` } }, select: { key: true } }),
  ]);
  return new Set([...mutes.map((m) => m.email.trim().toLowerCase()), ...outs.map((o) => o.key.slice(GIFT_PASS.key.length + 8))]);
}

async function loadSent(): Promise<Set<string>> {
  const rows = await prisma.counter.findMany({ where: { key: { startsWith: `${GIFT_PASS.key}:` } }, select: { key: true } });
  return new Set(rows.map((r) => r.key.slice(GIFT_PASS.key.length + 1)));
}

async function grant(userId: string, now: number): Promise<{ until: number; revert: () => Promise<void> }> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true, premiumTier: true } });
  const current = u?.premiumUntil ? u.premiumUntil.getTime() : null;
  const hadActive = current !== null && current > now;
  const until = giftPassUntil(now, current);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { premiumUntil: new Date(until), ...(hadActive ? {} : { premiumTier: "premium" }) } }),
    prisma.counter.create({ data: { key: giftPassCounterKey(userId), value: Math.floor(until / 1000) } }),
  ]);
  return {
    until,
    revert: async () => {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { premiumUntil: u?.premiumUntil ?? null, ...(u?.premiumTier ? { premiumTier: u.premiumTier } : {}) } }),
        prisma.counter.deleteMany({ where: { key: giftPassCounterKey(userId) } }),
      ]);
    },
  };
}

export async function runGiftPassBatch(opts: { dryRun: boolean; limit?: number }): Promise<GiftRunResult> {
  const now = Date.now();
  const open = giftPassOpen(now);
  const limit = Math.min(opts.limit && opts.limit > 0 ? opts.limit : GIFT_DEFAULT_BATCH, GIFT_MAX_BATCH);
  const [rows, optedOut, sentIds] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20_000,
      select: { id: true, email: true, displayName: true, isAdmin: true, premiumUntil: true, emailVerified: true, googleId: true, welcomeEmailSentAt: true },
    }),
    loadOptedOut(),
    loadSent(),
  ]);
  const a = giftAudience(rows, { optedOut, sent: sentIds, now });
  const base = { ok: true, dryRun: opts.dryRun, open, sentBefore: a.sent, excluded: a.excluded, pending: a.pending.length };
  if (opts.dryRun) return { ...base, sent: 0, failed: 0, remaining: a.pending.length };
  if (!open) return { ...base, ok: false, error: "the 3-day pass closed on 1 Dec 2026, 12:00 UTC; nothing is sent" };
  const viaBrevo = isBrevoEnabled();
  if (!viaBrevo && !isEmailEnabled()) return { ...base, ok: false, error: "no mail key in this environment; nothing would send" };

  let sent = 0;
  let failed = 0;
  const errors = new Set<string>();
  for (const r of a.pending.slice(0, limit)) {
    const g = await grant(r.id, Date.now()).catch(() => null);
    if (!g) {
      failed++;
      if (errors.size < 5) errors.add("the pass could not be granted; nothing was emailed");
      continue;
    }
    const unsubUrl = `${SITE_URL}/api/premium-pass/unsubscribe?t=${encodeURIComponent(signOptOut(r.email))}`;
    const m = buildGiftPassEmail({ siteUrl: SITE_URL, displayName: r.displayName, until: g.until, unsubUrl });
    const extras = { text: m.text, headers: m.headers };
    const ok = await (viaBrevo ? sendEmailBrevo(r.email, m.subject, m.html, extras) : sendEmail(r.email, m.subject, m.html, extras)).catch(() => false);
    if (ok) sent++;
    else {
      failed++;
      await g.revert().catch(() => errors.add("a send failed and its pass could not be taken back"));
      if (errors.size < 5) errors.add(getLastEmailError() ?? "the mail provider returned false with no reason");
      if (/\b(401|402|403|429)\b|limit|quota|credits/i.test(getLastEmailError() ?? "")) break;
    }
    await new Promise((res) => setTimeout(res, 600));
  }
  return { ...base, sent, failed, remaining: a.pending.length - sent, ...(errors.size ? { errors: [...errors] } : {}) };
}

/**
 * The owner's Gmail route (2026-11-28: "send it manually … all these BCC emails", Gmail BCC from the Compare Empire
 * account): grant the pass to up to `limit` pending accounts and return their addresses and ONE copy of the email to send
 * by hand. Same audience, Counter row and window as the mailed batch, so nobody gets it twice. A BCC copy carries no
 * per-person opt-out token, so its unsubscribe link is a reply to the sending address.
 */
export async function grantGiftPassOnly(opts: { limit?: number; unsubUrl: string }): Promise<{ ok: boolean; error?: string; granted: number; failed: number; remaining: number; emails: string[]; subject?: string; html?: string }> {
  const now = Date.now();
  if (!giftPassOpen(now)) return { ok: false, error: "the 3-day pass closed on 1 Dec 2026, 12:00 UTC", granted: 0, failed: 0, remaining: 0, emails: [] };
  const limit = Math.min(opts.limit && opts.limit > 0 ? opts.limit : GIFT_DEFAULT_BATCH, 450);
  const [rows, optedOut, sentIds] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20_000,
      select: { id: true, email: true, displayName: true, isAdmin: true, premiumUntil: true, emailVerified: true, googleId: true, welcomeEmailSentAt: true },
    }),
    loadOptedOut(),
    loadSent(),
  ]);
  const a = giftAudience(rows, { optedOut, sent: sentIds, now });
  const emails: string[] = [];
  let failed = 0;
  for (const r of a.pending.slice(0, limit)) {
    const g = await grant(r.id, Date.now()).catch(() => null);
    if (g) emails.push(r.email.trim());
    else failed++;
  }
  const m = buildGiftPassEmail({ siteUrl: SITE_URL, displayName: "", until: now + GIFT_PASS.days * 86_400_000, unsubUrl: opts.unsubUrl });
  return { ok: true, granted: emails.length, failed, remaining: a.pending.length - emails.length, emails, subject: m.subject, html: m.html };
}
