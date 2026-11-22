// This site's giveaway (owner, 2026-11-22: "Let's get all these sites a giveaway feature ... every 2 months"). The draw, the
// points and the accounts live on RiftCompare (Specifxx/TCGEmpire lib/giveaway.ts, the "op" entry, which must say the same
// prize and dates); this file holds only what the static /giveaway page shows. OP Compare's own accounts are separate, so the
// giveaway confirms the entrant's email through RiftCompare (components/giveaway/GiveawayEnter.tsx). DECISIONS.md, 2026-11-22.
export const GIVEAWAY_SERVICE = "https://riftcompare.com";
export const GIVEAWAY_SITE = "op";

export const GIVEAWAY = {
  key: "op-op18-2026-12",
  title: "Win an OP-18 The Dominance of God booster pack",
  prizeShort: "an OP-18 booster pack",
  prize: "One One Piece Card Game The Dominance of God (OP-18) booster pack",
  prizeDetail: "One sealed English booster pack, shipped to anywhere we can legally post it, at our cost.",
  imageUrl: "https://tcgplayer-cdn.tcgplayer.com/product/712904_200w.jpg",
  approxValue: "about A$20 (in stock at Australian stores, 22 Nov 2026)",
  opensAt: "2026-11-22T00:00:00Z",
  closesAt: "2026-12-14T12:59:59Z", // 14 Dec 2026, 23:59 AEDT
  closesText: "14 December 2026 at 11:59 pm Sydney time (AEDT)",
  drawOn: "15 December 2026",
  claimDays: 14,
};

export const ENTRY_POINTS = 10;
export const BONUS_POINTS = 40;
export const PREMIUM_START_POINTS = ENTRY_POINTS + BONUS_POINTS;
export const CHECKIN_POINTS = 5;
export const REFERRAL_POINTS = 25;
export const STAR_REFERRAL_POINTS = 100;
export const STAR_FRIEND_CHECKINS = 3;
export const MAX_REFERRALS = 10;
export const GIVEAWAY_EVERY_MONTHS = 2;

export type GiveawayState = "upcoming" | "open" | "closed";
export function giveawayState(now: Date = new Date()): GiveawayState {
  if (now.getTime() < Date.parse(GIVEAWAY.opensAt)) return "upcoming";
  return now.getTime() <= Date.parse(GIVEAWAY.closesAt) ? "open" : "closed";
}

/** The leaderboard and the winner, CDN-held on RiftCompare for six hours. */
export const LEADERBOARD_URL = `${GIVEAWAY_SERVICE}/api/giveaway/leaderboard?site=${GIVEAWAY_SITE}`;

export const GIVEAWAY_SITE_NAME = "OP Compare";
export const GIVEAWAY_GAME = "One Piece Card Game";
export const GIVEAWAY_IP_OWNER = "Bandai and Eiichiro Oda / Shueisha";
export const GIVEAWAY_CONTACT = "compareempire@gmail.com";
export const GIVEAWAY_DISCORD = "";
