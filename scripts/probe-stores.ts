// Check whether a Shopify store can be added to src/lib/stores.ts:
//
//   npx tsx scripts/probe-stores.ts https://store.example AU [https://other.example UK …]
//
// For each store it discovers the One Piece collections (sitemap + the handles
// the importer would read), fetches them with the market's Shopify Markets
// country, and runs every title through the real matcher against the catalogue
// in DATABASE_URL — so the numbers it prints are what the import would match.
// Read-only: it writes nothing.
import { prisma } from "../src/lib/db";
import { normalizeCountry } from "../src/lib/country";
import { buildCardIndex, buildNameIndex, matchByName, matchCardTitle } from "../src/lib/match";
import { fetchStoreProducts } from "../src/lib/store-import";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length % 2) {
    console.error("usage: probe-stores.ts <base-url> <market> [<base-url> <market> …]");
    process.exit(2);
  }
  const cards = await prisma.card.findMany({
    where: { number: { not: null } },
    select: { id: true, name: true, tcgName: true, number: true, variant: true, set: { select: { code: true, name: true, tcgName: true } } },
  });
  const idx = buildCardIndex(cards.map((c) => ({ ...c, setCode: c.set.code, setName: c.set.name })));
  const names = buildNameIndex(cards.map((c) => ({ id: c.id, tcgName: c.tcgName, setNames: [c.set.name, c.set.tcgName] })));
  for (let i = 0; i < args.length; i += 2) {
    const base = args[i].replace(/\/+$/, "");
    const country = normalizeCountry(args[i + 1]);
    const store = { key: "probe", name: base, base, country, collections: [] };
    const { products, failed, handles } = await fetchStoreProducts(store);
    const misses: Record<string, number> = {};
    let matched = 0;
    for (const p of products) {
      const m = matchCardTitle(p.title, idx);
      if ("id" in m || matchByName(p.title, names) != null) matched++;
      else misses[m.miss] = (misses[m.miss] ?? 0) + 1;
    }
    console.log(`${base} (${country}): ${handles.length} collections, ${products.length} products, ${matched} matched${failed ? " — A COLLECTION FAILED" : ""}`);
    console.log(`  handles: ${handles.join(", ") || "none"}`);
    console.log(`  misses: ${JSON.stringify(misses)}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
