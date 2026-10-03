import { NextResponse } from "next/server";
import { getCatalog, getSealedCatalog } from "@/lib/data";
import { getCountry } from "@/lib/get-country";
import { headline } from "@/lib/price";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";
import { norm, searchCards } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json({ hits: [] });
  const country = getCountry();
  const [cat, sealed] = await Promise.all([getCatalog(), getSealedCatalog()]);
  const cards = searchCards(cat.cards, cat.setById, q, 7).map((c) => {
    const h = headline(c, country);
    return {
      kind: "card" as const,
      slug: c.slug,
      name: c.name,
      number: c.number,
      variant: c.variant,
      set: cat.setById.get(c.setId)?.code ?? "",
      img: c.hasImage ? cardImage.thumb(c.id) : null,
      price: h.cents == null ? "—" : `${h.kind === "reference" ? "≈ " : ""}${money(h.cents, country)}`,
    };
  });
  const words = norm(q).split(" ");
  const sealedHits = sealed
    .filter((s) => /box|deck|pack|case/i.test(s.kind) && words.every((w) => norm(s.name).includes(w)))
    .slice(0, 3)
    .map((s) => {
      const h = headline(s, country);
      return {
        kind: "sealed" as const,
        slug: s.slug,
        name: s.name,
        number: null,
        variant: null,
        set: s.kind,
        img: s.imageUrl ? s.imageUrl.replace("_in_1000x1000", "_200w") : null,
        price: h.cents == null ? "—" : `${h.kind === "reference" ? "≈ " : ""}${money(h.cents, country)}`,
      };
    });
  return NextResponse.json({ hits: [...cards, ...sealedHits].slice(0, 8) }, { headers: { "Cache-Control": "private, max-age=60" } });
}
