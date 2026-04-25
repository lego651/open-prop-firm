# v1-f11 — Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every gap that stands between the current `main` and the first public visit to openpropfirm.com — fix the bot's known SCRAPE_URL/UA failures so the Monday cron stops bleeding, fill the SEO holes v1-f10 left in `sitemap.ts`, document a 10-minute pre-deploy smoke ritual that walks every shipped surface, stand up a tracking doc for the four pending affiliate applications, and write the production Vercel checklist (domain + env-var audit + Analytics) that the next deploy will be measured against.

**Architecture:** Pure ops + docs feature — no new components, no schema changes, no new npm deps. One small TypeScript edit to `scripts/monitor/utils.ts` (browser UA), one URL fix in `scripts/monitor/funding-pips.ts`, an additive rewrite of `src/app/sitemap.ts` to include the v1-f9/v1-f10 routes, and four new/extended markdown docs under `docs/`. The chrome-discontinuity follow-up (`/firms` lacks SiteHeader/SiteFooter) is **explicitly accepted as v1 boundary** — refactoring the route tree at launch time is the wrong tradeoff and the cost was already analyzed in the v1-f10 plan's risks section.

**Tech Stack:** Next.js 16 App Router (`MetadataRoute.Sitemap`), Node `fetch` for one-off URL probes, vitest (existing scraper test suites), gray-matter / markdown for docs.

---

## Spec traceability

- **Spec §7 manual pre-deploy verification** — Task 4 extends `docs/manual-qa.md` with a 10-min ritual at the top.
- **Spec §3.1 routes** — Task 2 makes `sitemap.ts` advertise the routes that already render: `/`, `/about`, `/disclosure`, `/terms`, `/firms`, `/firms/[slug]`. Wiki catch-all routes already covered by existing `getStaticParams()` walk.
- **Spec §6 failure: bot silent > 24 hours** — already shipped in v1-f5; Task 1 is the *prevention* side: stop two of the four scrapers from 403'ing every Monday.
- **Spec §2 decision #5 (affiliate-only monetization)** — Task 3 stands up the application tracker so we know what state each program is in before the URLs go live in firm frontmatter.
- **CEO-locked "openpropfirm.com" domain** — Task 5 documents the Vercel production checklist Jason will work through during the actual deploy.

---

## v1-f10 follow-ups consumed by v1-f11

From `/Users/lego/.claude/projects/-Users-lego--Lego651-open-prop-firm/memory/project_v1_progress.md`:

1. **`sitemap.ts` does not list `/about`, `/disclosure`, `/terms`, `/firms`, `/firms/[slug]`** — Task 2 fixes.
2. **FirmCardGrid chrome discontinuity** (clicking "Browse firms" on `/` lands on bare `/firms`) — **DECISION: accept as v1 boundary.** Reasons:
   - The v1-f10 risks section already analyzed the fix: move v1-f9's `firms/page.tsx` + `firms/[slug]/page.tsx` into `(marketing)/firms/...`, which would create a routing collision with the existing `/firms/[...slug]` wiki catch-all. "Resolving that collision is a non-trivial routing refactor, best deferred."
   - The decision pages have their own dense top-of-page chrome (VerificationBadge → SnapshotBar → RuleBreakdown). A second site nav above that would compete for attention exactly where Decision Header should dominate.
   - User flow: landing → "Browse firms" → grid. The grid IS the index — visitors aren't expected to navigate AWAY from it via top nav once they're on it. Bare style is acceptable.
   - **v2 candidate**, not a v1 blocker. Documented in Task 4's pre-deploy doc as a known-and-accepted boundary.

---

## Operational debt cleared by v1-f11

From the same memory file (lines 49–53):

- `scripts/monitor/funding-pips.ts` SCRAPE_URL `https://fundingpips.com/challenge` → 404 — Task 1 fixes.
- `scripts/monitor/apex-funding.ts` SCRAPE_URL → 403 from Cloudflare — Task 1 swaps `USER_AGENT` in `scripts/monitor/utils.ts` to a real browser UA string.
- `scripts/monitor/lucid-trading.ts` SCRAPE_URL → 403 from Cloudflare — same fix as Apex (shared `utils.ts` constant).
- The error path in `runner.ts` (v1-f3) handles 4xx/5xx cleanly — does NOT bump `last_verified`, posts a health comment, no data corruption. Today's state is safe; Task 1 just stops the noise.

---

## Architecture diagram — what changes after v1-f11

```
src/app/
├── sitemap.ts                                ← MODIFIED: now lists / + 3 marketing + /firms + /firms/[slug]
└── (everything else)                         ← UNTOUCHED

scripts/monitor/
├── utils.ts                                  ← MODIFIED: USER_AGENT → real browser string
├── funding-pips.ts                           ← MODIFIED: SCRAPE_URL → live URL discovered in Task 1
├── apex-funding.ts                           ← UNTOUCHED (gets fixed by utils.ts UA change)
└── lucid-trading.ts                          ← UNTOUCHED (gets fixed by utils.ts UA change)

docs/
├── manual-qa.md                              ← MODIFIED: prepended new "Part 0 — 10-min pre-deploy"
├── affiliate-applications.md                 ← NEW: tracking table + per-firm status notes
├── vercel-production-checklist.md            ← NEW: domain + env vars + analytics + first-deploy steps
└── superpowers/plans/
    └── 2026-04-24-v1-f11-launch-readiness.md ← NEW: this file
```

