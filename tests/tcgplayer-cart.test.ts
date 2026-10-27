import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tcgplayerCartUrl } from "../src/lib/tcgplayer-cart";
import { affiliateUrl } from "../src/lib/affiliate";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("a deck becomes one TCGplayer Mass Entry cart, names only", () => {
  const u = new URL(tcgplayerCartUrl([{ qty: 4, name: " Monkey.D.Luffy " }, { qty: 0, name: "Nami" }, { qty: 2, name: "Roronoa Zoro" }]));
  assert.equal(u.origin + u.pathname, "https://www.tcgplayer.com/massentry");
  assert.equal(u.searchParams.get("productline"), "One Piece Card Game");
  assert.equal(u.searchParams.get("c"), "4 Monkey.D.Luffy||2 Roronoa Zoro");
});

test("the cart link is affiliate-wrapped on the deck page and in the deck builder", () => {
  assert.match(affiliateUrl(tcgplayerCartUrl([{ qty: 1, name: "Nami" }]), "tcgplayer_cart", "/deck"), /^https:\/\/partner\.tcgplayer\.com\//);
  assert.match(read("src/app/decks/[slug]/page.tsx"), /tcgplayerCartHref=\{affiliateUrl\(tcgplayerCartUrl\(/);
  for (const f of ["src/components/decks/PublishedDeckView.tsx", "src/components/DeckBuilder.tsx"]) {
    assert.match(read(f), /Buy all on TCGplayer/, f);
    assert.match(read(f), /data-page="deck_cart"/, f);
  }
});
