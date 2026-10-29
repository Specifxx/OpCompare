import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchStoreListings, productUrl, WHOLE_CATALOGUE } from "../src/lib/store-import";
import { STORES } from "../src/lib/stores";

// L'Atelier TCG (Laval, QC) runs its own platform, not Shopify, but serves Shopify's feed format for its whole catalogue at
// /products.json (every game, CAD, a `url` field linking its own product page). The fixture is a sample of that live feed
// as read on 2026-10-29 (titles, handles, prices, availability and urls as served): 40 One Piece products, then a few of
// its Magic and Riftbound ones.
const FIXTURE = readFileSync(new URL("./fixtures/ateliertcg-products-2026-10-29.json", import.meta.url), "utf8");

test("L'Atelier TCG is listed once, in Canada, sealed only, reading its whole catalogue", () => {
  const store = STORES.find((s) => s.key === "ateliertcg");
  assert.deepEqual(store, { key: "ateliertcg", name: "L'Atelier TCG", base: "https://ateliertcg.com", country: "CA", collections: [WHOLE_CATALOGUE], sealedOnly: true });
  // Its second storefront, ccctcg.ca, sells the same stock at the same prices (284 of 284 products, 2026-10-29): one stock, one store.
  assert.equal(STORES.some((s) => s.base.includes("ccctcg")), false);
});

test("a whole-catalogue store: one /products.json read, One Piece titles only, its own product pages", async () => {
  const store = STORES.find((s) => s.key === "ateliertcg")!;
  const realFetch = globalThis.fetch;
  const asked: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const u = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (u.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /api/\nDisallow: /*/cart\n", { status: 200 });
    asked.push(`${u.pathname}?${u.searchParams}`);
    return new Response(FIXTURE, { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const read = await fetchStoreListings(store).finally(() => {
    globalThis.fetch = realFetch;
  });
  assert.deepEqual(asked, ["/products.json?limit=250&page=1&country=CA"]);
  assert.equal(read.failed, false);
  assert.equal(read.products.length, 40);
  assert.ok(read.products.every((p) => /one piece/i.test(p.title)));
  const box = read.products.find((p) => p.title === "One Piece Card Game OP-12 Legacy of the Master Booster Box")!;
  assert.equal(productUrl(store, box), "https://ateliertcg.com/en/product/one-piece-card-game-op-12-legacy-of-the-master-booster-box/");
  assert.equal(box.variants[0].price, "400.27");
});

test("a whole-catalogue feed `url` off the store's origin falls back to /products/<handle>", async () => {
  const store = { ...STORES.find((s) => s.key === "ateliertcg")!, base: "https://shop.example" };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const u = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (u.pathname === "/robots.txt") return new Response("", { status: 404 });
    return new Response(
      JSON.stringify({ products: [{ handle: "box", title: "One Piece Box", url: "https://elsewhere.example/box", variants: [{ title: "Default Title", price: "10.00", available: true }] }] }),
      { status: 200 },
    );
  }) as typeof fetch;
  const read = await fetchStoreListings(store).finally(() => {
    globalThis.fetch = realFetch;
  });
  assert.equal(productUrl(store, read.products[0]), "https://shop.example/products/box");
});
