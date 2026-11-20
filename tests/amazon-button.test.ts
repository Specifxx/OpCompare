// The Amazon row's button is amber (owner, 2026-11-18) and the quick views carry a real "See full page" button.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test(".btn-amazon is amber with dark ink in both themes", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /\.btn-amazon \{\s*@apply btn border border-\[#B7791F\] bg-\[#F5A524\] text-\[#111111\] hover:bg-\[#DC8A0B\]/);
});

test("the Amazon row's buttons use .btn-amazon, keep rel and tracking", () => {
  const src = read("src/components/AmazonLiveSlot.tsx");
  assert.equal((src.match(/btn-amazon/g) ?? []).length, 2);
  assert.doesNotMatch(src, /btn-primary/);
  assert.match(src, /rel=\{AMAZON_REL\}/);
  assert.match(src, /data-retailer/);
});

test("both quick views have a See full page button, secondary so the buy buttons stay the primary ones (2026-11-20)", () => {
  for (const f of ["src/components/QuickView.tsx", "src/components/SealedQuickView.tsx"]) {
    const src = read(f);
    assert.match(src, /data-quickview-fullpage className="btn-ghost[^"]*min-h-11 w-full/, f);
    assert.match(src, /See full page: price history and details/, f);
  }
});
