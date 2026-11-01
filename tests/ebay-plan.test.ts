// The eBay quota model, enforced by the build (RiftCompare's
// affiliate-priority.test.ts pattern). If a floor, share or interval changes in
// src/lib/ebay-plan.ts, no run may ever spend more than DAILY_CALL_CAP (500)
// Browse calls in 24h (owner, 2026-10-07) — and the methodology copy must say
// the same thing.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DAILY_CALL_CAP,
  DEFAULT_MAX_CALLS,
  DEFAULT_MIN_VALUE_CENTS,
  DEFAULT_QUOTA_RESERVE,
  EBAY_MARKETS,
  EU_MIN_VALUE_CENTS,
  MARKET_SHARES,
  PACING_MS,
  RETRY_RATE as PLAN_RETRY_RATE,
  SINGLE_CALL_COST as PLAN_SINGLE_COST,
  S1_MIN_CENTS,
  SEALED_MIN_CENTS,
  TIER_INTERVAL_HOURS,
  BREAKER_CONSECUTIVE,
  BREAKER_MIN_PAIRS,
  FailureBreaker,
  budgetFor,
  clampLimits,
  duePairs,
  fillPairs,
  HOT_DEMAND_POINTS,
  SINGLES_ABS_MIN_CENTS,
  SEARCH_WEIGHT,
  DEMAND_HALF_DAYS,
  demandPoints,
  pairScore,
  singlesFloor,
  quotaDayStart,
  ebayRunVerdict,
  pairKey,
  envInt,
  isDue,
  marketScope,
  modelDailyCalls,
  parseOnlyMarket,
  planRun,
  rotateMarkets,
  executionOrder,
  tierOf,
  type EbayMarket,
  type Pair,
  type PlanProduct,
} from "../src/lib/ebay-plan";

const ROOT = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ── The model's constants ────────────────────────────────────────────────────
const DAILY_LIMIT = 2500; // OP Compare's approved Browse allowance (owner, 2026-10-07). Raise DAILY_CALL_CAP with it.
const RESERVE = DEFAULT_QUOTA_RESERVE;
const CAP = 2000; // the arithmetic below is pinned at a 2,000 cap; DEFAULT_MAX_CALLS is pinned separately
const SPENDABLE = DAILY_LIMIT - RESERVE;
const RETRY_RATE = 0.05;
const SECONDS_PER_CALL = 0.75; // RiftCompare's measured figure — re-measure after week one
const PACING_SECONDS = PACING_MS / 1000;
const DB_AND_SETUP_MIN = 7;
const STALE_HOURS = Number(/export const STALE_HOURS = (\d+)/.exec(read("src/lib/import.ts"))![1]);
const TIMEOUT_MIN = Number(/timeout-minutes:\s*(\d+)/.exec(read(".github/workflows/ebay-prices.yml"))![1]);

// Tier counts. OP_COMPARE: re-counted from the OP Compare database on
// 2026-10-03 (Card.marketUsd / Sealed.marketUsd; sealed = kinds the eBay pass
// searches). TCGCSV: the spec's TCGCSV product counts (a more pessimistic sealed
// count, since it includes kinds we never search). Both must fit.
const OP_COMPARE = { s1: 390, s2Low: 341, s2High: 268, su: 76, sealed: 140 };
const TCGCSV = { s1: 390, s2Low: 341, s2High: 268, su: 75, sealed: 242 };

test("the model's retry rate is the plan's", () => {
  assert.equal(PLAN_RETRY_RATE, RETRY_RATE);
});

test("the daily ceiling: 2,500 calls, whatever the runs, dispatches or env vars", () => {
  assert.equal(DAILY_CALL_CAP, 2500);
  assert.ok(CAP + RESERVE <= DAILY_LIMIT, "a run at the cap leaves the reserve untouched");
  // A scheduled run and two dispatches land in one day, eBay reporting plenty left each time.
  let spent = 0;
  for (let run = 0; run < 3; run++) spent += budgetFor(DAILY_LIMIT - spent, 9000, RESERVE, null, undefined, { dailyLimit: DAILY_LIMIT, ourSpend24h: spent });
  assert.ok(spent <= DAILY_LIMIT - RESERVE, `${spent} > ${DAILY_LIMIT - RESERVE}`);
  // The modelled catalogue fits the day; the 2,000-call run takes the dearest first and the rest wait.
  for (const counts of [OP_COMPARE, TCGCSV]) {
    const { total, byMarket } = modelDailyCalls(counts);
    assert.ok(total <= DAILY_CALL_CAP, `modelled ${total} > ${DAILY_CALL_CAP}`);
    assert.equal(byMarket.SG, 0);
  }
});

