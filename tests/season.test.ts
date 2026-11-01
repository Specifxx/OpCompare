import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SEASON_BOOT_SCRIPT, seasonAt, seasonMarkupLive } from "../src/lib/season";

// The Halloween season (owner, 2026-10-24, ported from RiftCompare). These pin
// the window, the boot script that stamps it before paint, and that it never
// reaches the CDN-cached card page's tree or hides content.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

test("Halloween runs 16-31 October, and is gone on 1 November", () => {
  assert.equal(seasonAt(at(2026, 10, 15)), null);
  assert.equal(seasonAt(at(2026, 10, 16)), "halloween");
  assert.equal(seasonAt(at(2026, 10, 31)), "halloween");
  assert.equal(seasonAt(at(2026, 11, 1)), "christmas", "Christmas takes over");
  assert.equal(seasonAt(at(2027, 10, 20)), "halloween", "it comes back every year");
  // The markup is in the HTML from a day before to a day after, for the page cache.
  assert.equal(seasonMarkupLive("halloween", at(2026, 10, 15)), true);
  assert.equal(seasonMarkupLive("halloween", at(2026, 11, 1)), true);
  assert.equal(seasonMarkupLive("halloween", at(2026, 11, 2)), false);
  assert.equal(seasonMarkupLive("halloween", at(2026, 10, 14)), false);
});

function boot(date: Date, search = ""): string | null {
  let stamped: string | null = null;
  const RealDate = Date;
  const FakeDate = function () {
    return new RealDate(date.getTime());
  } as unknown as DateConstructor;
  const ctx = vm.createContext({
    Date: FakeDate,
    location: { search },
    document: { documentElement: { setAttribute: (k: string, v: string) => k === "data-season" && (stamped = v) } },
  });
  vm.runInContext(SEASON_BOOT_SCRIPT, ctx);
  return stamped;
}

test("the boot script agrees with seasonAt(), takes a ?season= override, and never throws", () => {
  for (const d of [at(2026, 10, 15), at(2026, 10, 16), at(2026, 10, 31), at(2026, 11, 1), at(2026, 3, 3)]) {
    assert.equal(boot(d), seasonAt(d), d.toDateString());
  }
  assert.equal(boot(at(2026, 3, 3), "?season=halloween"), "halloween", "preview it out of season");
  assert.equal(boot(at(2026, 10, 20), "?a=1&season=off"), null, "switch it off in season");
  assert.doesNotThrow(() => vm.runInContext(SEASON_BOOT_SCRIPT, vm.createContext({})));
});


test("the layout stamps the season inline; the decor is CSS-gated, under the content, and stops for reduced motion", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /__html: SEASON_BOOT_SCRIPT/);
  const css = read("src/app/globals.css");
  assert.match(css, /:root\[data-season="halloween"\] \.op-decor \{\s*display: block;/);
  assert.match(css, /\.op-thriller,\s*\.op-decor \{\s*display: none;/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.op-eyes i,[^}]*animation: none;/);
  // Decor lives in the hero's aria-hidden background layer, never over the text.
  const hero = read("src/components/home/CinematicHero.tsx");
  assert.match(hero, /pointer-events-none absolute inset-0 z-0" aria-hidden>[\s\S]*?<HalloweenDecor \/>[\s\S]*?<\/div>/);
  for (const f of ["src/components/home/HalloweenDecor.tsx", "src/components/home/ThrillerBarkComing.tsx", "src/lib/season.ts"]) {
    assert.doesNotMatch(read(f), /next\/headers|cookies\(|headers\(|@\/lib\/(db|data)\b/, f);
  }
});
