# Sprint 6 — Launch Readiness

> **Goal**: Ship the monitoring bot, plug legal/SEO gaps, and execute the production go-live checklist.
>
> **Carry-forwards from S4 review**: R4-11 (3rd-party sources → S6-09), R4-16 (search excerpt → S6-10). R4-14 (tsconfig.scripts.json) closed — file does not exist in the codebase.
>
> **S5 review**: All 15 findings (R5-01 through R5-15) were resolved in the S5 review session. No carry-forwards.

---

## Group A — Monitoring Bot (launch-blocking)

### S6-01 · Supabase migration + `/admin` page

**Summary**: Create the `bot_usage_log` table and a read-only admin page showing per-run stats.

**Acceptance criteria**:
- [ ] Migration file at `supabase/migrations/YYYYMMDDHHMMSS_bot_usage_log.sql` creates the table:
  - `id` bigserial primary key
  - `firm_slug` text not null
  - `run_at` timestamptz not null default now()
  - `last_verified` date
  - `changes_detected` boolean not null
  - `pr_url` text
  - `tokens_used` integer
  - `cost_usd` numeric(10,6)
  - `error` text
- [ ] Row-level security enabled; only `service_role` key may insert
- [ ] `src/app/admin/page.tsx` is a Server Component (no `'use client'`)
- [ ] Page queries `bot_usage_log` ordered by `run_at desc`, limit 100
- [ ] Renders a plain `<table>` with columns: firm, run_at, last_verified, changes, PR, tokens, cost, error
- [ ] Route is protected — unauthenticated requests redirect to `/auth/sign-in`
- [ ] No pagination required (simple MVP)

**Files likely affected**:
- `supabase/migrations/` (new file)
- `src/app/admin/page.tsx` (new file)
- `src/lib/supabase/server.ts` (if admin query helper needed)

---

### S6-02 · Monitor scripts — TypeScript/Cheerio scrapers

**Summary**: Implement per-firm TypeScript scrapers that fetch live data and compare against local markdown content.

**Acceptance criteria**:
- [ ] Scripts live at `scripts/monitor/<firm-slug>.ts` (one file per firm)
- [ ] Initial firms: FTMO, MyForexFunds (or current active firms in `content/`)
- [ ] Each script uses `cheerio` (not Python/BeautifulSoup) for HTML parsing
- [ ] Each script exports a `run(): Promise<BotRunResult>` function with type:
  ```ts
  interface BotRunResult {
    firmSlug: string
    lastVerified: string   // ISO date
    changesDetected: boolean
    diff: string | null    // unified diff or human-readable summary
    error: string | null
  }
  ```
- [ ] Script reads the corresponding `content/<firm-slug>/*.md` files to build expected values
- [ ] HTTP fetch uses a reasonable timeout (30s) and user-agent header
- [ ] `tsconfig.scripts.json` created at repo root extending base tsconfig, targeting `scripts/`
- [ ] `pnpm run monitor` (or `ts-node --project tsconfig.scripts.json`) runs all scrapers

**Files likely affected**:
- `scripts/monitor/<firm-slug>.ts` (new files)
- `scripts/monitor/types.ts` (shared types)
- `tsconfig.scripts.json` (new file)
- `package.json` (scripts entry)

---

### S6-03 · Diff engine + PR automation

**Summary**: Compare scraped data against local content, generate a patch, and open a GitHub PR using the `gh` CLI.

**Acceptance criteria**:
- [ ] `scripts/monitor/runner.ts` orchestrates all firm scrapers in sequence
- [ ] On `changesDetected === true`, runner writes updated markdown to a temp branch
- [ ] PR created via `gh pr create` (not GitHub API directly) with:
  - Title: `[bot] <firm-slug> — content update YYYY-MM-DD`
  - Body includes the diff summary from `BotRunResult.diff`
  - Label: `bot-update` (created if absent)
- [ ] `last_verified` field in local markdown front-matter is updated to today's date on every successful run (regardless of whether changes were detected)
- [ ] Run result (including `pr_url` if created) is inserted into `bot_usage_log` via Supabase service-role key
- [ ] Token/cost fields populated if scraping uses an LLM step; otherwise null
- [ ] Runner exits with code 0 on success, non-zero on unhandled error

**Files likely affected**:
- `scripts/monitor/runner.ts` (new file)
- `scripts/monitor/<firm-slug>.ts` (updated to return diff)
- Firm markdown front-matter fields

---

### S6-04 · Bot health check + `bot.yml` CI wiring

**Summary**: Wire the monitor runner as a scheduled GitHub Actions workflow and add a smoke-test health check.

**Acceptance criteria**:
- [ ] `.github/workflows/bot.yml` created with:
  - `schedule: cron: '0 6 * * 1'` (Mondays 06:00 UTC)
  - `workflow_dispatch` trigger for manual runs
  - Runs `pnpm install && pnpm run monitor`
  - Uses `SUPABASE_SERVICE_ROLE_KEY` and `GH_TOKEN` secrets from repo settings
- [ ] Workflow fails loudly (non-zero exit) if any scraper throws an unhandled exception
- [ ] A `scripts/monitor/health-check.ts` script verifies Supabase connectivity and `gh` auth — used as a pre-flight before the main run
- [ ] README or `docs/bot.md` documents how to run the bot locally and how to add a new firm

**Files likely affected**:
- `.github/workflows/bot.yml` (new file)
- `scripts/monitor/health-check.ts` (new file)
- `docs/bot.md` (new file)

