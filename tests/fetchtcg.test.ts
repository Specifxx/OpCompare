import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cents, pickCondition } from "../src/lib/fetchtcg";

test("Fetch's price is dollars; we keep cents", () => {
  assert.equal(cents(1.2), 120);
  assert.equal(cents(0.29), 29);
});

test("Near Mint wins, graded and damaged copies never", () => {
  assert.deepEqual(pickCondition([{ condition: "Light Play", price: 1 }, { condition: "Near Mint", price: 2 }, { condition: "PSA 10", price: 0.5 }]), { condition: "Near Mint", price: 2 });
  assert.equal(pickCondition([{ condition: "PSA 10", price: 10 }, { condition: "Damaged", price: 1 }]), null);
});

test("only the base printing, in its own set, by number and name, matches; a stale or missing file shows nothing", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "fetchtcg-"));
  mkdirSync(path.join(dir, "data", "fetch-live"), { recursive: true });
  const c = (o: object) => ({ s: "[OP01] Romance Dawn", no: "OP01-035", n: "Okiku", f: "Normal", c: "Near Mint", p: 120, u: "https://www.fetchtcg.com/cards/x?utm_source=a", ...o });
  writeFileSync(
    path.join(dir, "data", "fetch-live", "au.json"),
    JSON.stringify({
      fetchedAt: new Date().toISOString(),
      cards: [c({ n: "Okiku (035)" }), c({ f: "Foil", p: 500, n: "Okiku (Parallel)" }), c({ n: "Okiku (SP)", s: "[OP07] 500 Years in the Future", p: 900 }), c({ no: "OP01-036", n: "Twin" }), c({ no: "OP01-036", n: "Twin", p: 99 })],
    }),
  );
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const { fetchRowsFor } = await import("../src/lib/fetchtcg");
    assert.equal(fetchRowsFor({ name: "Okiku", number: "OP01-035", variant: null, finish: "Normal" })?.rows[0].priceCents, 120);
    assert.equal(fetchRowsFor({ name: "Okiku", number: "OP01-035", variant: "Parallel", finish: null }), null);
    assert.equal(fetchRowsFor({ name: "Someone", number: "OP01-035", variant: null, finish: null }), null);
    assert.equal(fetchRowsFor({ name: "Okiku", number: "OP01-035", variant: null, finish: "Foil" }), null, "a base card in the other finish is not this card");
    assert.equal(fetchRowsFor({ name: "Twin", number: "OP01-036", variant: null, finish: null }), null, "two Fetch listings of one card is ambiguous");
    assert.equal(fetchRowsFor({ name: "Okiku", number: null, variant: null, finish: null }), null);
  } finally {
    process.chdir(cwd);
  }
});

test("the feed is never committed and the build reads it", () => {
  assert.match(readFileSync(".gitignore", "utf8"), /^\/data\/fetch-live\/$/m);
  assert.match(readFileSync("package.json", "utf8"), /fetch-fetchtcg\.ts/);
});
