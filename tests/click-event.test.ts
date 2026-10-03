// The beacons' input rules: /api/click (lib/click-event.ts) and
// /api/premium/click (lib/nudge-surface.ts), plus the admin report's folds.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pageFromPath, parseClick, slugFromPath } from "../src/lib/click-event";
import { isPlanClickSurface, parsePlanClick } from "../src/lib/nudge-surface";
import { CLICK_RETENTION_DAYS, foldPlanClicks, mergeRetailerCounts, retailerLabel, slugHref } from "../src/lib/admin-clicks";
import { summarizeSubscription } from "../src/lib/plan-subscription";

test("parseClick accepts what the links carry and normalises case", () => {
  assert.deepEqual(parseClick({ retailer: "tcgplayer", page: "card", slug: "op01-120-shanks", country: "US" }), { retailer: "tcgplayer", page: "card", slug: "op01-120-shanks", country: "US", entry: null });
  assert.deepEqual(parseClick({ retailer: "EBAY_AU", page: "Card", slug: null, country: "AU" }), { retailer: "ebay_au", page: "card", slug: null, country: "AU", entry: null });
  assert.equal(parseClick({ retailer: "blackvaultgaming", country: "US" })?.page, "home", "a link without data-page counts as home");
});

test("parseClick refuses junk: unknown market, bad keys, non-objects", () => {
  assert.equal(parseClick(null), null);
  assert.equal(parseClick([]), null);
  assert.equal(parseClick("tcgplayer"), null);
  assert.equal(parseClick({ retailer: "tcgplayer", page: "card", country: "XX" }), null);
  assert.equal(parseClick({ retailer: "tcgplayer", page: "card", country: "us" }), null, "markets are upper-case codes");
  assert.equal(parseClick({ retailer: "", page: "card", country: "US" }), null);
  assert.equal(parseClick({ retailer: "<script>", page: "card", country: "US" }), null);
  assert.equal(parseClick({ retailer: "a".repeat(49), page: "card", country: "US" }), null);
  assert.equal(parseClick({ retailer: "tcgplayer", page: "a b", country: "US" }), null);
  assert.equal(parseClick({ retailer: "https://evil.example/", page: "card", country: "US" }), null, "no URLs");
});

test("parseClick drops an unreadable slug instead of storing it", () => {
  assert.equal(parseClick({ retailer: "tcgplayer", page: "card", slug: "../../etc", country: "US" })?.slug, null);
  assert.equal(parseClick({ retailer: "tcgplayer", page: "card", slug: 42, country: "US" })?.slug, null);
});

test("slug and page come from the path when the link has none", () => {
  assert.equal(slugFromPath("/card/op01-120-shanks"), "op01-120-shanks");
  assert.equal(slugFromPath("/sealed/op-09-booster-box/"), "op-09-booster-box");
  assert.equal(slugFromPath("/sets/romance-dawn"), null);
  assert.equal(slugFromPath("/card/a/b"), null);
  assert.equal(pageFromPath("/"), "home");
  assert.equal(pageFromPath("/price-guide"), "price-guide");
  assert.equal(pageFromPath("/card/x"), "card");
});

test("plan-click surfaces: the fixed steps and scoped places only", () => {
  for (const ok of ["dialog", "checkout", "premium-page", "slidein", "annual-switch", "nav:header", "nav:rail", "gate:buy-list", "gate:deal-finder", "nudge:movers", "tip:watchlist"]) assert.equal(isPlanClickSurface(ok), true, ok);
  for (const bad of ["", "nav:", "nav:Header", "evil:header", "gate:" + "x".repeat(33), "dialog ", 5, null]) assert.equal(isPlanClickSurface(bad), false, String(bad));
  assert.deepEqual(parsePlanClick({ surface: "gate:buy-list", tier: "premium" }), { surface: "gate:buy-list", tier: "premium" });
  assert.deepEqual(parsePlanClick({ surface: "<b>", tier: "gold" }), { surface: "dialog", tier: null }, "unknown values are coerced, never stored as sent");
  assert.deepEqual(parsePlanClick(null), { surface: "dialog", tier: null });
});

