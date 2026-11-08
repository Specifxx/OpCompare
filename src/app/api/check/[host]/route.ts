import { getStoreCheck } from "@/lib/data";
import { normaliseHost } from "@/lib/link-check";
import { CHECK_HOST } from "@/lib/link-check-build";

// /api/check/<host>: one store's listings for the "Is this a good price?" checker (components/LinkChecker.tsx,
// 2026-11-08). One file from the price snapshot (`check/<host>.json.gz`, written by the import), never Neon, and the
// pasted page is never fetched. A plain function cached by the CDN for a day (a route handler caches only through its
// header); a host we don't read is a 404, cached the same day. A snapshot GitHub won't serve is a 503, never cached.
export const dynamic = "force-dynamic";

const CDN = "public, s-maxage=86400, stale-while-revalidate=86400";
const HEADERS = { "Cache-Control": "public, max-age=3600", "CDN-Cache-Control": CDN, "Vercel-CDN-Cache-Control": CDN };

export async function GET(_req: Request, { params }: { params: { host: string } }) {
  let host = "";
  try {
    host = normaliseHost(decodeURIComponent(params.host).slice(0, 253));
  } catch {
    return new Response("Bad host", { status: 400 });
  }
  if (!CHECK_HOST.test(host)) return new Response("Bad host", { status: 400 });
  try {
    const body = await getStoreCheck(host);
    if (!body) return new Response("Not found", { status: 404, headers: HEADERS });
    return Response.json(body, { headers: HEADERS });
  } catch {
    return new Response("Unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
