import { getCatalog, getSealedCatalog } from "@/lib/data";
import { priceApiFrom } from "@/lib/price-api";

// The free public price file (lib/price-api.ts), from the pages' own catalogue loaders: regenerated at most every six
// hours, and the CDN holds each copy six hours (a route handler caches through its header). Open to every origin.
export const revalidate = 21600;

export async function GET() {
  const [cat, sealed] = await Promise.all([getCatalog(), getSealedCatalog()]);
  return new Response(JSON.stringify(priceApiFrom(cat.cards, sealed, new Date())), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Vercel-CDN-Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
