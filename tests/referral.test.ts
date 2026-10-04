// Referral capture and the (off-by-default) reward (lib/referral.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { referralCandidate, referralPremiumDays } from "../src/lib/referral";
import { REFERRAL_COOKIE } from "../src/lib/referral-cookie";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

test("the reward is OFF unless the owner sets REFERRAL_PREMIUM_DAYS (an entitlement writer CLAUDE.md must name first)", () => {
  assert.equal(referralPremiumDays({}), 0);
  assert.equal(referralPremiumDays({ REFERRAL_PREMIUM_DAYS: "0" }), 0);
  assert.equal(referralPremiumDays({ REFERRAL_PREMIUM_DAYS: "abc" }), 0);
  assert.equal(referralPremiumDays({ REFERRAL_PREMIUM_DAYS: "3" }), 3);
  assert.equal(referralPremiumDays({ REFERRAL_PREMIUM_DAYS: "999" }), 31, "capped");
});

test("self-referral and junk codes are ignored before any lookup", () => {
  assert.equal(referralCandidate("cmabc12345", "cmabc12345"), null, "an account cannot refer itself");
  assert.equal(referralCandidate("../../etc", "u1"), null);
  assert.equal(referralCandidate("", "u1"), null);
  assert.equal(referralCandidate(null, "u1"), null);
  assert.equal(referralCandidate("cmreferrer01", "u1"), "cmreferrer01");
});

test("the cookie is cleared on use, the grant is extend-only and logged, and the card hides at 0 days", () => {
  assert.equal(REFERRAL_COOKIE, "oc_ref");
  const src = read("src/lib/referral.ts");
  assert.match(src, /jar\.set\(REFERRAL_COOKIE, "", \{ path: "\/", maxAge: 0 \}\)/);
  assert.match(src, /grantReferralDays\(referrerId, days\)/);
  // The entitlement write is admin-billing's, extend-only, never in referral.ts itself.
  assert.doesNotMatch(src, /prisma\.user\.update|premiumUntil:/);
  assert.match(read("src/lib/admin-billing.ts"), /export async function grantReferralDays[\s\S]*grantedUntil\(referrer\.premiumUntil, days, now\)/);
  assert.match(src, /if \(!referrerId \|\| days === 0\) return;/);
  assert.match(read("src/app/profile/page.tsx"), /\{referralDays > 0 && <ReferralLinkCard/);
  assert.match(read("src/components/ReferralCapture.tsx"), /captureEntrySource\(\)/);
});
