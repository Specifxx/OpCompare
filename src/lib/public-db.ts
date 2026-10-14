// A read-only, Prisma-SHAPED client over the public data (lib/public-data.ts):
// `publicDb.card`, `.sealed`, `.set` and `.offer`, with findMany, findFirst,
// findUnique, count and groupBy. The catalogue and offers are not in Neon
// (owner, 2026-10-14), but the code that used to ask Postgres for them (the
// alert engine, the newsletter, the inbox, the collection, the admin pages) keeps
// its queries and its tests: it asks this instead, and gets rows built from the
// snapshot's files.
//
// It evaluates the part of Prisma's query language those callers use: equality,
// equals / in / notIn / not / gt / gte / lt / lte / startsWith / endsWith /
// contains, AND / OR / NOT, a relation filter on `set`, orderBy (with
// `{ sort, nulls }`), take, skip, and `select` (nested for `set`). Anything else
// THROWS rather than answering wrongly, so a new kind of query is noticed at once.
// It is not a database: offers are read from the files of the products the query
// can touch (every file when it names none), so scan queries belong in a job.
import { publicCatalog, publicOffers, type PublicCard, type PublicOffer, type PublicSealed, type PublicSet } from "./public-data";

type Json = Record<string, unknown>;
type Where = Json | undefined;

const isDate = (v: unknown): v is Date => v instanceof Date;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v) && !isDate(v);

function cmp(a: unknown, b: unknown): number {
  const x = isDate(a) ? a.getTime() : a;
  const y = isDate(b) ? b.getTime() : b;
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0;
}
const eq = (a: unknown, b: unknown) => (a == null || b == null ? a == null && b == null : cmp(a, b) === 0);

const OPS = new Set(["equals", "in", "notIn", "not", "gt", "gte", "lt", "lte", "startsWith", "endsWith", "contains", "mode"]);

function fieldMatches(value: unknown, cond: unknown): boolean {
  if (!isObj(cond)) return eq(value, cond);
  // A relation filter ({ set: { code: "OP01" } } / { is: … }): the value is the related row.
  if (isObj(value) && !Object.keys(cond).every((k) => OPS.has(k))) return matches(value, ("is" in cond ? cond.is : cond) as Json);
  for (const [op, arg] of Object.entries(cond)) {
    switch (op) {
      case "mode":
        break;
      case "equals":
        if (!eq(value, arg)) return false;
        break;
      case "in":
        if (!(arg as unknown[]).some((x) => eq(value, x))) return false;
        break;
      case "notIn":
        if ((arg as unknown[]).some((x) => eq(value, x))) return false;
        break;
      case "not":
        if (isObj(arg) ? fieldMatches(value, arg) : eq(value, arg)) return false;
        break;
      case "gt":
        if (value == null || !(cmp(value, arg) > 0)) return false;
        break;
      case "gte":
        if (value == null || !(cmp(value, arg) >= 0)) return false;
        break;
      case "lt":
        if (value == null || !(cmp(value, arg) < 0)) return false;
        break;
      case "lte":
        if (value == null || !(cmp(value, arg) <= 0)) return false;
        break;
      case "startsWith":
        if (typeof value !== "string" || !value.startsWith(String(arg))) return false;
        break;
      case "endsWith":
        if (typeof value !== "string" || !value.endsWith(String(arg))) return false;
        break;
      case "contains":
        if (typeof value !== "string" || !value.toLowerCase().includes(String(arg).toLowerCase())) return false;
        break;
      default:
        throw new Error(`publicDb: the filter operator "${op}" is not supported`);
    }
  }
  return true;
}

export function matches(row: Json, where: Where): boolean {
  if (!where) return true;
  for (const [k, cond] of Object.entries(where)) {
    if (k === "AND") {
      if (!(Array.isArray(cond) ? cond : [cond]).every((w) => matches(row, w as Json))) return false;
    } else if (k === "OR") {
      if (!(cond as Json[]).some((w) => matches(row, w))) return false;
    } else if (k === "NOT") {
      if ((Array.isArray(cond) ? cond : [cond]).some((w) => matches(row, w as Json))) return false;
    } else if (!fieldMatches(row[k], cond)) return false;
  }
  return true;
}

type OrderBy = Json | Json[] | undefined;

