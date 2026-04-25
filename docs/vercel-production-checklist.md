# Vercel Production Checklist — openpropfirm.com first deploy

> Walk this top-to-bottom the first time the site goes to production.
> Re-run sections individually after that as needed (e.g. only Section 4 when
> rotating a Supabase key).

---

## 1. Domain

- [ ] Apex domain `openpropfirm.com` purchased and DNS-controlled (Cloudflare, Namecheap, Porkbun, or whichever registrar).
- [ ] In the Vercel project: **Settings → Domains → Add → `openpropfirm.com`**. Vercel will give either an `A` record target or a `CNAME` target. Add it at the registrar.
- [ ] Add `www.openpropfirm.com` too. Configure it as a redirect → apex (Vercel's domain UI handles this; pick "Redirect to apex").
- [ ] Wait for DNS propagation (usually <10 min on Cloudflare, up to 1 hour elsewhere). Verify with `dig openpropfirm.com` — should resolve to a Vercel anycast IP.
- [ ] Vercel auto-provisions a Let's Encrypt cert. Confirm `https://openpropfirm.com` returns the site, not an error page.

## 2. Production branch

- [ ] In the Vercel project: **Settings → Git → Production Branch** is set to `main`.
- [ ] Confirm preview deploys are ON for non-main branches (default).
- [ ] **Branch protection on GitHub** — currently NOT enforced (per v1-f4 cleanup, confirmed via `gh api repos/.../branches/main/protection` → 404). That's intentional for the solo workflow Jason adopted on 2026-04-23. If/when collaborators are added, re-enable required-PR-review on main.

## 3. Environment variables (Production scope)

For each variable below, set in **Vercel → Settings → Environment Variables → Production** (and Preview, where the same value is needed).

### 3.1 — Public site URL (REQUIRED)

- [ ] `NEXT_PUBLIC_SITE_URL` = `https://openpropfirm.com`

  Read by:
  - `src/app/layout.tsx` → `metadata.metadataBase` (OG image canonical, Twitter card)
  - `src/app/sitemap.ts` → all sitemap URLs
  - `src/app/robots.ts` → sitemap reference

  If unset, all three fall back to the hardcoded `'https://openpropfirm.com'`. So at the literal openpropfirm.com domain, an unset value works — but on a preview URL (`xxx.vercel.app`), OG tags + sitemap will incorrectly point to the prod domain. Set it explicitly per environment.

  **Preview env value:** Leave UNSET so the layout's fallback kicks in to the prod domain (acceptable for previews — they're not crawled). Or set to `https://${VERCEL_URL}` if precise per-preview canonicals matter.

### 3.2 — Supabase auth (REQUIRED)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = (from Supabase Dashboard → Project Settings → API → Project URL)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from same page → anon public key)

  These are public-by-design — they're the client-side auth keys. Safe to expose.

- [ ] Supabase project's allowed redirect URLs include `https://openpropfirm.com/auth/callback` (Supabase Dashboard → Authentication → URL Configuration).

### 3.3 — Google OAuth (configured in Supabase, not Vercel)

- [ ] In Google Cloud Console → APIs & Services → Credentials → existing OAuth Client → **Authorized redirect URIs** includes `https://<supabase-project-id>.supabase.co/auth/v1/callback`.
- [ ] In Supabase Dashboard → Authentication → Providers → Google: enabled, Client ID + Client Secret pasted.
- [ ] No env vars needed in Vercel for Google OAuth — Supabase brokers the flow.

### 3.4 — Vercel Analytics + Speed Insights

- [ ] In Vercel project: **Analytics** tab → enabled. (Free tier plenty for v1.)
- [ ] **Speed Insights** tab → enabled.
- [ ] Both tracker scripts are already wired in `src/app/layout.tsx` via `@vercel/analytics/next` + `@vercel/speed-insights/next`. No env var to set — Vercel auto-injects `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` at build time in production.

### 3.5 — DO NOT set in Vercel

These are GitHub Actions secrets only — they MUST NOT appear in the Vercel project env:
- `SUPABASE_SERVICE_KEY` — full DB write access; only the bot uses it, only on GitHub Actions.
- `HEALTH_CHECK_ISSUE_NUMBER` — GitHub Actions variable.
- `ANTHROPIC_API_KEY` — only set if/when LLM-fallback bot lands (post-v1).

If any of the above shows up in Vercel's env list, REMOVE IT before promoting the deploy.

## 4. First production deploy

- [ ] `git push origin main` → Vercel auto-deploys.
- [ ] Watch the build log: should show all routes prerendering (1 root + 3 marketing + /firms + 4 firm details + N wiki paths + 2 legal). No build errors.
- [ ] Once deploy is "Ready", visit `https://openpropfirm.com` and walk Part 0 of `docs/manual-qa.md`.
- [ ] If Part 0 fails on prod but passes on `localhost`, suspect:
  - Env var mismatch (Section 3 above)
  - Cold-start error in a server component (check Vercel function logs)
  - Stale `next/font` or asset cache (Vercel → Deployments → Promote previous if needed)

## 5. Post-deploy verification

- [ ] `https://openpropfirm.com/sitemap.xml` returns XML. Submit to Google Search Console.
- [ ] `https://openpropfirm.com/robots.txt` returns the expected disallow rules.
- [ ] `curl -A "Twitterbot" -s https://openpropfirm.com/firms/funded-next | grep -E "og:title|og:description|og:image"` — should show populated OG tags.
- [ ] Vercel Analytics dashboard shows pageviews within 5 min of first visit.
- [ ] Speed Insights dashboard shows Core Web Vitals after ~24 hours of real traffic.

## 6. Bot's first production-cron interaction

The bot runs from GitHub Actions, not Vercel. But it does open PRs against `main`, which trigger Vercel previews. Confirm the chain works:

- [ ] Manually trigger the bot once after deploy: `gh workflow run bot.yml`. Wait for the run to complete.
- [ ] If it opens a PR (likely on Funding Pips, now that v1-f11 fixed its SCRAPE_URL), confirm Vercel auto-deploys a preview for that PR.
- [ ] Click the preview URL — Part 0 of manual-qa.md should still pass against the preview build.
- [ ] Merge the PR → `append-changelog.yml` should fire → main re-deploys → live site reflects the new changelog entry.

If any link in the chain breaks, fix BEFORE the Monday 06:00 UTC autonomous cron — once it's running on a schedule, debugging gets harder.

## 7. Rollback procedure

If a deploy ships a regression:

- [ ] Vercel → Deployments → previous successful deploy → **Promote to Production**.
- [ ] Rollback is instant (Vercel keeps the build cached). No revert commit required for the immediate fix.
- [ ] Once stable, `git revert <sha>` on main to make the rollback durable in code.

## 8. After everything passes

- [ ] Update `MEMORY.md`'s `project_v1_progress.md` — flip "v1-f11 SHIPPED" + "production live at openpropfirm.com" with the prod commit SHA.
- [ ] Tag the launch commit: `git tag v1.0.0 && git push origin v1.0.0`.
- [ ] Announce in whichever channel matters (X, Reddit r/propfirm, etc.) — that's a marketing/growth follow-up, not v1-f11 scope.