**No app code, components, repository helpers, or content frontmatter is touched.** Only one runtime file changes (`src/app/sitemap.ts`), and it's an additive route enumeration — no contract changes.

---

## Testing strategy

- **`scripts/monitor/utils.ts` UA change** — re-run existing `utils.test.ts`, `funding-pips.test.ts`, `apex-funding.test.ts`, `lucid-trading.test.ts`, `funded-next.test.ts`. They use HTML fixtures (in `scripts/monitor/__fixtures__/`), not live HTTP, so the UA swap is invisible to test logic. Goal: zero regressions.
- **`scripts/monitor/funding-pips.ts` URL change** — same: HTML-fixture-based tests, URL is a constant the test doesn't assert on. Run the file's tests to confirm.
- **Live URL probe (manual, in Task 1)** — `curl -A "<new UA>" -I "<URL>"` for each of the 3 problem URLs. Expected: HTTP 200 from each. If still 403, document the residual scraper that needs a deeper fix and file as v1-f11 backlog.
- **`src/app/sitemap.ts`** — no unit test added (no existing pattern; the file is a thin enumeration with build-time prerender as the smoke). Validation: `pnpm build` shows no errors, then `curl http://localhost:3000/sitemap.xml | grep -c "<url>"` ≥ 11 (1 root + 3 marketing + 1 firms index + 4 firm details + N wiki paths).
- **Docs** — markdown lint via `pnpm tsc --noEmit` won't catch anything, so visual review only. Each new doc opens in a browser preview / VS Code preview with no broken links.

---

## File structure

**New files:**
- `docs/affiliate-applications.md`
- `docs/vercel-production-checklist.md`
- `docs/superpowers/plans/2026-04-24-v1-f11-launch-readiness.md` (this plan)

**Modified files:**
- `scripts/monitor/utils.ts` (USER_AGENT constant)
- `scripts/monitor/funding-pips.ts` (SCRAPE_URL constant)
- `src/app/sitemap.ts` (enumeration extended)
- `docs/manual-qa.md` (prepended Part 0)

**Untouched:**
- All app code (`src/app/(marketing)/*`, `src/app/firms/*`, `src/app/legal/*`, `src/app/admin/*`, `src/app/auth/*`).
- All v1-f7/f8/f9/f10 components.
- All firm content frontmatter (`data/firms/**`).
- All bot orchestration (`runner.ts`, `health-check.ts`, `health-watchdog.ts`, GitHub Actions YAMLs).
- `.env.example` — no new env vars needed; `NEXT_PUBLIC_SITE_URL` already documented and Vercel Analytics auto-injects its key.

**No new npm deps.**

---

## Task 1: Bot operational debt — UA + funding-pips URL

**Files:**
- Modify: `scripts/monitor/utils.ts` (USER_AGENT constant)
- Modify: `scripts/monitor/funding-pips.ts` (SCRAPE_URL constant)

### Rationale

Three of the four launch-firm scrapers fail every Monday at 06:00 UTC — Apex + Lucid 403 because Cloudflare blocks the custom `OpenPropFirmBot/1.0` UA string, and Funding Pips 404s because the source page moved off `/challenge`. The fix is two constants. Funded Next works today; do not touch it.

### Step 1 — Probe each URL with current UA (baseline confirmation)

- [ ] **Sub-step 1a — Confirm 403 on Apex with current UA**

```bash
curl -A "Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)" \
  -I "https://apextraderfunding.com/evaluation"
```

Expected: `HTTP/2 403`. Record actual status in scratchpad.

- [ ] **Sub-step 1b — Confirm 403 on Lucid with current UA**

```bash
curl -A "Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)" \
  -I "https://lucidtrading.com/how-it-works"
```

Expected: `HTTP/2 403`.

- [ ] **Sub-step 1c — Confirm 404 on Funding Pips with current UA**

```bash
curl -A "Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)" \
  -I "https://fundingpips.com/challenge"
```

Expected: `HTTP/2 404`.

If any of the three is already 200, skip Step 2 sub-steps for that URL and document the unexpected pass.

### Step 2 — Probe each URL with a real browser UA

Use a current-stable Chrome/macOS UA string (do NOT spoof a moving-target UA — use a stable, well-known one):

`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36`

- [ ] **Sub-step 2a — Re-probe Apex with browser UA**

```bash
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
  -I "https://apextraderfunding.com/evaluation"
```

Expected: `HTTP/2 200`. If still 403, note that Cloudflare is fingerprinting more than UA — escalate as backlog (proxy or Playwright-based fetch is out of scope for v1).