test("shares sum to 1; SG has none; CA singles cost nothing", () => {
  const sum = Object.values(MARKET_SHARES).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.equal(MARKET_SHARES.SG, 0, "SG gets 0% unless an SG programme is added (DECISIONS)");
  assert.deepEqual(marketScope("SG"), { singles: false, sealed: false });
  assert.deepEqual(marketScope("CA"), { singles: false, sealed: true });
  const single: PlanProduct = { id: 1, kind: "single", marketUsd: 50000, number: "OP01-120", launch: false };
  assert.equal(tierOf(single, "CA"), null);
  assert.equal(modelDailyCalls({ s1: 1000, s2Low: 0, s2High: 0, su: 0, sealed: 0 }).byMarket.CA, 0);
});

test("every interval fits the 72h freshness window; S1 (the chase cards) can slip a whole daily run", () => {
  for (const h of Object.values(TIER_INTERVAL_HOURS)) assert.ok(h <= STALE_HOURS, `${h}h > ${STALE_HOURS}h`);
  assert.ok(TIER_INTERVAL_HOURS.S1 + 24 <= STALE_HOURS, "S1 + one missed daily run stays fresh");
});

test("one capped run fits the workflow's timeout with a 25% margin", () => {
  const minutes = (CAP * (SECONDS_PER_CALL + PACING_SECONDS)) / 60 + DB_AND_SETUP_MIN;
  assert.ok(minutes <= 0.75 * TIMEOUT_MIN, `${minutes.toFixed(1)} min > 75% of ${TIMEOUT_MIN}`);
});

test("budgetFor: live count minus reserve, capped per run; a dispatch cap only lowers it", () => {
  assert.equal(budgetFor(null, CAP), CAP);
  assert.equal(budgetFor(2500, CAP), CAP);
  assert.equal(budgetFor(800, CAP), 500);
  assert.equal(budgetFor(300, CAP), 0);
  assert.equal(budgetFor(2500, CAP, RESERVE, "50"), 50);
  assert.equal(budgetFor(2500, CAP, RESERVE, 50), 50);
  assert.equal(budgetFor(700, CAP, RESERVE, "50"), 50);
  assert.equal(budgetFor(320, CAP, RESERVE, "50"), 20);
  const logs: string[] = [];
  for (const bad of ["9999", "0", "-5", "abc"]) assert.equal(budgetFor(2500, CAP, RESERVE, bad, (m) => logs.push(m)), CAP);
  assert.equal(logs.length, 4);
  assert.equal(budgetFor(2500, CAP, RESERVE, ""), CAP);
});

test("budgetFor: a negative reserve is 0, never a budget above the live count", () => {
  assert.equal(budgetFor(300, CAP, -1000), 300);
  assert.equal(budgetFor(300, CAP, -1000, null, undefined, { dailyLimit: 5000 }), 300);
  const logs: string[] = [];
  assert.deepEqual(clampLimits(CAP, -1000, 5000, (m) => logs.push(m)), { cap: CAP, reserve: 0 });
  assert.match(logs.join("\n"), /negative/);
});

test("budgetFor: EBAY_MAX_CALLS is clamped to the spendable day, and DAILY_CALL_CAP holds whatever eBay's limit", () => {
  const logs: string[] = [];
  assert.deepEqual(clampLimits(4400, RESERVE, 2500, (m) => logs.push(m)), { cap: 2200, reserve: RESERVE });
  assert.equal(logs.length, 1);
  assert.equal(budgetFor(2500, 4400, RESERVE, null, undefined, { dailyLimit: 2500 }), 2200);
  // A bigger eBay allowance later still cannot pass our own ceiling until DAILY_CALL_CAP is raised.
  assert.deepEqual(clampLimits(4400, RESERVE, 5000), { cap: 4400, reserve: RESERVE });
  assert.equal(budgetFor(5000, 4400, RESERVE, null, undefined, { dailyLimit: 5000 }), DAILY_CALL_CAP);
  assert.equal(budgetFor(10000, 9000, RESERVE, null, undefined, { dailyLimit: 10000 }), DAILY_CALL_CAP);
});

