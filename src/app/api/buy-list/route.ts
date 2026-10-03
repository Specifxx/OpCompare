import { NextResponse } from "next/server";
import { affiliateUrl } from "@/lib/affiliate";
import { getCurrentUser } from "@/lib/auth";
import { retailerSubId } from "@/lib/board";
import { isBasketSource, planBuyList, type PlanItem, type PlanOffer } from "@/lib/buy-list";
import { cheapestGrades, meetsMinCondition, parseMinCondition, planTotal } from "@/lib/buy-list-condition";
import { getCardDetail, getSealedDetail, type OfferRow } from "@/lib/data";
import { mergeLines, parseDeckList, resolveDeck } from "@/lib/deck";
import { deckIndex } from "@/lib/deck-price";
import { getCountry } from "@/lib/get-country";
import { isPremium } from "@/lib/premium";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { sourceLabel } from "@/lib/stores";

export const dynamic = "force-dynamic";
const MAX_ITEMS = 60;

/** A plan item whose offers keep their condition (for the free total's played count). */
type GradedItem = PlanItem & { offers: (PlanOffer & { condition: string | null })[] };

// POST {source: "watchlist", items: [{slug, kind}]} or {source: "paste", text},
// with {minCondition: "nm" | "lp" | "any"} → the store plan for the visitor's
// market. Any signed-in account gets its own TOTAL (RiftCompare's free Best
// Basket taste) at any condition, with how many of its cheapest copies are
// played; the minimum condition and the store-by-store plan (store names,
// picks and links) are Premium, as on RiftCompare, and are computed into the
// response only for Premium. Reads the same self-cached per-product loaders
// the card and sealed pages use.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const rl = rateLimit(`buy-list:${user.id}`, 30, 60_000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter);
  const premium = isPremium(user, "premium");
  const body = (await req.json().catch(() => ({}))) as { source?: unknown; items?: { slug?: unknown; kind?: unknown }[]; text?: unknown; minCondition?: unknown };
  // The floor is a Premium control: a free total is always "any condition".
  const floor = premium ? parseMinCondition(body.minCondition) : "any";
  const market = getCountry();
  const usable = (offers: OfferRow[]) =>
    offers
      .filter((o) => o.market === market && isBasketSource(o.source) && meetsMinCondition(o, floor))
      .map((o) => ({ source: o.source, priceCents: o.priceCents, url: o.url, inStock: o.inStock, condition: o.condition }));

  let items: GradedItem[];
  let unmatched: string[] = [];
  if (body.source === "paste") {
    const text = typeof body.text === "string" ? body.text.slice(0, 20_000) : "";
    const { cat, idx } = await deckIndex();
    const resolved = mergeLines(resolveDeck(parseDeckList(text), idx));
    unmatched = resolved.filter((r) => !r.card).map((r) => r.line.raw);
    const lines = resolved.filter((r) => r.card).slice(0, MAX_ITEMS);
    const loaded = await Promise.all(
      lines.map(async ({ card, line }): Promise<GradedItem | null> => {
        const c = cat.byId.get(card!.id);
        const d = c ? await getCardDetail(c.slug) : null;
        if (!d) return null;
        // Copies are priced per item: a line of four is four times the store's
        // price (stores publish stock, not quantities; the page says so).
        const qty = line.qty;
        const name = `${qty > 1 ? `${qty}× ` : ""}${d.name}${d.number ? ` ${d.number}` : ""}${d.variant ? ` (${d.variant})` : ""}`;
        return { slug: d.slug, name, offers: usable(d.offers).map((o) => ({ ...o, priceCents: o.priceCents * qty })) };
      }),
    );
    items = loaded.filter((x): x is GradedItem => x != null);
  } else {
    const wanted = (Array.isArray(body.items) ? body.items : [])
      .filter((i) => typeof i?.slug === "string" && i.slug.length < 200)
      .slice(0, MAX_ITEMS) as { slug: string; kind?: unknown }[];
    const loaded = await Promise.all(
      wanted.map(async (w): Promise<GradedItem | null> => {
        const d = w.kind === "sealed" ? await getSealedDetail(w.slug) : await getCardDetail(w.slug);
        if (!d) return null;
        const name = "number" in d && d.number ? `${d.name} ${d.number}${d.variant ? ` (${d.variant})` : ""}` : d.name;
        return { slug: d.slug, name, offers: usable(d.offers) };
      }),
    );
    items = loaded.filter((x): x is GradedItem => x != null);
  }

  const plan = planBuyList(items);
  const headers = { "Cache-Control": "no-store" };
  if (!premium) {
    // The free answer is built from the plan's totals ONLY: no store, pick or
    // link leaves the server for an account without Premium.
    return NextResponse.json({ mode: "total", market, minCondition: floor, count: items.length, unmatched, ...planTotal(plan), ...cheapestGrades(items) }, { headers });
  }
  const page = "/tools/buy-list";
  const tag = <B extends { source: string; picks: { url: string }[] }>(b: B) => ({
    ...b,
    store: sourceLabel(b.source, market),
    picks: b.picks.map((p) => ({ ...p, url: affiliateUrl(p.url, retailerSubId(b.source), page) })),
  });
  return NextResponse.json(
    {
      mode: "plan",
      market,
      minCondition: floor,
      count: items.length,
      unmatched,
      ...plan,
      split: plan.split.map(tag),
      single: plan.single.map(tag),
    },
    { headers },
  );
}
