import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { tierOf } from "@/lib/premium";

export const dynamic = "force-dynamic";

// The header's account state, fetched by the browser only when the oc_auth hint
// cookie says someone is signed in (lib/use-me.ts). Never cached.
export async function GET() {
  const user = await getCurrentUser();
  const tier = tierOf(user);
  return NextResponse.json(
    {
      user: user ? { name: user.displayName, email: user.email, avatar: user.avatarUrl } : null,
      tier,
      adFree: tier != null,
      until: user?.premiumUntil?.toISOString() ?? null,
      admin: user?.isAdmin === true,
      // When the account was made: the Plus/Premium slide-in waits until an
      // account is 48 hours old (lib/nudge-gate.ts).
      createdAt: user?.createdAt?.toISOString() ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
