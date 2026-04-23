# v1-f5 — Health Check + Silent-Failure Watchdog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On every bot run, post a machine-readable health-check comment to a single pinned GitHub Issue; a separate watchdog workflow fires daily and posts an alert comment (which emails Jason via GitHub notifications) when the most recent health check is older than `MAX_SILENCE_HOURS`.

**Architecture:** Two independent additions to `scripts/monitor/`: (1) a pure `buildHealthCommentBody(status)` formatter that `runner.ts` calls at end-of-run and posts via `gh issue comment`; (2) a new `health-watchdog.ts` CLI that queries the pinned issue's recent comments via `gh issue view --json comments`, runs a pure `checkHealthStale(comments, now)` decision function, and posts a cooldown-gated alert when the latest health comment is too old. Neither side mutates schema or code outside `scripts/monitor/`.

**Tech Stack:** Node 20, TypeScript, vitest, `gh` CLI (already used by runner + append-changelog), GitHub Actions. No new npm deps.

---

## Spec traceability

- **§3.3 (Monitoring bot architecture)** "runner.ts posts a comment on the pinned GitHub Issue: '✅ 2026-04-22 09:00 UTC — X/Y scrapers OK, Z errors.'" → Task 3 wiring + Task 1 builder.
- **§6 risk row** "Bot silent > 24 hours → Health-check workflow → Email Jason via GitHub notification" → Tasks 2/4/5.
- **Spec drift note:** §3.3 shows a `09:00 UTC daily` cron; the currently-shipped `bot.yml` uses `0 6 * * 1` (Monday-only). This plan does NOT change the bot cron (out of scope). Instead, `MAX_SILENCE_HOURS` defaults to **192** (8 days) to accommodate the weekly cadence. Task 5 notes how to tighten it if/when Jason flips the bot to daily.

---

## File structure

**New files:**
- `scripts/monitor/health-comment.ts` — pure: `buildHealthCommentBody(status) → string`. Emits a markdown body with a sentinel HTML comment so the watchdog can reliably identify it.
- `scripts/monitor/health-comment.test.ts` — unit tests for the builder (green, mixed, all-errors).
- `scripts/monitor/watchdog-core.ts` — pure: `checkHealthStale({ comments, now, maxSilenceHours, alertCooldownHours }) → Decision`. The whole watchdog logic with zero I/O.
- `scripts/monitor/watchdog-core.test.ts` — unit tests (no comments, fresh OK, stale with no prior alert, stale with recent alert within cooldown).
- `scripts/monitor/health-watchdog.ts` — thin CLI: fetches comments via `gh issue view --json`, runs core, posts alert if needed. Supports `--dry-run`.
- `.github/workflows/health-watchdog.yml` — daily `0 12 * * *` cron (+ `workflow_dispatch` for manual testing).

**Modified files:**
- `scripts/monitor/runner.ts` — append ~15 lines at the end of `main()` to call the builder and `gh issue comment` the pinned issue. No other logic changes.

**Out of scope for v1-f5:**
- Changing `bot.yml` cron from weekly to daily (stays as-is).
- Any Supabase schema changes — watchdog reads GitHub comments directly, not the `bot_usage_log` table. Keeps the alerting path independent of Supabase availability.
- Creating the pinned issue (one-time manual step; Task 6 documents it).

---

## Shared types and sentinels (used across tasks)

```ts
// scripts/monitor/health-comment.ts (exported; reused in watchdog-core.ts)
export const HEALTH_SENTINEL = '<!-- openprop-health-check -->'
export const ALERT_SENTINEL  = '<!-- openprop-health-alert -->'

export interface PerFirmStatus {
  slug: string
  ok: boolean
  error: string | null   // null when ok === true
}

export interface HealthStatus {
  runAt: string          // ISO 8601 UTC, e.g. "2026-04-27T06:05:00Z"
  perFirm: PerFirmStatus[]
}
```

Sentinel rationale: reliably distinguish health comments from alert comments and from unrelated issue chatter. The watchdog never posts a health-check-sentinel comment; runner.ts never posts an alert-sentinel comment. Matching against the two constants is cheaper and more robust than parsing emoji/date prefixes.

---

## Task 1: Health-comment builder (pure)

**Files:**
- Create: `scripts/monitor/health-comment.ts`
- Test:   `scripts/monitor/health-comment.test.ts`

**Public contract:**

```ts
export const HEALTH_SENTINEL: string
export const ALERT_SENTINEL: string
export interface PerFirmStatus { slug: string; ok: boolean; error: string | null }
export interface HealthStatus { runAt: string; perFirm: PerFirmStatus[] }
export function buildHealthCommentBody(status: HealthStatus): string
```

**Output format:**

Green run:
```
<!-- openprop-health-check -->
✅ 2026-04-27 06:05 UTC — 4/4 scrapers OK

| Firm | Status | Error |
|---|---|---|
| funded-next | ✅ |  |
| funding-pips | ✅ |  |
| apex-funding | ✅ |  |
| lucid-trading | ✅ |  |
```

Mixed run:
```
<!-- openprop-health-check -->
⚠️ 2026-04-27 06:05 UTC — 2/4 scrapers OK, 2 errors

| Firm | Status | Error |
|---|---|---|
| funded-next | ✅ |  |
| funding-pips | ❌ | fetch failed: 404 |
| apex-funding | ✅ |  |
| lucid-trading | ❌ | fetch failed: 403 |
```

