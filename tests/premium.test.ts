// Accounts, Stripe entitlement and the paid tiers (ported from RiftCompare's
// premium-entitlement / premium-tiers / checkout-params / oauth-next tests).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { planBuyList } from "../src/lib/buy-list";
import { checkoutParams } from "../src/lib/checkout-params";
import { sanitizeNextPath } from "../src/lib/next-param";
import { normaliseProfile } from "../src/lib/oauth";
import { dealAccess, lookupKey, PLAN_CENTS } from "../src/lib/plans";
import { isPremium, tierOf } from "../src/lib/premium";
import {
  entitledUntilFromSubscription,
  extendedPremiumUntil,
  isOurSubscription,
  periodEndFromSubscription,
  subscriptionIdFromInvoice,
  tierOfSubscription,
} from "../src/lib/stripe-entitlement";

const T = 1_900_000_000; // epoch seconds
const price = (tier: string, site = "opcompare") => ({ id: "price_1", metadata: { site, tier } });

test("invoices name their subscription in both payload generations", () => {
  assert.equal(subscriptionIdFromInvoice({ subscription: "sub_old" }), "sub_old");
  assert.equal(subscriptionIdFromInvoice({ subscription: { id: "sub_obj" } }), "sub_obj");
  assert.equal(subscriptionIdFromInvoice({ parent: { subscription_details: { subscription: "sub_basil" } } }), "sub_basil");
  assert.equal(subscriptionIdFromInvoice({ lines: { data: [{ parent: { subscription_item_details: { subscription: "sub_line" } } }] } }), "sub_line");
  assert.equal(subscriptionIdFromInvoice({ lines: { data: [] } }), null);
});

test("the period end is read from the subscription or its items", () => {
  assert.equal(periodEndFromSubscription({ current_period_end: T })?.getTime(), T * 1000);
  assert.equal(periodEndFromSubscription({ items: { data: [{ current_period_end: T - 10 }, { current_period_end: T }] } })?.getTime(), T * 1000);
  assert.equal(periodEndFromSubscription({}), null);
});

test("only active and trialing subscriptions earn time; past_due never does", () => {
  const sub = (status: string) => ({ status, items: { data: [{ current_period_end: T, price: price("plus") }] } });
  assert.ok(entitledUntilFromSubscription(sub("active")));
  assert.ok(entitledUntilFromSubscription(sub("trialing")));
  for (const s of ["past_due", "canceled", "unpaid", "incomplete", "incomplete_expired"]) assert.equal(entitledUntilFromSubscription(sub(s)), null, s);
});

test("stamping is extend-only", () => {
  const later = new Date(T * 1000);
  const earlier = new Date(T * 1000 - 86400000);
  assert.equal(extendedPremiumUntil(null, later), later);
  assert.equal(extendedPremiumUntil(earlier, later), later);
  assert.equal(extendedPremiumUntil(later, earlier), null);
  assert.equal(extendedPremiumUntil(later, later), null);
  assert.equal(extendedPremiumUntil(earlier, null), null);
});

test("only OP Compare's subscriptions count, and the live Price names the tier", () => {
  assert.equal(isOurSubscription({ items: { data: [{ price: price("plus") }] } }), true);
  assert.equal(isOurSubscription({ metadata: { site: "opcompare" }, items: { data: [{ price: "price_x" }] } }), true);
  // RiftCompare's (or anything else's) subscription in the same account: ignored.
  assert.equal(isOurSubscription({ metadata: { userId: "u1", kind: "premium" }, items: { data: [{ price: { id: "p", metadata: {} } }] } }), false);
  assert.equal(tierOfSubscription({ items: { data: [{ price: price("plus") }] }, metadata: { tier: "premium" } }), "plus");
  assert.equal(tierOfSubscription({ items: { data: [{ price: "price_x" }] }, metadata: { tier: "plus" } }), "plus");
  assert.equal(tierOfSubscription({}), "premium");
});

test("tiers: admins are Premium, an expired date is nothing, Plus is below Premium", () => {
  const now = T * 1000;
  const future = new Date(now + 86400000);
  assert.equal(tierOf({ isAdmin: true, premiumUntil: null, premiumTier: "plus" }, now), "premium");
  assert.equal(tierOf({ isAdmin: false, premiumUntil: new Date(now - 1), premiumTier: "premium" }, now), null);
  assert.equal(isPremium({ isAdmin: false, premiumUntil: future, premiumTier: "plus" }, "plus", now), true);
  assert.equal(isPremium({ isAdmin: false, premiumUntil: future, premiumTier: "plus" }, "premium", now), false);
  assert.equal(isPremium({ isAdmin: false, premiumUntil: future, premiumTier: "premium" }, "premium", now), true);
  assert.equal(isPremium(null), false);
});

