// The tag lint (2026-11-19, boardroom: "fail the build if an affiliate tag or customid is missing on a paid row"). A paid row whose
// link lost its eBay campaign, its customid or TCGplayer's Impact wrap earns nothing and nobody notices: the click still works.
// So the build runs this first (scripts/tag-lint.ts, `npm run build`) and stops on any problem, and tests/tag-lint.test.ts runs it in
// CI. It checks the link BUILDERS every paid row goes through, in every market, and that no component hard-codes an eBay or
// TCGplayer link that skips them.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { affiliateUrl, ebayAffiliateUrl, ebaySearchUrl, EBAY_CAMPAIGN_ID, OUT_TCGPLAYER_PATH } from "./affiliate";
import { COUNTRY_LIST } from "./country";

/** "ok", or what is missing from an outbound paid link. */
export function paidLinkProblem(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url, "https://opcompare.app");
  } catch {
    return "not a URL";
  }
  const h = u.hostname.replace(/^www\./, "");
  if (/(^|\.)ebay\.[a-z.]+$/.test(h)) {
    if (u.searchParams.get("campid") !== EBAY_CAMPAIGN_ID) return "eBay link without our campaign";
    if (!u.searchParams.get("customid")) return "eBay link without a customid";
    return null;
  }
  if (u.pathname === OUT_TCGPLAYER_PATH) return u.searchParams.get("sharedid") ? null : "TCGplayer link without a sharedid";
  if (/(^|\.)partner\.tcgplayer\.com$/.test(h)) return null;
  if (/(^|\.)tcgplayer\.com$/.test(h)) return "TCGplayer link not through Impact";
  return "not an eBay or TCGplayer link";
}

export function tagLintProblems(root = process.cwd()): string[] {
  const out: string[] = [];
  const check = (what: string, url: string) => {
    const p = paidLinkProblem(url);
    if (p) out.push(`${what}: ${p}: ${url}`);
  };
  for (const c of COUNTRY_LIST) check(`eBay search ${c.code}`, ebaySearchUrl(c.code, "Monkey.D.Luffy OP01-024", "card-fallback"));
  for (const host of ["www.ebay.com", "www.ebay.com.au", "www.ebay.co.uk", "www.ebay.ca", "www.ebay.es"]) {
    check(`eBay listing ${host}`, ebayAffiliateUrl(`https://${host}/itm/123456789012`, "card"));
  }
  check("TCGplayer product", affiliateUrl("https://www.tcgplayer.com/product/123456", "tcgplayer", "/card"));
  check("TCGplayer search", affiliateUrl("https://www.tcgplayer.com/search/one-piece-card-game/product?q=Luffy", "tcgplayer", "/card"));
  const raw = /href=["'`]https:\/\/(?:www\.)?(?:ebay\.[a-z.]+|tcgplayer\.com)\//;
  for (const dir of ["src/components", "src/app"]) {
    for (const f of walk(join(root, dir))) if (raw.test(readFileSync(f, "utf8"))) out.push(`bare eBay/TCGplayer href in ${f.slice(root.length + 1)}`);
  }
  return out;
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files.push(...walk(p));
    else if (/\.tsx?$/.test(name)) files.push(p);
  }
  return files;
}
