// The stores OP Compare reads, by market. Every entry is a Shopify store that
// RiftCompare already tracks for Riftbound AND that lists One Piece singles
// with card numbers in their titles — checked by scripts/probe-stores.ts on
// 2026-10-03 (store kept when at least 20 One Piece listings carried a card
// number on the first page of its One Piece collections).
//
// `collections` are the One Piece handles the probe found; the importer also
// re-discovers handles from each store's sitemap on every run (lib/store-import.ts),
// so a store that adds a new collection is picked up without a code change.
//
// `currency` is set only where the storefront charges something other than its
// market's currency (carried over from RiftCompare's registry); the importer
// refuses any price whose currency does not match the market it is shown in.
import type { Country } from "./country";

export interface StoreInfo {
  key: string;
  name: string;
  base: string; // origin, no trailing slash
  country: Country;
  collections: string[];
  currency?: string;
}

export const STORES: StoreInfo[] = [
  { key: "atomilicollectables", name: "ATOMILI COLLECTABLES", base: "https://atomilicollectables.com", country: "US", collections: ["one-piece-card-game"] },
  { key: "blackvaultgaming", name: "Black Vault Gaming", base: "https://blackvaultgaming.com", country: "US", collections: ["one-piece-card-game","one-piece-tcg-singles","one-piece-card-game-singles","one-piece-promotion-cards","extra-booster-one-piece-heroines-edition","one-piece-demo-deck-cards"] },
  { key: "capefear", name: "Cape Fear Collectibles", base: "https://www.capefearcollectibles.com", country: "US", collections: ["one-piece-singles"] },
  { key: "cardboardanddie", name: "Cardboard and Die", base: "https://cardboardanddie.com", country: "US", collections: ["one-piece-singles-in-stock"] },
  { key: "danireon", name: "Danireon Cards & Games", base: "https://www.danireon.com", country: "US", collections: ["one-piece-tcg-singles","one-piece-the-azure-seas-seven-singles","one-piece-premium-booster-the-best-vol-2-singles","one-piece-premium-booster-the-best-singles","one-piece-carrying-on-his-will-singles","one-piece-wings-of-the-captain-singles","one-piece-emperors-in-the-new-world-singles","one-piece-romance-dawn-singles","one-piece-pillars-of-strength-singles","one-piece-a-fist-of-divine-speed-singles","one-piece-paramount-war-singles","one-piece-legacy-of-the-master-singles"] },
  { key: "fabricatorsforge", name: "Fabricator's Forge", base: "https://shop.fabricatorsforge.com", country: "US", collections: ["one-piece-singles"] },
  { key: "foxandfable", name: "Fox and Fable Games", base: "https://foxandfablegames.com", country: "US", collections: ["one-piece-singles"] },
  { key: "gachaboba", name: "Gacha Boba", base: "https://gachaboba.com", country: "US", collections: ["one-piece-singles","one-piece-op01-singles","one-piece-op04-singles-1","one-piece-op03-singles","one-piece-op02-singles","one-piece-op04-singles"] },
  { key: "gatorscardden", name: "Gator's Card Den", base: "https://gatorscardden.com", country: "US", collections: ["one-piece-singles"] },
  { key: "gglegends", name: "GG Legends", base: "https://store.gglehi.com", country: "US", collections: ["one-piece-tcg-singles-in-stock","one-piece-more-than-4","one-piece-last-1","one-piece-2-4"] },
  { key: "grognardgames", name: "Grognard Games", base: "https://grognardgames.com", country: "US", collections: ["one-piece-singles"] },
  { key: "hobbiesville", name: "Hobbiesville", base: "https://hobbiesville.com", country: "US", collections: ["one-piece-adventure-on-kamis-island-singles","one-piece-wings-of-the-captain-singles","one-piece-the-azure-seas-seven-singles","one-piece-singles","one-piece-carrying-on-his-will","one-piece-the-worlds-strongest-warriors-singles","one-piece-premium-booster-the-best","one-piece-premium-booster-the-best-vol-2","one-piece-emperors-in-the-new-world","one-piece-a-fist-of-divine-speed","one-piece-kingdoms-of-intrigue-singles","one-piece-the-time-of-battle-singles"] },
  { key: "impactgamingcenter", name: "Impact Gaming Center", base: "https://impactgamingcenter.gg", country: "US", collections: ["one-piece-singles"] },
  { key: "knightandday", name: "Knight and Day Games", base: "https://knightanddaygames.com", country: "US", collections: ["one-piece-singles"] },
  { key: "manyrealms", name: "Many Realms", base: "https://manyrealms.com", country: "US", collections: ["one-piece-singles-under-1","one-piece-singles","one-piece-over-500","one-piece-card-game-sealed"] },
  { key: "mysterymtg", name: "Mystery MTG", base: "https://mysterymtg.com", country: "US", collections: ["one-piece-tcg"] },
  { key: "nexustabletopgames", name: "Nexus Tabletop Games", base: "https://nexustabletopgames.com", country: "US", collections: ["one-piece"] },
  { key: "npcollectibles", name: "NP Collectibles", base: "https://npcollectibles.com", country: "US", collections: ["one-piece-singles"] },
  { key: "onboardgaming", name: "On-Board Gaming", base: "https://on-boardgaming.com", country: "US", collections: ["one-piece-singles"] },
  { key: "phantasma", name: "Phantasma", base: "https://phantasmalv.com", country: "US", collections: ["one-piece-singles"] },
  { key: "pokeboxusa", name: "PokeBox USA", base: "https://www.pokeboxusa.com", country: "US", collections: ["one-piece-card-game-promo-cards-single-cards-english","one-piece-card-game-single-cards-english","one-piece-card-game"] },
  { key: "punkouter", name: "PunkOuter Games", base: "https://punkouter.com", country: "US", collections: ["one-piece-singles-in-stock","one-piece-premium-booster-the-best-vol-2-singles-in-stock","one-piece-500-years-in-the-future-op-07-singles-in-stock","one-piece-emperors-in-the-new-world-op-09-singles-in-stock","one-piece-two-legends-op-08-singles-in-stock","one-piece-wings-of-the-captain-op-06-singles-in-stock","one-piece-premium-booster-the-best-singles-in-stock","one-piece-legacy-of-the-master-singles-in-stock","one-piece-royal-blood-op-10-singles-in-stock","one-piece-awakening-of-the-new-era-op-05-singles-in-stock","one-piece-paramount-war-op-02-singles-in-stock","one-piece-carrying-on-his-will-singles-in-stock"] },
  { key: "shippintexas", name: "Shippin Texas", base: "https://shippintexas.com", country: "US", collections: ["one-piece-singles"] },
  { key: "stompinggrounds", name: "Stomping Grounds TCG", base: "https://singles.stompinggroundstcg.com", country: "US", collections: ["one-piece"] },
  { key: "sweetsandgeeks", name: "Sweets and Geeks", base: "https://sweetsandgeeks.com", country: "US", collections: ["one-piece-tcg-singles-1","one-piece-tcg-singles","one-piece-tcg","one-piece-anime"] },
  { key: "nerdmerchant", name: "The Nerd Merchant", base: "https://thenerdmerchant.com", country: "US", collections: ["one-piece-singles"] },
  { key: "troveofcollectibles", name: "Trove of Collectibles", base: "https://troveofcollectibles.com", country: "US", collections: ["one-piece-tcg-characters"] },
  { key: "vegassingles", name: "Vegas Singles", base: "https://vegas.singles", country: "US", collections: ["one-piece-singles"] },
  { key: "wolfdentcg", name: "Wolf Den Gaming", base: "https://wolfdentcg.com", country: "US", collections: ["one-piece-singles"] },
  { key: "wulfgaming", name: "Wulf Gaming", base: "https://wulfgaming.com", country: "US", collections: ["one-piece-singles-1","one-piece-card-game"] },
  { key: "zamliytcg", name: "Zamliy TCG", base: "https://zamliytcg.com", country: "US", collections: ["one-piece-singles"] },
  { key: "acecollectibles", name: "Ace Collectibles", base: "https://acecollectibles.com.au", country: "AU", collections: ["one-piece-the-time-of-battle","one-piece-the-worlds-strongest-warriors-op-17","one-piece-singles"] },
  { key: "cardbot", name: "Cardbot", base: "https://cardbot.com.au", country: "AU", collections: ["one-piece","one-piece-singles"] },
  { key: "cherry", name: "Cherry Collectables", base: "https://www.cherrycollectables.com.au", country: "AU", collections: ["one-piece-singles","one-piece-card-game-promo","all-one-piece","carrot-one-piece-cards","rebecca-one-piece-cards"] },
  { key: "elementalarcade", name: "Elemental Arcade", base: "https://elementalarcade.com.au", country: "AU", collections: ["one-piece-singles"] },
  { key: "generalgames", name: "General Games Chirnside Park", base: "https://generalgames.com.au", country: "AU", collections: ["one-piece-singles-collection"] },
  { key: "hobbycollectorsaustralia", name: "Hobby Collectors Australia", base: "https://hobbycollectorsaustralia.com.au", country: "AU", collections: ["all-one-piece-singles","all-singles-one-piece-pokemon-riftbound"] },
  { key: "mintcollectables", name: "Mint Collectables", base: "https://mintcollectables.com.au", country: "AU", collections: ["one-piece-singles"] },
  { key: "obsessiongaming", name: "Obsession Gaming", base: "https://obsessiongaming.com.au", country: "AU", collections: ["one-piece-singles","one-piece-1"] },
  { key: "ozzie", name: "Ozzie Collectables", base: "https://www.ozziecollectables.com", country: "AU", collections: ["manufacturer-one-piece-card-game","one-piece-card-game","one-piece-singles","one-piece-trading-cards","one-piece","one-piece-2"] },
  { key: "plenty", name: "Plenty of Games", base: "https://plenty-of-games-au.myshopify.com", country: "AU", collections: ["one-piece-singles-in-stock","one-piece-single","one-piece-all"] },
  { key: "pokebox", name: "PokéBox", base: "https://www.pokebox.com.au", country: "AU", collections: ["black-one-piece-trading-cards-english","blue-one-piece-trading-cards-english","green-one-piece-trading-cards-english","purple-one-piece-trading-cards-english","red-one-piece-trading-cards-english","yellow-one-piece-trading-cards-english","one-piece-card-game-starter-deck-single-cards-english","one-piece-card-game-single-cards-english","one-piece-card-game-promo-cards-single-cards-english","one-piece-card-game-op-09-emperors-in-the-new-world-single-cards-english","one-piece-card-game-op-11-a-fist-of-divine-speed-single-cards-english","one-piece-card-game-op-04-kingdoms-of-intrigue-single-cards-english"] },
  { key: "spellroo", name: "Spellroo Gaming", base: "https://spellroogaming.com.au", country: "AU", collections: ["one-piece-card-game-singles"] },
  { key: "spindown", name: "Spindown", base: "https://spindown.com.au", country: "AU", collections: ["one-piece-singles","one-piece-card-game","one-piece-card-game-the-time-of-battle-singles","one-piece-promotional-cards"] },
  { key: "cardhub", name: "The Card Hub Australia", base: "https://thecardhubaustralia.com.au", country: "AU", collections: ["newly-added-one-piece-card-game","one-piece-card-game-single","greenacre-one-piece-card-game-single","one-piece-card-game-single-in-stock","op13-one-piece-card-game-single","extra-booster-one-piece-heroines-edition","parallel-one-piece","ssp-one-piece-card-game"] },
  { key: "finalboss", name: "The Final Boss Collectables", base: "https://thefinalbosscollectables.com.au", country: "AU", collections: ["one-piece-singles-gl","one-piece-adventure-on-kamis-island-singles-gl","one-piece-two-legends-singles-gl","one-piece-the-time-of-battle-singles-gl","one-piece-carrying-on-his-will-singles-gl","one-piece-wings-of-the-captain-singles-gl","one-piece-the-best-vol-2-singles","one-piece-royal-blood-singles-gl","one-piece-legacy-of-the-master-singles-gl","one-piece-a-fist-of-divine-speed-singles-gl","one-piece-pillars-of-strength-singles-gl"] },
  { key: "thegamesdistrict", name: "The Games District", base: "https://thegamesdistrict.com", country: "AU", collections: ["one-piece-singles","private-all-one-piece-starter-decks","op-pr-one-piece-promotion-cards"] },
  { key: "trollaustraliamelb", name: "Troll Aus Melbourne", base: "https://trollaustraliamelb.com.au", country: "AU", collections: ["one-piece-singles","prb-02-one-piece-card-the-best-vol-2","prb-01-one-piece-card-the-best"] },
  { key: "trollaustralia", name: "Troll Australia", base: "https://www.trollaustralia.com.au", country: "AU", collections: ["one-piece-singles","one-piece-singles-v2","one-piece-cards","one-piece-singles-banner"] },
  { key: "turnordergames", name: "Turn Order Games", base: "https://turnordergames.com.au", country: "AU", collections: ["one-piece-the-card-game-singles"] },
  { key: "boardsandswords", name: "Boards & Swords", base: "https://boardsandswords.co.uk", country: "UK", collections: ["one-piece-singles","one-piece-promotion-cards"] },
  { key: "cardgoblin", name: "Card Goblin", base: "https://www.cardgoblin.shop", country: "UK", collections: ["one-piece-single","one-piece","one-piece-two-legends-op08","unnumbered-promos-one-piece","promos-one-piece","special-tournament-promos-one-piece","one-piece-memorial-collection","one-piece-products"] },
  { key: "dicesaloon", name: "Dice Saloon", base: "https://dicesaloonsingles.co.uk", country: "UK", collections: ["one-piece-promotion-cards","one-piece-singles","one-piece-card-game","cc-onepiece-op15-eb04","one-piece-the-time-of-battle","one-piece-demo-deck-cards"] },
  { key: "evolutiontcg", name: "Evolution Trading Cards", base: "https://evolutiontradingcards.co.uk", country: "UK", collections: ["one-piece-single"] },
  { key: "forbiddenplanet", name: "Forbidden Planet", base: "https://shop.forbiddenplanet.co.uk", country: "UK", collections: ["one-piece-singles","one-piece-single","one-piece-promotion-cards","extra-booster-one-piece-heroines-edition","one-piece-demo-deck-cards"] },
  { key: "impactleague", name: "Impact League TCG", base: "https://impactleaguetcg.co.uk", country: "UK", collections: ["one-piece-singles","cc-onepiece-prb-02","cc-onepiece-prb-01","cc-onepiece-op08","cc-onepiece-op15-eb04","cc-onepiece-op12","cc-onepiece-op04","one-piece-promotion-cards","extra-booster-one-piece-heroines-edition","cc-onepiece-op13","one-piece","cc-onepiece-op11"] },
  { key: "livingrealms", name: "Living Realms", base: "https://livingrealms.co.uk", country: "UK", collections: ["one-piece-promotion-cards","extra-booster-one-piece-heroines-edition","one-piece-demo-deck-cards"] },
  { key: "moxinthehole", name: "Mox in the Hole", base: "https://moxinthehole.co.uk", country: "UK", collections: ["one-piece-singles-in-stock","one-piece-promotion-cards","extra-booster-one-piece-heroines-edition"] },
  { key: "redsun", name: "Red Sun Collectables", base: "https://redsuncollectables.com", country: "UK", collections: ["one-piece"] },
  { key: "spellboundgames", name: "Spellbound Games", base: "https://spellboundgames.co.uk", country: "UK", collections: ["one-piece-single","one-piece-promotion-cards","extra-booster-one-piece-heroines-edition","one-piece-tcg"] },
  { key: "tierzerogames", name: "Tier Zero Games", base: "https://tierzerogames.com", country: "UK", collections: ["one-piece-single"] },
  { key: "totalcards", name: "Total Cards", base: "https://totalcards.net", country: "UK", collections: ["one-piece-best-sellers","one-piece-main-set-1","one-piece-single-cards","one-piece-extra-boosters","one-piece-op14-the-azure-seas-seven","one-piece-op15-adventure-on-kamis-island","one-piece-prb-02-one-piece-card-the-best-vol-2","one-piece-op13-carrying-on-his-will","one-piece-op07-500-years-in-the-future","one-piece-op03-pillars-of-strength","one-piece-op-09-emperors-in-the-new-world","one-piece-op-11-a-fist-of-divine-speed"] },
  { key: "yardsgames", name: "Yard's Games", base: "https://yardsgames.com", country: "UK", collections: ["one-piece-singles"] },
  { key: "chonkycollectibles", name: "Chonky Collectibles", base: "https://chonkycollectibles.com", country: "SG", collections: ["one-piece-singles","one-piece-trading-cards"] },
  { key: "games401", name: "401 Games", base: "https://store.401games.ca", country: "CA", collections: ["one-piece-card-game","one-piece-starter-deck-sets","one-piece-promotional-sets","one-piece-booster-sets","one-piece-special-sets","one-piece-singles","one-piece-card-game-pillars-of-strength","one-piece-paramount-war-singles-sealed","all-one-piece-card-game","one-piece-new-releases","one-piece-romance-dawn","one-piece-awakening-of-the-new-era"] },
  { key: "bananagames", name: "Banana Games & Hobby", base: "https://bananagames.ca", country: "CA", collections: ["one-piece-singles","fix-one-piece-singles","correct-one-piece-singles","one-piece-the-time-of-battle-op16-singles"] },
  { key: "battlegroundgames", name: "Battleground Games", base: "https://battlegroundgames.ca", country: "CA", collections: ["one-piece","one-piece-singles"] },
  { key: "blackrosehobbies", name: "Black Rose Hobbies", base: "https://blackrosehobbies.com", country: "CA", collections: ["one-piece-singles"] },
  { key: "carddynasty", name: "Card Dynasty", base: "https://carddynasty.ca", country: "CA", collections: ["one-piece-singles","one-piece"] },
  { key: "cartessportivesrivesud", name: "Cartes Sportives Rive Sud", base: "https://cartessportivesrivesud.com", country: "CA", collections: ["one-piece-singles"] },
  { key: "danireonca", name: "Danireon Cards & Games", base: "https://www.danireon.com", country: "CA", collections: ["one-piece-tcg-singles","one-piece-the-azure-seas-seven-singles","one-piece-premium-booster-the-best-vol-2-singles","one-piece-premium-booster-the-best-singles","one-piece-carrying-on-his-will-singles","one-piece-wings-of-the-captain-singles","one-piece-emperors-in-the-new-world-singles","one-piece-romance-dawn-singles","one-piece-pillars-of-strength-singles","one-piece-a-fist-of-divine-speed-singles","one-piece-paramount-war-singles","one-piece-legacy-of-the-master-singles"] },
  { key: "derpycards", name: "Derpy Cards", base: "https://derpycards.ca", country: "CA", collections: ["da-one-piece-singles","one-piece","one-piece-trading-card-game-singles","one-piece-1"] },
  { key: "eacollectibles", name: "EA Collectibles", base: "https://eacollectibles.com", country: "CA", collections: ["one-piece-singles-canada","one-piece-heroines-edition-singles"] },
  { key: "eclipsegames", name: "Eclipse Games", base: "https://eclipsegames.ca", country: "CA", collections: ["one-piece-singles","one-piece-high-end"] },
  { key: "empiretradings", name: "Empire Trading", base: "https://www.empiretradings.com", country: "CA", collections: ["one-piece-singles"] },
  { key: "enterthebattlefield", name: "Enter the Battlefield", base: "https://enterthebattlefield.ca", country: "CA", collections: ["one-piece-singles"] },
  { key: "espercards", name: "Esper Cards & Games", base: "https://shop.espercardsandgames.com", country: "CA", collections: ["one-piece-singles"] },
  { key: "freshbrewed", name: "Fresh Brewed Games Ltd.", base: "https://freshbrewed.games", country: "CA", collections: ["one-piece"] },
  { key: "game3", name: "Game 3 TCG & Hobby", base: "https://game3.ca", country: "CA", collections: ["one-piece-singles","one-piece-singles-instock","one-piece","one-piece-best-selection-volume-2-all-products","one-piece-op09-emperors-in-the-new-world","one-piece-op14","one-piece-op15-adventure-on-kamis-island-all-products","one-piece-carrying-on-his-will-op13-all-products","one-piece-op17-the-worlds-strongest-warriors-all-products","one-piece-a-fist-of-divine-speed","one-piece-op16-the-time-of-battle-all-products","one-piece-legacy-of-the-master-all-products"] },
  { key: "itsgametime", name: "Game Time Collectibles", base: "https://itsgametime.ca", country: "CA", collections: ["one-piece-2","one-piece-singles"] },
  { key: "gametime", name: "GameTime/TempsDuJeu", base: "https://game-time.ca", country: "CA", collections: ["one-piece-cartes-a-lunite","op-one-piece-card-the-best-prb-01","op-one-piece-card-the-best-vol-02-prb-02","one-piece","op-one-piece-heroines-edition-eb-03"] },
  { key: "silvergoblin", name: "Gobelin d'Argent - Silver Goblin", base: "https://silvergoblin.cards", country: "CA", collections: ["all-one-piece-card-game-singles","extra-booster-one-piece-heroines-edition-singles"] },
  { key: "gtgames", name: "GT Games", base: "https://gtgames.ca", country: "CA", collections: ["one-piece-single","one-piece-singles","one-piece-4-and-over","one-piece-promotion-cards","extra-booster-one-piece-heroines-edition","extra-booster-one-piece-heroines-edition-vol-2","one-piece-demo-deck-cards"] },
  { key: "heavenscollectibles", name: "Heaven's Collectibles & TCG", base: "https://heavenscollectibles.ca", country: "CA", collections: ["one-piece-singles"] },
  { key: "hobbiesvilleca", name: "Hobbiesville", base: "https://hobbiesville.com", country: "CA", collections: ["one-piece-adventure-on-kamis-island-singles","one-piece-wings-of-the-captain-singles","one-piece-the-azure-seas-seven-singles","one-piece-singles","one-piece-carrying-on-his-will","one-piece-the-worlds-strongest-warriors-singles","one-piece-premium-booster-the-best","one-piece-premium-booster-the-best-vol-2","one-piece-emperors-in-the-new-world","one-piece-a-fist-of-divine-speed","one-piece-kingdoms-of-intrigue-singles","one-piece-the-time-of-battle-singles"] },
  { key: "hobbysag", name: "Hobby Saguenay", base: "https://hobbysag.com", country: "CA", collections: ["one-piece-singles","one-piece-en-stock"] },
  { key: "hpwcards", name: "HPW CARDS INC.", base: "https://hpwcards.com", country: "CA", collections: ["one-piece-singles","all-one-piece-singles","one-piece-singles-extra-booster-anime-25th-collection","extra-booster-one-piece-heroines-edition"] },
  { key: "invasioninc", name: "Invasion Inc", base: "https://invasioncnc.ca", country: "CA", collections: ["one-piece-singles"] },
  { key: "jacksonqueen", name: "Jack's On Queen", base: "https://jacksonqueen.ca", country: "CA", collections: ["one-piece-singles"] },
  { key: "kanzengames", name: "KanZenGames Sports & Collectibles", base: "https://kanzengames.com", country: "CA", collections: ["one-piece-singles-in-stock","one-piece-sealed-singles","one-piece","extra-booster-one-piece-heroines-edition","ebay-one-piece-singles","one-piece-tcg-singles-all","one-piece-sealed","one-piece-tcg-singles-in-stock","one-piece-sealed-in-stock","one-piece-pre-order-1","one-piece-sealed-does-not-include-pre-order","one-piece-sealed-in-stock-no-pre-order"] },
  { key: "boutiquelechevalier", name: "Le Chevalier", base: "https://boutiquelechevalier.com", country: "CA", collections: ["one-piece-singles-all"] },
  { key: "legendarycollectables", name: "Legendary Collectables", base: "https://legendarycollectables.com", country: "CA", collections: ["all-one-piece-singles"] },
  { key: "levelupgames", name: "Level Up Games", base: "https://levelupgames.ca", country: "CA", collections: ["new-one-piece-showcase-singles","one-piece-promotion-cards","extra-booster-one-piece-heroines-edition"] },
  { key: "lotuspetalgaming", name: "Lotus Petal Gaming", base: "https://lotuspetalgaming.com", country: "CA", collections: ["one-piece-singles"] },
  { key: "madmerchantgames", name: "Mad Merchant Cards and Games Limited", base: "https://madmerchantgames.com", country: "CA", collections: ["one-piece"] },
  { key: "merchantsinventory", name: "Merchant's Shop", base: "https://merchantsinventory.ca", country: "CA", collections: ["one-piece-singles"] },
  { key: "northernwartable", name: "Northern War Table", base: "https://northernwartable.com", country: "CA", collections: ["one-piece-singles-test"] },
  { key: "redriotgames", name: "Red Riot Games", base: "https://redriotgames.ca", country: "CA", collections: ["one-piece-op05"] },
  { key: "royaltycardsandcollectibles", name: "Royalty Cards and Collectibles", base: "https://royaltycardsandcollectibles.com", country: "CA", collections: ["one-piece-singles","one-piece-promotion-cards","eb-03-extra-booster-one-piece-heroines-edition-singles"] },
  { key: "skyfoxgames", name: "Sky Fox Games", base: "https://www.skyfoxgames.com", country: "CA", currency: "CAD", collections: ["one-piece-singles-1","one-piece-tcg"] },
  { key: "tapsgames", name: "Taps Games", base: "https://tapsgames.com", country: "CA", collections: ["one-piece-singles","one-piece-singles-high-end"] },
  { key: "vulcancollectibles", name: "Vulcan Collectibles", base: "https://vulcancollectibles.com", country: "CA", collections: ["singles-one-piece","one-piece-singles-in-stock","singles-one-piece-main"] },
  { key: "battlebearkl", name: "Battle Bear Kaiserslautern", base: "https://battle-bear-kl.de", country: "EU", collections: ["one-piece-einzelkarten","one-piece-einzelkarten-bis-10","one-piece-card-game","one-piece-einzelkarten-vitrine","one-piece-alternate-art-einzelkarten"] },
  { key: "battlebearsb", name: "Battle Bear Saarbr\\u00fccken", base: "https://www.battle-bear-sb.de", country: "EU", collections: ["one-piece-einzelkarten","one-piece-einzelkarten-bis-10","one-piece-alternate-art-einzelkarten","one-piece-card-game","one-piece-einzelkarten-vitrine"] },
  { key: "elduelista", name: "El Duelista", base: "https://www.elduelista.com", country: "EU", collections: ["one-piece-single","unnumbered-promos-one-piece","promos-one-piece","special-tournament-promos-one-piece","premium-bandai-products-one-piece","judge-promos-one-piece","winner-cards-one-piece"] },
  { key: "endturn", name: "End Turn", base: "https://www.endturn.pt", country: "EU", collections: ["one-piece-single","unnumbered-promos-one-piece","promos-one-piece","starter-deck-one-piece-film-edition","reprints-one-piece","premium-bandai-products-one-piece","judge-promos-one-piece","special-tournament-promos-one-piece"] },
  { key: "gsgameon", name: "GS-GameOn", base: "https://www.gs-gameon.com", country: "EU", collections: ["one-piece-single","onepiece","unnumbered-promos-one-piece","carte-gradate-one-piece","special-tournament-promos-one-piece","promos-one-piece","judge-promos-one-piece","premium-bandai-products-one-piece","one-piece-products","sigillati-one-piece","prodotti-giapponesi-one-piece","one-piece-promo-products"] },
  { key: "lichcards", name: "Lichcards", base: "https://lichcards.nl", country: "EU", collections: ["one-piece-single"] },
  { key: "manamarketeu", name: "Mana Market EU", base: "https://manamarket.eu", country: "EU", collections: ["one-piece-single","one-piece-singles","one-piece","promos-one-piece"] },
  { key: "nordiclegends", name: "Nordic Legends", base: "https://nordic-legends.com", country: "EU", collections: ["one-piece-single","unnumbered-promos-one-piece","promos-one-piece"] },
  { key: "trextcg", name: "T-REX TCG", base: "https://www.t-rextcg.com", country: "EU", collections: ["one-piece-single","unnumbered-promos-one-piece","promos-one-piece","special-tournament-promos-one-piece","judge-promos-one-piece","starter-deck-one-piece-film-edition","premium-bandai-products-one-piece","reprints-one-piece","one-piece-products","one-piece-preconstructed-decks"] },
  { key: "timetwister", name: "Timetwister Games", base: "https://timetwistergames.it", country: "EU", collections: ["one-piece-single","unnumbered-promos-one-piece","promos-one-piece","judge-promos-one-piece","reprints-one-piece","special-tournament-promos-one-piece","starter-deck-one-piece-film-edition","premium-bandai-products-one-piece"] },
  { key: "trinketmage", name: "Trinket Mage", base: "https://trinket-mage.eu", country: "EU", collections: ["one-piece-single"] },
  { key: "universetcg", name: "Universe TCG", base: "https://www.universetcg.com", country: "EU", collections: ["one-piece-single","home-one-piece-singles","unnumbered-promos-one-piece"] },
];

export const STORE_BY_KEY: Record<string, StoreInfo> = Object.fromEntries(STORES.map((s) => [s.key, s]));

export function storesIn(country: Country): StoreInfo[] {
  return STORES.filter((s) => s.country === country);
}

/** "store:cherry" → the store; "tcgplayer" → null. */
export function storeForSource(source: string): StoreInfo | null {
  return source.startsWith("store:") ? STORE_BY_KEY[source.slice(6)] ?? null : null;
}

export function sourceLabel(source: string): string {
  if (source === "tcgplayer") return "TCGplayer";
  return storeForSource(source)?.name ?? source.replace(/^store:/, "");
}
