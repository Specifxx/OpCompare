# Claude in Chrome — OP Compare setup prompt

Paste everything between the lines into Claude in Chrome while logged in to
GitHub, Vercel, Neon, Google and the registrar of **opcompare.app** (the same
accounts RiftCompare uses).

---

You are setting up the production infrastructure for **OP Compare**, a One Piece
Card Game price-comparison website. Its code is already finished in the GitHub
repo **Specifxx/OpCompare** (branch `claude/tender-noether-2na98p`). It is the
sister site of RiftCompare (repo Specifxx/TCGEmpire, site riftcompare.com) and
must get its **own** database, Vercel project, Google Analytics property and
Search Console property.

**The domain is `opcompare.app`. I already own it. Use exactly
`https://opcompare.app` (no `www`, no trailing slash) everywhere a site URL is
asked for.** `.app` domains are HTTPS-only, so the site won't load until
Vercel has issued its certificate (a few minutes after the DNS records are
right). That delay is normal.

Ground rules:
- Never change, delete or rotate anything belonging to RiftCompare (its Vercel
  project, its GitHub repo/secrets, its Neon projects, its GA/GSC properties,
  riftcompare.com's DNS). You may only READ values from RiftCompare where a
  step says so.
- Do not buy anything (no domains, no paid plans) and do not add a payment
  method. If a step needs money or a decision I haven't given, stop and ask me.
- Never delete an existing DNS record on opcompare.app without asking me first.
- Never paste secret values into chat, issues or commit messages. Put them only
  in the secret or env-var fields named below.
- Keep a running checklist and finish with a summary of what you did, every
  value you set (secrets shown as "set", not their contents) and anything left.

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
   - `GSC_SA_KEY` = added in step 7.4
5. Same page → **Variables** tab → New repository variable:
   - `SITE_URL` = `https://opcompare.app`
   - `GSC_PROPERTY` = `sc-domain:opcompare.app` (change it in step 7 only if
     you have to fall back to a URL-prefix property)
   - `INDEXNOW_KEY` = `43ac93dd97a44d4894bedf52d621c57c` (RiftCompare's public
     IndexNow key, reused on purpose)

## 3. Vercel — new project and the domain
1. https://vercel.com/new → import **Specifxx/OpCompare**, in the same Vercel
   team as RiftCompare. Project name `opcompare`. Framework Next.js (auto).
   Leave build settings default.
2. Settings → Environment Variables, add for **Production and Preview**:
   - `DATABASE_URL` = the Neon pooled string
   - `CRON_SECRET` = same random string as GitHub
   - `NEXT_PUBLIC_SITE_URL` = `https://opcompare.app`
   - `INDEXNOW_KEY` = `43ac93dd97a44d4894bedf52d621c57c`
   Then copy these from RiftCompare's Vercel project, but only the ones it
   has (Settings → Environment Variables there; read the values, change
   nothing): `EBAY_AFFILIATE_CAMPAIGN`, `TCGPLAYER_IMPACT_LINK`,
   `NEXT_PUBLIC_USD_TO_AUD`, `NEXT_PUBLIC_USD_TO_GBP`, `NEXT_PUBLIC_USD_TO_SGD`,
   `NEXT_PUBLIC_USD_TO_CAD`, `NEXT_PUBLIC_USD_TO_EUR`.
   Do NOT copy any `EBAY_CLIENT_*`, `RM*`, `RH*`, `HISTORY_DATABASE_URL*`,
   Stripe, Resend, Discord, AdSense or Google OAuth variables. OP Compare
   doesn't use them.
3. Settings → Git → Production Branch = **`main`**.
4. Settings → Domains → add **`opcompare.app`**, then add **`www.opcompare.app`**
   set to **redirect to `opcompare.app`** (308). opcompare.app is the primary
   domain.
5. Point the DNS at Vercel:
   - Vercel → the team's **Domains** page: if `opcompare.app` is listed there
     (bought through Vercel or using Vercel nameservers), Vercel configures
     the records itself. Wait for both domains to show **Valid Configuration**.
   - Otherwise find the registrar: open
     https://lookup.icann.org/en/lookup?name=opcompare.app and read
     "Registrar" and the nameservers. Open that registrar's (or DNS host's)
     dashboard and add **exactly the records Vercel's Domains page shows** for
     `opcompare.app` (an A record on `@`) and `www` (a CNAME). Do not change the
     nameservers, and ask me before removing any record that conflicts (for
     example a parking-page A record on `@`). If you can't get into that
     account, stop and tell me which registrar it is.
   - Wait until Vercel shows **Valid Configuration** and a certificate for
     both names.
6. Production builds run only for commits whose subject contains `[deploy]`. If
   you see "build skipped" messages, leave them. Step 5 deploys it.

