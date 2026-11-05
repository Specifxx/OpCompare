// Amazon's Creators API prices on sealed pages (2026-11-05): fetched by a CDN-cached route at request time (OP Compare
// builds weekly), matched by the sealed matcher, shown 24 hours with the time, never stored, never a board row.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { credentialsFor, itemsOf, pickListing, tokenEndpoint, type Item } from "../src/lib/amazon-creators";
import { amazonItemUrl, median, pickAmazonItem } from "../src/lib/amazon-live";
import type { SealedRef } from "../src/lib/match";

test("the token endpoint follows the credential version, else the store's home region", () => {
  assert.equal(tokenEndpoint("3.1", "AU"), "https://api.amazon.com/auth/o2/token");
  assert.equal(tokenEndpoint("3.3", "US"), "https://api.amazon.co.jp/auth/o2/token");
  assert.equal(tokenEndpoint(undefined, "UK"), "https://api.amazon.co.uk/auth/o2/token");
  assert.equal(tokenEndpoint(undefined, "EU"), "https://api.amazon.co.uk/auth/o2/token");
  assert.equal(tokenEndpoint(undefined, "AU"), "https://api.amazon.co.jp/auth/o2/token");
});

test("one credential serves every store: the AU-named variables are the default, a market's own win", () => {
  const au = { AMAZON_CREATORS_AU_CLIENT_ID: " a ", AMAZON_CREATORS_AU_CLIENT_SECRET: "b", AMAZON_CREATORS_AU_VERSION: "3.3" };
  assert.equal(credentialsFor("US", {}), null);
  assert.equal(credentialsFor("US", { AMAZON_CREATORS_AU_CLIENT_ID: "a" }), null);
  assert.deepEqual(credentialsFor("AU", au), { id: "a", secret: "b", version: "3.3" });
  assert.deepEqual(credentialsFor("US", au), { id: "a", secret: "b", version: "3.3" });
  assert.deepEqual(credentialsFor("US", { ...au, AMAZON_CREATORS_US_CLIENT_ID: "u", AMAZON_CREATORS_US_CLIENT_SECRET: "v" }), { id: "u", secret: "v", version: "3.1" });
});

const listing = (amount: number, o: Partial<{ cond: string; avail: string; cur: string; box: boolean; seller: string }> = {}) => ({
  price: { money: { amount, currency: o.cur ?? "USD" } },
  condition: { value: o.cond ?? "New" },
  availability: { type: o.avail ?? "IN_STOCK" },
  isBuyBoxWinner: o.box,
  merchantInfo: { name: o.seller ?? "Amazon.com" },
});
const item = (...listings: ReturnType<typeof listing>[]): Item => ({ asin: "B000000001", offersV2: { listings } });

test("the shown price is the new, in-stock buy box in the store's currency, else the cheapest such listing", () => {
  assert.deepEqual(pickListing(item(listing(130), listing(125, { box: true })), "USD"), { amount: 125, seller: undefined });
  assert.deepEqual(pickListing(item(listing(130, { seller: "Card Shop" }), listing(128)), "USD"), { amount: 128, seller: undefined });
  assert.equal(pickListing(item(listing(130, { seller: "Card Shop" })), "USD")!.seller, "Card Shop");
  assert.equal(pickListing(item(listing(10, { cond: "Used" })), "USD"), null, "used is never shown");
  assert.equal(pickListing(item(listing(10, { avail: "OUT_OF_STOCK" })), "USD"), null);
  assert.equal(pickListing(item(listing(10, { cur: "AUD" })), "USD"), null, "another currency is another store");
  assert.equal(pickListing({ asin: "B000000001", offersV2: null }, "USD"), null);
  assert.deepEqual(itemsOf({ searchResult: { items: [item()] } }).length, 1);
});

test("the item shown is the first search result the sealed matcher reads as this product, near the store median", () => {
  const box: SealedRef = { id: 7, name: "OP-13 Carrying on His Will Booster Box", kind: "Booster Box", setCode: "OP13", setName: "Carrying on His Will" };
  const items = [
    { asin: "B0CASE00001", title: "One Piece Card Game OP-13 Carrying on His Will Booster Case (12 boxes)", price: 1400 },
    { asin: "B0PACK00001", title: "One Piece Card Game OP-13 Carrying on His Will Booster Pack", price: 6 },
    { asin: "B0FAKE00001", title: "One Piece Card Game OP-13 Carrying on His Will Booster Box", price: 400 },
    { asin: "B0BOX000001", title: "One Piece Card Game OP-13 Carrying on His Will Booster Box", price: 135 },
    { asin: "B0BOX000002", title: "One Piece Card Game OP-13 Carrying on His Will Booster Box", price: 140 },
  ];
  assert.deepEqual(pickAmazonItem(items, box, 12000), { asin: "B0BOX000001", cents: 13500 }, "the case, the pack and the fantasy price are passed over");
  assert.deepEqual(pickAmazonItem(items, box, undefined), { asin: "B0FAKE00001", cents: 40000 }, "without a store median the first matching title wins");
  assert.equal(pickAmazonItem([{ asin: "B0X", title: "One Piece OP-12 Legacy of the Master Booster Box", price: 130 }], box, 12000), null, "another set is never this product");
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), undefined);
});

test("an item link goes to Amazon's own page with the market's tag and the sub id", () => {
  assert.equal(amazonItemUrl("B0ABCDEFGH", "US", "sealed-amazon"), "https://www.amazon.com/dp/B0ABCDEFGH?tag=riftcompare-20&ascsubtag=oc-us-sealed-amazon");
  assert.match(amazonItemUrl("B0ABCDEFGH", "AU", "sealed-amazon")!, /amazon\.com\.au\/dp\/.*tag=opcompare-22/);
  assert.equal(amazonItemUrl("B0ABCDEFGH", "SG", "sealed-amazon"), null, "no Amazon Singapore");
  assert.equal(amazonItemUrl("not-an-asin", "US", "sealed-amazon"), null);
});

const walk = (d: string): string[] => fs.readdirSync(d).flatMap((f) => (fs.statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));

test("the Creators API client is reached only through lib/amazon-live.ts, only from the Amazon route; the credentials are named nowhere else", () => {
  for (const f of [...walk("src/app"), ...walk("src/components"), ...walk("src/lib")].filter((f) => /\.tsx?$/.test(f))) {
    const s = fs.readFileSync(f, "utf8");
    if (f !== "src/lib/amazon-creators.ts" && f !== "src/lib/amazon-live.ts") assert.ok(!/amazon-creators/.test(s), `${f} imports the Creators API client`);
    if (/from "@\/lib\/amazon-live"/.test(s)) assert.equal(f, "src/app/api/amazon/sealed/[slug]/route.ts", `${f} reads live Amazon prices`);
    if (f !== "src/lib/amazon-creators.ts" && f !== "src/lib/health.ts") assert.ok(!/AMAZON_CREATORS/.test(s), `${f} names the credentials`);
  }
  const route = fs.readFileSync("src/app/api/amazon/sealed/[slug]/route.ts", "utf8");
  assert.match(route, /s-maxage=21600/, "the answer sits in the CDN six hours: four calls a day per product and market at most");
  assert.doesNotMatch(route, /@\/lib\/db/);
  const quick = fs.readFileSync("src/lib/sealed-quick-view.ts", "utf8");
  assert.doesNotMatch(quick, /amazon/i, "no Amazon in the quick view (no Amazon link in a pop-up)");
});
