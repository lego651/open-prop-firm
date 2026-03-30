# Monitoring Bot

The OpenPropFirm monitoring bot scrapes firm websites weekly, compares against local content, and opens GitHub PRs when changes are detected. It runs automatically every Monday at 06:00 UTC via GitHub Actions, and can also be triggered manually.

## How It Works

1. **Health check** — verifies Supabase connectivity and `gh` auth before running
2. **Scrape** — per-firm TypeScript scripts in `scripts/monitor/<firm-slug>.ts` fetch each firm's website and extract key data points using Cheerio
3. **Diff** — checks the live page for expected keywords and product names, flagging structural changes (removed products, changed pricing signals). Does not perform field-level content diffing
4. **Update** — `last_verified` front-matter is updated to today's date on every successful run (regardless of whether changes were detected)
5. **PR** — if changes are detected, commits the updated content to a temp branch and opens a GitHub PR with label `bot-update`
6. **Log** — inserts a row into `bot_usage_log` in Supabase for every run

View run history at `/admin` (authentication required).

## Running Locally

### Prerequisites

- Node.js 20+ (npm is included with Node.js — no separate install needed)
- GitHub CLI (`gh`) authenticated: `gh auth login`
- `.env.local` with Supabase credentials (see below)

### Environment Variables

```bash
# Required for logging (skip if you just want to test scrapers)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Commands

```bash
# Pre-flight check (verifies connectivity before running)
npm run monitor:health

# Run all scrapers
npm run monitor

# Run a single firm only
npm run monitor -- --firm funded-next
npm run monitor -- --firm funding-pips
npm run monitor -- --firm apex-funding
npm run monitor -- --firm lucid-trading
```

## Adding a New Firm

### 1. Create the scraper

Add `scripts/monitor/<firm-slug>.ts`. The file must export a `run(): Promise<BotRunResult>` function:

```ts
import * as cheerio from 'cheerio'
import { readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import type { BotRunResult } from './types'

const FIRM_SLUG = 'your-firm'
const SCRAPE_URL = 'https://yourfirm.com/evaluation'
const TIMEOUT_MS = 30_000
const USER_AGENT = 'Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)'

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const res = await fetch(SCRAPE_URL, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const $ = cheerio.load(await res.text())
    const bodyText = $('body').text().replace(/\s+/g, ' ')

    const diffs: string[] = []
    // Add your checks here, e.g.:
    if (!/some expected text/i.test(bodyText)) {
      diffs.push('Expected text no longer found — product may have changed.')
    }

    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diff: diffs.length > 0 ? diffs.join('\n') : null,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

### 2. Register in runner.ts

Add an import and entry to `SCRAPERS` in `scripts/monitor/runner.ts`:

```ts
import { run as runYourFirm } from './your-firm'

const SCRAPERS = [
  // existing entries...
  { slug: 'your-firm', run: runYourFirm },
]
```

### 3. Test locally

```bash
npm run monitor -- --firm your-firm
```

### 4. Add content

Follow [CONTRIBUTING.md](../CONTRIBUTING.md) to add the firm's markdown content under `data/firms/`.

## GitHub Actions Setup

The workflow lives at `.github/workflows/bot.yml`. To enable it:

1. Add the following **repository secrets** in GitHub → Settings → Secrets → Actions:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - No `GH_TOKEN` needed — the workflow uses the built-in `GITHUB_TOKEN` (auto-provisioned by GitHub Actions)

2. The workflow runs automatically every Monday at 06:00 UTC.

3. To trigger manually: GitHub → Actions → Monitoring Bot → Run workflow.

## BotRunResult Type

```ts
interface BotRunResult {
  firmSlug: string          // e.g. "funded-next"
  lastVerified: string      // ISO date YYYY-MM-DD
  changesDetected: boolean
  diff: string | null       // human-readable change summary
  error: string | null      // set if the scraper threw an error
}
```

## bot_usage_log Schema

| Column | Type | Description |
|---|---|---|
| `id` | bigserial | Auto-incrementing primary key |
| `firm_slug` | text | Firm identifier |
| `run_at` | timestamptz | When the run executed (default: now()) |
| `last_verified` | date | Date used for last_verified update |
| `changes_detected` | boolean | Whether the scraper found changes |
| `pr_url` | text | GitHub PR URL if one was created |
| `tokens_used` | integer | LLM tokens if an AI step was used (else null) |
| `cost_usd` | numeric | LLM cost if applicable (else null) |
| `error` | text | Error message if the scraper failed |
