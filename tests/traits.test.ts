import { test } from "node:test";
import assert from "node:assert/strict";
import { traitHref, traitHubs } from "../src/lib/traits";

// Trait hubs (/cards/trait/[slug]), 2026-11-01.
test("traits merge by slug under the commoner spelling and skip thin ones", () => {
  const rows: [string, number[], number[]][] = [];
  for (let i = 0; i < 14; i++) rows.push([`OP01-${String(i).padStart(3, "0")}`, [i < 10 ? 0 : 1, 2], []]);
  rows.push(["OP02-001", [3], []]);
  const hubs = traitHubs({ types: ["FILM", "Film", "Straw Hat Crew", "Rare Crew"], kws: [], rows });
  assert.deepEqual(hubs.map((h) => [h.slug, h.name, h.numbers.size]), [["film", "FILM", 14], ["straw-hat-crew", "Straw Hat Crew", 14]]);
  assert.equal(traitHref(hubs, "Film"), "/cards/trait/film");
  assert.equal(traitHref(hubs, "Rare Crew"), null);
});
