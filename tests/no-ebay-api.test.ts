// OP Compare never spends the eBay Browse API quota (it belongs to RiftCompare):
// eBay appears only as search links we build. This fails if any source file
// names an eBay API host, OAuth endpoint or Browse API path.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const FORBIDDEN = [/api\.ebay\.com/i, /api\.sandbox\.ebay\.com/i, /identity\/v1\/oauth2/i, /buy\/browse\/v1/i, /EBAY_CLIENT_(ID|SECRET)/];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(p);
    return /\.(ts|tsx|js|mjs|yml|yaml)$/.test(e.name) ? [p] : [];
  });
}

test("no eBay API calls anywhere", () => {
  const files = [...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "scripts")), ...(fs.existsSync(path.join(ROOT, ".github")) ? walk(path.join(ROOT, ".github")) : [])];
  const hits: string[] = [];
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${path.relative(ROOT, f)}: ${re}`);
  }
  assert.deepEqual(hits, []);
});