## 4. Load the data
1. GitHub → Actions → **Import prices** → Run workflow (branch main, defaults).
   It creates the tables and imports ~7,300 cards, ~420 sealed products and the
   prices from ~235 stores. Wait until it finishes green (10–20 min). If it fails,
   open the log and report the error to me.

## 5. First production deploy
1. GitHub → Actions → **Production deploy** → Run workflow (branch main).
2. In Vercel → Deployments, wait for the new production deployment to be
   **Ready**, then open **https://opcompare.app** and check:
   - the homepage shows card counts and prices
   - `/browse` lists cards
   - a card page shows a price table
   - `https://opcompare.app/sitemap.xml` loads and its URLs start with
     `https://opcompare.app/`
   - `https://opcompare.app/indexnow.txt` shows the key
   - `https://www.opcompare.app` redirects to `https://opcompare.app`

## 6. Google Analytics 4
1. https://analytics.google.com → Admin → in the **same account as RiftCompare**
   → Create → Property → name "OP Compare", my time zone/currency → Web data
   stream for `https://opcompare.app`, Enhanced measurement on.
2. Copy the Measurement ID (`G-…`) → Vercel env var `NEXT_PUBLIC_GA_ID`
   (Production).
3. Admin → Events → once `buy_click` appears (after some traffic), mark it as a
   key event. (If it hasn't appeared yet, tell me to do this later.)

## 7. Google Search Console
1. https://search.google.com/search-console → Add property → **Domain** →
   `opcompare.app`. Google shows a TXT record (`google-site-verification=…`).
   Add it as a **TXT record on `@`** wherever opcompare.app's DNS lives (Vercel →
   Domains → opcompare.app → DNS Records if Vercel manages it, otherwise the
   registrar from step 3.5). Wait a few minutes, then click **Verify** (retry for
   up to ~30 minutes; DNS can be slow). The property is
   `sc-domain:opcompare.app`, which matches the GitHub variable already.
   - Only if you cannot add DNS records: add a **URL prefix** property
     `https://opcompare.app/` instead, choose the **HTML tag** method, copy only
     the `content="…"` value into Vercel env var `GOOGLE_SITE_VERIFICATION`
     (Production), run GitHub Actions → Production deploy, wait for Ready, then
     click Verify. Then change the GitHub variable `GSC_PROPERTY` to
     `https://opcompare.app/`.
2. Settings → Users and permissions → Add user: the service-account email
   RiftCompare's Search Console property already lists as a user (open
   RiftCompare's property → Settings → Users and permissions to read it; it
   ends in `.iam.gserviceaccount.com`) → permission **Full**.
3. Sitemaps → submit `https://opcompare.app/sitemap.xml`.
4. `GSC_SA_KEY`: GitHub secrets can't be read back, so: Google Cloud Console →
   IAM & Admin → Service accounts → the account with that email → Keys → Add key
   → Create new key → JSON. Open the downloaded JSON file in a browser tab and
   copy its full contents into the GitHub secret `GSC_SA_KEY`. If you can't open
   the file, stop and ask me to paste it.
5. Bing: https://www.bing.com/webmasters → Add site → **Import from Google
   Search Console** → select `opcompare.app`. (If import isn't offered, add
   `https://opcompare.app/`, choose the meta-tag method, put its `content` value
   in Vercel env var `BING_SITE_VERIFICATION`, redeploy as in step 5, verify.)
   Then submit `https://opcompare.app/sitemap.xml` there too.

## 8. Turn on the search workflows
1. GitHub → Actions → **Search Console** → Run workflow. Check that its summary
   shows "Sitemap submit … HTTP 204" or "HTTP 200".
2. GitHub → Actions → **IndexNow submit** → Run workflow; check it reports URLs
   submitted.
3. If you set `NEXT_PUBLIC_GA_ID`, `GOOGLE_SITE_VERIFICATION` or
   `BING_SITE_VERIFICATION` after step 5, run **Production deploy** once more so
   they take effect, then view the page source of https://opcompare.app and
   confirm the `gtag` script / verification meta tags are there.

## 9. Affiliate housekeeping (optional — ask me before submitting forms)
- Impact (TCGplayer affiliate): add `https://opcompare.app` as a promotional
  property/website on the existing account.
- eBay Partner Network: nothing required (OP Compare's clicks are tagged
  `oc-…`); optionally add `https://opcompare.app` to the account's traffic
  sources.

## 10. Report
Give me:
- the live URL, and whether `www` redirects
- the Neon project name and region
- which GitHub secrets and variables exist, and which Vercel env vars exist
  (names only)
- the GA4 measurement ID
- the GSC property and its verification status, and whether Bing is set up
- the results of the Import / Production deploy / Search Console / IndexNow runs
- anything you could not finish, and why

---
