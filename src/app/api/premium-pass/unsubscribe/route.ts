import { giftOptOutTokenValid, optOutOfGiftEmail } from "@/lib/premium-gift-pass-access";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// The 3-day pass email's opt-out (lib/premium-gift-pass.ts, 2026-11-27). GET only shows a confirm button, so a link scanner
// that opens the URL opts nobody out; the button and RFC 8058 one-click both POST. A signed address, no session.
export const dynamic = "force-dynamic";

function page(state: "ask" | "done" | "bad", token = ""): Response {
  const body =
    state === "ask"
      ? `<h1>Unsubscribe from ${SITE_NAME} news?</h1><p>You won't get news or offers from ${SITE_NAME} again. Price alerts you set yourself still arrive.</p><form method="post" action="?t=${encodeURIComponent(token)}"><button type="submit">Unsubscribe</button></form>`
      : state === "done"
        ? `<h1>You're unsubscribed</h1><p>${SITE_NAME} won't send you news or offers again. Price alerts you set yourself still arrive.</p>`
        : `<h1>Link not recognised</h1><p>This link is invalid. Reply to any of our emails and we'll take you off by hand.</p>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${SITE_NAME}</title>
<style>body{margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#374151}main{max-width:460px;margin:60px auto;padding:28px;background:#fff;border:1px solid #e3e6ea;border-radius:14px}.b{font-weight:800;font-size:20px;color:#d62828}h1{font-size:20px;color:#111827}a{color:#d62828;font-weight:700}button{background:#d62828;color:#fff;border:0;border-radius:9px;padding:11px 20px;font-weight:700;font-size:15px;cursor:pointer}</style></head>
<body><main><div class="b">${SITE_NAME}</div>${body}<p><a href="${SITE_URL}">Back to ${SITE_NAME}</a></p></main></body></html>`;
  return new Response(html, { status: state === "bad" ? 400 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  return page(giftOptOutTokenValid(t) ? "ask" : "bad", t);
}

export async function POST(req: Request) {
  const ok = await optOutOfGiftEmail(new URL(req.url).searchParams.get("t")).catch(() => false);
  return page(ok ? "done" : "bad");
}
