// The Compare Empire network's step (lib/family-network.ts, DECISIONS.md "Sites that grow each other",
// 2026-11-02), run by the import and eBay workflows after the snapshot is built and before it is published:
//
//   1. family-feed.json: OP Compare's best sealed deals and pre-orders today, from the snapshot just built
//      (SNAPSHOT_LOCAL_DIR). Sister sites read it from the `snapshot` branch.
//   2. family-cluster.json: the sister card sites' feeds, read from GitHub now, for the "Other card games"
//      block (getFamilyFeeds in lib/data.ts).
//
// Both are written into SNAPSHOT_DIR. Never fails the run: a missing sister is left out.
import fs from "node:fs";
import path from "node:path";
import { FAMILY_ID, familyItems, familyLinks } from "../src/lib/family";
import { CLUSTER_FILE, FEED_FILE, buildFeed, clusterIds, fetchFamilyFeeds, type FamilyCluster } from "../src/lib/family-network";

async function main() {
  const dir = process.env.SNAPSHOT_DIR || ".snapshot-out";
  // The snapshot this job just built (FAMILY_FROM_GITHUB=1 reads the published one instead, for a local try).
  if (!process.env.FAMILY_FROM_GITHUB) process.env.SNAPSHOT_LOCAL_DIR ||= dir;
  const feed = buildFeed(FAMILY_ID, await familyItems(), familyLinks());
  fs.writeFileSync(path.join(dir, FEED_FILE), JSON.stringify(feed, null, 1) + "\n");
  console.log(`[family] ${FEED_FILE}: ${feed.items.length} items`);
  const ids = clusterIds(FAMILY_ID);
  const feeds = await fetchFamilyFeeds(ids);
  console.log(`[family] read ${feeds.length}/${ids.length} sister feeds: ${feeds.map((f) => f.site).join(", ") || "none"}`);
  const out: FamilyCluster = { v: 1, site: FAMILY_ID, fetchedAt: new Date().toISOString(), feeds };
  fs.writeFileSync(path.join(dir, CLUSTER_FILE), JSON.stringify(out) + "\n");
}

main()
  .catch((e) => console.warn("[family] skipped:", e instanceof Error ? e.message : e))
  .finally(() => process.exit(0));