- [ ] **Sub-step 2b — Re-probe Lucid with browser UA**

```bash
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
  -I "https://lucidtrading.com/how-it-works"
```

Expected: `HTTP/2 200`. Same escalation rule if not.

- [ ] **Sub-step 2c — Discover the live Funding Pips evaluation URL**

```bash
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
  -L -I "https://fundingpips.com/"
```

Look at the homepage redirect chain + scrape the homepage HTML for the canonical "challenge" / "evaluation" / "pricing" link:

```bash
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
  -s "https://fundingpips.com/" | grep -oE 'href="[^"]*"' | grep -iE "challenge|evaluation|pricing" | head -20
```

Pick the URL whose page contains the watched fields (max drawdown, profit target, account sizes). Confirm with a HEAD probe:

```bash
curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" \
  -I "<discovered URL>"
```

Expected: `HTTP/2 200`. Record the URL — it goes into the next step.

### Step 3 — Update USER_AGENT constant in `scripts/monitor/utils.ts`

Replace the existing constant on `scripts/monitor/utils.ts:3-4`:

```ts
export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
```

Leave the rest of `utils.ts` unchanged. This is a constant — every existing scraper picks it up automatically through the `fetchPage()` import.

### Step 4 — Update SCRAPE_URL in `scripts/monitor/funding-pips.ts`

Replace the constant on `scripts/monitor/funding-pips.ts:15`:

```ts
const SCRAPE_URL = '<URL discovered in Step 2c>'
```

If Step 2c could not find a working URL, flip the file's behavior to a soft-skip: keep the constant but throw a clear error when the page returns non-200, and file `funding-pips.ts: needs new SCRAPE_URL` as v1-f11 backlog. Do NOT remove the file or comment it out — that breaks `runner.ts`'s firm enumeration.

### Step 5 — Re-run scraper unit tests

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm test -- scripts/monitor
```

Expected: all green. The fixture-based tests do not actually hit HTTP, so the UA + URL changes don't affect them. If anything fails, the change touched test logic — revert and investigate.

### Step 6 — Type check

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
```

Clean.

### Step 7 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git checkout -b feat/v1-f11-launch-readiness
git add scripts/monitor/utils.ts scripts/monitor/funding-pips.ts
git commit -m "$(cat <<'EOF'
[s1] fix: v1-f11 bot UA + funding-pips SCRAPE_URL

Switch shared USER_AGENT in scripts/monitor/utils.ts from the custom
"OpenPropFirmBot/1.0" string to a stock macOS Chrome 124 UA so Cloudflare
stops 403'ing the Apex + Lucid scrapers. Funding Pips moved off /challenge
— SCRAPE_URL pointed at the canonical live evaluation page discovered via
homepage scrape.

Pre-bot-cron debt cleared per v1-f11 plan. Funded Next scraper untouched
(already 200s on the existing UA + URL). Existing fixture-based unit
tests are HTTP-free and pass without modification.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Sitemap fix — list every shipped public URL

**Files:**
- Modify: `src/app/sitemap.ts` (full rewrite of the `return` body)

### Rationale

Today, `sitemap.ts` enumerates the wiki catch-all (`/firms/<category>/<slug>` and its children) plus the home `/`. After v1-f9 + v1-f10, FIVE more public URLs render and SHOULD be crawlable: `/about`, `/disclosure`, `/terms`, `/firms` (decision-tool index), and `/firms/[slug]` for each launch firm. Without them, Google sees the site as a wiki, not a decision tool — exactly inverted from spec §3.1's URL ranking intent.

### Step 1 — Read current sitemap.ts to lock the structure in mind

Already done in plan-prep. Current shape:

```ts
import type { MetadataRoute } from 'next'
import { getStaticParams } from '@/lib/content/getContentTree'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const params = await getStaticParams()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com'

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...params.map(({ slug }) => ({
      url: `${siteUrl}/firms/${slug.join('/')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
```

### Step 2 — Rewrite full file

Replace `src/app/sitemap.ts` end-to-end:

```ts
import type { MetadataRoute } from 'next'
import { getStaticParams } from '@/lib/content/getContentTree'
import { listFirms } from '@/lib/firms/repository'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com'
  const now = new Date()

  // Decision-tool surface (priority 1.0 / 0.9) — the site's primary product.
  const marketing: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/disclosure`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/firms`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]

  // Per-firm decision pages (priority 0.9) — the v1-f9 routes.
  const firms = await listFirms()
  const firmPages: MetadataRoute.Sitemap = firms.map((f) => ({
    url: `${siteUrl}/firms/${f.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  // Wiki catch-all (priority 0.6) — secondary reference content under /firms/<category>/<slug>/...
  const wikiParams = await getStaticParams()
  const wikiPages: MetadataRoute.Sitemap = wikiParams.map(({ slug }) => ({
    url: `${siteUrl}/firms/${slug.join('/')}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...marketing, ...firmPages, ...wikiPages]
}
```

Notes baked into the structure:
- `/about` and `/terms` get lower priority (legalese / boilerplate).
- `/disclosure` gets 0.7 — important for trust signaling but not a landing target.
- `/firms` and per-firm decision pages get 0.9 — the actual product surface.
- Wiki priority drops from 0.8 (current) to 0.6 because the decision pages are now the canonical entry, and we want crawlers to weight them above the deep wiki tree.
- `lastModified` reused from a single `now` so the entire sitemap shares one timestamp per request — matches existing pattern.

### Step 3 — Type check

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
```

Expected: clean. `listFirms` is a server-only repository function exported by `src/lib/firms/repository.ts` (v1-f9). It runs at build time inside the sitemap, same as `getStaticParams`.

### Step 4 — Build + smoke

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm build
```

Build log should NOT show any new errors. The sitemap is generated at build time.

```bash
pnpm dev
```

Then in another terminal:

```bash
curl -s http://localhost:3000/sitemap.xml | grep -c "<url>"
```

Expected: ≥ 11 entries (1 root + 4 marketing + 1 firms index + 4 firm details + N wiki paths). The Funded Next + Funding Pips + Apex + Lucid firm-detail URLs should all appear:

```bash
curl -s http://localhost:3000/sitemap.xml | grep -E "/firms/(funded-next|funding-pips|apex-funding|lucid-trading)"
```

Expected: 4 lines, one per firm.

```bash
curl -s http://localhost:3000/sitemap.xml | grep -E "/(about|disclosure|terms|firms)<"
```

Expected: at least 4 lines (the 3 marketing routes + `/firms`).

### Step 5 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add src/app/sitemap.ts
git commit -m "$(cat <<'EOF'
[s1] feat: v1-f11 sitemap covers all v1-f9 + v1-f10 routes

sitemap.ts now enumerates the decision-tool surface (/, /about, /disclosure,
/terms, /firms, /firms/[slug] × 4 launch firms) in addition to the existing
wiki catch-all walk. Decision pages get priority 0.9; root + /firms get 1.0
and 0.9; wiki drops from 0.8 → 0.6 so crawlers weight the canonical decision
URLs above the deep reference tree. lastModified reuses one Date per request.

Closes the v1-f10 follow-up logged in project_v1_progress.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Affiliate-applications tracking doc

**Files:**
- Create: `docs/affiliate-applications.md`

### Rationale

All 4 launch firms have `affiliate.url: null` in their decision frontmatter pending program approvals. Once a program approves, three things happen in sequence: (1) Jason gets a unique URL + UTM, (2) the firm's `decision.affiliate.url` + `decision.affiliate.utm` flip from null to populated, (3) `AffiliateCTA` renders on the firm page. There's no operational doc tracking which programs are at which stage, who to email if no response, or what UTM string we registered. This doc is that log.

### Step 1 — Write `docs/affiliate-applications.md`

```md
# Affiliate Applications — v1 Launch Tracker

> Source-of-truth log for every prop-firm affiliate program OpenPropFirm has applied to.
> Each firm's `decision.affiliate.url` + `decision.affiliate.utm` in `data/firms/**/index.md`
> stays `null` until the corresponding row below shows status `live`.

---

## Status legend

- `not-applied` — application never submitted
- `applied` — application submitted, awaiting reply
- `under-review` — firm acknowledged, in their internal vetting queue
- `approved` — accepted, awaiting URL/UTM provisioning
- `live` — URL + UTM populated in firm frontmatter, AffiliateCTA renders on the firm page
- `rejected` — declined; reason recorded in notes
- `paused` — withdrew or program currently closed

---

## Tracker

| Firm | Slug | Program URL | Applied | Last contact | Status | URL once live | UTM once live | Notes |
|---|---|---|---|---|---|---|---|---|
| Funded Next | `funded-next` | https://fundednext.com/affiliates (verify) | TBD | — | `not-applied` | — | — | Highest-traffic CFD firm; apply first |
| Funding Pips | `funding-pips` | https://fundingpips.com/affiliate (verify) | TBD | — | `not-applied` | — | — | — |
| Apex Trader Funding | `apex-funding` | https://apextraderfunding.com/affiliate (verify) | TBD | — | `not-applied` | — | — | Futures-only; smaller funnel but high payout |
| Lucid Trading | `lucid-trading` | (not yet confirmed) | TBD | — | `not-applied` | — | — | Confirm program existence first |

> Update the `Applied` and `Last contact` columns to ISO dates (YYYY-MM-DD) as state changes.
> Update `URL once live` and `UTM once live` only after the firm provisions the link — that is the same value that goes into `data/firms/<category>/<slug>/index.md` under `decision.affiliate`.

---

## When a program approves

1. Update this tracker row → status `approved`, fill `URL once live` + `UTM once live`.
2. Edit the firm's `data/firms/<category>/<slug>/index.md` frontmatter:
   ```yaml
   decision:
     affiliate:
       url: '<URL once live>'
       utm: '<UTM once live>'
   ```
3. Run `pnpm validate:firms` (or `pnpm tsc --noEmit && pnpm test -- firms`) to confirm the schema accepts the change.
4. Spot-check the firm's page at `localhost:3000/firms/<slug>` — `AffiliateCTA` should render with the affiliate button. (Before this change, the component renders `null` because of v1-f8's null-guard.)
5. Update this tracker row → status `live`. Commit.

