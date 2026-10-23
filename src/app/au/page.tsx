import type { Metadata } from "next";
import { regionMetadata } from "@/lib/home-metadata";
import { RegionHome } from "@/components/home/RegionHome";

// The AU region home (RiftCompare's /au): the homepage body locked to one
// market, with reciprocal hreflang. Static like "/" (ISR, six hours).
export const revalidate = 21600;

export function generateMetadata(): Promise<Metadata> {
  return regionMetadata("AU");
}

export default function AUHomePage() {
  return <RegionHome region="AU" />;
}
