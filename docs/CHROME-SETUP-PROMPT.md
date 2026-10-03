# Claude in Chrome — OP Compare setup prompt

Paste everything between the lines into Claude in Chrome while logged in to
GitHub, Vercel, Neon and Google (the same accounts RiftCompare uses).

---

You are setting up the production infrastructure for **OP Compare**, a One Piece
Card Game price-comparison website. Its code is already finished in the GitHub
repo **Specifxx/OpCompare** (branch `claude/tender-noether-2na98p`). It is the
sister site of RiftCompare (repo Specifxx/TCGEmpire, site riftcompare.com) and
must get its **own** database, Vercel project, Google Analytics property and
Search Console property.

Ground rules:
- Never change, delete or rotate anything belonging to RiftCompare (its Vercel
  project, its GitHub repo/secrets, its Neon projects, its GA/GSC properties).
  You may only READ values from RiftCompare where a step says so.
- Do not buy anything (no domains, no paid plans) and do not add a payment
  method. If a step needs money or a decision I haven't given, stop and ask me.
- Never paste secret values into chat, issues or commit messages — only into the
  secret/env-var fields named below.
- Keep a running checklist and finish with a summary of what you did, every
  value you set (secrets shown as "set", not their contents) and anything left.

**Domain:** if I already own a domain for OP Compare (ask me if unsure), use it
as `<DOMAIN>`. If not, use the Vercel URL (`opcompare.vercel.app` or whatever
Vercel assigns) as `<SITE_URL>` for now and tell me at the end.

## 1. Neon — new database
1. Open https://console.neon.tech and create a **new project** named `opcompare`
   (Postgres 16 or newest, region **AWS US East (N. Virginia)**, free plan).
