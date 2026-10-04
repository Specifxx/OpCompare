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
// CLAUDE.md. When on, the write is admin-billing's grantReferralDays (the
// entitlement writer stays in that one file), extend-only and logged.
//
// Server-only. Best-effort — it must never block or fail signup.
import { cookies } from "next/headers";
import { grantReferralDays } from "./admin-billing";
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
    // The write itself is admin-billing's (extend-only, the one entitlement
    // writer beside the webhook and the reconcile).
    const granted = await grantReferralDays(referrerId, days);
    if (granted) console.log("[referral]", "grant", JSON.stringify({ referrerId, newUserId, days, tier: granted.tier, until: granted.until.toISOString() }));
  } catch {
    // Referral is a bonus, never a gate — swallow everything.
  }
}
