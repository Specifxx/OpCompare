// One Piece creators featured on /creators (owner, 2026-11-03: "the creators page
// for all of these sites", formatted like RiftCompare's). A hand-curated list,
// the same convention as RiftCompare's lib/content/creators.ts: no database
// table, no admin UI, just an array a commit edits. Partnerships are agreed one
// at a time, by a person.
//
// THE DEAL. A creator mentions or links OP Compare in their content; in return
// they get a card here (and the creators bubble on the homepage) with their
// socials and a "Buy them a pack" button. That button goes to the creator's OWN
// tip page (Ko-fi, Buy Me a Coffee, Patreon…): OP Compare never handles the
// money and takes no cut, and the page says so.
//
// NOT CALLED "partners" IN ANY URL OR LABEL: that word already means the
// eBay/TCGplayer/Amazon affiliate relationships. "Creators" throughout.
//
// HOW TO ADD ONE: append an entry once a creator has agreed. Use the creator's
// own spelling and handle, and only links they gave us or show publicly. A
// square avatar goes in public/creators/<slug>.webp (or .jpg).

export type CreatorPlatform = "YouTube" | "Twitch" | "TikTok" | "Instagram" | "X" | "Discord" | "Website" | "Email";

export interface CreatorLink {
  platform: CreatorPlatform;
  url: string;
  /** As displayed, e.g. "@handle". */
  handle?: string;
}

export interface Creator {
  /** Stable id, used in analytics: lowercase, hyphens. */
  slug: string;
  name: string;
  /** What they make, one line. */
  blurb: string;
  /** Their channels, most important first. The first is the card's main link. */
  links: CreatorLink[];
  /** Their own tip page. Shown as "Buy them a pack". Omit if they have none. */
  tipUrl?: string;
  /** Short content tags, e.g. "Deck techs", "Pack openings". At most three show. */
  tags?: string[];
  /** Where they're based, if they're happy to say ("AU", "US"...). */
  region?: string;
  /** Their favourite leader or character, shown as a chip. */
  favourite?: string;
  /** A square avatar they supplied, in public/creators/. Initials are used without one. */
  avatar?: string;
  /** ISO date the listing went live. Newest first. */
  since: string;
}

// Empty until the first creator agrees. Example:
//   {
//     slug: "some-creator",
//     name: "Some Creator",
//     blurb: "One Piece deck techs and OP-13 pack openings",
//     links: [
//       { platform: "YouTube", url: "https://youtube.com/@somecreator", handle: "@somecreator" },
//       { platform: "TikTok", url: "https://tiktok.com/@somecreator", handle: "@somecreator" },
//     ],
//     tipUrl: "https://ko-fi.com/somecreator",
//     tags: ["Deck techs", "Pack openings"],
//     region: "AU",
//     favourite: "Luffy",
//     since: "2026-11-10",
//   },
export const CREATORS: Creator[] = [];

/** Newest first. Pure. */
export function featuredCreators(list: Creator[] = CREATORS): Creator[] {
  return [...list].sort((a, b) => b.since.localeCompare(a.since) || a.name.localeCompare(b.name));
}

/** "Some Creator" → "SC". Pure. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Each platform's own colour; white (or dark) text on it reads at 4.5:1 or better. */
export const PLATFORM_STYLE: Record<CreatorPlatform, { bg: string; fg: string }> = {
  YouTube: { bg: "#CC0000", fg: "#fff" },
  Twitch: { bg: "#7A3FD1", fg: "#fff" },
  TikTok: { bg: "#000000", fg: "#fff" },
  Instagram: { bg: "#C13584", fg: "#fff" },
  X: { bg: "#000000", fg: "#fff" },
  Discord: { bg: "#5865F2", fg: "#fff" },
  Website: { bg: "#3f3f46", fg: "#fff" },
  Email: { bg: "#3f3f46", fg: "#fff" },
};
