// "Other card games on sale" (DECISIONS.md "Sites that grow each other", 2026-11-02): one tile per sister
// card site with its best real store deal or pre-order today, read from the snapshot's family-cluster.json
// through getFamilyFeeds (six hours). One block per page; nothing when no sister has anything or the file
// can't be read. Plain followed links: our own sites, one cluster, no commission. The baseline market (US)
// only: the page is cached once for every visitor.
import { getFamilyFeeds } from "@/lib/data";
import { blockHeading, familyMoney, pickTiles, tileNote, type FamilyFeed } from "@/lib/family-network";

export async function FamilyCluster({ kind }: { kind: "deal" | "preorder" }) {
  let feeds: FamilyFeed[] = [];
  try {
    feeds = await getFamilyFeeds();
  } catch {
    return null;
  }
  const tiles = pickTiles(feeds, { self: "op", cluster: "cards", kind, region: "US", max: 6 });
  if (!tiles.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="other-games">
      <div>
        <h2 id="other-games" className="text-xl font-bold">{blockHeading("cards", kind)}</h2>
        <p className="text-sm text-slate-400">Today&apos;s best store price on each of our sister sites, from their own daily price check.</p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ site, item, more }) => (
          <li key={site.id} className="flex min-w-0 gap-3 rounded-lg border border-ink-800 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- the sister site's own hotlinked photo */}
            {item.image ? <img src={item.image} alt="" aria-hidden="true" className="h-16 w-14 shrink-0 object-contain" loading="lazy" /> : null}
            <div className="min-w-0 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">{site.topic} · {site.name}</p>
              <a href={item.url} rel="noopener" className="line-clamp-2 font-semibold hover:underline">{item.title}</a>
              <p>
                <span className="font-bold tabular-nums">{familyMoney(item.cents, item.currency)}</span> <span className="text-slate-400">at {item.store}</span>
              </p>
              <p className="text-xs text-slate-400">{tileNote(item)}</p>
              {more ? <a href={more} rel="noopener" className="text-xs font-semibold hover:underline">More on {site.name} →</a> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