test("budgetFor: our own last-24h spend counts against the day, known live count or not", () => {
  assert.equal(budgetFor(null, CAP, RESERVE, null, undefined, { ourSpend24h: 0 }), CAP);
  assert.equal(budgetFor(null, CAP, RESERVE, null, undefined, { ourSpend24h: 800 }), 1400); // 2500 − 800 − the 300 reserve
  assert.equal(budgetFor(null, CAP, RESERVE, null, undefined, { ourSpend24h: 2300 }), 0);
  // eBay says plenty is left, but we already spent 2,000 in 24h: the ceiling leaves 500.
  assert.equal(budgetFor(4000, CAP, RESERVE, null, undefined, { ourSpend24h: 2000 }), 500);
  let spent = 0;
  for (let run = 0; run < 3; run++) spent += budgetFor(null, CAP, RESERVE, null, undefined, { ourSpend24h: spent });
  assert.ok(spent <= DAILY_CALL_CAP, `${spent} > ${DAILY_CALL_CAP}`);
});

test("the failure breaker: 10 failed searches in a row, or over half after 50, stop the run", () => {
  const b = new FailureBreaker();
  for (let i = 0; i < BREAKER_CONSECUTIVE - 1; i++) assert.equal(b.record(true), false);
  assert.equal(b.record(true), true);
  assert.match(b.tripped!, /10 failed searches in a row/);
  // Scattered failures: no streak of 10, but more than half of 50+.
  const r = new FailureBreaker();
  let tripped = false;
  for (let i = 0; i < BREAKER_MIN_PAIRS + 10 && !tripped; i++) tripped = r.record(i % 3 !== 0);
  assert.ok(tripped && r.pairs >= BREAKER_MIN_PAIRS && r.failures / r.pairs > 0.5, String(r.tripped));
  // A healthy run with the odd failure never trips.
  const ok = new FailureBreaker();
  for (let i = 0; i < 2000; i++) assert.equal(ok.record(i % 10 === 0), false);
});

test("the run's verdict: red on a refused token, a tripped breaker, or calls spent with nothing completed", () => {
  assert.deepEqual(ebayRunVerdict({ latched: null, spent: 0, completed: 0 }), { ok: true, reason: null });
  assert.equal(ebayRunVerdict({ latched: "budget", spent: 2200, completed: 1700 }).ok, true);
  assert.equal(ebayRunVerdict({ latched: "429", spent: 300, completed: 250 }).ok, true);
  assert.equal(ebayRunVerdict({ tokenRefused: true, latched: null, spent: 0, completed: 0 }).ok, false);
  assert.equal(ebayRunVerdict({ latched: "failures", spent: 10, completed: 0 }).ok, false);
  assert.equal(ebayRunVerdict({ latched: "failures", spent: 900, completed: 600 }).ok, false);
  assert.equal(ebayRunVerdict({ latched: "budget", spent: 40, completed: 0 }).ok, false);
});

test("steady state: one run a day, never past the cap, the dearest pairs never starved", () => {
  // OP_COMPARE's tier counts as products; each run searches every pair it planned.
  const products: PlanProduct[] = [];
  let id = 1;
  const add = (n: number, marketUsd: number | null, extra: Partial<PlanProduct> = {}) => {
    for (let i = 0; i < n; i++) products.push({ id: id++, kind: "single", marketUsd, number: "OP01-001", launch: false, ...extra });
  };
  add(OP_COMPARE.s1, 20000);
  add(OP_COMPARE.s2Low, 5000);
  add(OP_COMPARE.s2High, 9000);
  add(OP_COMPARE.su, null, { launch: true, refUsd: 5000 });
  for (let i = 0; i < OP_COMPARE.sealed; i++) products.push({ id: id++, kind: "sealed", marketUsd: 9000, sealedKind: "Booster Box", launch: false });
  const checks = new Map<string, Date>();
  const t0 = new Date("2026-10-08T05:37:00Z").getTime();
  for (let run = 0; run < 10; run++) {
    const at = new Date(t0 + run * 24 * 3600_000);
    const due = Object.fromEntries(EBAY_MARKETS.map((m) => [m, duePairs(products, m, checks, at)]));
    const plan = planRun(due, CAP, at);
    assert.ok(plan.modelled <= CAP, `run ${run}: ${plan.modelled} > ${CAP}`);
    for (const p of plan.order) checks.set(pairKey(p.productId, p.market), at);
  }
  // After ten days every US S1 card has been searched: the top of the catalogue is never starved.
  const s1Ids = products.filter((p) => p.marketUsd === 20000).map((p) => p.id);
  assert.ok(s1Ids.every((i) => checks.has(pairKey(i, "US"))), "every US S1 pair searched");
});

