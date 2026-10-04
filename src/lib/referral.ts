// Referral attribution (RiftCompare's lib/referral.ts, ported in wave 2,
// 2026-10-03). The share code is the referrer's own User.id: a link like
// opcompare.app/?ref=<userId> drops a cookie (components/ReferralCapture),
// read here when the referred visitor creates an account.
//
// THE REWARD IS OFF. RiftCompare grants the referrer REFERRAL_PREMIUM_DAYS of
// their own tier per friend. On OP Compare a grant is an ENTITLEMENT WRITE, and
// CLAUDE.md allows only the webhook, the daily reconcile and the admin
// grant/revoke routes to make one. So REFERRAL_PREMIUM_DAYS defaults to 0 and
// nothing is granted until the owner approves the program AND amends
// CLAUDE.md's writer list. When on, the grant is extend-only (grantedUntil,
// the admin grant's own rule) and logged like an admin grant.
//
// Server-only. Best-effort — it must never block or fail signup.
import { cookies } from "next/headers";
import { prisma } from "./db";
import { grantedUntil } from "./admin-billing";
import { isTier } from "./plans";
import { REFERRAL_COOKIE } from "./referral-cookie";

export { REFERRAL_COOKIE };

/** Days of the referrer's own tier per friend who joins. 0 (the default) = off. */
export function referralPremiumDays(env: Record<string, string | undefined> = process.env): number {
  const n = Math.floor(Number(env.REFERRAL_PREMIUM_DAYS ?? 0));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 31) : 0;
}

/** Pure: is this referral code worth a lookup? (cuid-shaped, not the new account itself). */
export function referralCandidate(code: string | null | undefined, newUserId: string): string | null {
  if (!code || !/^[a-z0-9]{6,40}$/i.test(code) || code === newUserId) return null;
  return code;
}

export async function applyReferral(newUserId: string): Promise<void> {
  try {
    const jar = cookies();
    const code = jar.get(REFERRAL_COOKIE)?.value;
    // Clear immediately so this browser can't credit a second account.
    if (code) jar.set(REFERRAL_COOKIE, "", { path: "/", maxAge: 0 });
    const referrerId = referralCandidate(code ? decodeURIComponent(code) : null, newUserId);
    const days = referralPremiumDays();
    if (!referrerId || days === 0) return;
    const referrer = await prisma.user.findUnique({ where: { id: referrerId }, select: { id: true, premiumUntil: true, premiumTier: true } });
    if (!referrer || referrer.id === newUserId) return;
    // Extend-only, at the referrer's own tier (a free referrer gets Plus).
    const until = grantedUntil(referrer.premiumUntil, days);
    const tier = referrer.premiumUntil && referrer.premiumUntil > new Date() && isTier(referrer.premiumTier) ? referrer.premiumTier : "plus";
    await prisma.user.update({ where: { id: referrer.id }, data: { premiumUntil: until, premiumTier: tier } });
    console.log("[referral]", "grant", JSON.stringify({ referrerId: referrer.id, newUserId, days, tier, until: until.toISOString() }));
  } catch {
    // Referral is a bonus, never a gate — swallow everything.
  }
}
