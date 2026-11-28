// One batch of the 3-day Premium pass email (lib/premium-gift-pass.ts; owner, 2026-11-27), run by
// .github/workflows/email-premium-pass.yml. DRY_RUN=1 (the default) counts only. Prints counts, never an address.
import { prisma } from "../src/lib/db";
import { writeFileSync } from "node:fs";
import { grantGiftPassOnly, runGiftPassBatch } from "../src/lib/premium-gift-pass-server";

async function main() {
  if (process.env.GRANT_ONLY === "1") {
    // The Gmail route (owner, 2026-11-28): grant and write the addresses + email to a file the workflow ENCRYPTS before it
    // leaves the runner (the repository is public: an address is never printed). Counts only in the log.
    const res = await grantGiftPassOnly({ limit: Number(process.env.LIMIT) || undefined, unsubUrl: process.env.GIFT_UNSUB_URL || "mailto:compareempire@gmail.com?subject=Unsubscribe%20OP%20Compare" });
    writeFileSync("gift-batch.json", JSON.stringify({ emails: res.emails, subject: res.subject, html: res.html }));
    console.log("3-day pass (grant only):", JSON.stringify({ ok: res.ok, error: res.error, granted: res.granted, failed: res.failed, remaining: res.remaining }));
    if (!res.ok) process.exitCode = 1;
    return;
  }
  const res = await runGiftPassBatch({ dryRun: process.env.DRY_RUN !== "0", limit: Number(process.env.LIMIT) || undefined });
  console.log("3-day pass:", JSON.stringify(res, null, 2));
  if (!res.ok) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
