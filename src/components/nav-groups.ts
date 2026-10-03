// The grouped site navigation, shared by the desktop rail (SideNav), the phone
// menu (MobileMenu) and the footer site map — edit a link here once and all
// three follow. Ported from RiftCompare's nav-groups.ts, One Piece's pages.
export interface NavLink {
  href: string;
  label: string;
  keywords?: string[];
  hideInFooter?: boolean;
}
export interface NavGroup {
  title: string;
  icon: "tag" | "book" | "search" | "wrench" | "compass" | "info";
  links: NavLink[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Prices",
    icon: "tag",
    links: [
      { href: "/browse", label: "Card Database", keywords: ["cards", "search", "singles", "compare prices"] },
      { href: "/price-guide", label: "Price Guide", keywords: ["price list", "card values", "all prices"] },
      { href: "/sealed", label: "Sealed Products", keywords: ["booster box", "packs", "starter deck", "case"] },
      { href: "/market", label: "Market Index", keywords: ["index", "market", "chart", "trend"] },
      { href: "/movers", label: "Weekly Movers", keywords: ["movers", "risers", "fallers", "trending"] },
      { href: "/stores", label: "Stores we track", keywords: ["stores", "shops", "retailers"] },
    ],
  },
  {
    title: "The Card Database",
    icon: "search",
    links: [
      { href: "/sets", label: "Sets & card lists", keywords: ["sets", "set list", "romance dawn", "op01", "booster"] },
      { href: "/leaders", label: "Leaders", keywords: ["leaders", "leader cards", "decks"] },
      { href: "/colors", label: "Colours", keywords: ["colors", "colours", "red", "green", "blue", "purple", "black", "yellow"] },
      { href: "/cards", label: "By type & rarity", keywords: ["rarity", "secret rare", "manga", "parallel", "sp", "treasure rare"] },
      { href: "/cards/all", label: "Every card (A-Z)", keywords: ["all cards", "full list", "a-z"] },
    ],
  },
  {
    title: "Tools",
    icon: "wrench",
    links: [
      { href: "/tools/deal-finder", label: "Deal Finder", keywords: ["deals", "bargains", "cheapest", "undervalued"] },
      { href: "/tools/box-value", label: "Box Value Calc", keywords: ["ev", "box value", "per pack", "is a box worth it"] },
      { href: "/watchlist", label: "My Watchlist", keywords: ["watchlist", "saved", "favourites"] },
    ],
  },
  {
    title: "About",
    icon: "info",
    links: [
      { href: "/about", label: "About OP Compare", keywords: ["about", "who"] },
      { href: "/methodology", label: "How we compare", keywords: ["methodology", "how", "condition", "currency"] },
      { href: "/contact", label: "Contact & feedback", keywords: ["contact", "email", "feedback"] },
      { href: "/privacy", label: "Privacy policy", hideInFooter: true },
      { href: "/terms", label: "Terms of service", hideInFooter: true },
    ],
  },
];

export const PRIMARY_NAV = [
  { href: "/sealed", label: "Sealed" },
  { href: "/price-guide", label: "Price Guide" },
  { href: "/movers", label: "Movers" },
  { href: "/sets", label: "Sets" },
];

export function searchNav(q: string): NavLink[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return NAV_GROUPS.flatMap((g) => g.links).filter(
    (l) => l.label.toLowerCase().includes(s) || (l.keywords ?? []).some((k) => k.includes(s) || s.includes(k)),
  );
}
