import { getChaseStrip } from "@/lib/data";
import type { ChaseTile } from "@/lib/listing-panel";
import { EbayChaseStrip } from "./EbayChaseStrip";
import { TcgplayerChaseStrip } from "./TcgplayerChaseStrip";

/** Server wrapper: one cached loader, any error renders nothing. The TCGplayer
 *  strip of the same cards follows the eBay one (2026-10-28) unless `tcgplayer={false}`. */
export async function EbayChase({ page, heading, limit, className, variant, tcgplayer = true }: { page: string; heading?: string; limit?: number; className?: string; variant?: "strip" | "banner"; tcgplayer?: boolean }) {
  let tiles: ChaseTile[] = [];
  try {
    tiles = await getChaseStrip();
  } catch {
    tiles = [];
  }
  const ebay = <EbayChaseStrip tiles={tiles} page={page} {...(heading ? { heading } : {})} {...(limit ? { limit } : {})} {...(className ? { className } : {})} {...(variant ? { variant } : {})} />;
  if (!tcgplayer) return ebay;
  return (
    <>
      {ebay}
      <TcgplayerChaseStrip tiles={tiles} page={page} {...(limit ? { limit } : {})} className="mt-6" />
    </>
  );
}