## When a program rejects

- Update the row → status `rejected`. Add reason in notes column.
- Frontmatter stays at `affiliate.url: null` — the page just doesn't render the CTA. No code change.

## Audit cadence

Re-check the tracker weekly during launch month, then monthly after. Programs go dark or change terms without notice; a stale `live` URL that 404s is worse than no URL at all.

## Related docs

- Affiliate disclosure copy: `data/static/disclosure.md`
- Component that renders the CTA: `src/components/firm/AffiliateCTA.tsx`
- Firm frontmatter schema: `scripts/monitor/schema.ts` (search for `affiliate`)
```

### Step 2 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add docs/affiliate-applications.md
git commit -m "$(cat <<'EOF'
[s1] docs: v1-f11 affiliate-application tracker

Operational log for the 4 launch firms' affiliate programs — status,
contact dates, URL/UTM once provisioned, and the exact handoff steps to
flip a firm's frontmatter from affiliate.url:null → live. All 4 firms
start at `not-applied`; tracker is updated as Jason works the queue.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Manual QA — prepend 10-minute pre-deploy ritual

**Files:**
- Modify: `docs/manual-qa.md` (prepend a new "Part 0" above the existing Prerequisites section)

### Rationale

Today's `docs/manual-qa.md` is a 170-line full-product QA — it's good but it's NOT a 10-minute pre-deploy. The pre-deploy needs to be SHORT enough that Jason runs it every time before pushing main, COMPREHENSIVE enough to catch the regressions that matter (broken render on any of the 8 public URLs, broken Snapshot Bar values, broken AffiliateCTA conditional, broken Pre-Trade Checklist localStorage). Prepend it; keep the existing content as the deeper "Part 1+" comprehensive sweep.

### Step 1 — Read current `docs/manual-qa.md` head to confirm insertion point

The current file starts:

```md
# Manual QA Checklist — OpenPropFirm v1

Run this against the production URL (or `npm run dev` locally) before launch.
...
---

## Prerequisites
...
```

We insert a "Part 0 — 10-Minute Pre-Deploy Ritual" between the intro and "Prerequisites". The intro line is also slightly tightened to call out the two layers.

### Step 2 — Apply the edit to `docs/manual-qa.md`

Replace the top of the file (everything from line 1 through the first `## Prerequisites` heading, exclusive) with:

