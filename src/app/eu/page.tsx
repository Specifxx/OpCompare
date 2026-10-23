import type { Metadata } from "next";
import { regionMetadata } from "@/lib/home-metadata";
import { RegionHome } from "@/components/home/RegionHome";

// The EU region home (RiftCompare's /eu): the homepage body locked to one
// market, with reciprocal hreflang. Static like "/" (ISR, six hours).
export const revalidate = 21600;

export function generateMetadata(): Promise<Metadata> {
  return regionMetadata("EU");
}

export default function EUHomePage() {
  return <RegionHome region="EU" />;
}