test("envInt treats an empty GitHub variable as unset, never 0", () => {
  assert.equal(envInt(""), null);
  assert.equal(envInt(undefined), null);
  assert.equal(envInt(" 600 "), 600);
  assert.equal(envInt("abc"), null);
  assert.equal(envInt("0"), 0);
});

test("EBAY_ONLY_MARKET: an unknown code throws; ca is sealed only", () => {
  assert.throws(() => parseOnlyMarket("XX"));
  assert.equal(parseOnlyMarket(""), null);
  assert.equal(parseOnlyMarket("ca"), "CA");
  assert.equal(parseOnlyMarket("gb"), "UK");
  assert.deepEqual(marketScope(parseOnlyMarket("ca")!), { singles: false, sealed: true });
});

test("tiers: S1 / S2 floors per market, unpriced only in a launch window, no DON!!, no loose packs", () => {
  const s = (marketUsd: number | null, extra: Partial<PlanProduct> = {}): PlanProduct => ({ id: 1, kind: "single", marketUsd, number: "OP01-001", launch: false, ...extra });
  assert.equal(tierOf(s(S1_MIN_CENTS), "US"), "S1");
  assert.equal(tierOf(s(DEFAULT_MIN_VALUE_CENTS), "US"), "S2");
  assert.equal(tierOf(s(DEFAULT_MIN_VALUE_CENTS - 1), "US"), null);
  assert.equal(tierOf(s(DEFAULT_MIN_VALUE_CENTS), "EU"), null);
  assert.equal(tierOf(s(EU_MIN_VALUE_CENTS), "EU"), "S2");
  assert.equal(tierOf(s(null), "US"), null);
  // Unpriced in a launch window: only with a store reference price above the floor.
  assert.equal(tierOf(s(null, { launch: true }), "US"), null);
  assert.equal(tierOf(s(null, { launch: true, refUsd: DEFAULT_MIN_VALUE_CENTS }), "US"), "SU");
  assert.equal(tierOf(s(null, { launch: true, refUsd: DEFAULT_MIN_VALUE_CENTS - 1 }), "US"), null);
  assert.equal(tierOf(s(null, { launch: false, refUsd: 50000 }), "US"), null);
  // A printing whose own canonical title can't match it is never searched.
  assert.equal(tierOf(s(S1_MIN_CENTS, { matchable: false }), "US"), null);
  assert.equal(tierOf(s(50000, { number: null }), "US"), null);
  const p = (marketUsd: number | null, sealedKind = "Booster Box", launch = false): PlanProduct => ({ id: 2, kind: "sealed", marketUsd, sealedKind, launch });
  assert.equal(tierOf(p(SEALED_MIN_CENTS), "CA"), "P1");
  assert.equal(tierOf(p(SEALED_MIN_CENTS - 1), "US"), null);
  assert.equal(tierOf(p(9000, "Booster Pack"), "US"), null);
  assert.equal(tierOf(p(null, "Booster Box", true), "UK"), null);
  assert.equal(tierOf({ ...p(null, "Booster Box", true), refUsd: SEALED_MIN_CENTS }, "UK"), "P1");
  assert.equal(tierOf({ ...p(null, "Booster Box", true), refUsd: SEALED_MIN_CENTS - 1 }, "UK"), null);
  assert.equal(tierOf(p(9000), "SG"), null);
});

