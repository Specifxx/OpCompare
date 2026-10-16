// Submit every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver) so they
// recrawl now. Run daily by .github/workflows/indexnow.yml. Needs SITE_URL
// (where to read the sitemap) and INDEXNOW_KEY; without the key IndexNow is
// simply off and the run skips quietly.
//
// The request names the host of the sitemap's OWN URLs, never SITE_URL's:
// IndexNow answers 422 to a URL off the request's host, and MTG Compare's runs
// were all 422s for a week because a stale SITE_URL variable named its old
// Vercel host (DECISIONS.md, 2026-10-16). And the run FAILS, with IndexNow's
// answer in the log, when a batch is refused, when the key file never serves
// the key or when the sitemap is empty: a "0 of N submitted" on a green run is
// invisible to the watchdog, which reads the workflow's conclusion.
async function get(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "User-Agent": "opcompare-indexnow" } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}

/** Where a submission goes: the origin of the sitemap's own URLs and only the URLs on it. Null without URLs. */
export function submissionPlan(urls: readonly string[]): { origin: string; host: string; keyLocation: string; urls: string[]; dropped: number } | null {
  const first = urls.find((u) => /^https?:\/\//.test(u));
  if (!first) return null;
  const { origin, host } = new URL(first);
  const same = urls.filter((u) => {
    try {
      return new URL(u).host === host;
    } catch {
      return false;
    }
  });
  return { origin, host, keyLocation: `${origin}/indexnow.txt`, urls: same, dropped: urls.length - same.length };
}

async function main() {
  const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.INDEXNOW_KEY ?? "";
  if (!site || !key) {
    console.log("SITE_URL or INDEXNOW_KEY not set — skipping IndexNow.");
    return;
  }
  const xml = await get(`${site}/sitemap.xml`);
  const plan = submissionPlan([...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/g)].map((m) => m[1]!.replace(/&amp;/g, "&")));
  if (!plan || !plan.urls.length) {
    console.error(`IndexNow: ${site}/sitemap.xml listed no URLs — nothing submitted.`);
    process.exitCode = 1;
    return;
  }
  if (plan.origin !== new URL(site).origin) {
    console.warn(`IndexNow: SITE_URL is ${site} but the sitemap's URLs are on ${plan.origin}; submitting for ${plan.host}. Set the SITE_URL repository variable to ${plan.origin}.`);
  }
  if (plan.dropped) console.warn(`IndexNow: ${plan.dropped} URL(s) not on ${plan.host} left out.`);
  let live = false;
  for (let i = 0; i < 20 && !live; i++) {
    try {
      live = (await get(plan.keyLocation)).trim() === key;
    } catch {
      /* not deployed yet */
    }
    if (!live) await new Promise((r) => setTimeout(r, 10000));
  }
  if (!live) {
    console.error(`IndexNow: ${plan.keyLocation} never served INDEXNOW_KEY — set the same key in Vercel and redeploy. Nothing submitted.`);
    process.exitCode = 1;
    return;
  }
  let sent = 0;
  for (let i = 0; i < plan.urls.length; i += 10000) {
    const batch = plan.urls.slice(i, i + 10000);
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: plan.host, key, keyLocation: plan.keyLocation, urlList: batch }),
    });
    const said = r.ok ? "" : ` — ${(await r.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 500) || "(no body)"}`;
    console.log(`batch ${i / 10000 + 1}: ${batch.length} URLs → HTTP ${r.status}${said}`);
    if (r.ok) sent += batch.length;
  }
  console.log(`IndexNow: ${sent} of ${plan.urls.length} URLs submitted for ${plan.host}.`);
  if (sent < plan.urls.length) {
    console.error("IndexNow refused part of the submission (above): failing the run so the watchdog sees it.");
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("indexnow-submit.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
