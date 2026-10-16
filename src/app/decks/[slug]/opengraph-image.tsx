import { deckOg } from "@/lib/og/images";

// A published deck's share image: the deck's title and cost beside its Leader.
export const runtime = "nodejs";
export const revalidate = 86400;
// Drawn on its first request, never at build, then served from the ISR cache for
// a day (lib/og/respond.ts). Without this EMPTY list Next 14 treats a [slug]
// route as dynamic and draws the image on every request, whatever `revalidate` says.
export function generateStaticParams() {
  return [];
}
export const alt = "OP Compare deck: the deck title, what it costs to build and its Leader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { slug: string } }) {
  return deckOg(params.slug);
}
