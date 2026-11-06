import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanDisplayName, normalizeSignInEmail, SIGN_IN_AUDIENCE, SIGN_IN_ISSUER } from "../src/lib/email-sign-in";
import { SIGN_IN_REQUEST_URL } from "../src/lib/email-sign-in-url";

// Email sign-in links (2026-11-06): RiftCompare mails them, we verify with its
// public key. DECISIONS.md, "Email sign-in links, mailed by RiftCompare".
const read = (f: string) => readFileSync(join(__dirname, "..", f), "utf8");

test("addresses and names are normalised and junk refused", () => {
  assert.equal(normalizeSignInEmail(" A@iCloud.com "), "a@icloud.com");
  for (const bad of ["", "x", "a@b", "a b@c.com", null]) assert.equal(normalizeSignInEmail(bad), null);
  assert.equal(cleanDisplayName("  Luffy   D "), "Luffy D");
  assert.equal(cleanDisplayName("a"), null);
});

test("tokens are RiftCompare's, for this site only, EdDSA only, and used once", () => {
  assert.equal(SIGN_IN_ISSUER, "https://riftcompare.com");
  assert.equal(SIGN_IN_AUDIENCE, "https://opcompare.app");
  assert.equal(SIGN_IN_REQUEST_URL, "https://riftcompare.com/api/sister-sign-in");
  const lib = read("src/lib/email-sign-in.ts");
  assert.match(lib, /algorithms: \["EdDSA"\]/);
  assert.match(lib, /audience: SIGN_IN_AUDIENCE/);
  assert.match(lib, /prisma\.meta\.create\(\{ data: \{ key: `signin-jti:\$\{jti\}`/);
  assert.ok(lib.indexOf("if (isAdminEmail(email)) return null") < lib.indexOf("prisma.user.create"));
});

test("a GET never signs in, and no mail key or mail module is involved", () => {
  const route = read("src/app/api/auth/email-link/route.ts");
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function GET/);
  assert.doesNotMatch(read("src/app/login/email/page.tsx"), /verifySignInToken|createSession/);
  assert.doesNotMatch(read("src/lib/email-sign-in.ts"), /lib\/email"|from "\.\/email"/);
  assert.doesNotMatch(read("src/components/EmailSignInForm.tsx"), /@\/lib\/email-sign-in"/, "the form must not import the db module");
});

test("the sign-in form offers the link beside Google and Discord", () => {
  assert.match(read("src/components/AuthForm.tsx"), /<EmailSignInForm next=\{next\} \/>/);
});
