import { test } from "node:test";
import assert from "node:assert/strict";
import { adsTxtBody, adsenseLoaderSrc, parseAdsenseClientId } from "../src/lib/adsense";
import { parseCreatives } from "../src/lib/tcgplayer-creatives";

test("a publisher id is ca-pub- plus 16 digits, or nothing; it never throws", () => {
  assert.equal(parseAdsenseClientId("ca-pub-1234567890123456"), "ca-pub-1234567890123456");
  assert.equal(parseAdsenseClientId(" ca-pub-1234567890123456 "), "ca-pub-1234567890123456");
  for (const bad of [undefined, null, "", "pub-1234567890123456", "ca-pub-123", "ca-pub-12345678901234567"]) assert.equal(parseAdsenseClientId(bad), null);
});

test("ads.txt is the seller line, and only with an id", () => {
  assert.equal(adsTxtBody(null), null);
  assert.equal(adsTxtBody("ca-pub-1234567890123456"), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
  assert.match(adsenseLoaderSrc("ca-pub-1234567890123456"), /adsbygoogle\.js\?client=ca-pub-1234567890123456$/);
});

test("this build has no AdSense id, so every slot is a house promo", async () => {
  const m = await import("../src/lib/adsense");
  if (!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID) {
    assert.equal(m.AD_UNITS_ENABLED, false);
    assert.equal(m.ADSENSE_CLIENT_ID, null);
  }
});

test("TCGplayer creative ids come only from the owner's env, malformed ones dropped", () => {
  assert.deepEqual(parseCreatives("3841228:336x280, 3841229:728x90"), [{ id: "3841228", w: 336, h: 280 }, { id: "3841229", w: 728, h: 90 }]);
  assert.deepEqual(parseCreatives("abc:1x1,12:3x4,3841228:336"), []);
  assert.deepEqual(parseCreatives(undefined), []);
});

// Display ads on guides and explainers only (owner, 2026-11-19).
test("a real AdSense unit fills only the article slot, and only with both ids", async () => {
  const { realUnitFor, parseAdUnitId } = await import("../src/lib/adsense");
  const id = "ca-pub-1234567890123456";
  assert.equal(realUnitFor("article", id, "1234567890"), "1234567890");
  for (const slot of ["card", "price-guide", "movers", "market", "sealed", "account", "premium"]) assert.equal(realUnitFor(slot, id, "1234567890"), null, slot);
  assert.equal(realUnitFor("article", null, "1234567890"), null);
  assert.equal(realUnitFor("article", id, null), null);
  assert.equal(parseAdUnitId("article"), null);
  assert.equal(parseAdUnitId(" 1234567890 "), "1234567890");
});

test("no page loads AdSense site-wide: the script comes only from the guide slot", async () => {
  const { readFileSync, readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); } };
  walk("src");
  const loaders = files.filter((f) => /adsenseLoaderSrc\(|pagead2\.googlesyndication/.test(readFileSync(f, "utf8")) && !f.endsWith("lib/adsense.ts"));
  assert.deepEqual(loaders.map((f) => f.replace(/\\/g, "/")), ["src/components/AdSlot.tsx"]);
  const users = files.filter((f) => /<AdSlot[^>]*slot="article"/.test(readFileSync(f, "utf8")));
  assert.deepEqual(users.map((f) => f.replace(/\\/g, "/")), ["src/components/blog/ArticleView.tsx"]);
  const viewUsers = files.filter((f) => /<ArticleView\b/.test(readFileSync(f, "utf8"))).map((f) => f.replace(/\\/g, "/")).sort();
  assert.deepEqual(viewUsers, ["src/app/blog/[slug]/page.tsx", "src/app/guides/[slug]/page.tsx"]);
});
