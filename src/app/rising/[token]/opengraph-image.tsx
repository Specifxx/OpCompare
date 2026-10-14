import { risingOg } from "@/lib/og/images";

// A shared Hot 40 link's unfurl: its frozen title beside the top three cards.
export const runtime = "nodejs";
export const revalidate = 86400;
// Drawn on its first request, never at build, then served from the ISR cache for
// a day (lib/og/respond.ts). Without this EMPTY list Next 14 treats a [slug]
// route as dynamic and draws the image on every request, whatever `revalidate` says.
export function generateStaticParams() {
  return [];
}
export const alt = "OP Compare Hot 40 — One Piece cards ranked by demand and price-timing signals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { token: string } }) {
  return risingOg(params.token);
}