```md
# Manual QA Checklist — OpenPropFirm v1

Two layers of QA, run at different times:

- **Part 0 — 10-Minute Pre-Deploy Ritual.** Run before EVERY push to main. Catches the regressions that matter on the 8 public URLs and the firm decision components.
- **Parts 1–5 — Comprehensive QA.** Run before launch, then quarterly. Walks every guest + auth + admin flow.

---

## Part 0 — 10-Minute Pre-Deploy Ritual

Run on `pnpm dev` (or against the preview URL after `vercel deploy`).

### 0.1 — Marketing surface (90 seconds)

- [ ] `/` loads. Hero + "Browse firms" CTA + 4 firm cards visible. SiteHeader sticky on scroll. SiteFooter visible at bottom with affiliate-disclosure micro-copy.
- [ ] `/about` loads. Renders prose. Header + Footer present.
- [ ] `/disclosure` loads. Header + Footer present. "Affiliate-only" stance is visible in the body.
- [ ] `/terms` loads. Header + Footer present.
- [ ] Click "Firms" in the SiteHeader → lands on `/firms` (bare style is intentional for v1 — see "Known v1 boundaries" at the bottom of Part 0).

### 0.2 — Firm decision pages (4 firms × ~60 seconds = 4 minutes)

For EACH of the four launch firms — `/firms/funded-next`, `/firms/funding-pips`, `/firms/apex-funding`, `/firms/lucid-trading` — confirm:

- [ ] Page renders without console errors.
- [ ] **VerificationBadge** shows a date and either "manual" or "bot". If the badge is amber/red (>7 days stale), note which firm — it's a bot-monitoring signal, not necessarily a deploy blocker.
- [ ] **SnapshotBar** renders with 6 chips populated (max DD, daily DD, profit target, payout split, payout cycle, news trading). No chip should be empty/blank.
- [ ] **RuleBreakdown** section renders with content (the firm's `rules.md` body). H2 headings appear in the breakdown.
- [ ] **Changelog** section renders. If empty (`No changes recorded yet.`), that's fine — bot hasn't logged anything yet for this firm.
- [ ] **KillYouFirstList** renders with at least one warning entry, amber-tinted background.
- [ ] **FitScoreTable** renders with rating rows + a "Best for" line at the top.
- [ ] **PreTradeChecklist** renders with checkable items, green-tinted background. Click one item — checkbox state flips. Reload the page — the checked state persists (localStorage).
- [ ] **AffiliateCTA** — TWO valid states:
  - If the firm's `decision.affiliate.url` is `null` → CTA does NOT render (correct null-guard). Confirm by inspecting the page — no green button block at the bottom.
  - If the URL is populated → button renders, links to the affiliate URL, has the disclosure micro-copy.

### 0.3 — Wiki catch-all (60 seconds)

The Obsidian-style wiki must still work — it's the original content surface and v1-f10's layout split could regress it.

- [ ] `/firms/cfd/funding-pips` → 3-panel AppShell (sidebar tree + content + optional graph). Sidebar shows the file tree.
- [ ] `/firms/cfd/funding-pips/rules` → still inside AppShell, content updates.
- [ ] `/firms/futures/apex-funding` → same shape, futures category.

### 0.4 — Cross-cut sanity (60 seconds)

- [ ] `/sitemap.xml` returns XML. Spot-check that all 4 firm decision URLs (`/firms/<slug>`) appear.
- [ ] `/robots.txt` returns text. `/admin` and `/auth` are disallowed.
- [ ] DevTools console on `/` and on one firm decision page — zero errors, zero React hydration warnings.
- [ ] Page tab title on `/` reads "OpenPropFirm — the pre-trade decision page for prop firm traders".

### 0.5 — Bot health (30 seconds)

- [ ] Open the pinned `Bot Health Check` issue on GitHub — newest comment is < 8 days old (matches `MAX_SILENCE_HOURS=192`). If older, the watchdog will alert separately; the deploy doesn't block on it but Jason should investigate before EOD.

### 0.6 — Sign-off

- [ ] All Part 0 checks passed → safe to deploy.
- [ ] Any check failed → STOP. Fix or back out the failing change before pushing main.

### Known v1 boundaries (intentional, not bugs)

These are documented decisions, NOT regressions. They should NOT block a deploy:

- `/firms` and `/firms/[slug]` (decision-tool routes) render WITHOUT SiteHeader/SiteFooter. The decision page has its own dense top chrome (VerificationBadge → SnapshotBar) and a second site nav above it would compete for attention. v2 candidate.
- `/legal/terms-of-service` and `/legal/disclaimer` still resolve (the old `legal/` route group). New canonical routes are `/terms` + `/disclosure`. v1-f11 does NOT add 301 redirects — old links keep working as-is.
- The `/firms/cfd/<slug>` wiki catch-all coexists with `/firms/<slug>` decision-tool routes. Two different surfaces over the same firm slug. v2 may unify; v1 ships both.

---

```

