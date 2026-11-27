import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GIFT_FEATURES, GIFT_PASS, buildGiftPassEmail, giftAudience, giftPassOpen, giftPassUntil, signOptOut, verifyOptOut, type GiftUserRow } from "../src/lib/premium-gift-pass";

// The 3-day Premium pass email (owner, 2026-11-27; DECISIONS.md).
const NOW = Date.UTC(2026, 10, 28, 9);
const ENV = { EMAIL_LINK_SECRET: "x".repeat(40) };
const row = (o: Partial<GiftUserRow> & { id: string }): GiftUserRow => ({
  email: `${o.id}@example.com`, displayName: "Sam", isAdmin: false, premiumUntil: null, emailVerified: new Date(NOW - 1e7), googleId: null, welcomeEmailSentAt: null, ...o,
});

test("sends close by themselves on 1 Dec 2026 12:00 UTC; the pass is 3 days, extend-only", () => {
  assert.equal(new Date(GIFT_PASS.sendUntil).toISOString(), "2026-12-01T12:00:00.000Z");
  assert.equal(giftPassOpen(NOW), true);
  assert.equal(giftPassOpen(GIFT_PASS.sendUntil), false);
  assert.equal(giftPassUntil(NOW, null), NOW + 3 * 86_400_000);
  assert.equal(giftPassUntil(NOW, NOW + 9e9), NOW + 9e9);
});

test("never paying, admins, unverified, opted out, recently emailed or twice", () => {
  const a = giftAudience(
    [
      row({ id: "ok" }),
      row({ id: "pay", premiumUntil: new Date(NOW + 1000) }),
      row({ id: "adm", isAdmin: true }),
      row({ id: "unv", emailVerified: null }),
      row({ id: "goog", emailVerified: null, googleId: "g" }),
      row({ id: "out" }),
      row({ id: "new", welcomeEmailSentAt: new Date(NOW - 3_600_000) }),
      row({ id: "done", premiumUntil: new Date(NOW + 1000) }),
    ],
    { optedOut: new Set(["out@example.com"]), sent: new Set(["done"]), now: NOW },
  );
  assert.deepEqual(a.pending.map((p) => p.id), ["ok", "goog"]);
  assert.equal(a.sent, 1);
  assert.deepEqual(a.excluded, { paying: 1, admins: 1, unverified: 1, optedOut: 1, recent: 1 });
});

test("the opt-out link is the address, signed; a forged one is refused", () => {
  const t = signOptOut("Sam@Example.com", ENV);
  assert.equal(verifyOptOut(t, ENV), "sam@example.com");
  assert.equal(verifyOptOut(t.slice(0, -2) + "AA", ENV), null);
  assert.equal(verifyOptOut(t, { EMAIL_LINK_SECRET: "y".repeat(40) }), null);
});

test("the email lists Premium's features, its end day, no card, the real prices and an unsubscribe", () => {
  const m = buildGiftPassEmail({ siteUrl: "https://opcompare.app", displayName: "Sam", until: Date.UTC(2026, 11, 1, 9), unsubUrl: "https://opcompare.app/api/premium-pass/unsubscribe?t=x" });
  for (const f of GIFT_FEATURES) assert.ok(m.html.includes(f.title));
  assert.ok(m.html.includes("Tuesday 1 December"));
  assert.ok(/nothing to cancel/.test(m.text) && m.text.includes("US$4.99") && m.text.includes("US$39.99"));
  assert.ok(m.headers["List-Unsubscribe"]);
  assert.ok(!/rift/i.test(m.html));
});

test("script-side sending, request-time reads only through the access lib, GET only asks", () => {
  const route = readFileSync("src/app/api/premium-pass/unsubscribe/route.ts", "utf8");
  assert.ok(!route.includes("premium-gift-pass-server") && !route.includes("@/lib/email"));
  const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
  assert.ok(!get.includes("optOutOfGiftEmail("));
  assert.ok(!readFileSync("src/lib/premium-gift-pass-access.ts", "utf8").includes("./email"));
  const server = readFileSync("src/lib/premium-gift-pass-server.ts", "utf8");
  assert.ok(server.indexOf("await grant(") < server.indexOf("sendEmailBrevo(r.email"));
  assert.ok(server.includes("g.revert()"));
  assert.ok(!/schedule:/.test(readFileSync(".github/workflows/email-premium-pass.yml", "utf8")));
});
