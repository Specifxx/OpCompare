import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The Discord hub (owner, 2026-11-20): OP Compare's own invite by default, shown with a reason, under the comparison and in the footer.
test("the Discord box links OP Compare's own hub invite, under the comparison", () => {
  assert.match(readFileSync("src/lib/site.ts", "utf8"), /NEXT_PUBLIC_DISCORD_URL \|\| "https:\/\/discord\.gg\/zkUVnPbaHD"/);
  const page = readFileSync("src/app/sealed/[slug]/page.tsx", "utf8");
  assert.ok(page.indexOf("<DiscordCta") > page.indexOf("<PriceBoard"), "the box sits under the price board");
  assert.match(readFileSync("src/components/Footer.tsx", "utf8"), /<DiscordCta /);
  assert.match(readFileSync("src/components/DiscordCta.tsx", "utf8"), /Restock and price-drop alerts/);
});
