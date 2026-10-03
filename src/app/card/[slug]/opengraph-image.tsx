import { ImageResponse } from "next/og";
import { getCardDetail } from "@/lib/data";
import { money } from "@/lib/format";
import { cardImage } from "@/lib/images";

export const runtime = "nodejs";
export const alt = "One Piece card price on OP Compare";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A card's share image: its art, name, printing and prices. A read error falls
// back to the brand card rather than a 500.
export default async function Image({ params }: { params: { slug: string } }) {
  let card: Awaited<ReturnType<typeof getCardDetail>> = null;
  try {
    card = await getCardDetail(params.slug);
  } catch {
    card = null;
  }
  const us = card?.offers.filter((o) => o.market === "US" && o.inStock).sort((a, b) => a.priceCents - b.priceCents) ?? [];
  const stores = new Set(card?.offers.filter((o) => o.inStock).map((o) => `${o.source}|${o.market}`)).size;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "radial-gradient(circle at 80% 0%, #3a1016 0%, #070c16 65%)", color: "#fff", padding: 50, fontFamily: "sans-serif" }}>
        {card?.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" src={cardImage.large(card.id)} width={380} height={530} style={{ borderRadius: 18, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }} />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", marginLeft: 50, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>
            <span style={{ color: "#ff4d55" }}>OP</span>
            <span>Compare</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{card?.name ?? "One Piece card prices"}</div>
            {card?.variant ? <div style={{ fontSize: 34, color: "#cbd5e1", marginTop: 8 }}>{card.variant}</div> : null}
            {card ? (
              <div style={{ fontSize: 28, color: "#94a3b8", marginTop: 12 }}>{`${card.set.name} · ${card.number ?? card.set.code}`}</div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {card?.marketUsd ? <div style={{ fontSize: 30, color: "#f5c542" }}>{`TCGplayer market ${money(card.marketUsd, "US")}`}</div> : null}
            {us[0] ? <div style={{ fontSize: 40, fontWeight: 800, marginTop: 6 }}>{`From ${money(us[0].priceCents, "US")} in the US`}</div> : null}
            <div style={{ fontSize: 26, color: "#cbd5e1", marginTop: 8 }}>{stores ? `In stock at ${stores} stores · 6 markets compared` : "Prices compared across 6 markets"}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