All-errors run:
```
<!-- openprop-health-check -->
❌ 2026-04-27 06:05 UTC — 0/4 scrapers OK, 4 errors

| Firm | Status | Error |
|---|---|---|
...
```

Formatting rules:
- First line is the sentinel, verbatim.
- Second line starts with an emoji (`✅` all OK, `⚠️` any errors but at least one OK, `❌` zero OK), a space, the run timestamp formatted as `YYYY-MM-DD HH:MM UTC` (no seconds), ` — `, and the summary.
- Table rows are in the input order (don't re-sort).
- Error column is empty (not `-` or `—`) when `ok === true`, to keep rendering clean.
- Multi-line error strings are collapsed to the first line (errors sometimes include stack traces from `execFileSync`).

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/monitor/health-comment.test.ts
import { describe, it, expect } from 'vitest'
import { buildHealthCommentBody, HEALTH_SENTINEL } from './health-comment'

const RUN_AT = '2026-04-27T06:05:00Z'

describe('buildHealthCommentBody', () => {
  it('emits a green summary when all firms succeed', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: true, error: null },
        { slug: 'funding-pips', ok: true, error: null },
        { slug: 'apex-funding', ok: true, error: null },
        { slug: 'lucid-trading', ok: true, error: null },
      ],
    })
    const lines = body.split('\n')
    expect(lines[0]).toBe(HEALTH_SENTINEL)
    expect(lines[1]).toBe('✅ 2026-04-27 06:05 UTC — 4/4 scrapers OK')
    expect(body).toContain('| funded-next | ✅ |  |')
    expect(body).toContain('| lucid-trading | ✅ |  |')
  })

  it('emits a mixed-warning summary when some firms error', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: true, error: null },
        { slug: 'funding-pips', ok: false, error: 'fetch failed: 404' },
        { slug: 'apex-funding', ok: true, error: null },
        { slug: 'lucid-trading', ok: false, error: 'fetch failed: 403' },
      ],
    })
    expect(body.split('\n')[1]).toBe('⚠️ 2026-04-27 06:05 UTC — 2/4 scrapers OK, 2 errors')
    expect(body).toContain('| funding-pips | ❌ | fetch failed: 404 |')
    expect(body).toContain('| lucid-trading | ❌ | fetch failed: 403 |')
  })

  it('emits an all-errors summary when zero firms succeed', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: false, error: 'boom' },
        { slug: 'funding-pips', ok: false, error: 'boom' },
      ],
    })
    expect(body.split('\n')[1]).toBe('❌ 2026-04-27 06:05 UTC — 0/2 scrapers OK, 2 errors')
  })

  it('collapses multi-line error strings to the first line', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: false, error: 'line-one\nline-two\nline-three' },
      ],
    })
    expect(body).toContain('| funded-next | ❌ | line-one |')
    expect(body).not.toContain('line-two')
  })

  it('preserves input order of firms in the table', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'zeta', ok: true, error: null },
        { slug: 'alpha', ok: true, error: null },
      ],
    })
    const zetaIdx = body.indexOf('zeta')
    const alphaIdx = body.indexOf('alpha')
    expect(zetaIdx).toBeLessThan(alphaIdx)
  })

  it('starts with the health sentinel', () => {
    const body = buildHealthCommentBody({ runAt: RUN_AT, perFirm: [] })
    expect(body.startsWith(HEALTH_SENTINEL + '\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- health-comment`
Expected: FAIL with "Cannot find module './health-comment'"

- [ ] **Step 3: Write minimal implementation**

```ts
// scripts/monitor/health-comment.ts
export const HEALTH_SENTINEL = '<!-- openprop-health-check -->'
export const ALERT_SENTINEL = '<!-- openprop-health-alert -->'

export interface PerFirmStatus {
  slug: string
  ok: boolean
  error: string | null
}

export interface HealthStatus {
  runAt: string
  perFirm: PerFirmStatus[]
}

/** Format an ISO timestamp as "YYYY-MM-DD HH:MM UTC" (no seconds, no tz offset). */
function formatRunAt(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const mm = pad(d.getUTCMonth() + 1)
  const dd = pad(d.getUTCDate())
  const hh = pad(d.getUTCHours())
  const mi = pad(d.getUTCMinutes())
  return `${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`
}

function firstLine(s: string | null): string {
  if (!s) return ''
  return s.split('\n')[0]
}

/**
 * Build the markdown body for a health-check issue comment. Starts with
 * HEALTH_SENTINEL so the watchdog can reliably identify health posts.
 */
export function buildHealthCommentBody(status: HealthStatus): string {
  const total = status.perFirm.length
  const okCount = status.perFirm.filter((f) => f.ok).length
  const errorCount = total - okCount

  let emoji: string
  if (errorCount === 0) emoji = '✅'
  else if (okCount === 0) emoji = '❌'
  else emoji = '⚠️'

  const summary =
    errorCount === 0
      ? `${okCount}/${total} scrapers OK`
      : `${okCount}/${total} scrapers OK, ${errorCount} error${errorCount > 1 ? 's' : ''}`

  const header = `${emoji} ${formatRunAt(status.runAt)} — ${summary}`

  const rows = status.perFirm.map((f) => {
    const statusCell = f.ok ? '✅' : '❌'
    const errCell = f.ok ? '' : firstLine(f.error)
    return `| ${f.slug} | ${statusCell} | ${errCell} |`
  })

  return [
    HEALTH_SENTINEL,
    header,
    '',
    '| Firm | Status | Error |',
    '|---|---|---|',
    ...rows,
  ].join('\n')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- health-comment`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/health-comment.ts scripts/monitor/health-comment.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f5 health-comment builder

Pure formatter that emits the markdown body for the pinned health-check
issue comment. Leads with a sentinel HTML comment so the watchdog can
reliably filter health posts from other issue chatter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Watchdog stale-check core (pure)

**Files:**
- Create: `scripts/monitor/watchdog-core.ts`
- Test:   `scripts/monitor/watchdog-core.test.ts`

**Public contract:**

```ts
import type { ALERT_SENTINEL, HEALTH_SENTINEL } from './health-comment'

export interface IssueComment {
  body: string
  createdAt: string  // ISO 8601
}

export interface Decision {
  action: 'quiet' | 'alert' | 'suppressed-cooldown'
  latestHealthAt: string | null        // ISO 8601 or null if no health comment found
  latestAlertAt: string | null         // ISO 8601 or null
  alertBody: string | null             // set only when action === 'alert'
}

export function checkHealthStale(input: {
  comments: IssueComment[]
  now: Date
  maxSilenceHours: number
  alertCooldownHours: number
}): Decision
```

**Decision table:**

| latestHealthAt | latestAlertAt | → action | notes |
|---|---|---|---|
| null | — | alert | "no health comment ever" — alerts once, then cooldown applies |
| fresh (< maxSilenceHours old) | — | quiet | normal green path |
| stale (>= maxSilenceHours) | null or older than cooldown | alert | fire alert |
| stale | newer than `now - alertCooldownHours` | suppressed-cooldown | dedupe |

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/monitor/watchdog-core.test.ts
import { describe, it, expect } from 'vitest'
import { checkHealthStale } from './watchdog-core'
import { HEALTH_SENTINEL, ALERT_SENTINEL } from './health-comment'

const NOW = new Date('2026-04-30T12:00:00Z') // fixed reference point

function health(daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * 86400 * 1000)
  return { body: `${HEALTH_SENTINEL}\n✅ stub`, createdAt: d.toISOString() }
}
function alert(daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * 86400 * 1000)
  return { body: `${ALERT_SENTINEL}\n⚠️ stub`, createdAt: d.toISOString() }
}
function other(daysAgo: number) {
  const d = new Date(NOW.getTime() - daysAgo * 86400 * 1000)
  return { body: 'unrelated comment', createdAt: d.toISOString() }
}

const MAX = 192           // 8 days
const COOLDOWN = 24       // 1 day

describe('checkHealthStale', () => {
  it('alerts when there are no health comments at all', () => {
    const d = checkHealthStale({
      comments: [other(1)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('alert')
    expect(d.latestHealthAt).toBeNull()
    expect(d.alertBody).toMatch(ALERT_SENTINEL)
  })

  it('is quiet when the latest health comment is fresh', () => {
    const d = checkHealthStale({
      comments: [health(1)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('quiet')
    expect(d.latestHealthAt).toBe(health(1).createdAt)
    expect(d.alertBody).toBeNull()
  })

  it('alerts when the latest health comment is older than the threshold and no prior alert', () => {
    const d = checkHealthStale({
      comments: [health(10)],  // 10 days > 8-day threshold
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('alert')
    expect(d.latestHealthAt).toBe(health(10).createdAt)
    expect(d.alertBody).toMatch(ALERT_SENTINEL)
    expect(d.alertBody).toContain('Last health check: 10')
  })

  it('suppresses alert when a prior alert is within the cooldown window', () => {
    const d = checkHealthStale({
      comments: [health(10), alert(0.5)],  // alert 12h ago, cooldown 24h
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('suppressed-cooldown')
    expect(d.latestAlertAt).toBe(alert(0.5).createdAt)
    expect(d.alertBody).toBeNull()
  })

  it('re-alerts when the prior alert is older than the cooldown window', () => {
    const d = checkHealthStale({
      comments: [health(10), alert(2)],  // alert 2 days ago, cooldown 1 day
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('alert')
    expect(d.latestAlertAt).toBe(alert(2).createdAt)
  })

  it('ignores comments that are neither health nor alert', () => {
    const d = checkHealthStale({
      comments: [other(0.1), health(1), other(0.2)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('quiet')
    expect(d.latestHealthAt).toBe(health(1).createdAt)
  })

  it('picks the newest health comment when multiple exist', () => {
    const d = checkHealthStale({
      comments: [health(20), health(2), health(50)],
      now: NOW,
      maxSilenceHours: MAX,
      alertCooldownHours: COOLDOWN,
    })
    expect(d.action).toBe('quiet')
    expect(d.latestHealthAt).toBe(health(2).createdAt)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- watchdog-core`
Expected: FAIL with "Cannot find module './watchdog-core'"

- [ ] **Step 3: Write the implementation**

```ts
// scripts/monitor/watchdog-core.ts
import { ALERT_SENTINEL, HEALTH_SENTINEL } from './health-comment'

export interface IssueComment {
  body: string
  createdAt: string
}

export interface Decision {
  action: 'quiet' | 'alert' | 'suppressed-cooldown'
  latestHealthAt: string | null
  latestAlertAt: string | null
  alertBody: string | null
}

function newestMatching(
  comments: IssueComment[],
  sentinel: string,
): IssueComment | null {
  const matches = comments.filter((c) => c.body.includes(sentinel))
  if (matches.length === 0) return null
  return matches.reduce((a, b) =>
    new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime() ? a : b,
  )
}

function hoursAgo(isoThen: string, now: Date): number {
  return (now.getTime() - new Date(isoThen).getTime()) / (1000 * 60 * 60)
}

function renderAlertBody(latestHealthAt: string | null, maxSilenceHours: number, now: Date): string {
  const age = latestHealthAt
    ? `Last health check: ${hoursAgo(latestHealthAt, now).toFixed(1)} hours ago (${latestHealthAt})`
    : 'Last health check: never'
  return [
    ALERT_SENTINEL,
    `⚠️ Bot silent > ${maxSilenceHours}h — investigate`,
    '',
    age,
    '',
    `Checked at: ${now.toISOString()}`,
  ].join('\n')
}

export function checkHealthStale(input: {
  comments: IssueComment[]
  now: Date
  maxSilenceHours: number
  alertCooldownHours: number
}): Decision {
  const { comments, now, maxSilenceHours, alertCooldownHours } = input

  const latestHealth = newestMatching(comments, HEALTH_SENTINEL)
  const latestAlert = newestMatching(comments, ALERT_SENTINEL)

  const latestHealthAt = latestHealth?.createdAt ?? null
  const latestAlertAt = latestAlert?.createdAt ?? null

  const healthIsFresh =
    latestHealth !== null && hoursAgo(latestHealth.createdAt, now) < maxSilenceHours

  if (healthIsFresh) {
    return { action: 'quiet', latestHealthAt, latestAlertAt, alertBody: null }
  }

  const alertIsRecent =
    latestAlert !== null && hoursAgo(latestAlert.createdAt, now) < alertCooldownHours

  if (alertIsRecent) {
    return {
      action: 'suppressed-cooldown',
      latestHealthAt,
      latestAlertAt,
      alertBody: null,
    }
  }

  return {
    action: 'alert',
    latestHealthAt,
    latestAlertAt,
    alertBody: renderAlertBody(latestHealthAt, maxSilenceHours, now),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- watchdog-core`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/watchdog-core.ts scripts/monitor/watchdog-core.test.ts
git commit -m "$(cat <<'EOF'
feat: v1-f5 watchdog stale-check core

Pure decision function — given the issue's comments, now, and thresholds,
returns {action, alertBody}. No I/O. Dedupe via a configurable cooldown
so a persistently stale issue does not spam Jason's inbox.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire runner.ts to post the health comment

**Files:**
- Modify: `scripts/monitor/runner.ts` — append a new block at the end of `main()`, after the per-scraper loop and the `Monitor run complete.` log.

The new block:
1. Reads `HEALTH_CHECK_ISSUE_NUMBER` from `process.env`. If unset, logs a warning and returns (non-fatal — the bot still succeeds even without health publishing).
2. Builds a `HealthStatus` by mapping the existing `BotRunResult[]` accumulated during the run. (Note: the current `main()` doesn't accumulate results — we need to push into a local array as we go.)
3. Calls `buildHealthCommentBody(status)`.
4. Posts via `execFileSync('gh', ['issue', 'comment', issueNumber, '--body-file', tmpFile])`, using a temp-file body (same pattern as `runner.ts:createPR`) to avoid shell metacharacter injection.

- [ ] **Step 1: Accumulate results in `main()`**

Add a local array at the top of `main()` before the for-loop and `push` each `result` into it:

```ts
async function main() {
  const args = process.argv.slice(2)
  const firmFilter = args.includes('--firm') ? args[args.indexOf('--firm') + 1] : null
  const dryRun = args.includes('--dry-run')

  const scrapers = firmFilter
    ? SCRAPERS.filter((s) => s.slug === firmFilter)
    : SCRAPERS

  if (scrapers.length === 0) {
    console.error(`No scraper found for firm: ${firmFilter}`)
    process.exit(1)
  }

  console.log(
    `Running monitor for: ${scrapers.map((s) => s.slug).join(', ')}${dryRun ? ' (dry-run)' : ''}\n`,
  )

  let hasUnhandledError = false
  const allResults: Array<{ slug: string; result: BotRunResult | null; unhandled: boolean }> = []

  for (const { slug, run } of scrapers) {
    console.log(`[${slug}] Starting...`)
    let result: BotRunResult
    try {
      result = await run()
    } catch (err) {
      console.error(`[${slug}] Unhandled error:`, err)
      hasUnhandledError = true
      allResults.push({ slug, result: null, unhandled: true })
      continue
    }

    allResults.push({ slug, result, unhandled: false })

    if (result.error) {
      console.error(`[${slug}] Scraper error: ${result.error}`)
    } else {
      // ... (existing log lines unchanged)
    }
    // ... (rest of existing loop body unchanged)
  }

  if (hasUnhandledError) {
    // existing hasUnhandledError branch — keep as-is for exit code, but let the
    // health comment step run first so a crashed scraper still shows up.
  }

  // NEW: post health comment (must run before the hasUnhandledError exit).
  // ... (see Step 2)
}
```

Reorder: move the `hasUnhandledError` exit to AFTER the health-comment block so crash cases still publish. Keep the final `console.log('Monitor run complete.')` where it is.

- [ ] **Step 2: Add the health-comment block at the end of main()**

Immediately before the final `console.log('Monitor run complete.')` (and before the `hasUnhandledError` exit), insert:

```ts
  // Post health check to pinned issue.
  const issueNumber = process.env.HEALTH_CHECK_ISSUE_NUMBER
  if (!issueNumber) {
    console.warn(
      '  [health] HEALTH_CHECK_ISSUE_NUMBER not set — skipping pinned-issue health comment',
    )
  } else if (dryRun) {
    console.log('  [health] dry-run — skipping pinned-issue health comment')
  } else {
    try {
      const { buildHealthCommentBody } = await import('./health-comment')
      const body = buildHealthCommentBody({
        runAt: new Date().toISOString(),
        perFirm: allResults.map(({ slug, result, unhandled }) => {
          if (unhandled) return { slug, ok: false, error: 'unhandled exception' }
          if (!result) return { slug, ok: false, error: 'no result' }
          if (result.error) return { slug, ok: false, error: result.error }
          return { slug, ok: true, error: null }
        }),
      })
      const bodyFile = path.join(tmpdir(), `opf-health-${Date.now()}.md`)
      writeFileSync(bodyFile, body, 'utf-8')
      try {
        execFileSync('gh', ['issue', 'comment', issueNumber, '--body-file', bodyFile], {
          stdio: 'inherit',
        })
        console.log(`  [health] Posted health comment to issue #${issueNumber}`)
      } finally {
        try { unlinkSync(bodyFile) } catch { /* ignore */ }
      }
    } catch (err) {
      console.warn(
        `  [health] failed to post health comment: ${err instanceof Error ? err.message : err}`,
      )
    }
  }
```

Imports needed at the top of runner.ts (several already exist — check before adding):
- `writeFileSync`, `unlinkSync` from `fs` ✓ already imported
- `tmpdir` from `os` ✓ already imported
- `path` ✓ already imported
- `execFileSync` ✓ already imported

No new imports required.

- [ ] **Step 3: Manual dry-run smoke test**

```bash
HEALTH_CHECK_ISSUE_NUMBER= \
  npx tsx --project tsconfig.scripts.json scripts/monitor/runner.ts --dry-run
```

Expected: the run proceeds, each scraper logs normally, and the final log includes `[health] HEALTH_CHECK_ISSUE_NUMBER not set — skipping pinned-issue health comment` (since the env var is unset).

Also run:

```bash
HEALTH_CHECK_ISSUE_NUMBER=999 \
  npx tsx --project tsconfig.scripts.json scripts/monitor/runner.ts --dry-run
```

Expected: the `[health] dry-run — skipping pinned-issue health comment` branch fires — no `gh` call made.

Do NOT run without `--dry-run` — that would actually post to a real GH issue.

- [ ] **Step 4: Type check and run the full test suite**

```bash
pnpm tsc --noEmit
pnpm test
```

Expected: both clean (no new failures; health-comment tests from Task 1 still green).

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/runner.ts
git commit -m "$(cat <<'EOF'
feat: v1-f5 post health comment to pinned issue from runner.ts

After every monitor run, posts a sentinel-tagged summary to the issue
referenced by HEALTH_CHECK_ISSUE_NUMBER. Non-fatal on failure: the bot
still completes and exits normally even if the comment cannot be posted.
No behavior change when the env var is unset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: health-watchdog CLI

**Files:**
- Create: `scripts/monitor/health-watchdog.ts`

No test file: thin orchestrator over Task 2's pure core; the watchdog logic is fully covered by `watchdog-core.test.ts`.

### CLI contract

```
tsx --project tsconfig.scripts.json scripts/monitor/health-watchdog.ts \
  [--dry-run] [--max-silence-hours N] [--alert-cooldown-hours N]
```

Behavior:
1. Reads `HEALTH_CHECK_ISSUE_NUMBER` env var (required — throws if missing).
2. `MAX_SILENCE_HOURS` defaults to 192 (8 days). Override via `--max-silence-hours` flag or env var `MAX_SILENCE_HOURS`.
3. `ALERT_COOLDOWN_HOURS` defaults to 24. Override via `--alert-cooldown-hours` flag or env var `ALERT_COOLDOWN_HOURS`.
4. Fetches comments: `gh issue view <N> --json comments -q '.comments'`. Parses as JSON — each entry has `{ body, createdAt, ... }`.
5. Calls `checkHealthStale({ comments, now: new Date(), maxSilenceHours, alertCooldownHours })`.
6. If `decision.action === 'alert'`, posts `decision.alertBody!` via `gh issue comment <N> --body-file <tmp>` (same temp-file pattern as runner). Skip when `--dry-run`.
7. Logs the decision + action to stdout. Exit 0 in all non-error cases (even when alert-posting fails, so the workflow doesn't hide other issues).

### Implementation

- [ ] **Step 1: Write the CLI**

```ts
// scripts/monitor/health-watchdog.ts
/**
 * Silent-failure watchdog for the monitoring bot.
 *
 * Reads the pinned GitHub issue's recent comments, decides whether the latest
 * health-check comment is stale, and posts an alert comment when it is (gated
 * by a cooldown so stale issues don't flood the inbox).
 *
 * Invoked from .github/workflows/health-watchdog.yml on a daily cron.
 *
 * Exit code is 0 for both "quiet" and "alert posted successfully" — we never
 * want this job to turn red just because the bot has been silent. The alert
 * email is the signal.
 */

import { execFileSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { checkHealthStale, type IssueComment } from './watchdog-core'

interface Args {
  dryRun: boolean
  maxSilenceHours: number
  alertCooldownHours: number
}

function parseArgs(argv: string[]): Args {
  const envInt = (name: string, fallback: number): number => {
    const v = process.env[name]
    if (!v) return fallback
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`${name} must be a positive number, got ${JSON.stringify(v)}`)
    }
    return n
  }

  const out: Args = {
    dryRun: false,
    maxSilenceHours: envInt('MAX_SILENCE_HOURS', 192),
    alertCooldownHours: envInt('ALERT_COOLDOWN_HOURS', 24),
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--max-silence-hours') out.maxSilenceHours = Number(argv[++i])
    else if (a === '--alert-cooldown-hours') out.alertCooldownHours = Number(argv[++i])
  }

  if (!Number.isFinite(out.maxSilenceHours) || out.maxSilenceHours <= 0) {
    throw new Error('--max-silence-hours must be a positive number')
  }
  if (!Number.isFinite(out.alertCooldownHours) || out.alertCooldownHours <= 0) {
    throw new Error('--alert-cooldown-hours must be a positive number')
  }
  return out
}

function fetchComments(issueNumber: string): IssueComment[] {
  const raw = execFileSync(
    'gh',
    ['issue', 'view', issueNumber, '--json', 'comments', '-q', '.comments'],
    { encoding: 'utf-8' },
  )
  const parsed = JSON.parse(raw) as Array<{ body: string; createdAt: string }>
  // Defensive: trim to the fields we care about.
  return parsed.map((c) => ({ body: c.body, createdAt: c.createdAt }))
}

function postAlert(issueNumber: string, body: string): void {
  const bodyFile = path.join(tmpdir(), `opf-watchdog-alert-${Date.now()}.md`)
  writeFileSync(bodyFile, body, 'utf-8')
  try {
    execFileSync('gh', ['issue', 'comment', issueNumber, '--body-file', bodyFile], {
      stdio: 'inherit',
    })
  } finally {
    try { unlinkSync(bodyFile) } catch { /* ignore */ }
  }
}

function main(): void {
  const { dryRun, maxSilenceHours, alertCooldownHours } = parseArgs(process.argv.slice(2))

  const issueNumber = process.env.HEALTH_CHECK_ISSUE_NUMBER
  if (!issueNumber) {
    throw new Error('HEALTH_CHECK_ISSUE_NUMBER env var is required')
  }

  console.log(
    `[watchdog] issue=#${issueNumber}, maxSilence=${maxSilenceHours}h, cooldown=${alertCooldownHours}h${
      dryRun ? ', dry-run' : ''
    }`,
  )

  const comments = fetchComments(issueNumber)
  const decision = checkHealthStale({
    comments,
    now: new Date(),
    maxSilenceHours,
    alertCooldownHours,
  })

  console.log(
    `[watchdog] decision=${decision.action} latestHealth=${decision.latestHealthAt ?? 'never'} latestAlert=${decision.latestAlertAt ?? 'never'}`,
  )

  if (decision.action !== 'alert') {
    console.log('[watchdog] no alert posted.')
    return
  }

  if (dryRun) {
    console.log('[watchdog] dry-run — alert body would be:')
    console.log(decision.alertBody)
    return
  }

  try {
    postAlert(issueNumber, decision.alertBody!)
    console.log('[watchdog] alert posted.')
  } catch (err) {
    console.error('[watchdog] failed to post alert:', err)
    // Do not exit non-zero — see top-of-file docstring.
  }
}

try {
  main()
} catch (err) {
  console.error('[watchdog] fatal:', err)
  process.exit(1)
}
```

- [ ] **Step 2: Type check**

```bash
pnpm tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Local dry-run smoke test**

Without `HEALTH_CHECK_ISSUE_NUMBER`:

```bash
npx tsx --project tsconfig.scripts.json scripts/monitor/health-watchdog.ts --dry-run
```

Expected: exits 1 with `[watchdog] fatal: Error: HEALTH_CHECK_ISSUE_NUMBER env var is required`.

With a fake issue number (won't actually post due to `--dry-run`):

```bash
HEALTH_CHECK_ISSUE_NUMBER=999 \
  npx tsx --project tsconfig.scripts.json scripts/monitor/health-watchdog.ts --dry-run
```

Expected outcome depends on whether issue #999 exists:
- If it does: parser runs, prints a decision, and (if alert) prints the body without posting. Either `[watchdog] no alert posted.` or `[watchdog] dry-run — alert body would be: ...`.
- If it doesn't: `gh` exits non-zero, fatal error printed. Acceptable smoke-test output.

`git status --short` must show **no changes** after this step.

- [ ] **Step 4: Commit**

```bash
git add scripts/monitor/health-watchdog.ts
git commit -m "$(cat <<'EOF'
feat: v1-f5 health-watchdog CLI

Thin orchestrator: fetches the pinned issue's comments via gh, calls the
pure watchdog-core decision function, posts an alert comment when the
latest health check is stale (with cooldown-gated dedupe). Exits 0 even
on posting failure — the alert email is the signal we care about.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: health-watchdog.yml workflow

**Files:**
- Create: `.github/workflows/health-watchdog.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/health-watchdog.yml
name: Health Watchdog

on:
  schedule:
    - cron: '0 12 * * *'   # Daily at 12:00 UTC (6h after Monday bot run; runs every day regardless)
  workflow_dispatch:        # Manual trigger for testing

jobs:
  watchdog:
    name: Check bot silence and alert on staleness
    runs-on: ubuntu-latest

    permissions:
      issues: write           # post alert comment on the pinned issue
      contents: read          # checkout the scripts

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run watchdog
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          HEALTH_CHECK_ISSUE_NUMBER: ${{ vars.HEALTH_CHECK_ISSUE_NUMBER }}
          MAX_SILENCE_HOURS: ${{ vars.MAX_SILENCE_HOURS }}        # optional override
          ALERT_COOLDOWN_HOURS: ${{ vars.ALERT_COOLDOWN_HOURS }}  # optional override
        run: |
          npx tsx --project tsconfig.scripts.json scripts/monitor/health-watchdog.ts
```

Notes:
- `vars.HEALTH_CHECK_ISSUE_NUMBER` is a repo-level Actions variable (not secret) set once per Task 6.
- `MAX_SILENCE_HOURS` and `ALERT_COOLDOWN_HOURS` are **optional** repo variables. When unset, the workflow passes an empty env and the CLI falls back to defaults (192 / 24).
- Cron is 12:00 UTC daily — 6h after the Monday 06:00 UTC bot run — to avoid a race where watchdog runs before the bot posts.

- [ ] **Step 2: Also wire `HEALTH_CHECK_ISSUE_NUMBER` into `bot.yml`**

Modify `.github/workflows/bot.yml` to forward the repo variable into the existing `Run monitor` step's env block:

```yaml
      - name: Run monitor
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          HEALTH_CHECK_ISSUE_NUMBER: ${{ vars.HEALTH_CHECK_ISSUE_NUMBER }}  # ← add this
        run: npx tsx --project tsconfig.scripts.json scripts/monitor/runner.ts
```

Only the `Run monitor` step gets the new env var. The `Run health check` step (pre-flight) doesn't need it.

- [ ] **Step 3: Validate YAML**

Parse both files via `node`:

```bash
node -e "for (const f of ['.github/workflows/health-watchdog.yml', '.github/workflows/bot.yml']) { require('js-yaml').load(require('fs').readFileSync(f, 'utf-8')); console.log(f + ' OK'); }"
```

Expected: both print `OK`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/health-watchdog.yml .github/workflows/bot.yml
git commit -m "$(cat <<'EOF'
feat: v1-f5 health-watchdog workflow + wire issue number into bot.yml

New daily workflow runs at 12:00 UTC to detect silent bot failures and
post an alert comment to the pinned issue. bot.yml also forwards
HEALTH_CHECK_ISSUE_NUMBER so runner.ts can post its own green/mixed
comment after each monitoring run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: One-time setup doc

**Files:**
- Create: `docs/superpowers/plans/2026-04-23-v1-f5-setup.md` — short ops doc describing the one-time manual steps Jason has to perform after merge.

This doc is NOT the plan; it is the operational companion that stays checked in.

- [ ] **Step 1: Write the setup doc**

```markdown
# v1-f5 One-Time Setup

After the v1-f5 PR merges, perform these one-time steps. Takes ~5 minutes.

## 1. Create the pinned health-check issue

1. Navigate to https://github.com/lego651/open-prop-firm/issues/new
2. Title: `Bot Health Check`
3. Body:
   ```
   This issue tracks the monitoring bot's daily/weekly health checks.
   Each bot run appends a summary comment. The watchdog workflow posts
   an alert here when the bot goes silent for longer than expected.

   Do not close this issue. Do not delete the comments.
   ```
4. Submit. Note the issue number (e.g., `#42`).
5. From the issue page, click the `...` menu → **Pin issue**.

## 2. Set the repo Actions variable

```bash
gh variable set HEALTH_CHECK_ISSUE_NUMBER --body "42"   # replace 42 with the actual number
```

Verify:
```bash
gh variable list
```

## 3. (Optional) tune thresholds

Defaults: `MAX_SILENCE_HOURS=192` (8 days), `ALERT_COOLDOWN_HOURS=24`.

Current bot cron is Mondays 06:00 UTC. If you later change `bot.yml` to daily, tighten:

```bash
gh variable set MAX_SILENCE_HOURS --body "30"        # daily cron → alert after 30h silence
gh variable set ALERT_COOLDOWN_HOURS --body "24"     # once per day max
```

## 4. Manually trigger the watchdog once to smoke-test

```bash
gh workflow run health-watchdog.yml
gh run watch
```

Expected: the run succeeds. Because no health comment has been posted yet, the watchdog posts an alert ("Last health check: never"). That alert becomes part of the cooldown record, so the next watchdog run (12:00 UTC tomorrow) will be suppressed unless >24h have passed without a green check.

## 5. Verify the bot posts a health comment on its next run

Next scheduled bot run: Monday 06:00 UTC. Or manually:

```bash
gh workflow run bot.yml
gh run watch
```

After completion, open the pinned issue and confirm a `✅` / `⚠️` / `❌` comment appeared with the health sentinel.
```

- [ ] **Step 2: Commit the setup doc**

```bash
git add docs/superpowers/plans/2026-04-23-v1-f5-setup.md
git commit -m "$(cat <<'EOF'
docs: v1-f5 one-time setup instructions

Post-merge ops: create pinned issue, set Actions variable, smoke-test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Full validation + PR

- [ ] **Step 1: Type check + test suite**

```bash
pnpm tsc --noEmit
pnpm test
```

Expected: clean; 13 new tests pass (6 health-comment + 7 watchdog-core). Full suite ≥ 101 tests.

`pnpm lint` may still show the pre-existing errors in `src/components/content/ContentPanelRight.tsx` that were present on main before v1-f4 — those are not introduced by this branch and are tracked separately.

- [ ] **Step 2: Push the feature branch**

```bash
git push -u origin feat/v1-f5-health-watchdog
```

(Assumption: the implementer starts this plan on a fresh branch named `feat/v1-f5-health-watchdog` checked out from `main`.)

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "feat: v1-f5 health check + silent-failure watchdog" --body "$(cat <<'EOF'
## Summary

- After every bot run, \`runner.ts\` posts a sentinel-tagged health summary to a pinned GitHub Issue (referenced via the \`HEALTH_CHECK_ISSUE_NUMBER\` repo variable).
- A new \`health-watchdog.yml\` workflow runs daily at 12:00 UTC, fetches the pinned issue's comments, and posts an alert (which triggers a subscriber email) when the latest health check is older than \`MAX_SILENCE_HOURS\` (default 192h = 8 days, matching the current weekly bot cron). Cooldown-gated to avoid spamming.
- Two new pure modules with full unit coverage: \`health-comment.ts\` (6 tests), \`watchdog-core.ts\` (7 tests). One thin CLI: \`health-watchdog.ts\`.
- Satisfies spec §3.3 (health-check posting) and §6 (silent-failure alerting).

## Pre-merge action items for Jason

See \`docs/superpowers/plans/2026-04-23-v1-f5-setup.md\` for full steps. In short:
1. Create + pin a \`Bot Health Check\` issue.
2. \`gh variable set HEALTH_CHECK_ISSUE_NUMBER --body "<N>"\`.
3. Trigger \`health-watchdog.yml\` manually once to verify.

## Test plan

- [x] \`pnpm test\` — 13 new tests pass (6 + 7).
- [x] \`pnpm tsc --noEmit\` clean.
- [x] Local dry-run of runner + watchdog show the correct env-gated / dry-run branches without side effects.
- [ ] After merge + setup: manual watchdog trigger posts the "never" alert to the pinned issue.
- [ ] After Monday's bot run: a green/mixed/red health comment appears.

## Follow-ups (not blocking)

- If \`bot.yml\` ever flips from weekly to daily, \`gh variable set MAX_SILENCE_HOURS 30\` to tighten the staleness threshold.
- The watchdog posts through GitHub's issue-subscriber notification channel — make sure you're watching the repo (or the specific issue) with "All Activity" for the email to arrive.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (performed by plan author)

**1. Spec coverage:**
- [x] §3.3 "runner.ts posts a comment on the pinned GitHub Issue" — Task 3 wiring, Task 1 builder.
- [x] §6 "Bot silent > 24 hours → Health-check workflow → Email Jason" — Tasks 2 + 4 + 5. Note: threshold defaults to 192h due to weekly bot cadence; spec-aligned 24h threshold becomes appropriate once `bot.yml` flips to daily (documented in Task 6 + PR body).
- [x] Cooldown-based dedupe (not in the spec but a direct mitigation for "every watchdog run spams me"): test-covered in Task 2.

**2. Placeholder scan:**
- No "TBD" / "handle edge cases" / "implement later" / "similar to task N" phrases. Every code block is complete and self-contained.

**3. Type consistency:**
- `HealthStatus`, `PerFirmStatus`, `HEALTH_SENTINEL`, `ALERT_SENTINEL` are defined exactly once (in `health-comment.ts`) and re-imported everywhere else. `IssueComment` and `Decision` are defined exactly once (in `watchdog-core.ts`). `buildHealthCommentBody(status)` signature matches across Task 1 and Task 3. `checkHealthStale(input)` signature matches across Task 2 and Task 4.

**4. Scope:**
- 4 new files (+ 2 test files), 2 modified files (runner.ts, bot.yml), 1 new workflow, 1 setup doc. Zero npm deps. The bot cron is NOT changed. Supabase is NOT touched. Schema is NOT touched. `data/firms/**` is NOT touched.

**5. Follow-ups recorded in the PR body:**
- Threshold tightening when bot cadence changes.
- Subscription requirement for email delivery.
