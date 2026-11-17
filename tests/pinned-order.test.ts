import test from "node:test";
import assert from "node:assert/strict";

import { pinnedOrder } from "../src/lib/pinned-order";

const e = { source: "ebay", priceCents: 500 };
const t = { source: "tcgplayer", priceCents: 450 };

test("the cheaper of eBay and TCGplayer leads; eBay on a tie or an unpriced side (owner, 2026-11-17)", () => {
  assert.deepEqual(pinnedOrder(e, t), [t, e]);
  assert.deepEqual(pinnedOrder({ ...e, priceCents: 400 }, t), [{ ...e, priceCents: 400 }, t]);
  assert.deepEqual(pinnedOrder({ ...e, priceCents: 450 }, t), [{ ...e, priceCents: 450 }, t]);
  assert.deepEqual(pinnedOrder({ ...e, priceCents: 0 }, t), [t, { ...e, priceCents: 0 }].reverse().reverse());
  assert.deepEqual(pinnedOrder(null, t), [t]);
  assert.deepEqual(pinnedOrder(e, null), [e]);
  assert.deepEqual(pinnedOrder(null, null), []);
});