test("isDue: never searched, then interval minus a 3h grace; force ignores intervals", () => {
  const now = new Date("2026-10-03T05:37:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000);
  assert.ok(isDue(null, "S1", now));
  assert.ok(isDue(ago(47.97), "S1", now)); // checked 05:39 two days ago
  assert.ok(!isDue(ago(44), "S1", now));
  assert.ok(isDue(ago(69), "S2", now));
  assert.ok(!isDue(ago(68), "S2", now));
  assert.ok(isDue(ago(1), "S2", now, true));
});

const now = new Date("2026-10-03T05:37:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3600_000);

test("due order: S1 before S2, never-searched before stale, then most overdue, then value", () => {
  const products: PlanProduct[] = [
    { id: 1, kind: "single", marketUsd: 5000, number: "OP01-001", launch: false }, // S2, never
    { id: 2, kind: "single", marketUsd: 20000, number: "OP01-002", launch: false }, // S1, stale 55h
    { id: 3, kind: "single", marketUsd: 15000, number: "OP01-003", launch: false }, // S1, never
    { id: 4, kind: "single", marketUsd: 90000, number: "OP01-004", launch: false }, // S1, stale 50h
    { id: 5, kind: "single", marketUsd: null, number: "OP16-001", launch: true, refUsd: 4000 }, // SU, never
    { id: 6, kind: "sealed", marketUsd: 12000, sealedKind: "Booster Box", launch: false }, // P1, never
  ];
  const checks = new Map([["2|US", ago(55)], ["4|US", ago(50)]]);
  const due = duePairs(products, "US", checks, now);
  assert.deepEqual(due.map((p) => p.productId), [3, 2, 4, 6, 1, 5]);
});

const pairs = (market: EbayMarket, n: number, kind: "single" | "sealed" = "single"): Pair[] =>
  Array.from({ length: n }, (_, i) => ({ productId: i + 1, market, kind, tier: "S1", marketUsd: 20000 - i, checkedAt: null, cost: kind === "single" ? 1.25 : 1, score: 0 }));;

test("planRun: each market within its share in phase 1, the leftover spills in phase 2", () => {
  const due = { US: pairs("US", 400), UK: pairs("UK", 400), AU: pairs("AU", 400), EU: pairs("EU", 400), CA: pairs("CA", 400, "sealed") };
  const plan = planRun(due, 1000, now, { dayIndex: 0 });
  for (const m of ["US", "UK", "AU", "EU", "CA"] as EbayMarket[]) assert.ok(plan.allowance[m] === Math.floor(1000 * MARKET_SHARES[m]));
  assert.ok(plan.modelled <= 1000);
  // A market with few due pairs hands its share on.
  const thin = planRun({ US: pairs("US", 1000), UK: pairs("UK", 4) }, 1000, now, { dayIndex: 0 });
  assert.equal(thin.used.UK, 5);
  assert.ok(thin.used.US > Math.floor(1000 * MARKET_SHARES.US), "US takes the spill");
  assert.ok(thin.modelled <= 1000 && thin.modelled > 990);
  assert.ok(thin.spill > 0);
  assert.equal(thin.overflow.length, 1000 + 4 - thin.order.length);
});

test("planRun: strict priority — a cheap low-tier pair never jumps a higher-tier one that doesn't fit", () => {
  const s1: Pair = { productId: 1, market: "US", kind: "single", tier: "S1", marketUsd: 20000, checkedAt: null, cost: 1.25, score: 0 };
  const p1: Pair = { productId: 2, market: "US", kind: "sealed", tier: "P1", marketUsd: 9000, checkedAt: null, cost: 1, score: 0 };
  const plan = planRun({ US: [s1, p1] }, 1, now, { only: "US" });
  assert.deepEqual(plan.order, []);
  assert.deepEqual(plan.overflow.map((p) => p.productId), [1, 2]);
});

test("planRun: EBAY_ONLY_MARKET gets the whole budget and nothing spills", () => {
  const plan = planRun({ US: pairs("US", 100) }, 50, now, { only: "US" });
  assert.equal(plan.allowance.US, 50);
  assert.equal(plan.order.length, 40);
  assert.equal(plan.spill, 0);
});

test("planRun: the US runs first every day; the other markets rotate, so each takes the last slot", () => {
  const due = Object.fromEntries((["US", "UK", "AU", "EU", "CA"] as EbayMarket[]).map((m) => [m, pairs(m, 3)]));
  const last = new Set<string>();
  for (let d = 0; d < 4; d++) {
    const plan = planRun(due, 4000, now, { dayIndex: d });
    assert.equal(plan.marketOrder[0], "US");
    assert.equal(plan.order[0].market, "US");
    last.add(plan.marketOrder[plan.marketOrder.length - 1]);
    assert.equal(plan.order[plan.order.length - 1].market, plan.marketOrder[plan.marketOrder.length - 1]);
  }
  assert.deepEqual([...last].sort(), ["AU", "CA", "EU", "UK"]);
  assert.deepEqual(rotateMarkets(["US", "UK"], 3), ["UK", "US"]);
  assert.deepEqual(executionOrder(["UK", "AU"], 1), ["AU", "UK"], "no US due: just the rotation");
  assert.deepEqual(EBAY_MARKETS.slice(0, 5), ["US", "UK", "AU", "EU", "CA"]);
});

test("planRun: the spill goes to the US's due pairs before any other market's", () => {
  // Every market is short of its share except the US and the UK, which both have far more due.
  const plan = planRun({ US: pairs("US", 2000), UK: pairs("UK", 2000), AU: pairs("AU", 2) }, 1000, now, { dayIndex: 0 });
  assert.equal(plan.used.UK, Math.floor(1000 * MARKET_SHARES.UK / 1.25) * 1.25, "the UK keeps its own share and no more");
  assert.ok(plan.used.US > Math.floor(1000 * MARKET_SHARES.US), "the US takes the spill");
  assert.equal(plan.overflow[0].market, "US", "overflow lists the US first");
});

test("the methodology page states the plan's floors and intervals", () => {
  const page = read("src/app/methodology/page.tsx").replace(/\s+/g, " ");
  const usd = (c: number) => `US$${c / 100}`;
  assert.ok(page.includes(`worth ${usd(DEFAULT_MIN_VALUE_CENTS)} or more`), "singles floor");
  assert.ok(page.includes(`(${usd(EU_MIN_VALUE_CENTS)} in the EU)`), "EU floor");
  assert.ok(page.includes(`sealed products worth ${usd(SEALED_MIN_CENTS)} or more`), "sealed floor");
  assert.ok(page.includes(`cards of ${usd(S1_MIN_CENTS)} and up, are refreshed every two days`), "S1 and hot");
  assert.ok(page.includes("visitors search for and open most"), "demand");
  assert.equal(TIER_INTERVAL_HOURS.S1, 48);
  assert.ok(page.includes("the rest every three days, most overdue first"));
  assert.equal(TIER_INTERVAL_HOURS.S2, 72);
  assert.equal(TIER_INTERVAL_HOURS.P1, 72);
  assert.ok(page.includes("Once a day"));
  assert.ok(page.includes("fixed daily budget"));
  assert.equal((read(".github/workflows/ebay-prices.yml").match(/- cron:/g) ?? []).length, 1);
});

test("the per-run cap is the whole daily ceiling: a shared 5,000-call key lets one run spend all 2,500, a 2,500 key still reserves", () => {
  // Owner, 2026-10-09: "use up all the API creds". Yesterday's run started with 5,000
  // left, took 1,600 of 2,500 (a 2,000 cap, 400 spent earlier in the window) and left
  // 1,976 pairs due, 595 never searched in each of UK and AU.
  assert.equal(DEFAULT_MAX_CALLS, DAILY_CALL_CAP);
  assert.equal(budgetFor(5000, DEFAULT_MAX_CALLS, RESERVE, null, undefined, { dailyLimit: 5000, ourSpend24h: 0 }), 2500);
  assert.equal(budgetFor(5000, DEFAULT_MAX_CALLS, RESERVE, null, undefined, { dailyLimit: 5000, ourSpend24h: 400 }), 2100);
  // The ceiling still holds whatever the key reports, and the other site's share is left alone.
  assert.equal(budgetFor(1400, DEFAULT_MAX_CALLS, RESERVE, null, undefined, { dailyLimit: 5000, ourSpend24h: 1610 }), 890);
  assert.equal(budgetFor(5000, DEFAULT_MAX_CALLS, RESERVE, null, undefined, { dailyLimit: 5000, ourSpend24h: 2500 }), 0);
  // An approved 2,500-call key (no other site) still keeps its reserve.
  assert.equal(budgetFor(2500, DEFAULT_MAX_CALLS, RESERVE, null, undefined, { dailyLimit: 2500, ourSpend24h: 0 }), 2200);
});

// ── The floor and demand (owner, 2026-10-24) ─────────────────────────────────
// "We only use the eBay quota for items that are US$20 or more, prioritising the ones people
// search and open, on a rotating basis, sealed included."
const single = (id: number, marketUsd: number | null, o: Partial<PlanProduct> = {}): PlanProduct => ({ id, kind: "single", marketUsd, number: `OP01-${String(id).padStart(3, "0")}`, launch: false, ...o });
const sealedP = (id: number, marketUsd: number | null, o: Partial<PlanProduct> = {}): PlanProduct => ({ id, kind: "sealed", marketUsd, sealedKind: "Booster Box", launch: false, ...o });

test("the floor: nothing under US$20 is ever searched, however hot; the EU's is US$40; the env can only raise it", () => {
  assert.equal(SINGLES_ABS_MIN_CENTS, 2000);
  assert.equal(SEALED_MIN_CENTS, 2000);
  for (const m of ["US", "UK", "AU", "EU"] as EbayMarket[]) {
    assert.equal(tierOf(single(1, 1999, { demand: 500 }), m), null, `${m}: a US$19.99 card with huge demand`);
    assert.equal(tierOf(single(2, 500, { demand: 500 }), m), null, `${m}: a US$5 card with huge demand`);
  }
  assert.notEqual(tierOf(single(3, 2000), "US"), null, "US$20 is in");
  assert.equal(tierOf(single(3, 2000), "EU"), null, "US$20 is under the EU floor");
  assert.notEqual(tierOf(single(3, 4000), "EU"), null);
  assert.equal(tierOf(sealedP(4, 1999, { demand: 500 }), "US"), null, "sealed under US$20 is never searched either");
  assert.notEqual(tierOf(sealedP(4, 2000), "US"), null);
  assert.equal(singlesFloor("US", 100), 2000, "an env floor below US$20 is ignored");
  assert.equal(singlesFloor("US", 5000), 5000, "and one above it raises it");
  assert.equal(singlesFloor("EU", 2000), EU_MIN_VALUE_CENTS);
  // Nothing under the floor is due, whatever the checks say.
  const prods = [single(1, 500, { demand: 99 }), single(2, 1500), single(3, 2500), sealedP(4, 1000, { demand: 99 })];
  for (const m of ["US", "UK", "AU", "EU", "CA"] as EbayMarket[]) {
    for (const p of duePairs(prods, m, new Map(), new Date("2026-10-24T12:37:00Z"))) assert.ok((p.marketUsd ?? 0) >= 2000, `${m}: ${p.productId}`);
  }
});

test("demand: hot products (or US$100+ singles) refresh every 48h and go first; the rest rotate every 72h", () => {
  assert.equal(tierOf(single(1, 3000, { demand: HOT_DEMAND_POINTS }), "US"), "S1", "a hot US$30 card");
  assert.equal(tierOf(single(1, 3000, { demand: HOT_DEMAND_POINTS - 1 }), "US"), "S2", "one point short");
  assert.equal(tierOf(single(2, S1_MIN_CENTS), "US"), "S1", "a chase card needs no demand");
  assert.equal(tierOf(sealedP(3, 5000, { demand: HOT_DEMAND_POINTS }), "US"), "S1", "a hot sealed product");
  assert.equal(tierOf(sealedP(3, 5000), "US"), "P1", "a quiet one rotates");
  const now = new Date("2026-10-24T12:37:00Z");
  const hot = single(10, 2500, { demand: 40 });
  const cold = single(11, 90000 - 85000 + 2000);
  const prods = [cold, hot];
  const due = duePairs(prods, "US", new Map(), now);
  assert.deepEqual(due.map((p) => p.productId), [10, 11], "hot (S1) before a never-searched cold card, though the cold one is dearer");
});

test("rotation inside a tier: most overdue first, then the higher score (price × demand), never the price alone", () => {
  const now = new Date("2026-10-24T12:37:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000);
  const prods = [single(1, 2100, { demand: 8 }), single(2, 9000, { demand: 0 }), single(3, 2500, { demand: 0 })];
  // All never searched: the score decides. 21×9=189 > 90×1=90 > 25×1=25.
  assert.deepEqual(duePairs(prods, "US", new Map(), now).map((p) => p.productId), [1, 2, 3]);
  // The more overdue goes first, whatever its score.
  const checks = new Map([[pairKey(1, "US"), ago(73)], [pairKey(2, "US"), ago(100)], [pairKey(3, "US"), ago(80)]]);
  assert.deepEqual(duePairs(prods, "US", checks, now).map((p) => p.productId), [2, 3, 1]);
  // A tight budget keeps the hot pairs and leaves the cold ones waiting.
  const hotAndCold = [...Array.from({ length: 5 }, (_, i) => single(100 + i, 3000, { demand: 50 })), ...Array.from({ length: 50 }, (_, i) => single(200 + i, 30000))];
  const plan = planRun({ US: duePairs(hotAndCold, "US", new Map(), now) }, 20, now, { only: "US" });
  assert.ok(plan.order.slice(0, 5).every((p) => p.productId >= 100 && p.productId < 105), "the five hot cards are first");
});

test("demandPoints and pairScore: a search is worth SEARCH_WEIGHT views, stale demand counts half, price × (1 + demand)", () => {
  const now = new Date("2026-10-24T00:00:00Z");
  assert.equal(demandPoints(0, 0, null, now), 0);
  assert.equal(demandPoints(2, 4, now, now), 2 * SEARCH_WEIGHT + 4);
  assert.equal(demandPoints(2, 4, new Date(now.getTime() - (DEMAND_HALF_DAYS + 1) * 86_400_000), now), (2 * SEARCH_WEIGHT + 4) / 2);
  assert.equal(demandPoints(-5, -5, now, now), 0, "never negative");
  assert.equal(pairScore(5000, 0), 50);
  assert.equal(pairScore(5000, 9), 500);
  assert.equal(pairScore(null, 9), 0);
});

test("fillPairs: only eligible pairs that are not due, tier then oldest, so leftover budget has somewhere to go", () => {
  const now = new Date("2026-10-09T12:37:00Z");
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000);
  const prods: PlanProduct[] = [
    { id: 1, kind: "single", marketUsd: 20000, number: "OP01-120", launch: false },
    { id: 2, kind: "single", marketUsd: 5000, number: "OP01-121", launch: false },
    { id: 3, kind: "single", marketUsd: 5000, number: "OP01-122", launch: false },
    { id: 4, kind: "single", marketUsd: 5000, number: "OP01-123", launch: false },
    { id: 5, kind: "single", marketUsd: 100, number: "OP01-124", launch: false },
  ];
  const checks = new Map<string, Date>([
    [pairKey(1, "US"), ago(10)], // S1, 48h interval: not due
    [pairKey(2, "US"), ago(50)], // S2, 72h: not due, older
    [pairKey(3, "US"), ago(20)], // S2: not due, newer
    // 4: never searched → due, not a fill pair
    [pairKey(5, "US"), ago(1)], // under the floor: never eligible
  ]);
  const fill = fillPairs(prods, "US", checks, now, { minValueCents: 300 });
  assert.deepEqual(fill.map((p) => p.productId), [1, 2, 3]);
  const due = duePairs(prods, "US", checks, now, { minValueCents: 300 });
  assert.deepEqual(due.map((p) => p.productId), [4]);
  // Together they are every eligible pair, each in exactly one list.
  assert.equal(fill.length + due.length, 4);
});

test("quotaDayStart: eBay's day runs 07:00 UTC to 07:00 UTC, so a drifting schedule never sees yesterday's spend", () => {
  assert.equal(quotaDayStart(new Date("2026-10-09T12:37:00Z")).toISOString(), "2026-10-09T07:00:00.000Z");
  assert.equal(quotaDayStart(new Date("2026-10-09T05:37:00Z")).toISOString(), "2026-10-08T07:00:00.000Z");
  assert.equal(quotaDayStart(new Date("2026-10-09T07:00:00Z")).toISOString(), "2026-10-09T07:00:00.000Z");
  assert.equal(quotaDayStart(new Date("2026-01-01T00:30:00Z")).toISOString(), "2025-12-31T07:00:00.000Z");
  // A noon run is 5h from either edge, so a cron delayed by hours stays in its own day.
  const cron = /cron: "(\d+) (\d+) \* \* \*"/.exec(read(".github/workflows/ebay-prices.yml"))!;
  const hour = Number(cron[2]);
  assert.ok(hour >= 9 && hour <= 16, `run hour ${hour} should sit mid-day, clear of the 07:00 reset and the 07:07/19:07 imports`);
});