function sorter(orderBy: OrderBy): ((a: Json, b: Json) => number) | null {
  const list = orderBy == null ? [] : Array.isArray(orderBy) ? orderBy : [orderBy];
  const keys = list.flatMap((o) =>
    Object.entries(o).map(([field, dir]) => {
      const spec = isObj(dir) ? dir : { sort: dir };
      const desc = spec.sort === "desc";
      // Postgres: ascending puts NULLs last, descending first, unless the query says.
      const nullsFirst = spec.nulls ? spec.nulls === "first" : desc;
      return { field, desc, nullsFirst };
    }),
  );
  if (!keys.length) return null;
  return (a, b) => {
    for (const { field, desc, nullsFirst } of keys) {
      const x = a[field];
      const y = b[field];
      if (x == null || y == null) {
        if (x == null && y == null) continue;
        return (x == null ? 1 : -1) * (nullsFirst ? -1 : 1);
      }
      const c = cmp(x, y);
      if (c) return desc ? -c : c;
    }
    return 0;
  };
}

function project(row: Json, select: Json | undefined): Json {
  if (!select) return row;
  const out: Json = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) out[k] = row[k];
    else if (isObj(v) && isObj(v.select) && isObj(row[k])) out[k] = project(row[k] as Json, v.select as Json);
    else if (isObj(v) && isObj(v.select) && row[k] == null) out[k] = null;
    else if (v) throw new Error(`publicDb: the select entry "${k}" is not supported`);
  }
  return out;
}

interface FindArgs {
  where?: Json;
  orderBy?: OrderBy;
  take?: number;
  skip?: number;
  select?: Json;
}

function find(rows: Json[], a: FindArgs = {}): Json[] {
  let out = rows.filter((r) => matches(r, a.where));
  const s = sorter(a.orderBy);
  if (s) out = [...out].sort(s);
  if (a.skip) out = out.slice(a.skip);
  if (a.take != null) out = out.slice(0, a.take);
  return out.map((r) => project(r, a.select));
}

/** `{ productId_source_market: { … } }` compound keys become plain equality filters. */
function uniqueWhere(where: Json): Json {
  const out: Json = {};
  for (const [k, v] of Object.entries(where)) {
    if (k.includes("_") && isObj(v)) Object.assign(out, v);
    else out[k] = v;
  }
  return out;
}

