// ONE host for search engines (owner, 2026-10-25): www.opcompare.app. The apex answers every
// page with a 301 to it; everything that names the site (canonicals, the sitemap, the
// robots.txt Sitemap lines, Open Graph, JSON-LD) is built from SITE_URL.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("the site's own host is www, the apex is its alias", async () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const site = await import("../src/lib/site");
  assert.equal(site.CANONICAL_HOST, "www.opcompare.app");
  assert.equal(site.APEX_HOST, "opcompare.app");
  assert.equal(site.SITE_URL, "https://www.opcompare.app");
});

test("robots.txt names the www sitemaps", async () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  const robots = (await import("../src/app/robots")).default();
  assert.deepEqual(robots.sitemap, ["https://www.opcompare.app/sitemap.xml", "https://www.opcompare.app/news-sitemap.xml"]);
  assert.equal(robots.host, "https://www.opcompare.app");
});

test("the apex 301s to www, and only the endpoints named on the apex by a provider or a sent email are exempt", async () => {
  type Redirect = { source: string; has?: { value: string }[]; destination: string; statusCode?: number };
  const mod = (await import("../next.config.js")) as unknown as { default?: { redirects: () => Promise<Redirect[]> }; redirects?: () => Promise<Redirect[]> };
  const redirects = await (mod.default?.redirects ?? mod.redirects!)();
  const apex = redirects.filter((r) => r.has?.some((h) => h.value === "opcompare.app"));
  assert.equal(apex.length, 2, "the home page and every other path");
  for (const r of apex) {
    assert.equal(r.statusCode, 301, "a real 301");
    assert.ok(r.destination.startsWith("https://www.opcompare.app/"));
  }
  const rest = apex.find((r) => r.source !== "/")!;
  const re = new RegExp("^/" + /\(\(\?!(.*)\)\.\+\)/.exec(rest.source)![0].replace(/^\(\(\?!/, "(?!").replace(/\)\.\+\)$/, ").+"));
  for (const keep of ["/api/stripe/webhook", "/api/ebay/marketplace-deletion", "/api/alerts/unsubscribe", "/api/alerts/action", "/api/alerts/release/unsubscribe"]) assert.doesNotMatch(keep, re, `${keep} must keep answering on the apex`);
  for (const go of ["/card/x", "/api/ebay/marketplace-deletion/x", "/api/stripe/webhooks", "/sitemap.xml", "/robots.txt", "/blog/a", "/alerts/action", "/api/alerts/subscribe", "/api/auth/oauth/google"]) assert.match(go, re, `${go} must redirect`);
  assert.ok(!redirects.some((r) => r.has?.some((h) => h.value === "www.opcompare.app")), "no redirect away from www");
  assert.match(read("src/app/api/ebay/marketplace-deletion/route.ts"), /https:\/\/opcompare\.app\/api\/ebay\/marketplace-deletion/, "eBay's registered endpoint stays on the apex");
});

test("no page, route or script hard-codes the old apex as the site URL", () => {
  const bad: string[] = [];
  const walk = (d: string) => {
    for (const n of fs.readdirSync(path.join(ROOT, d))) {
      const rel = `${d}/${n}`;
      if (fs.statSync(path.join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(ts|tsx|yml)$/.test(n)) {
        const s = read(rel);
        for (const m of s.matchAll(/["'`]https:\/\/opcompare\.app[/"'`]/g)) {
          const line = s.slice(0, m.index).split("\n").length;
          const text = s.split("\n")[line - 1];
          if (!/^\s*(\/\/|\*|#)/.test(text)) bad.push(`${rel}:${line}`);
        }
      }
    }
  };
  for (const d of ["src", "scripts", ".github/workflows"]) walk(d);
  // Allowed: the two endpoints registered with their providers on the apex.
  const allowed = new Set(["src/app/api/ebay/marketplace-deletion/route.ts"]);
  assert.deepEqual(bad.filter((b) => !allowed.has(b.split(":")[0])), []);
});

test("the workflows that post to or probe the site use the www host", () => {
  for (const f of ["import-prices.yml", "watchdog.yml", "email.yml", "email-weekly.yml", "search-console.yml", "stripe-setup.yml", "indexnow.yml"]) {
    const y = read(`.github/workflows/${f}`);
    assert.doesNotMatch(y, /'https:\/\/opcompare\.app'/, f);
  }
});

test("fitTitle keeps both ends of a long name, so the variants of one product have different titles", async () => {
  const { fitTitle, TITLE_MAX } = await import("../src/lib/seo-title");
  assert.equal(fitTitle("OP-09 Booster Box", " Price"), "OP-09 Booster Box Price");
  const set = "Extra Booster: One Piece Heroines Edition Vol.2 - ";
  const titles = ["Booster Pack", "Sleeved Booster Pack", "Booster Box", "Display"].map((k) => fitTitle(set + k, " Price"));
  assert.equal(new Set(titles).size, 4, titles.join(" | "));
  for (const t of titles) assert.ok(t.length <= TITLE_MAX, t);
  assert.ok(titles[1].endsWith("Sleeved Booster Pack Price"), titles[1]);
});

test("the DON!! cards have one page: the rarity and type copies are gone and redirect to it", async () => {
  const { RARITY_FACETS, TYPE_FACETS, PRINTING_FACETS } = await import("../src/lib/facets");
  assert.ok(PRINTING_FACETS.some((f) => f.slug === "don"));
  assert.ok(!RARITY_FACETS.some((f) => f.slug === "don") && !TYPE_FACETS.some((f) => f.slug === "don"));
  const cfg = read("next.config.js");
  assert.match(cfg, /source: "\/cards\/rarity\/don", destination: "\/cards\/printing\/don", statusCode: 301/);
  assert.match(cfg, /source: "\/cards\/type\/don", destination: "\/cards\/printing\/don", statusCode: 301/);
});

test("the sitemap lists a Leader's deck page only when the page is indexable (two or more decks)", () => {
  assert.match(read("src/app/sitemap.ts"), /perLeader\.get\(d\.leaderSlug\) \?\? 0\) >= 2/);
  assert.match(read("src/app/decks/leader/[leader]/page.tsx"), /decks!\.length < 2/);
});

test("the privacy and terms pages each have their own description", () => {
  const d = (f: string) => /description: "([^"]+)"/.exec(read(f))?.[1];
  assert.ok(d("src/app/privacy/page.tsx") && d("src/app/terms/page.tsx"));
  assert.notEqual(d("src/app/privacy/page.tsx"), d("src/app/terms/page.tsx"));
});