---

## Group B — Legal & Community

### S6-05 · Legal pages + footer links

**Summary**: Add Terms of Service and Disclaimer pages; link them from the site footer.

**Acceptance criteria**:
- [ ] `content/legal/terms-of-service.md` and `content/legal/disclaimer.md` exist with substantive content
- [ ] Both pages render via the existing content pipeline (no new route needed if tree picks them up)
- [ ] Site footer (wherever it lives) includes links to both pages
- [ ] Pages are accessible without authentication

**Files likely affected**:
- `content/legal/terms-of-service.md` (new file)
- `content/legal/disclaimer.md` (new file)
- Footer component (TBD — locate in codebase)

---

### S6-06 · CONTRIBUTING.md

**Summary**: Document how external contributors can add or update firm data.

**Acceptance criteria**:
- [ ] `CONTRIBUTING.md` at repo root covers:
  - How to add a new firm (content structure, required front-matter fields including `last_verified`)
  - How to run the monitor bot locally
  - PR expectations and labeling conventions
- [ ] Linked from `README.md`

**Files likely affected**:
- `CONTRIBUTING.md` (new file)
- `README.md` (add link)

---

## Group C — SEO & Analytics

### S6-07 · Per-page metadata + static OG image

**Summary**: Populate `<title>` and `<meta>` tags for every page; add a single static OG image.

**Acceptance criteria**:
- [ ] Every page exports `metadata` (or `generateMetadata`) with at minimum: `title`, `description`, `openGraph.title`, `openGraph.description`
- [ ] Firm pages derive title/description from front-matter (`title`, `description` fields)
- [ ] A static `public/og.png` (1200×630) exists and is referenced as the default `openGraph.image`
- [ ] No dynamic OG image generation required (static image is acceptable for launch)
- [ ] Homepage and `/auth/*` pages have appropriate metadata
- [ ] Verified with `<meta>` inspector or `curl -s <url> | grep og:`

**Files likely affected**:
- `src/app/layout.tsx`
- `src/app/[...slug]/page.tsx` (or equivalent dynamic route)
- `src/app/auth/*/page.tsx` files
- `public/og.png` (new asset)

---

### S6-08 · Vercel Analytics + Speed Insights

**Summary**: Install `@vercel/analytics` and `@vercel/speed-insights` and inject into the root layout.

**Acceptance criteria**:
- [ ] `@vercel/analytics` and `@vercel/speed-insights` installed as dependencies
- [ ] `<Analytics />` and `<SpeedInsights />` rendered in `src/app/layout.tsx`
- [ ] No lint or typecheck errors introduced
- [ ] Analytics dashboard shows data after a production deploy (verified post-launch)

**Files likely affected**:
- `src/app/layout.tsx`
- `package.json`

---

## Group D — Content Debt (S4 carry-forwards)

### S6-09 · Replace 3rd-party source references (R4-11)

**Summary**: Audit all firm pages for links or citations pointing to external sites and replace with first-party wording or remove entirely.

**Acceptance criteria**:
- [ ] All `content/` markdown files audited for external source links/citations
- [ ] Any 3rd-party attribution replaced with direct wording ("as of [date]" or similar)
- [ ] No broken links remain (verify with `pnpm run build` or link-checker)
- [ ] `last_verified` front-matter field added to any firm page that lacks it

**Files likely affected**:
- `content/**/*.md`

---

### S6-10 · Improve search excerpt (R4-16)

**Summary**: Fix search result snippets — strip the H1, find the first substantive paragraph, and index the full body text.

**Acceptance criteria**:
- [ ] Search excerpt generation strips the leading H1 title before selecting snippet text
- [ ] Excerpt selects the first non-empty paragraph (not a heading or front-matter line)
- [ ] Full markdown body (post-H1-strip) is indexed for full-text search, not just the excerpt
- [ ] Excerpt truncated at ~160 characters with ellipsis
- [ ] Verified by searching a term that appears mid-page and confirming the result snippet is relevant

**Files likely affected**:
- `src/lib/content/search.ts` (or wherever excerpt logic lives)
- Possibly `src/app/api/search/route.ts`

---

## Group E — Launch

### S6-11 · Production go-live checklist

**Summary**: Complete all pre-launch infrastructure tasks required to ship to production.

**Acceptance criteria**:
- [ ] Supabase project configured with custom SMTP (Resend or similar) for auth emails
- [ ] Supabase redirect URLs include the production domain for password reset and OAuth flows
- [ ] All required environment variables set in Vercel project settings (production environment):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Any other secrets referenced in codebase
- [ ] Custom domain configured and DNS propagated in Vercel
- [ ] Bot run executed manually against production (`pnpm run monitor`) and `/admin` page shows the log entry
- [ ] `pnpm turbo build` succeeds with zero errors on main branch
- [ ] Auth flows tested end-to-end in production: sign-up, sign-in, forgot password, update password
- [ ] Mobile layout manually verified at 375px viewport (iPhone SE baseline) — no horizontal scroll, nav accessible

**Files likely affected**:
- Vercel dashboard (env vars, domain)
- Supabase dashboard (SMTP, redirect URLs)
- No code changes expected

---

## Exit Criteria for S6

- [ ] All S6-01 through S6-11 acceptance criteria met
- [ ] `pnpm turbo lint && pnpm turbo typecheck` pass clean
- [ ] `pnpm turbo build` succeeds
- [ ] Bot has run at least once against production and `/admin` shows the result
- [ ] Site is live on production domain
