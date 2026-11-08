import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { priceApiFrom } from "../src/lib/price-api";

// The free price file (competitor scan, 2026-11-08): store prices only (`low`), never lastKnown, absolute links.
const low = (us: number | null, au: number | null = null) => ({ US: us, AU: au, UK: null, SG: null, CA: null, EU: null });

test("prices.json lists each priced card and sealed product with its market prices and links", () => {
  const api = priceApiFrom(
    [
      { id: 1, slug: "luffy-op01-001", name: "Luffy", number: "OP01-001", printing: "Alt Art", low: low(1250, 2100) },
      { id: 2, slug: "unpriced", name: "Unpriced", number: null, printing: "Normal", low: low(null) },
    ],
    [{ id: 9, slug: "op01-box", name: "OP01 Booster Box", low: low(14999) }],
    new Date("2026-11-08T00:00:00Z"),
    "https://example.com",
    "Example",
  );
  assert.equal(api.products.length, 2);
  assert.deepEqual(api.products[0].prices, { US: { cents: 1250, url: "https://example.com/card/luffy-op01-001" }, AU: { cents: 2100, url: "https://example.com/card/luffy-op01-001" } });
  assert.equal(api.products[1].prices.US.url, "https://example.com/sealed/op01-box");
  assert.equal(api.currency.AU, "AUD");
  assert.match(api.licence, /visible link/);
});

test("prices.json never reads the last known price and is open to every origin, held at least six hours", () => {
  const lib = fs.readFileSync("src/lib/price-api.ts", "utf8").replace(/\/\/.*$/gm, "");
  assert.ok(!new RegExp("last" + "Known").test(lib));
  const route = fs.readFileSync("src/app/prices.json/route.ts", "utf8");
  assert.match(route, /export const revalidate = 21600;/);
  assert.match(route, /Access-Control-Allow-Origin/);
});
