import { cardOg } from "@/lib/og/images";

// A card's share image: art, printing, rarity and the cheapest price in each
// market, from the cached catalogue (no Offer query).
export const runtime = "nodejs";
export const revalidate = 86400;
// Drawn on its first request, never at build, then served from the ISR cache for
// a day (lib/og/respond.ts). Without this EMPTY list Next 14 treats a [slug]
// route as dynamic and draws the image on every request, whatever `revalidate` says.
export function generateStaticParams() {
  return [];
}
export const alt = "One Piece card price on OP Compare: card art, TCGplayer market price and the cheapest store in each market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { slug: string } }) {
  return cardOg(params.slug);
}
