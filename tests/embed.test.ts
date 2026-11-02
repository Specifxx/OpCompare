import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { badgeHtml, embedSnippet, marketParam } from "../src/lib/embed";

test("marketParam falls back to the US", () => {
  assert.equal(marketParam("uk"), "UK");
  assert.equal(marketParam("xx"), "US");
  assert.equal(marketParam(null), "US");
});

test("the badge is noindex, escapes text and links back; the snippet carries a plain text link", () => {
  const h = badgeHtml({ site: "S", name: "<b>x</b>", meta: "m", price: "$1.00", sub: "s", href: "https://e.com/card/a", image: null });
  assert.match(h, /name="robots" content="noindex"/);
  assert.ok(!h.includes("<b>x</b>"));
  assert.match(h, /href="https:\/\/e\.com\/card\/a"/);
  assert.match(embedSnippet("https://e.com", "S", "a", "A", "t"), /<a href="https:\/\/e\.com\/card\/a">A price on S<\/a>/);
});

test("only the widgets can be framed, never the rest of the site", () => {
  const cfg = readFileSync("next.config.js", "utf8");
  assert.match(cfg, /source: "\/embed\/:path\+", headers: \[\{ key: "Content-Security-Policy", value: "frame-ancestors \*" \}\]/);
  assert.match(cfg, /"X-Frame-Options", value: "SAMEORIGIN"/);
});
