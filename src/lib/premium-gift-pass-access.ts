// The 3-day pass's two request-time reads (lib/premium-gift-pass.ts, 2026-11-27): the opt-out route and the checkout fence.
// Per request, uncached, one Counter row or one select-limited User row; it never sends mail (that is premium-gift-pass-server.ts,
// script-side). Called only from /api routes.
import { prisma } from "./db";
import { giftOptOutKey, giftPassCounterKey, verifyOptOut } from "./premium-gift-pass";

/** The opt-out route: a signed address, stored as a Counter row. True when the link was genuine. */
export async function optOutOfGiftEmail(token: string | null): Promise<boolean> {
  const email = verifyOptOut(token);
  if (!email) return false;
  await prisma.counter.upsert({ where: { key: giftOptOutKey(email) }, create: { key: giftOptOutKey(email), value: Math.floor(Date.now() / 1000) }, update: {} });
  return true;
}

export function giftOptOutTokenValid(token: string | null): boolean {
  return verifyOptOut(token) !== null;
}

/** May an entitled account start checkout? Yes while the emailed pass is its ONLY Premium (premiumUntil no later than the pass's end). */
export async function giftPassMayCheckout(userId: string): Promise<boolean> {
  const gift = await prisma.counter.findUnique({ where: { key: giftPassCounterKey(userId) }, select: { value: true } }).catch(() => null);
  if (!gift || gift.value * 1000 <= Date.now()) return false;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true } }).catch(() => null);
  return !!u?.premiumUntil && u.premiumUntil.getTime() <= gift.value * 1000 + 60_000;
}
