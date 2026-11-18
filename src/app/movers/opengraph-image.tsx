import { moversOg } from "@/lib/og/images";

// /movers' own share image (more shareable artefacts, 2026-11-18): this week's five biggest risers.
export const runtime = "nodejs";
export const revalidate = 86400;
export const alt = "One Piece price movers on OP Compare: this week's biggest risers by TCGplayer market price";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return moversOg();
}