function groupBy(rows: Json[], a: { by: string[]; where?: Json; orderBy?: OrderBy; take?: number } & Json): Json[] {
  const groups = new Map<string, Json[]>();
  for (const r of rows.filter((x) => matches(x, a.where))) {
    const k = JSON.stringify(a.by.map((f) => (isDate(r[f]) ? (r[f] as Date).getTime() : r[f])));
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  const agg = (list: Json[], spec: unknown, fn: (vals: number[]) => number | null) =>
    Object.fromEntries(Object.keys(spec as Json).map((f) => [f, fn(list.map((r) => r[f]).filter((v): v is number => typeof v === "number"))]));
  const out = [...groups.values()].map((list) => {
    const row: Json = Object.fromEntries(a.by.map((f) => [f, list[0][f]]));
    if (a._count) row._count = a._count === true ? list.length : { _all: list.length, ...agg(list, a._count, (v) => v.length) };
    if (a._min) row._min = agg(list, a._min, (v) => (v.length ? Math.min(...v) : null));
    if (a._max) row._max = agg(list, a._max, (v) => (v.length ? Math.max(...v) : null));
    if (a._sum) row._sum = agg(list, a._sum, (v) => (v.length ? v.reduce((x, y) => x + y, 0) : null));
    return row;
  });
  const s = sorter(a.orderBy);
  const sorted = s ? out.sort(s) : out;
  return a.take != null ? sorted.slice(0, a.take) : sorted;
}

/** The product ids a where clause can touch (null: it does not say, so every product). */
export function productHints(where: Where): Set<number> | null {
  if (!where) return null;
  let hint: Set<number> | null = null;
  const narrow = (s: Set<number> | null) => {
    if (!s) return;
    hint = hint ? new Set([...hint].filter((x) => s.has(x))) : s;
  };
  for (const [k, cond] of Object.entries(where)) {
    if (k === "productId") {
      if (typeof cond === "number") narrow(new Set([cond]));
      else if (isObj(cond) && Array.isArray(cond.in)) narrow(new Set(cond.in as number[]));
      else if (isObj(cond) && typeof cond.gte === "number" && typeof cond.lt === "number" && cond.lt - cond.gte <= 4096) {
        narrow(new Set(Array.from({ length: cond.lt - cond.gte }, (_, i) => (cond.gte as number) + i)));
      }
    } else if (k === "AND") {
      for (const w of Array.isArray(cond) ? cond : [cond]) narrow(productHints(w as Json));
    } else if (k === "OR") {
      const branches = (cond as Json[]).map((w) => productHints(w));
      if (branches.every((b) => b)) narrow(new Set(branches.flatMap((b) => [...b!])));
    }
  }
  return hint;
}

const asJson = (rows: unknown[]) => rows as Json[];

function model<T>(rows: () => Promise<T[]>) {
  return {
    findMany: async (a?: FindArgs): Promise<any[]> => find(asJson(await rows()), a),
    findFirst: async (a?: FindArgs): Promise<any | null> => find(asJson(await rows()), { ...a, take: 1 })[0] ?? null,
    findUnique: async (a: { where: Json; select?: Json }): Promise<any | null> => find(asJson(await rows()), { where: uniqueWhere(a.where), take: 1, select: a.select })[0] ?? null,
    count: async (a?: { where?: Json }): Promise<number> => asJson(await rows()).filter((r) => matches(r, a?.where)).length,
    groupBy: async (a: { by: string[]; where?: Json; orderBy?: OrderBy; take?: number } & Json): Promise<any[]> => groupBy(asJson(await rows()), a),
  };
}

const offerModel = {
  findMany: async (a?: FindArgs): Promise<any[]> => find(asJson(await publicOffers(productHints(a?.where) ?? undefined)), a),
  findFirst: async (a?: FindArgs): Promise<any | null> => find(asJson(await publicOffers(productHints(a?.where) ?? undefined)), { ...a, take: 1 })[0] ?? null,
  findUnique: async (a: { where: Json; select?: Json }): Promise<any | null> => {
    const where = uniqueWhere(a.where);
    return find(asJson(await publicOffers(productHints(where) ?? undefined)), { where, take: 1, select: a.select })[0] ?? null;
  },
  count: async (a?: { where?: Json }): Promise<number> => asJson(await publicOffers(productHints(a?.where) ?? undefined)).filter((r) => matches(r, a?.where)).length,
  groupBy: async (a: { by: string[]; where?: Json; orderBy?: OrderBy; take?: number } & Json): Promise<any[]> => groupBy(asJson(await publicOffers(productHints(a.where) ?? undefined)), a),
};

export const publicDb = {
  card: model<PublicCard>(async () => (await publicCatalog()).cards),
  sealed: model<PublicSealed>(async () => (await publicCatalog()).sealed),
  set: model<PublicSet>(async () => (await publicCatalog()).sets),
  offer: offerModel,
};

export type PublicDb = typeof publicDb;
export type { PublicCard, PublicOffer, PublicSealed, PublicSet };

/**
 * Attach each row's card (`row.card`), for private rows that point at a card by
 * id (a price alert, a collection line): the join to Card is gone with the
 * table, so the cards are read from the public data in ONE query. A row that
 * already carries its `card` (a test's stub) keeps it; a row whose card the
 * catalogue no longer has is dropped, as the old cascade deleted it.
 * `source` lets a caller or a test supply the card model.
 */
export async function attachCards<T extends { cardId: number }, C = any>(
  rows: T[],
  select: Json,
  source: Pick<PublicDb["card"], "findMany"> = publicDb.card,
): Promise<(T & { card: C })[]> {
  const stubbed = rows as (T & { card?: C })[];
  const need = [...new Set(stubbed.filter((r) => !r.card).map((r) => r.cardId))];
  const byId = new Map<number, C>(need.length ? ((await source.findMany({ where: { id: { in: need } }, select: { id: true, ...select } })) as (C & { id: number })[]).map((c) => [c.id, c]) : []);
  return stubbed.flatMap((r) => {
    const card = r.card ?? byId.get(r.cardId);
    return card ? [{ ...r, card }] : [];
  });
}

/** The same for rows that point at a sealed product by `sealedId`. */
export async function attachSealed<T extends { sealedId: number }, S = any>(
  rows: T[],
  select: Json,
  source: Pick<PublicDb["sealed"], "findMany"> = publicDb.sealed,
): Promise<(T & { sealed: S })[]> {
  const stubbed = rows as (T & { sealed?: S })[];
  const need = [...new Set(stubbed.filter((r) => !r.sealed).map((r) => r.sealedId))];
  const byId = new Map<number, S>(need.length ? ((await source.findMany({ where: { id: { in: need } }, select: { id: true, ...select } })) as (S & { id: number })[]).map((c) => [c.id, c]) : []);
  return stubbed.flatMap((r) => {
    const sealed = r.sealed ?? byId.get(r.sealedId);
    return sealed ? [{ ...r, sealed }] : [];
  });
}
