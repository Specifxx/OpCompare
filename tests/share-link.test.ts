import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { priceGap, shareText, shareUrl } from "../src/lib/share-link";

// Word of mouth (DECISIONS.md, "Share buttons and shared lists").
test("every shared link carries utm_source=share and its medium, keeping the page's own query", () => {
  assert.equal(shareUrl("https://opcompare.app", "/card/x", "card"), "https://opcompare.app/card/x?utm_source=share&utm_medium=card");
  assert.equal(shareUrl("https://opcompare.app", "/deck?list=abc", "deck"), "https://opcompare.app/deck?list=abc&utm_source=share&utm_medium=deck");
});

test("the price gap needs two sellers and a real spread", () => {
  const g = priceGap([{ priceCents: 1000, retailerName: "eBay" }, { priceCents: 400, retailerName: "Store" }])!;
  assert.equal(g.pct, 60);
  assert.equal(g.low.retailerName, "Store");
  assert.equal(priceGap([{ priceCents: 400, retailerName: "A" }, { priceCents: 900, retailerName: "A" }]), null);
  assert.equal(priceGap([{ priceCents: 400, retailerName: "A" }]), null);
  assert.match(shareText("Luffy", g, (c) => `$${c / 100}`), /\$4 at Store, up to \$10 elsewhere \(60% less\)/);
});

test("share buttons, the arrival counter and the robots allow are wired in", () => {
  assert.match(fs.readFileSync("src/app/card/[slug]/page.tsx", "utf8"), /<ShareButton responsive name=\{title\} texts=\{shareTexts\}/);
  assert.match(fs.readFileSync("src/app/sealed/[slug]/page.tsx", "utf8"), /<ShareButton responsive name=\{s.name\} medium="sealed"/);
  assert.match(fs.readFileSync("src/components/QuickView.tsx", "utf8"), /<ShareButton /);
  assert.match(fs.readFileSync("src/app/layout.tsx", "utf8"), /<ShareArrival \/>/);
  assert.match(fs.readFileSync("src/app/robots.ts", "utf8"), /"\/\*utm_source=share"/);
});
