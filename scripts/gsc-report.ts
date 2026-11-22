// Google Search Console: submit the sitemap and report indexing. Run daily by
// .github/workflows/search-console.yml.
//
//   GSC_SA_KEY   — service-account JSON key (RiftCompare's works: add its
//                  client_email as a Full user on the OP Compare property)
//   GSC_PROPERTY — "sc-domain:opcompare.app" (Domain property; the workflow's
//                  default) or "https://opcompare.app/" (URL-prefix property)
//   SITE_URL     — https://opcompare.app (the workflow's default)
//
// Submitting a sitemap needs the account to have Full or Owner permission on the
// property; the report itself needs only read access.
import crypto from "node:crypto";
import fs from "node:fs";

const b64 = (b: string | Buffer) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const out: string[] = [];
const say = (s = "") => {
  console.log(s);
  out.push(s);
};

async function token(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/webmasters", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${head}.${claims}`);
  const jwt = `${head}.${claims}.${b64(signer.sign(sa.private_key))}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = (await r.json()) as { access_token?: string };
  if (!j.access_token) throw new Error(`auth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function main() {
  const key = process.env.GSC_SA_KEY;
  const property = process.env.GSC_PROPERTY;
  const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  if (!key || !property || !site) {
    say("GSC_SA_KEY, GSC_PROPERTY or SITE_URL is not set — skipping Search Console.");
    return;
  }
  const sa = JSON.parse(key);
  const at = await token(sa);
  const api = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}`;
  const auth = { Authorization: `Bearer ${at}` };

  const sitemap = `${site}/sitemap.xml`;
  const put = await fetch(`${api}/sitemaps/${encodeURIComponent(sitemap)}`, { method: "PUT", headers: auth });
  say(`## Search Console — ${property}`);
  say(`Sitemap submit ${sitemap}: HTTP ${put.status}${put.status === 403 ? " (the service account needs Full permission on the property)" : ""}`);

  const maps = (await (await fetch(`${api}/sitemaps`, { headers: auth })).json()) as { sitemap?: { path: string; lastDownloaded?: string; errors?: string; warnings?: string; contents?: { submitted?: string; indexed?: string }[] }[] };
  for (const m of maps.sitemap ?? []) {
    const c = m.contents?.[0];
    say(`- ${m.path}: last read ${m.lastDownloaded ?? "never"}, ${c?.submitted ?? "?"} URLs submitted, errors ${m.errors ?? 0}, warnings ${m.warnings ?? 0}`);
  }

  const q = async (body: object) =>
    (await (await fetch(`${api}/searchAnalytics/query`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) })).json()) as {
      rows?: { keys: string[]; clicks: number; impressions: number; position: number }[];
      error?: unknown;
    };
  const pages = await q({ startDate: day(28), endDate: day(2), dimensions: ["page"], rowLimit: 25000 });
  if (pages.error) {
    say(`searchAnalytics error: ${JSON.stringify(pages.error)}`);
  } else {
    const rows = pages.rows ?? [];
    say("");
    say(`Pages with Google impressions (28 days): **${rows.length}**, clicks ${rows.reduce((a, r) => a + r.clicks, 0)}, impressions ${rows.reduce((a, r) => a + r.impressions, 0)}`);
    const queries = await q({ startDate: day(28), endDate: day(2), dimensions: ["query"], rowLimit: 15 });
    say("");
    say("| Query | Clicks | Impressions | Position |");
    say("|---|---|---|---|");
    for (const r of queries.rows ?? []) say(`| ${r.keys[0]} | ${r.clicks} | ${r.impressions} | ${r.position.toFixed(1)} |`);
    pageTables(rows, (await q({ startDate: day(56), endDate: day(29), dimensions: ["page"], rowLimit: 25000 })).rows ?? []);
  }
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
}

type Row = { keys: string[]; clicks: number; impressions: number; position: number };

// The per-page tables the site loop's job D reads (its fix list): the top pages,
// pages Google shows on pages 1-2 that nobody clicks, and the pages gaining and
// losing the most clicks against the 28 days before. Bounded: 15 rows each.
function pageTables(now: Row[], before: Row[]) {
  const path = (u: string) => u.replace(/^https?:\/\/[^/]+/, "") || "/";
  const line = (r: Row) => `| ${path(r.keys[0])} | ${r.clicks} | ${r.impressions} | ${r.impressions ? ((100 * r.clicks) / r.impressions).toFixed(1) : "0.0"}% | ${r.position.toFixed(1)} |`;
  const head = () => {
    say("| Page | Clicks | Impressions | CTR | Position |");
    say("|---|---|---|---|---|");
  };
  say("");
  say("### Top pages by clicks (28 days)");
  head();
  for (const r of [...now].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 15)) say(line(r));
  say("");
  say("### Fix list: shown on Google pages 1-2, clicked least (28 days, 100+ impressions)");
  head();
  for (const r of now
    .filter((r) => r.impressions >= 100 && r.position <= 20)
    .sort((a, b) => a.clicks / a.impressions - b.clicks / b.impressions || b.impressions - a.impressions)
    .slice(0, 15))
    say(line(r));
  const prev = new Map(before.map((r) => [r.keys[0], r.clicks]));
  const cur = new Map(now.map((r) => [r.keys[0], r.clicks]));
  const delta = [...new Set([...now.map((r) => r.keys[0]), ...before.map((r) => r.keys[0])])].map((k) => ({
    k,
    now: cur.get(k) ?? 0,
    before: prev.get(k) ?? 0,
  }));
  for (const [title, list] of [
    ["Gaining", delta.filter((d) => d.now > d.before).sort((a, b) => b.now - b.before - (a.now - a.before))],
    ["Losing", delta.filter((d) => d.now < d.before).sort((a, b) => a.now - a.before - (b.now - b.before))],
  ] as const) {
    say("");
    say(`### ${title} pages (clicks, 28 days vs the 28 before)`);
    say("| Page | Now | Before | Change |");
    say("|---|---|---|---|");
    for (const d of list.slice(0, 15)) say(`| ${path(d.k)} | ${d.now} | ${d.before} | ${d.now - d.before > 0 ? "+" : ""}${d.now - d.before} |`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