test("Deal Finder: nothing signed out, three rows free, everything with a plan", () => {
  assert.equal(dealAccess(false, null), "none");
  assert.equal(dealAccess(true, null), "top3");
  assert.equal(dealAccess(true, "plus"), "full");
  assert.equal(dealAccess(true, "premium"), "full");
});

test("?next= stays on this site and off the API", () => {
  for (const ok of ["/premium?go=plus-year", "/card/luffy-op01-024", "/account"]) assert.equal(sanitizeNextPath(ok), ok);
  for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "/api/me", "", null, "premium"]) assert.equal(sanitizeNextPath(bad as string), null, String(bad));
});

test("only a provider-verified email is trusted", () => {
  assert.equal(normaliseProfile("google", { sub: "1", email: "A@B.com", email_verified: "true" }).emailVerified, true);
  assert.equal(normaliseProfile("google", { sub: "1", email: "a@b.com" }).emailVerified, false);
  assert.equal(normaliseProfile("google", { sub: "1", email: "A@B.com" }).email, "a@b.com");
  assert.equal(normaliseProfile("discord", { id: "9", email: "x@y.z", verified: false }).emailVerified, false);
  assert.equal(normaliseProfile("discord", { id: "9", avatar: "abc" }).avatar, "https://cdn.discordapp.com/avatars/9/abc.png");
});

test("the checkout session carries the site, the user and the tier", () => {
  const base = { priceId: "price_p", tier: "plus" as const, interval: "year" as const, siteUrl: "https://opcompare.app" };
  const a = checkoutParams({ ...base, user: { id: "u1", email: "a@b.c", stripeCustomerId: null } });
  assert.equal(a.mode, "subscription");
  assert.deepEqual(a.line_items, [{ price: "price_p", quantity: 1 }]);
  assert.equal((a as { customer_email?: string }).customer_email, "a@b.c");
  assert.equal(a.client_reference_id, "u1");
  assert.deepEqual(a.subscription_data.metadata, { site: "opcompare", kind: "oc_premium", userId: "u1", tier: "plus", interval: "year" });
  assert.equal(a.success_url, "https://opcompare.app/premium/welcome?session_id={CHECKOUT_SESSION_ID}");
  const b = checkoutParams({ ...base, user: { id: "u1", email: "a@b.c", stripeCustomerId: "cus_1" } });
  assert.equal((b as { customer?: string }).customer, "cus_1");
  assert.equal((b as { customer_email?: string }).customer_email, undefined);
});

test("prices: RiftCompare's, and each tier × interval has its own lookup key", () => {
  assert.deepEqual(PLAN_CENTS, { plus: { month: 299, year: 2399 }, premium: { month: 499, year: 3999 } });
  assert.equal(new Set(["plus", "premium"].flatMap((t) => ["month", "year"].map((i) => lookupKey(t as "plus", i as "month")))).size, 4);
});

test("the Buy List Planner: cheapest split and best single store", () => {
  const plan = planBuyList([
    { slug: "a", name: "A", offers: [{ source: "store:x", priceCents: 100, url: "u", inStock: true }, { source: "store:y", priceCents: 120, url: "u", inStock: true }] },
    { slug: "b", name: "B", offers: [{ source: "store:y", priceCents: 200, url: "u", inStock: true }, { source: "store:x", priceCents: 50, url: "u", inStock: false }] },
    { slug: "c", name: "C", offers: [{ source: "store:z", priceCents: 10, url: "u", inStock: false }] },
  ]);
  assert.equal(plan.splitTotalCents, 300);
  assert.deepEqual(plan.split.map((b) => [b.source, b.totalCents]), [["store:y", 200], ["store:x", 100]]);
  assert.equal(plan.single[0].source, "store:y"); // stocks both A and B
  assert.equal(plan.single[0].totalCents, 320);
  assert.deepEqual(plan.single[1].missing, ["B"]);
  assert.deepEqual(plan.unavailable, ["C"]);
});

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");

test("the session is never read by the layout, and gated rows are cut in the query", () => {
  assert.doesNotMatch(read("src/app/layout.tsx"), /getCurrentUser|@\/lib\/auth/);
  const deal = read("src/app/tools/deal-finder/page.tsx");
  assert.match(deal, /access === "none" \? null : await getCatalog\(\)/);
  assert.match(deal, /access === "full" \? FULL_ROWS : FREE_DEAL_ROWS/);
  assert.match(read("src/app/api/buy-list/route.ts"), /isPremium\(user, "premium"\)/);
});
