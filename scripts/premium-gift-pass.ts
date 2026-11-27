// One batch of the 3-day Premium pass email (lib/premium-gift-pass.ts; owner, 2026-11-27), run by
// .github/workflows/email-premium-pass.yml. DRY_RUN=1 (the default) counts only. Prints counts, never an address.
import { prisma } from "../src/lib/db";
import { runGiftPassBatch } from "../src/lib/premium-gift-pass-server";

async function main() {
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