(Note: the trailing `---` and the existing `## Prerequisites` heading on the next line stay. The file's existing intro paragraph "Run this against the production URL..." is REPLACED by the new dual-layer intro above.)

### Step 3 — Visual review

```bash
cd /Users/lego/@Lego651/open-prop-firm
# Open in your editor's markdown preview, or run:
cat docs/manual-qa.md | head -100
```

Confirm:
- "Part 0" heading appears at the top, above any "Prerequisites" or "Part 1" content.
- All 4 firm slugs (`funded-next`, `funding-pips`, `apex-funding`, `lucid-trading`) appear in section 0.2.
- "Known v1 boundaries" appears at the bottom of Part 0.

### Step 4 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add docs/manual-qa.md
git commit -m "$(cat <<'EOF'
[s1] docs: v1-f11 manual-qa Part 0 — 10-min pre-deploy ritual

Prepends a fast, comprehensive pre-deploy checklist to docs/manual-qa.md
covering: 4 marketing routes (header/footer/hero/cards), 4 firm decision
pages (every v1-f7 + v1-f8 component, including PreTradeChecklist
localStorage round-trip and AffiliateCTA null-vs-live conditional), the
wiki catch-all (regression check on v1-f10's layout split), sitemap +
robots + console-error sanity, and a 30-second bot health glance.

The existing Parts 1–5 stay as-is and are now framed as "comprehensive
QA, run before launch + quarterly". Part 0 also documents the 3
intentional v1 boundaries (chrome discontinuity on /firms, legacy
/legal/* routes, wiki+decision dual surface) so they don't get
mistakenly flagged as deploy blockers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Vercel production checklist

**Files:**
- Create: `docs/vercel-production-checklist.md`

### Rationale

Jason owns the actual production deploy — domain, env vars, Analytics, branch protection. There's currently no single doc that says "to push openpropfirm.com live, do these N things in this order". This doc is that runbook. It also surfaces a subtle gap: `NEXT_PUBLIC_SITE_URL` is read by `metadata.metadataBase` in `src/app/layout.tsx` AND by `sitemap.ts` AND by `robots.ts` — if Vercel's prod env var is missing or wrong, OG tags + sitemap + robots all silently fall back to the hardcoded `'https://openpropfirm.com'`. That's correct for the launch, but the doc makes that contract explicit.

### Step 1 — Write `docs/vercel-production-checklist.md`

```md
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
- [ ] If it opens a PR (likely on Funding Pips or another firm with detected drift), confirm Vercel auto-deploys a preview for that PR.
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
```

### Step 2 — Commit

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add docs/vercel-production-checklist.md
git commit -m "$(cat <<'EOF'
[s1] docs: v1-f11 Vercel production checklist

Top-to-bottom runbook for the first openpropfirm.com deploy: domain
config, production branch, every required env var (with the read-by
mapping for NEXT_PUBLIC_SITE_URL → layout/sitemap/robots), explicit
DO-NOT-set list (SUPABASE_SERVICE_KEY etc. are GH Actions secrets only),
post-deploy verification (sitemap, robots, OG tags, Analytics),
bot↔Vercel preview chain confirmation, and rollback procedure.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full validation + plan commit + merge to main + memory update

### Step 1 — Full test + type check + build

```bash
cd /Users/lego/@Lego651/open-prop-firm
pnpm tsc --noEmit
pnpm test
pnpm build
```

Expected:
- `tsc`: clean.
- `test`: same count as v1-f10 (169) — v1-f11 adds zero new vitest cases. If count drops, a UA/URL change accidentally broke a fixture-based test.
- `build`: every route still prerenders. Build log spot-check:
  - `/` (landing)
  - `/about`, `/disclosure`, `/terms`
  - `/firms`, `/firms/funded-next`, `/firms/funding-pips`, `/firms/apex-funding`, `/firms/lucid-trading`
  - Wiki catch-all routes under `/firms/cfd/**` and `/firms/futures/**`
  - `/legal/terms-of-service`, `/legal/disclaimer`

### Step 2 — Manual smoke (golden path through Part 0 of manual-qa)

```bash
pnpm dev
```

Run the entire **Part 0 — 10-Minute Pre-Deploy Ritual** from the just-edited `docs/manual-qa.md`. Every checkbox passes against `localhost:3000`.

Specifically verify:
- `/sitemap.xml` shows the new entries (Section 0.4 of Part 0).
- All 4 firm decision pages render every component (Section 0.2).
- Wiki at `/firms/cfd/funding-pips` still has AppShell (Section 0.3).

### Step 3 — Commit the plan doc itself

```bash
cd /Users/lego/@Lego651/open-prop-firm
git add docs/superpowers/plans/2026-04-24-v1-f11-launch-readiness.md
git commit -m "$(cat <<'EOF'
[s1] docs: v1-f11 plan

Reference artifact kept alongside v1-f1..f10 plans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 4 — Fast-forward merge to main + push

Per Jason's 2026-04-23 directive — no PR.

```bash
cd /Users/lego/@Lego651/open-prop-firm
git checkout main
git pull --ff-only origin main
git merge --ff-only feat/v1-f11-launch-readiness
git push origin main
```

If `--ff-only` fails (main moved):

```bash
git checkout feat/v1-f11-launch-readiness
git rebase origin/main
git checkout main
git merge --ff-only feat/v1-f11-launch-readiness
git push origin main
```

### Step 5 — Delete the feature branch

```bash
cd /Users/lego/@Lego651/open-prop-firm
git branch -d feat/v1-f11-launch-readiness
git push origin --delete feat/v1-f11-launch-readiness 2>/dev/null || true
```

### Step 6 — Update the v1 progress memory

Edit `/Users/lego/.claude/projects/-Users-lego--Lego651-open-prop-firm/memory/project_v1_progress.md`:

Under **Shipped:**, add a v1-f11 entry after v1-f10 (replace `<FILL IN>` with the actual final commit SHA on main):

```
- v1-f11 — Launch readiness. Bot UA fix (`scripts/monitor/utils.ts` USER_AGENT → stock macOS Chrome 124, unblocks Apex + Lucid 403s) + Funding Pips SCRAPE_URL re-pointed to live evaluation page. `src/app/sitemap.ts` rewritten to enumerate /, /about, /disclosure, /terms, /firms, /firms/[slug] × 4 in addition to existing wiki catch-all. New `docs/affiliate-applications.md` tracker for the 4 launch firms' affiliate program states. New `docs/vercel-production-checklist.md` runbook for the openpropfirm.com first deploy (domain, env vars w/ read-by mapping, Analytics, bot↔preview chain, rollback). `docs/manual-qa.md` prepended with "Part 0 — 10-Minute Pre-Deploy Ritual" covering 4 marketing routes + 4 firm decision pages + wiki regression check + cross-cut sanity + bot health glance + intentional v1 boundaries doc. Chrome-discontinuity follow-up explicitly accepted as v1 boundary (route refactor too risky at launch). 6 task commits + plan doc. (2026-04-24, direct-to-main, final commit <FILL IN>.)
```

Under **v1-f5 follow-ups filed as backlog**, remove the `Funding Pips SCRAPE_URL 404` and `Apex/Lucid 403` lines (now resolved by v1-f11).

Under **Operational debt / pre-bot-run checks**, mark the same three entries as "RESOLVED 2026-04-24 in v1-f11" (or delete them — they're done).

Replace the **Next:** section with:

```
**Next:** v1 SHIPPED. The 11 features that were planned all landed. Next pointer is **launch ops**, not a v1-fN feature: (a) walk `docs/vercel-production-checklist.md` against the actual openpropfirm.com domain when Jason is ready to flip the switch; (b) work `docs/affiliate-applications.md` — submit applications to all 4 launch firms; (c) run the bot's first scheduled cron and watch for fallout in the Bot Health Check issue. Once any of these surface a NEW build need (not just config), file as v1.x-fN with a fresh plan in `docs/superpowers/plans/`.
```

Then save the file. No commit needed — memory file is git-ignored at the user-level path.

---

## Self-review (performed by plan author)

**1. Spec coverage:**
- [x] Spec §7 manual pre-deploy verification — Task 4.
- [x] Spec §3.1 routes (sitemap completeness) — Task 2.
- [x] Spec §6 failure-mode prevention (bot 24h silent) — Task 1 unblocks 3 of 4 scrapers; v1-f5 watchdog already covers detection.
- [x] Spec §2 decision #5 (affiliate-only monetization) — Task 3 stands up the application tracker.
- [x] CEO-locked openpropfirm.com domain + Vercel deploy — Task 5.
- [x] v1-f10 follow-up #1 (sitemap gaps) — Task 2.
- [x] v1-f10 follow-up #2 (chrome discontinuity) — explicit decision documented in plan rationale + Task 4's "Known v1 boundaries" section.

**2. Placeholder scan:** No TBD / "implement later" / "add appropriate error handling" / "similar to Task N". Funding Pips' new SCRAPE_URL is discovered live in Task 1 Step 2c — that's investigation, not a placeholder. The affiliate tracker has `TBD` in the `Applied` column intentionally — those are values Jason fills in as he submits applications, not gaps in the plan.

**3. Type consistency:**
- `listFirms` (Task 2's sitemap) imported from existing `@/lib/firms/repository` — same name + signature as v1-f9.
- `MetadataRoute.Sitemap` (Task 2) imported from `next` — matches existing usage in `sitemap.ts` line 1.
- `USER_AGENT` (Task 1) is the existing exported constant in `scripts/monitor/utils.ts` — name unchanged, just value swapped.
- `SCRAPE_URL` (Task 1) is the existing module-local `const` in `scripts/monitor/funding-pips.ts:15` — name unchanged, just value swapped.

**4. Scope guard:**
- Zero changes to v1-f7/f8/f9/f10 components.
- Zero changes to firm content (`data/firms/**`).
- Zero changes to schema (`scripts/monitor/schema.ts`) — affiliate URL flips happen by editing frontmatter under the existing schema, NOT by changing the schema.
- Zero changes to GitHub Actions YAMLs.
- Zero changes to `runner.ts` / `health-check.ts` / `health-watchdog.ts`.
- Zero new npm deps.
- One non-trivial app-code change (`src/app/sitemap.ts`) and it's purely additive route enumeration, not a contract change.

**5. Risks flagged to implementer:**

- **Task 1 Sub-step 2a/2b may still 403 even with the browser UA.** Cloudflare can fingerprint TLS handshake, header order, JA3, etc. — not just the UA string. If Apex or Lucid still 403s after the UA swap, do NOT chase the rabbit hole in v1-f11. Document the residual scraper as backlog ("needs Playwright-based fetch or proxy"), let v1-f5's watchdog cover the silent-failure case, and ship Task 1 with whatever the UA swap DOES fix. Funding Pips' URL fix and any Apex/Lucid wins are net positive.
- **Task 1 Sub-step 2c may not find a clean Funding Pips URL.** If the homepage scrape returns nothing parsable, fall back to the documented soft-skip in Step 4 — keep the file functional, file backlog. Do NOT delete the scraper.
- **Task 2's sitemap rewrite uses `listFirms()`** which under the hood reads every firm's `index.md`. If any firm's frontmatter is malformed, sitemap generation will throw at build time. Mitigation: v1-f1's validators already catch this on PR; if it fires here, it's a prior bug surfaced — fix the offending frontmatter, not the sitemap.
- **Memory update in Task 6 Step 6 is the only step that touches files OUTSIDE the repo.** That edit is to `~/.claude/projects/.../memory/project_v1_progress.md` (user-level memory store). Make sure the SHA inserted matches the `git push origin main` from Step 4.
- **Manual-qa Part 0's PreTradeChecklist localStorage check assumes the dev server is HTTPS-or-localhost.** localStorage is gated to secure origins; on a raw IP it won't persist. Always use `localhost:3000` or `https://openpropfirm.com` for Part 0 — never the raw LAN IP.

**6. Rollback plan:** All v1-f11 changes are additive or trivial constant-swaps. Rolling back any single Task is `git revert <sha>` and ships clean — no schema, no data, no API. The riskiest change (Task 1's UA swap) reverts to the prior state (Apex + Lucid 403, Funding Pips 404), which is the documented status quo before v1-f11 began.
