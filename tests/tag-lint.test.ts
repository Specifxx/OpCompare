import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { paidLinkProblem, tagLintProblems } from "../src/lib/tag-lint";

test("every eBay and TCGplayer link builder is tagged in every market, and no bare link is hard-coded", () => {
  assert.deepEqual(tagLintProblems(), []);
});

test("the lint catches what it is for", () => {
  assert.equal(paidLinkProblem("https://www.ebay.com/itm/1"), "eBay link without our campaign");
  assert.equal(paidLinkProblem("https://www.ebay.com/itm/1?campid=5339155912"), "eBay link without a customid");
  assert.equal(paidLinkProblem("https://www.tcgplayer.com/product/1"), "TCGplayer link not through Impact");
});

test("the build runs the tag lint first", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(pkg.scripts.build, /^tsx scripts\/tag-lint\.ts && /);
});
