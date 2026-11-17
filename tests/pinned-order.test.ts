import test from "node:test";
import assert from "node:assert/strict";

import { pinnedOrder } from "../src/lib/pinned-order";

const e = { source: "ebay", priceCents: 500 };
const t = { source: "tcgplayer", priceCents: 450 };

test("eBay first, then TCGplayer (owner, 2026-11-17, final)", () => {
  assert.deepEqual(pinnedOrder(e, t), [e, t]);
  assert.deepEqual(pinnedOrder({ ...e, priceCents: 400 }, t), [{ ...e, priceCents: 400 }, t]);
  assert.deepEqual(pinnedOrder(null, t), [t]);
  assert.deepEqual(pinnedOrder(e, null), [e]);
  assert.deepEqual(pinnedOrder(null, null), []);
});
