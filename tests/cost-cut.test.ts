// Vercel cost cut (DECISIONS.md, 2026-10-23): analytics filter, robots groups,
// cache lives no shorter than six hours, and the import purges only on change.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");

test("Vercel Analytics drops local, preview, automated, bot and opted-out traffic", () => {
  const src = read("src/components/ConsentGatedAnalytics.tsx");
  assert.match(src, /<Analytics beforeSend=\{beforeSend\} \/>/);
  for (const re of [/"localhost"/, /"127\.0\.0\.1"/, /\.vercel\.app/, /navigator\.webdriver/, /BOT_UA\.test\(navigator\.userAgent\)/, /"va-disable"/, /get\("notrack"\)/]) assert.match(src, re);
  assert.doesNotMatch(read("package.json"), /speed-insights/);
});

test("robots: search and answer engines allowed, SEO scrapers and bulk scrapers disallowed", async () => {
  const src = read("src/app/robots.ts");
  for (const b of ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "PetalBot", "Bytespider", "DataForSeoBot", "BLEXBot", "CCBot"]) assert.match(src, new RegExp(`BLOCKED = \\[[^\\]]*"${b}"`), b);
  for (const g of ["Googlebot", "Bingbot", "OAI-SearchBot", "PerplexityBot"]) assert.match(src, new RegExp(`SEARCH = \\[[^\\]]*"${g}"`), g);
  assert.match(src, /\{ userAgent: BLOCKED, disallow: "\/" \}/);
});

test("no page or route caches for less than six hours", () => {
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.resolve(__dirname, "../src/app")).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const m = fs.readFileSync(f, "utf8").match(/export const revalidate = (\d+);/);
    if (m) assert.ok(Number(m[1]) >= 21600, `${f}: revalidate ${m[1]}`);
  }
});

test("the import purges the site's cache only when the data changed", () => {
  const sh = read("scripts/publish-snapshot.sh");
  assert.match(sh, /\$4 != "meta\.json"/);
  assert.match(sh, /changed=\$changed" >> "\$GITHUB_OUTPUT"/);
  assert.match(read(".github/workflows/import-prices.yml"), /SNAPSHOT_CHANGED: \$\{\{ steps\.publish\.outputs\.changed \}\}/);
  assert.match(read("scripts/publish-history.ts"), /shouldRevalidate\(before\?\.value \?\? null, ref, process\.env\.SNAPSHOT_CHANGED\)/);
  const lib = read("src/lib/import.ts");
  assert.match(lib, /return prevRef !== ref \|\| snapshotChanged !== "false";/);
});