test("every surface the code fires is one the route accepts", () => {
  const ROOT = path.resolve(__dirname, "../src");
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const seen = new Set<string>();
  for (const f of walk(ROOT).filter((f) => f.endsWith(".tsx"))) {
    for (const m of fs.readFileSync(f, "utf8").matchAll(/(?<![\w-])surface="([^"]+)"/g)) seen.add(m[1]);
  }
  assert.ok(seen.size >= 5, "surfaces are named in the components");
  for (const s of seen) assert.equal(isPlanClickSurface(s) || /^[a-z-]+$/.test(s), true, s);
  for (const s of [...seen].filter((s) => s.includes(":"))) assert.equal(isPlanClickSurface(s), true, s);
});

test("admin folds: retailer rows merge three windows; interest folds per user", () => {
  const rows = mergeRetailerCounts(
    [{ k: "tcgplayer", n: 10 }, { k: "blackvaultgaming", n: 4 }, { k: "ebay_us", n: 2 }],
    [{ k: "tcgplayer", n: 3 }, { k: "blackvaultgaming", n: 4 }],
    [{ k: "blackvaultgaming", n: 1 }],
  );
  assert.deepEqual(rows.map((r) => [r.retailer, r.d7, r.d30, r.d90]), [["blackvaultgaming", 1, 4, 4], ["tcgplayer", 0, 3, 10], ["ebay_us", 0, 0, 2]]);
  assert.equal(retailerLabel("tcgplayer"), "TCGplayer");
  assert.equal(retailerLabel("blackvaultgaming"), "Black Vault Gaming");
  assert.equal(retailerLabel("ebay_au"), "eBay (AU)");
  assert.equal(retailerLabel("mystery"), "mystery");
  assert.equal(retailerLabel("ebay_no_listing"), "eBay (no listing on file)");
  assert.equal(retailerLabel("ebay_banner"), "eBay banner");
  assert.equal(retailerLabel("ebay"), "eBay (listing)");
  assert.equal(retailerLabel("tcgplayer_banner"), "TCGplayer banner");
  assert.equal(slugHref("op-09-booster-box", new Set(["op-09-booster-box"])), "/sealed/op-09-booster-box");
  assert.equal(slugHref("op01-120-shanks", new Set(["op-09-booster-box"])), "/card/op01-120-shanks");
  const t = (h: number) => new Date(Date.UTC(2026, 9, 3, h));
  const { byUser, anon } = foldPlanClicks([
    { userId: "u1", surface: "nav:header", createdAt: t(1) },
    { userId: null, surface: "gate:deal-finder", createdAt: t(2) },
    { userId: "u1", surface: "checkout", createdAt: t(3) },
    { userId: "u2", surface: "slidein", createdAt: t(0) },
  ]);
  assert.equal(anon, 1);
  assert.equal(byUser.get("u1")?.count, 2);
  assert.deepEqual(byUser.get("u1")?.last, t(3));
  assert.deepEqual([...byUser.get("u1")!.surfaces].sort(), ["checkout", "nav:header"]);
});

test("summarizeSubscription: ours only; tier, interval, renewal and cancellation", () => {
  const now = Date.UTC(2026, 9, 3);
  const sub = {
    status: "active",
    created: Math.floor((now - 65 * 86_400_000) / 1000),
    cancel_at_period_end: false,
    metadata: { site: "opcompare", tier: "plus" },
    items: { data: [{ current_period_end: Math.floor(Date.UTC(2026, 9, 20) / 1000), price: { id: "price_1", metadata: { site: "opcompare", tier: "plus" }, recurring: { interval: "month" } } }] },
  };
  assert.deepEqual(summarizeSubscription(sub, now), { tier: "plus", interval: "month", status: "active", periodEnd: "2026-10-20T00:00:00.000Z", cancelAtPeriodEnd: false, monthsActive: 2 });
  assert.equal(summarizeSubscription({ ...sub, metadata: {}, items: { data: [{ price: { metadata: {} } }] } }, now), null, "another product's subscription is ignored");
  assert.equal(summarizeSubscription({ ...sub, cancel_at_period_end: true }, now)?.cancelAtPeriodEnd, true);
  assert.equal(summarizeSubscription(null, now), null);
});

