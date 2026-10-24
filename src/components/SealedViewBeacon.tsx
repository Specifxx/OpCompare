"use client";

import { useEffect } from "react";
import { sendCardView } from "@/lib/card-views";

// Records a sealed-product page view, the way CardViewBeacon does for a card (same
// once-per-day-per-browser guard, same bot and rate limits on the server). The page
// is cached, so a server-side counter would miss most visits. The count ranks which
// products get an eBay price first (lib/ebay-plan.ts HOT_DEMAND_POINTS).
export function SealedViewBeacon({ slug, productId }: { slug: string; productId: number }) {
  useEffect(() => {
    sendCardView(slug, "view", `sealed-${productId}`);
  }, [slug, productId]);
  return null;
}
