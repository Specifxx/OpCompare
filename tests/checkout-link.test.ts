import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isCheckoutLink, shopifyCartUrl, withShopifyVariant } from "../src/lib/checkout-link";
import { affiliateUrl } from "../src/lib/affiliate";
import { bestVariant } from "../src/lib/match";
import { buyClickProps } from "../src/lib/buy-click";

// Straight to checkout, ported from RiftCompare (#340). DECISIONS.md, 2026-11-06.
const PRODUCT = "https://www.cherrycollectables.com.au/products/luffy-op01-024";
const ID = 44123456789012;

test("the import's variant pick is still the product page, and only for a real variant id", () => {
  assert.equal(withShopifyVariant(PRODUCT, ID), `${PRODUCT}?variant=${ID}`);
  assert.equal(withShopifyVariant(PRODUCT, undefined), PRODUCT, "no id (another platform's reader) → unchanged");
  assert.equal(withShopifyVariant(PRODUCT, 12), PRODUCT, "not a Shopify id");
  assert.equal(withShopifyVariant("https://shop.example/producto/luffy/", ID), "https://shop.example/producto/luffy/", "not a /products/ URL");
});

test("a product URL with the variant becomes the store's cart permalink", () => {
  assert.equal(shopifyCartUrl(`${PRODUCT}?variant=${ID}`), `https://www.cherrycollectables.com.au/cart/${ID}:1`);
  assert.equal(shopifyCartUrl(`https://store.example/en-au/products/x?variant=${ID}`), `https://store.example/en-au/cart/${ID}:1`);
  assert.equal(shopifyCartUrl(`${PRODUCT}?variant=${ID}&utm_source=opcompare`), `https://www.cherrycollectables.com.au/cart/${ID}:1?utm_source=opcompare`);
  assert.equal(shopifyCartUrl(PRODUCT), null, "no variant → the product page");
  assert.equal(shopifyCartUrl(`${PRODUCT}?variant=abc`), null);
});

test("affiliateUrl: an untracked Shopify store row opens checkout, tagged; the rest keep the product page", () => {
  const out = affiliateUrl(`${PRODUCT}?variant=${ID}`, "store:cherry", "/card/luffy");
  const u = new URL(out);
  assert.equal(u.pathname, `/cart/${ID}:1`);
  assert.equal(u.searchParams.get("utm_source"), "opcompare");
  assert.equal(u.searchParams.get("utm_campaign"), "card");
  assert.equal(u.searchParams.get("utm_content"), "checkout");
  assert.ok(isCheckoutLink(out));
  assert.equal(new URL(affiliateUrl(PRODUCT, "store:cherry", "/card/luffy")).pathname, "/products/luffy-op01-024");
  // Emails keep the product page (with the variant picked).
  const mail = new URL(affiliateUrl(`${PRODUCT}?variant=${ID}`, "store:cherry", "/email-alert-drop"));
  assert.equal(mail.pathname, "/products/luffy-op01-024");
  assert.equal(mail.searchParams.get("variant"), String(ID));
  assert.ok(!isCheckoutLink(affiliateUrl("https://www.ebay.com/itm/123", "ebay_us", "/card/x")));
  assert.ok(!isCheckoutLink(affiliateUrl("https://www.tcgplayer.com/product/1", "tcgplayer", "/card/x")));
  assert.ok(!isCheckoutLink(affiliateUrl("https://www.amazon.com/dp/B0ABCDEFGH", "amazon", "/sealed/x")));
});

test("a store with its own programme (partner ref, Awin) is returned before the cart rewrite", () => {
  const src = readFileSync(new URL("../src/lib/affiliate.ts", import.meta.url), "utf8");
  const body = src.slice(src.indexOf("export function affiliateUrl("));
  const partner = body.indexOf("if (partner) return partner;");
  const awin = body.indexOf("if (awin) return awin;");
  const cart = body.indexOf("shopifyCartUrl(");
  const email = body.indexOf('if (!page?.startsWith("email"))');
  assert.ok(partner > 0 && awin > partner && cart > awin && email > 0 && email < cart, "partner and Awin win over checkout; never in an email");
});

test("the import records the variant it priced, for in-stock Shopify rows only", () => {
  const v = bestVariant([
    { id: 1000001, title: "Lightly Played", price: "3.00", available: true },
    { id: 1000002, title: "Near Mint", price: "4.00", available: true },
  ]);
  assert.equal(v?.variantId, 1000002);
  assert.equal(bestVariant([{ title: "Near Mint", price: "4.00", available: true }])?.variantId, undefined);
  const src = readFileSync(new URL("../src/lib/import.ts", import.meta.url), "utf8");
  assert.match(src, /best && res\.platform === "shopify" && !p\.url \? withShopifyVariant\(productUrl\(store, p\), best\.variantId\)/);
});

test("buy clicks are tagged checkout or product", () => {
  assert.equal(buyClickProps({ retailer: "store:x", page: "card", card: null, surface: null, href: `https://s.example/cart/${ID}:1` }, "/card/x")?.link_type, "checkout");
  assert.equal(buyClickProps({ retailer: "store:x", page: "card", card: null, surface: null, href: PRODUCT }, "/card/x")?.link_type, "product");
});
