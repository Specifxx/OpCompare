import Link from "next/link";
import { Callout, SimpleTable } from "@/components/blog/BlogBits";
import type { Post } from "../types";
import { GUIDE, LEADER, OP18_PREORDERS, byNumber, leaderPath, op18Set, withArt } from "./op18-shared";

// "What is Rush?" and every other keyword, from the owner's growth pack (16 October
// 2026). Each definition and rule number was checked against Bandai's English
// Comprehensive Rules, version 1.2.1, "Last updated: 8/28/2026"
// (en.onepiece-cardgame.com/pdf/rule_comprehensive.pdf, section 10, plus 2-10,
// 3-7-4, 4-9-2, 6-5-5-2, 7-1-2 and 7-1-3), which settles the pack's one open
// question (whether its numbering matched the current English edition). The OP18 examples are reported pre-release text and
// say so (./op18-shared.tsx). Every keyword links its /keywords/[slug] page, which
// lists the cards whose text carries it, priced.
const RULES_VERSION = "version 1.2.1, last updated 28 August 2026";
const kw = (slug: string, name: string) => <Link href={`/keywords/${slug}`}>[{name}]</Link>;

export const keywordsExplained: Post = {
  slug: "one-piece-tcg-keywords-explained",
  title: () => "What Is Rush in One Piece TCG? Every Keyword Explained",
  description:
    "Rush, Rush: Character, Blocker, Double Attack, Banish, Trigger, Counter and DON!! ×N explained in plain English, with the official rule number for each.",
  tags: ["guide", "rules", "keywords"],
  category: "guide",
  date: "2026-10-16",
  minutes: 8,
  faq: [
    {
      q: "What does Rush: Character mean in One Piece TCG?",
      a: "The Character can attack on the turn it is played, but only your opponent's Characters, not their Leader (Comprehensive Rules 10-1-6-1). From the next turn it attacks like any other Character. [Every card with Rush: Character](/keywords/rush-character) is listed with prices.",
    },
    {
      q: "What's the difference between Rush and Rush: Character?",
      a: "On the turn it is played, a Character with Rush can attack the opponent's Leader or a rested Character; a Character with Rush: Character can attack only Characters. Without either, a Character cannot attack the turn it is played (3-7-4).",
    },
    {
      q: "Does Banish stop Triggers?",
      a: "Yes. When a card with Banish deals damage to the Leader, the Life card goes to the trash instead of the hand, and its Trigger is not activated (Comprehensive Rules 10-1-3-1).",
    },
    {
      q: "Can a rested Blocker block?",
      a: "No. You use Blocker by resting the card during the Block Step (10-1-4-1), so it has to be active. Once rested it stays rested until your next Refresh Phase, which is why a Blocker usually stops one attack per turn.",
    },
    {
      q: "Does Unblockable stop counters?",
      a: "No. Unblockable only stops your opponent activating Blocker against that attack (10-1-7-1). They can still use Counter values and Counter events from their hand in the Counter Step.",
    },
  ],
  related: [
    { href: "/keywords", label: "Every keyword, with its cards" },
    { href: "/keywords/rush", label: "Cards with [Rush]" },
    { href: "/keywords/rush-character", label: "Cards with [Rush: Character]" },
    { href: "/keywords/blocker", label: "Cards with [Blocker]" },
  ],
  build: ({ cat }) => {
    const set = op18Set(cat);
    const karoo = byNumber(cat, LEADER.karoo.number);
    const luffy = byNumber(cat, LEADER.luffy.number);
    const gunko = byNumber(cat, LEADER.gunko.number);
    return {
      heroCards: withArt([karoo, luffy, gunko]),
      summary: [
        <>
          <strong>[Rush]</strong> lets a Character attack the turn it is played (rule 10-1-1-1); <strong>[Rush: Character]</strong> does too, but only at
          Characters, never the Leader (10-1-6-1).
        </>,
        <>
          <strong>[Blocker]</strong> redirects an attack to itself by resting; <strong>[Unblockable]</strong> switches Blocker off, not counters.
        </>,
        <>
          <strong>[Banish]</strong> trashes the Life card it takes and stops its <strong>[Trigger]</strong>; <strong>[Double Attack]</strong> takes two.
        </>,
        <>
          <strong>[DON!! ×2]</strong> is a condition (have 2 attached); <strong>DON!! −2</strong> is a cost (give 2 back).
        </>,
        <>Every rule number is from Bandai&apos;s Comprehensive Rules, {RULES_VERSION}.</>,
      ],
      lede: (
        <>
          <p>
            <strong>The One Piece Card Game packs a lot of rules into a few bracketed words.</strong> [Rush], [Blocker], [Banish], [DON!! ×2]: once you know them,
            most cards read in seconds. This guide explains each keyword in plain English. The rule numbers come from section 10 of Bandai&apos;s{" "}
            <strong>Comprehensive Rules</strong> ({RULES_VERSION}), so you can settle arguments at your local store.
          </p>
          <p>
            Every keyword below links to its own page on OP Compare, which lists every card whose text carries it, with live prices. The full list is on{" "}
            <Link href="/keywords">the keywords page</Link>.
          </p>
        </>
      ),
      sections: [
        {
          id: "quick-reference",
          title: "Quick reference table",
          body: (
            <SimpleTable
              head={["Keyword", "One-line meaning", "Rule"]}
              rows={[
                [kw("rush", "Rush"), "Can attack the turn it is played", "10-1-1"],
                [kw("rush-character", "Rush: Character"), "Can attack the turn it is played, but only Characters", "10-1-6"],
                [kw("double-attack", "Double Attack"), "Deals 2 damage to a Leader instead of 1", "10-1-2"],
                [kw("banish", "Banish"), "The Life card it takes goes to the trash, not the hand, and no Trigger", "10-1-3"],
                [kw("blocker", "Blocker"), "Rest it to make it the new target of an attack", "10-1-4"],
                [kw("trigger", "Trigger"), "When this Life card is taken as damage, you may use its effect instead", "10-1-5"],
                [kw("unblockable", "Unblockable"), "Your opponent cannot use Blocker against this attack", "10-1-7"],
                [kw("on-play", "On Play"), "Happens when the card is played", "10-2-6"],
                [kw("when-attacking", "When Attacking"), "Happens when you declare an attack with it", "10-2-5"],
                [kw("activate-main", "Activate: Main"), "You choose to use it in your Main Phase, not during a battle", "10-2-2"],
                [kw("counter", "Counter"), "An Event you can play only in your opponent's Counter Step", "10-2-4"],
                [kw("once-per-turn", "Once Per Turn"), "Can be activated and resolved once each turn", "10-2-13"],
                [kw("don-x", "DON!! ×N"), "Active while at least N DON!! are given to the card", "10-2-9"],
                ["DON!! −N", "Cost: return N DON!! to your DON!! deck", "10-2-10"],
              ]}
            />
          ),
        },
        {
          id: "rush",
          title: "What is Rush?",
          body: (
            <>
              <p>
                {kw("rush", "Rush")} lets a Character <strong>attack on the same turn it is played</strong> (rule 10-1-1-1). Without it, a Character cannot attack
                on the turn it is played (3-7-4), so it waits until your next turn.
              </p>
              <p>
                That is why Rush is an aggressive keyword. You can play a Character and pressure your opponent&apos;s Leader or Characters straight away, before
                they get a turn to remove it.
              </p>
              <p>
                <strong>Example:</strong> the new OP18 Leader{" "}
                {karoo ? <Link href={leaderPath(karoo)}>Karoo</Link> : "Karoo"} gives [Rush] (and +1000 power) to all of your Characters that are both Animal and
                Alabasta type, on its reported pre-release text. A Karoo deck builds its whole plan around this keyword: see the{" "}
                <Link href={GUIDE.karoo}>Karoo leader guide</Link>.
              </p>
            </>
          ),
        },
        {
          id: "rush-character",
          title: "What is “Rush: Character”?",
          body: (
            <>
              <p>
                {kw("rush-character", "Rush: Character")} is a <strong>restricted version of Rush</strong> (rule 10-1-6-1):
              </p>
              <ul>
                <li>
                  The Character <strong>can</strong> attack on the turn it is played,
                </li>
                <li>
                  but on that turn it can <strong>only attack your opponent&apos;s Characters</strong>, not their Leader.
                </li>
              </ul>
              <p>
                Think of it as &ldquo;removal Rush&rdquo;. It can trade with an opposing Character straight away (attacks target the Leader or a{" "}
                <em>rested</em> Character, 7-1-1-2), but it cannot push Life damage on the turn it lands. On later turns it attacks normally.
              </p>
              <SimpleTable
                head={["", "Attack the turn it is played?", "Attack the Leader that turn?"]}
                rows={[
                  ["No keyword", "No", "No"],
                  [kw("rush-character", "Rush: Character"), "Yes", "No, Characters only"],
                  [kw("rush", "Rush"), "Yes", "Yes"],
                ]}
              />
            </>
          ),
        },
        {
          id: "blocker",
          title: "What is Blocker?",
          body: (
            <>
              <p>
                {kw("blocker", "Blocker")} (rule 10-1-4-1): when your opponent attacks <strong>another</strong> of your cards, you can <strong>rest</strong> this
                Character during the Block Step. It then takes the place of the card being attacked.
              </p>
              <ul>
                <li>
                  A Blocker must be <strong>active</strong> to use, because using it rests it.
                </li>
                <li>
                  It stays rested until your next Refresh Phase, so each Blocker usually stops one attack per turn, and only one Blocker can be used in each battle
                  (7-1-2-1).
                </li>
                <li>It is how you protect your Leader&apos;s Life or a key Character.</li>
              </ul>
            </>
          ),
        },
        {
          id: "unblockable",
          title: "What is Unblockable?",
          body: (
            <p>
              {kw("unblockable", "Unblockable")} (rule 10-1-7-1): while this card is attacking, your opponent <strong>cannot activate Blocker</strong>. They can
              still use counters from their hand in the Counter Step (7-1-3).
            </p>
          ),
        },
        {
          id: "double-attack",
          title: "What is Double Attack?",
          body: (
            <p>
              {kw("double-attack", "Double Attack")} (rule 10-1-2-1): when this card&apos;s attack deals damage to a <strong>Leader</strong>, it deals{" "}
              <strong>2 damage instead of 1</strong>. Your opponent loses 2 Life cards to one attack, which makes it one of the strongest finishing keywords in the
              game.
            </p>
          ),
        },
        {
          id: "banish",
          title: "What is Banish?",
          body: (
            <>
              <p>
                {kw("banish", "Banish")} (rule 10-1-3-1): when this card deals damage to the opposing Leader, the Life card goes{" "}
                <strong>to the trash instead of their hand</strong>, and <strong>its Trigger is not activated</strong>.
              </p>
              <p>That hurts in two ways:</p>
              <ol>
                <li>Your opponent does not get the card in hand, so they have fewer counters next time.</li>
                <li>They cannot reveal a Trigger to swing the game back.</li>
              </ol>
            </>
          ),
        },
        {
          id: "trigger",
          title: "What is Trigger?",
          body: (
            <p>
              {kw("trigger", "Trigger")} (rule 10-1-5-1): when you take damage and the Life card has a Trigger, you <strong>may reveal it and activate the Trigger
              instead of adding it to your hand</strong>; you can also decline and take it into your hand unrevealed (10-1-5-2). Triggers are comeback tools, such
              as a free removal effect or a free Character while you are being attacked. That is also why Banish matters: it switches Triggers off.
            </p>
          ),
        },
        {
          id: "timing",
          title: "Timing keywords: On Play, When Attacking, Activate: Main",
          body: (
            <ul>
              <li>
                {kw("on-play", "On Play")} (10-2-6-1): activates when the card is played. Many search and removal effects use it.
              </li>
              <li>
                {kw("when-attacking", "When Attacking")} (10-2-5-1): activates when you declare an attack with this card. <strong>Example:</strong> the{" "}
                <Link href={GUIDE.luffy}>OP18 green Luffy Leader</Link> has a When Attacking effect that, on its reported text, lets him set himself active and
                attack again.
              </li>
              <li>
                {kw("activate-main", "Activate: Main")} (10-2-2-1): an ability you choose to use during your Main Phase, but not during a battle.{" "}
                <strong>Example:</strong> <Link href={GUIDE.gunko}>Saint Gunko&apos;s Leader</Link> uses Activate: Main to add DON!!, on its reported text.
              </li>
              <li>
                {kw("once-per-turn", "Once Per Turn")} (10-2-13-1) is a limit, not a timing: the ability can be activated and resolved only once each turn.
              </li>
            </ul>
          ),
        },
        {
          id: "counter",
          title: "Counter: two different things",
          body: (
            <ul>
              <li>
                <strong>Counter value</strong> (the number printed on the side of a Character card, rule 2-10): during your opponent&apos;s attack, in the Counter
                Step, you can trash the card from your hand to add that much power to your Leader or Character for the battle (7-1-3-1-1). Only Characters have one.
              </li>
              <li>
                {kw("counter", "Counter")} <strong>on Event cards</strong> (rule 10-2-4-1): an Event that can <strong>only</strong> be used during your
                opponent&apos;s Counter Step.
              </li>
            </ul>
          ),
        },
        {
          id: "don",
          title: "DON!! ×2 and DON!! −2",
          body: (
            <>
              <ul>
                <li>
                  {kw("don-x", "DON!! ×N")} (10-2-9-1) is a <strong>condition</strong>. The effect works only while at least N DON!! cards are given to that card.
                  Each DON!! given also adds 1000 power during your turn (6-5-5-2).
                </li>
                <li>
                  <strong>DON!! −N</strong> (10-2-10-1) is a <strong>cost</strong>. You return N DON!! from your Leader, Characters and cost area to your DON!! deck
                  to use the effect.
                </li>
              </ul>
              <Callout title="The one-line version">
                New players often mix these up. &ldquo;×&rdquo; means <em>have this many attached</em>. &ldquo;−&rdquo; means <em>give this many back</em>.
              </Callout>
            </>
          ),
        },
        {
          id: "next",
          title: "Where to go next",
          body: (
            <ul>
              <li>
                Every keyword, with every card that has it: <Link href="/keywords">the keywords page</Link>.
              </li>
              <li>
                Building your first deck? Start with our <Link href="/blog/cheapest-one-piece-leaders">cheapest One Piece leaders</Link> list.
              </li>
              <li>
                Learning the cards? Read <Link href="/guides/one-piece-card-rarities-explained">One Piece card rarities explained</Link>.
              </li>
              <li>
                Buying the new set? Compare prices on <Link href={OP18_PREORDERS}>the OP18 pre-order page</Link>, then see{" "}
                {set ? <Link href={`/sets/${set.slug}`}>the OP18 The Dominance of God card list</Link> : "the OP18 card list"}.
              </li>
              <li>
                The OP18 Leader guides: <Link href={GUIDE.luffy}>green Luffy</Link>, <Link href={GUIDE.karoo}>Karoo</Link> and{" "}
                <Link href={GUIDE.gunko}>Saint Gunko</Link>.
              </li>
              <li>
                Looking for a store? Browse <Link href="/stores">our stores directory</Link>.
              </li>
            </ul>
          ),
        },
      ],
    };
  },
};
