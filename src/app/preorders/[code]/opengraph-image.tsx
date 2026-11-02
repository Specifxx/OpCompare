import { autoPreorderOg } from "@/lib/og/images";

// /preorders/<code>'s share image: the set's code, name, date and product shots
// from the day-old image catalogue (autoPreorderOg in lib/og/images.tsx).
export const runtime = "nodejs";
export const revalidate = 86400;
export const alt = "One Piece pre-order prices on OP Compare: booster boxes, packs and cases compared across every store we track";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return [];
}

export default function Image({ params }: { params: { code: string } }) {
  return autoPreorderOg(params.code);
}