test("beacon routes never fail, are rate-limited, and never import the database directly", () => {
  for (const p of ["src/app/api/click/route.ts", "src/app/api/premium/click/route.ts"]) {
    const src = fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");
    assert.match(src, /rateLimit\(/, p);
    assert.match(src, /status: 204/, p);
    assert.doesNotMatch(src, /@\/lib\/db"/, p);
  }
});

test("switch-to-annual never writes entitlement", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../src/app/api/premium/switch-to-annual/route.ts"), "utf8");
  assert.doesNotMatch(src, /premiumUntil|premiumTier|stampFromSubscription/);
  assert.match(src, /proration_behavior: "always_invoice"/);
  assert.match(src, /stripeEnabled\(\)/);
});

test("resume (Keep) and switch-to-annual: same-origin POST, never write entitlement", () => {
  for (const p of ["src/app/api/premium/resume/route.ts", "src/app/api/premium/switch-to-annual/route.ts"]) {
    const src = fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");
    assert.match(src, /sameOrigin\(req\)/, p);
    assert.match(src, /stripeEnabled\(\)/, p);
    assert.doesNotMatch(src, /premiumUntil|premiumTier|stampFromSubscription|@\/lib\/db"/, p);
    assert.doesNotMatch(src, /export async function GET/, p);
  }
  const annual = fs.readFileSync(path.resolve(__dirname, "../src/app/api/premium/switch-to-annual/route.ts"), "utf8");
  assert.match(annual, /cancel_at_period_end/, "a plan set to end is never billed a year");
});

test("beacons: same-origin only, pruned after the retention window, the report bounded to it", () => {
  const read = (p: string) => fs.readFileSync(path.resolve(__dirname, "..", p), "utf8");
  for (const r of ["src/app/api/click/route.ts", "src/app/api/premium/click/route.ts"]) assert.match(read(r), /if \(!sameOrigin\(req\)\) return NO_CONTENT\(\);/, r);
  assert.equal(CLICK_RETENTION_DAYS, 90);
  assert.match(read("src/lib/beacons.ts"), /clickEvent\.deleteMany\(\{ where: \{ createdAt: \{ lt: before \} \} \}\)/);
  assert.match(read("src/lib/beacons.ts"), /premiumClick\.deleteMany/);
  assert.match(read("scripts/import.ts"), /pruneBeacons\(\)/);
  // No unbounded scan of either table in the admin report.
  const admin = read("src/lib/admin-clicks.ts");
  for (const m of admin.matchAll(/prisma\.(clickEvent|premiumClick)\.(groupBy|count|findMany)\(([^\n]*)/g)) assert.match(m[3], /createdAt: \{ gte:/, m[0]);
  // A list page's link names its card: the beacon prefers data-card over the path.
  assert.match(read("src/components/OutboundBeacon.tsx"), /a\.getAttribute\("data-card"\) \|\| slugFromPath\(path\)/);
  for (const f of ["src/components/DealTable.tsx", "src/components/CheapestOnEbay.tsx"]) assert.match(read(f), /data-card=\{/, f);
});

test("parseClick keeps a known entry bucket and drops anything else (wave 2)", () => {
  assert.equal(parseClick({ retailer: "tcgplayer", country: "US", entry: "reddit" })?.entry, "reddit");
  assert.equal(parseClick({ retailer: "tcgplayer", country: "US", entry: "https://evil.example" })?.entry, null);
  assert.equal(parseClick({ retailer: "tcgplayer", country: "US" })?.entry, null);
});
