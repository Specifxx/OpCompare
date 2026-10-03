import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordClick } from "@/lib/beacons";
import { parseClick } from "@/lib/click-event";
import { HOUR, ipKey, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// The outbound-click beacon (RiftCompare's /api/click), fed by the ONE global
// listener OutboundBeacon on every a[data-retailer] click. Always 204: a beacon
// must never surface an error, and bad or rate-limited input is dropped, not
// stored. The account id is the only personal datum, and only when the session
// cookie is there (no DB read for signed-out visitors).
const NO_CONTENT = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  try {
    if (!rateLimit(`click:${ipKey(req)}`, 120, HOUR).ok) return NO_CONTENT();
    const text = await req.text();
    if (text.length > 2_000) return NO_CONTENT();
    const click = parseClick(JSON.parse(text));
    if (!click) return NO_CONTENT();
    const user = await getCurrentUser(); // no DB read without a session cookie
    await recordClick(click, user?.id ?? null);
  } catch {
    /* never fail a beacon */
  }
  return NO_CONTENT();
}
