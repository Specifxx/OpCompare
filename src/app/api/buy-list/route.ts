import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { planBuyList, type PlanItem } from "@/lib/buy-list";
import { getCardDetail, getSealedDetail } from "@/lib/data";
import { getCountry } from "@/lib/get-country";
import { isPremium } from "@/lib/premium";
import { sourceLabel } from "@/lib/stores";

export const dynamic = "force-dynamic";
const MAX_ITEMS = 60;

// POST {items: [{slug, kind}]} → the store plan for the visitor's market.
// Premium only: the plan is never computed for anyone else. Reads the same
// self-cached per-product loaders the card and sealed pages use.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isPremium(user, "premium")) return NextResponse.json({ error: "The Buy List Planner is part of Premium.", code: "tier_required" }, { status: 402 });
  const body = (await req.json().catch(() => ({}))) as { items?: { slug?: unknown; kind?: unknown }[] };
  const wanted = (Array.isArray(body.items) ? body.items : [])
    .filter((i) => typeof i?.slug === "string" && i.slug.length < 200)
    .slice(0, MAX_ITEMS) as { slug: string; kind?: unknown }[];
  const market = getCountry();
  const loaded = await Promise.all(
    wanted.map(async (w): Promise<PlanItem | null> => {
      const d = w.kind === "sealed" ? await getSealedDetail(w.slug) : await getCardDetail(w.slug);
      if (!d) return null;
      const name = "number" in d && d.number ? `${d.name} ${d.number}${d.variant ? ` (${d.variant})` : ""}` : d.name;
      return { slug: d.slug, name, offers: d.offers.filter((o) => o.market === market).map((o) => ({ source: o.source, priceCents: o.priceCents, url: o.url, inStock: o.inStock })) };
    }),
  );
  const items = loaded.filter((x): x is PlanItem => x != null);
  const plan = planBuyList(items);
  const label = (s: string) => sourceLabel(s);
  return NextResponse.json(
    {
      market,
      count: items.length,
      ...plan,
      split: plan.split.map((b) => ({ ...b, store: label(b.source) })),
      single: plan.single.map((b) => ({ ...b, store: label(b.source) })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
