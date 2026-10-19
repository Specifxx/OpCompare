import { preorderOg } from "@/lib/og/images";

// /op18-preorders' share image: static (no price, no live count), the set's own
// product art read from public/preorders. See preorderOg in lib/og/images.tsx.
export const runtime = "nodejs";
export const revalidate = 86400;
export const alt = "One Piece OP18 pre-order prices on OP Compare: booster boxes, packs and cases compared across every store we track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return preorderOg("OP18");
}
