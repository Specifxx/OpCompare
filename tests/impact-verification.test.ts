// Impact's site-verification tag must sit in the root layout's <head>, exactly in
// Impact's own form (a `value` attribute), so every page carries it.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("the Impact site-verification meta tag is in the root layout head", () => {
  const layout = fs.readFileSync(path.resolve(__dirname, "../src/app/layout.tsx"), "utf8");
  const head = layout.slice(layout.indexOf("<head>"), layout.indexOf("</head>"));
  assert.match(head, /<meta name="impact-site-verification" \{\.\.\.IMPACT_VERIFICATION_ATTR\} \/>/);
  assert.match(layout, /IMPACT_VERIFICATION_ATTR = \{ value: "cd475173-83c8-45d7-a414-7aeea2d17f68" \}/);
});
