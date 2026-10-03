// Every themed colour token tailwind.config.ts names must be defined in BOTH
// palettes in globals.css (RiftCompare's tests/theme.test.ts rule).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const config = fs.readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
const block = (sel: RegExp) => {
  const m = sel.exec(css);
  assert.ok(m, `missing ${sel}`);
  return css.slice(m.index, css.indexOf("}", m.index));
};

test("every themed token exists in the dark and light palettes", () => {
  const names = [...config.matchAll(/v\("([a-z0-9-]+)"\)/g)].map((m) => m[1]);
  assert.ok(names.length > 20);
  const dark = block(/^:root \{/m);
  const light = block(/^:root\[data-theme="light"\] \{/m);
  for (const n of new Set(names)) {
    assert.match(dark, new RegExp(`--c-${n}:`), `dark is missing --c-${n}`);
    assert.match(light, new RegExp(`--c-${n}:`), `light is missing --c-${n}`);
  }
});