2. Copy the **pooled** connection string (Dashboard → Connect → "Pooled
   connection" on; it contains `-pooler` and ends with `?sslmode=require`).
   This is `DATABASE_URL`.

## 2. GitHub — Specifxx/OpCompare
1. Create branch **`main`** from `claude/tender-noether-2na98p` (Code → branches
   → New branch, source `claude/tender-noether-2na98p`). Then Settings → General
   → Default branch → switch to `main`.
2. Settings → Actions → General → Workflow permissions → **Read and write
   permissions** → Save.
3. Generate a random 48-character alphanumeric string for `CRON_SECRET` (keep it
   for step 3).
4. Settings → Secrets and variables → Actions → **Secrets** → New repository
   secret:
   - `DATABASE_URL` = the Neon pooled string
   - `CRON_SECRET` = the random string
   - `GSC_SA_KEY` = the Search Console service-account JSON key (see step 7.4)
5. Same page → **Variables** tab → New repository variable:
   - `SITE_URL` = `https://<DOMAIN>` (or the Vercel URL), no trailing slash
   - `INDEXNOW_KEY` = `43ac93dd97a44d4894bedf52d621c57c` (RiftCompare's public
     IndexNow key — reused on purpose)
   - `GSC_PROPERTY` = set in step 7

## 3. Vercel — new project
1. https://vercel.com/new → import **Specifxx/OpCompare**. Project name
   `opcompare`. Framework Next.js (auto). Leave build settings default.
2. Before or right after the first deploy, Settings → Environment Variables, add
   for **Production and Preview**:
   - `DATABASE_URL` = the Neon pooled string
   - `CRON_SECRET` = same random string as GitHub
   - `NEXT_PUBLIC_SITE_URL` = `https://<DOMAIN>` (or the Vercel URL)
   - `INDEXNOW_KEY` = `43ac93dd97a44d4894bedf52d621c57c`
   Optional, only if RiftCompare's Vercel project has them (Settings →
   Environment Variables there; copy the values, don't change them):
   `EBAY_AFFILIATE_CAMPAIGN`, `TCGPLAYER_IMPACT_LINK`, `NEXT_PUBLIC_USD_TO_AUD`,
   `NEXT_PUBLIC_USD_TO_GBP`, `NEXT_PUBLIC_USD_TO_SGD`, `NEXT_PUBLIC_USD_TO_CAD`,
   `NEXT_PUBLIC_USD_TO_EUR`.
   Do NOT copy any `EBAY_CLIENT_*`, `RM*`, `RH*`, `HISTORY_DATABASE_URL*`,
   Stripe, Resend, Discord, AdSense or Google OAuth variables — OP Compare
   doesn't use them.
3. Settings → Git → Production Branch = **`main`**.
4. If I own `<DOMAIN>`: Settings → Domains → add `<DOMAIN>` and `www.<DOMAIN>`
   (redirect www → apex) and follow Vercel's DNS instructions at my registrar
   (ask me if you can't access the registrar).
5. Note: production builds only run for commits whose subject contains
   `[deploy]`. Don't try to fix "build skipped" messages — step 5 deploys it.

## 4. Load the data
1. GitHub → Actions → **Import prices** → Run workflow (branch main, defaults).
   It creates the tables and imports ~7,300 cards, ~420 sealed products and ~190k
   store prices. Wait until it finishes green (5–15 min). If it fails, open the
   log and report the error to me.

## 5. First production deploy
1. GitHub → Actions → **Production deploy** → Run workflow (branch main).
2. In Vercel → Deployments, wait for the new production deployment to be
   **Ready**, then open the site and check: the homepage shows card counts and
   prices; `/browse` lists cards; a card page shows a price table; `/sitemap.xml`
   and `/indexnow.txt` load.

## 6. Google Analytics 4
1. https://analytics.google.com → Admin → in the **same account as RiftCompare**
   → Create → Property → name "OP Compare", my time zone/currency → Web data
   stream for `https://<DOMAIN>` (or the Vercel URL), Enhanced measurement on.
2. Copy the Measurement ID (`G-…`) → Vercel env var `NEXT_PUBLIC_GA_ID`
   (Production).
3. Admin → Events → once `buy_click` appears (after some traffic), mark it as a
   key event. (If it hasn't appeared yet, tell me to do this later.)

## 7. Google Search Console
1. https://search.google.com/search-console → Add property:
   - If I own `<DOMAIN>`: **Domain** property `<DOMAIN>`, verify with the DNS TXT
     record at my registrar. Then `GSC_PROPERTY` = `sc-domain:<DOMAIN>`.
   - Otherwise: **URL prefix** `https://<SITE_URL host>/`, choose the **HTML tag**
     method, copy only the `content="…"` value into Vercel env var
     `GOOGLE_SITE_VERIFICATION` (Production), run GitHub Actions → Production
     deploy again, wait for Ready, then click Verify. `GSC_PROPERTY` =
     `https://<SITE_URL host>/`.
2. Set the GitHub variable `GSC_PROPERTY` accordingly.
3. Settings → Users and permissions → Add user: the service-account email
   RiftCompare's Search Console property already lists as a user (open
   RiftCompare's property → Settings → Users and permissions to read it) →
   permission **Full**.
4. `GSC_SA_KEY`: GitHub secrets can't be read back, so: Google Cloud Console →
   IAM & Admin → Service accounts → the account with that email → Keys → Add key
   → Create new key → JSON. Open the downloaded JSON file in a browser tab, copy
   its full contents into the GitHub secret `GSC_SA_KEY`. If you can't open the
   file, stop and ask me to paste it.
5. Search Console → Sitemaps → submit `sitemap.xml`.
6. Optional but recommended — Bing: https://www.bing.com/webmasters → Add site →
   **Import from Google Search Console** → select the OP Compare property.

## 8. Turn on the search workflows
1. GitHub → Actions → **Search Console** → Run workflow; check its summary shows
   "Sitemap submit … HTTP 204/200".
2. GitHub → Actions → **IndexNow submit** → Run workflow; check it reports URLs
   submitted.
3. If you set `NEXT_PUBLIC_GA_ID` or `GOOGLE_SITE_VERIFICATION` after step 5, run
   **Production deploy** once more so they take effect.

## 9. Affiliate housekeeping (optional — ask me before submitting forms)
- Impact (TCGplayer affiliate): add `<DOMAIN>` as a promotional property/website
  on the existing account.
- eBay Partner Network: nothing required (OP Compare's clicks are tagged
  `oc-…`); optionally add the site to the account's traffic sources.

## 10. Report
Give me: the live URL, the Neon project name and region, which GitHub secrets
and variables exist, which Vercel env vars exist (names only), the GA4
measurement ID, the GSC property and its verification status, the results of
the Import / Production deploy / Search Console / IndexNow runs, and anything
you could not finish and why.

---
