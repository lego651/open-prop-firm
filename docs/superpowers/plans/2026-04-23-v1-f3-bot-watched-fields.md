# v1-f3 Bot Upgrade — Watched-Fields Diffing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bot's keyword-presence sniffing with structured field-level diffing against the `decision.snapshot` frontmatter shipped in v1-f2, so drift on any of the 6 watched fields produces a PR with a precise before/after table and a clean source URL for each changed field.

**Architecture:** A new `scripts/monitor/diff.ts` owns the pure diff logic and PR-body rendering. Each per-firm scraper becomes a field-extractor module — for every watched field it returns either the parsed value or `null` (unknown). A new `scripts/monitor/read-current.ts` reads the ground-truth `DecisionSnapshot` + cheapest challenge price from on-disk frontmatter. The runner glues these together: for each firm, load current → scrape remote → diff → if diffs exist open a PR with `renderPRBody()`; always log to Supabase + update `last_verified`.

**Tech Stack:** TypeScript · cheerio (HTML parsing, already installed) · gray-matter (frontmatter, already installed) · vitest (tests) · Zod (schema, already shipped in v1-f1). No new dependencies.

---

## Files touched by this plan

**Create:**
- `scripts/monitor/diff.ts` — `diffSnapshots()` + `renderPRBody()` pure functions
- `scripts/monitor/diff.test.ts` — unit tests for diff.ts
- `scripts/monitor/read-current.ts` — reads on-disk `index.md` + cheapest `challenges/*.md` price for a firm slug
- `scripts/monitor/read-current.test.ts` — unit tests
- `scripts/monitor/__fixtures__/funded-next.html` — saved HTML snippet (trimmed) for scraper test
- `scripts/monitor/__fixtures__/funding-pips.html` — same
- `scripts/monitor/__fixtures__/apex-funding.html` — same
- `scripts/monitor/__fixtures__/lucid-trading.html` — same
- `scripts/monitor/funded-next.test.ts` — scraper tests that use the fixture
- `scripts/monitor/funding-pips.test.ts` — same
- `scripts/monitor/apex-funding.test.ts` — same
- `scripts/monitor/lucid-trading.test.ts` — same

**Modify:**
- `scripts/monitor/types.ts` — add `FieldDiff`, `ScrapedSnapshot`, `CurrentSnapshot`; extend `BotRunResult`
- `scripts/monitor/funded-next.ts` — upgrade to parse 6 watched fields, return `ScrapedSnapshot`, produce structured diff
- `scripts/monitor/funding-pips.ts` — same
- `scripts/monitor/apex-funding.ts` — same
- `scripts/monitor/lucid-trading.ts` — same
- `scripts/monitor/runner.ts` — read current snapshot, call `diffSnapshots()` + `renderPRBody()`, add `--dry-run` flag, carry structured `diffs[]` into `bot_usage_log`
- `scripts/monitor/utils.ts` — add `parseDollarAmount()`, `parsePercentage()` shared helpers

**Explicitly out of scope (other features own these):**
- `.github/workflows/bot.yml` cron bump (v1-f5)
- `append-changelog.yml` workflow (v1-f4)
- Pinned GitHub Issue + health-watchdog.yml (v1-f5)
- Any changes to the Supabase `bot_usage_log` table schema. If additional columns are desirable, they ship with v1-f5.

---

## Shared type shape — lock this in before anything else

All later tasks reference these names. Define them once in `types.ts` and never rename.

```ts
import type { DecisionSnapshot } from './schema'

// A single field-level change detected by the bot.
export interface FieldDiff {
  field: string           // dotted path, e.g. "snapshot.max_drawdown.value_usd"
  from: unknown           // current on-disk value
  to: unknown             // scraped live value
  source_url: string      // URL the bot observed the new value at
}

// Partial DecisionSnapshot + the challenge-price watched field.
// Every field optional: scraper returns only what it could parse.
export interface ScrapedSnapshot {
  news_trading_allowed?: boolean | null
  overnight_holding_allowed?: boolean | null
  weekend_holding_allowed?: boolean | null
  max_drawdown?: {
    type?: DecisionSnapshot['max_drawdown']['type'] | null
    value_usd?: number | null
  } | null
  consistency_rule?: {
    enabled?: boolean | null
    max_daily_pct?: number | null
  } | null
  payout_split_pct?: number | null
  cheapest_challenge_price_usd?: number | null
}

// Ground-truth snapshot read from on-disk frontmatter.
// Guaranteed non-partial for snapshot fields (validator enforces it).
// cheapest_challenge_price_usd may be null if the firm has no challenge files.
export interface CurrentSnapshot {
  snapshot: DecisionSnapshot
  cheapest_challenge_price_usd: number | null
  // Every snapshot field carries its own source_url inside the DecisionSnapshot.
  // Cheapest-price source_url is derived from the challenge file that supplied
  // the minimum — captured here so the PR body can cite it.
  cheapest_challenge_source_url: string | null
}

// Existing interface, extended.
export interface BotRunResult {
  firmSlug: string
  lastVerified: string          // ISO date (YYYY-MM-DD)
  changesDetected: boolean
  diffs: FieldDiff[]            // NEW — structured, one entry per changed field
  diff: string | null           // kept: human-readable PR body (rendered by diff.ts)
  error: string | null
}
```

---

## Branch + PR convention

- Branch: `v1-f3-bot-watched-fields`
- PR title: `feat: v1-f3 bot upgrade — watched-fields diffing`
- Each task below lands a single commit. Keeps reviewer able to inspect each scraper, diff module, and runner change in isolation.

---

## Task 0: Preflight — branch + baseline

**Files:**
- None modified.

- [ ] **Step 1: Confirm local main is synced with origin**

Run: `git fetch origin && git status`

Expected: on `main`, up-to-date with `origin/main`. v1-f2 merge commit `cd66708` is the latest on main.

- [ ] **Step 2: Confirm there are no uncommitted tracked changes that would pollute this branch**

Run: `git status --short`

Expected: either clean, or only `src/components/content/SplitPaneLayout.tsx` + `src/components/nav/NavFileTree.tsx` modifications (the pane-nav WIP). If the WIP is present, stash it: `git stash push -m "wip: pane-aware file-tree nav" src/components/content/SplitPaneLayout.tsx src/components/nav/NavFileTree.tsx`. It will be popped back after the PR merges.

- [ ] **Step 3: Create the feature branch**

Run: `git checkout -b v1-f3-bot-watched-fields`

Expected: `Switched to a new branch 'v1-f3-bot-watched-fields'`

- [ ] **Step 4: Baseline — run existing monitor tests**

Run: `npm test -- monitor`

Expected: schema + schema.test.ts + validate-content tests pass (37 from v1-f2). No scraper tests exist yet.

- [ ] **Step 5: Baseline — verify the bot still type-checks and runs locally in dry-read mode**

Run: `npx tsx --project tsconfig.scripts.json -e "import('./scripts/monitor/funded-next').then(m => m.run()).then(r => console.log(JSON.stringify(r, null, 2)))"`

Expected: output is a `BotRunResult` with `firmSlug: 'funded-next'`, `changesDetected: false` (or a keyword-presence diff if fundednext.com changed), no exception. This baseline proves the scraper contract works before we touch it.

If the remote fetch fails (offline, timeout), skip this step and continue.

---

## Task 1: Extend `types.ts` with the shared diff types

**Files:**
- Modify: `scripts/monitor/types.ts`

- [ ] **Step 1: Replace the file contents**

Open `scripts/monitor/types.ts`. Replace its entire contents with:

```ts
import type { DecisionSnapshot } from './schema'

/** A single field-level change detected by the bot. */
export interface FieldDiff {
  field: string
  from: unknown
  to: unknown
  source_url: string
}

/**
 * Partial DecisionSnapshot + cheapest-tier challenge price.
 * Every field optional — scrapers only report what they successfully parsed.
 */
export interface ScrapedSnapshot {
  news_trading_allowed?: boolean | null
  overnight_holding_allowed?: boolean | null
  weekend_holding_allowed?: boolean | null
  max_drawdown?: {
    type?: DecisionSnapshot['max_drawdown']['type'] | null
    value_usd?: number | null
  } | null
  consistency_rule?: {
    enabled?: boolean | null
    max_daily_pct?: number | null
  } | null
  payout_split_pct?: number | null
  cheapest_challenge_price_usd?: number | null
}

/** Ground-truth snapshot read from on-disk frontmatter. */
export interface CurrentSnapshot {
  snapshot: DecisionSnapshot
  cheapest_challenge_price_usd: number | null
  cheapest_challenge_source_url: string | null
}

/** Result returned by each per-firm scraper. */
export interface BotRunResult {
  firmSlug: string
  lastVerified: string
  changesDetected: boolean
  diffs: FieldDiff[]
  diff: string | null
  error: string | null
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --project tsconfig.scripts.json --noEmit`

Expected: existing scrapers and `runner.ts` break because `BotRunResult` now requires `diffs: FieldDiff[]`. That's expected — later tasks fix each. Capture the failing file list; it should be `runner.ts` + 4 scrapers.

Do NOT fix the scrapers here. Their upgrades are Tasks 4–7.

- [ ] **Step 3: Temporarily satisfy the compiler in the 4 scrapers and runner.ts so the rest of the repo type-checks**

In each of `scripts/monitor/funded-next.ts`, `funding-pips.ts`, `apex-funding.ts`, `lucid-trading.ts` — in both the success and catch `return` blocks — add `diffs: [],` right after the `firmSlug:` line. Example for `funded-next.ts`:

```ts
return {
  firmSlug: FIRM_SLUG,
  lastVerified: today,
  changesDetected: diffs.length > 0,
  diffs: [],
  diff: diffs.length > 0 ? diffs.join('\n') : null,
  error: null,
}
```

Do the same in each file's two `return` statements (the success path and the `catch` block). This is a 5-minute mechanical edit that unblocks type-checking without committing scraper behavior changes yet.

- [ ] **Step 4: Re-run the type check**

Run: `npx tsc --project tsconfig.scripts.json --noEmit`

Expected: exits 0, no type errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`

Expected: 37 tests pass (no new tests yet; no existing tests broken).

- [ ] **Step 6: Commit**

```bash
git add scripts/monitor/types.ts scripts/monitor/funded-next.ts scripts/monitor/funding-pips.ts scripts/monitor/apex-funding.ts scripts/monitor/lucid-trading.ts
git commit -m "$(cat <<'EOF'
feat(bot): extend BotRunResult with structured diffs[]

Adds FieldDiff, ScrapedSnapshot, and CurrentSnapshot interfaces used
by the incoming diff.ts module + per-firm scraper upgrades. Each
existing scraper now returns diffs: [] as a stub; real field diffing
lands in later commits.

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `diff.ts` — `diffSnapshots()` with full test coverage

**Files:**
- Create: `scripts/monitor/diff.ts`
- Create: `scripts/monitor/diff.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `scripts/monitor/diff.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { diffSnapshots } from './diff'
import type { CurrentSnapshot, ScrapedSnapshot } from './types'

const SRC = 'https://example.com/rules'

function makeCurrent(overrides?: Partial<CurrentSnapshot['snapshot']>): CurrentSnapshot {
  return {
    snapshot: {
      news_trading_allowed: true,
      overnight_holding_allowed: true,
      weekend_holding_allowed: true,
      max_drawdown: {
        type: 'static',
        value_usd: 5000,
        source_url: SRC,
      },
      consistency_rule: {
        enabled: false,
        source_url: SRC,
      },
      payout_split_pct: 80,
      best_for: 'Flagship',
      ...overrides,
    },
    cheapest_challenge_price_usd: 199.99,
    cheapest_challenge_source_url: SRC,
  }
}

describe('diffSnapshots', () => {
  it('returns [] when scraped matches current', () => {
    const scraped: ScrapedSnapshot = {
      news_trading_allowed: true,
      overnight_holding_allowed: true,
      weekend_holding_allowed: true,
      max_drawdown: { type: 'static', value_usd: 5000 },
      consistency_rule: { enabled: false },
      payout_split_pct: 80,
      cheapest_challenge_price_usd: 199.99,
    }
    expect(diffSnapshots(makeCurrent(), scraped, SRC)).toEqual([])
  })

  it('skips fields the scraper returned null', () => {
    const scraped: ScrapedSnapshot = {
      news_trading_allowed: null,
      max_drawdown: null,
    }
    expect(diffSnapshots(makeCurrent(), scraped, SRC)).toEqual([])
  })

  it('skips fields the scraper omitted entirely', () => {
    const scraped: ScrapedSnapshot = {}
    expect(diffSnapshots(makeCurrent(), scraped, SRC)).toEqual([])
  })

  it('flags a single boolean change', () => {
    const scraped: ScrapedSnapshot = { news_trading_allowed: false }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toEqual({
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: SRC,
    })
  })

  it('flags nested max_drawdown.value_usd change', () => {
    const scraped: ScrapedSnapshot = {
      max_drawdown: { type: 'static', value_usd: 6000 },
    }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({
      field: 'snapshot.max_drawdown.value_usd',
      from: 5000,
      to: 6000,
    })
  })

  it('flags nested max_drawdown.type change', () => {
    const scraped: ScrapedSnapshot = {
      max_drawdown: { type: 'trailing_eod', value_usd: 5000 },
    }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({
      field: 'snapshot.max_drawdown.type',
      from: 'static',
      to: 'trailing_eod',
    })
  })

  it('flags consistency_rule.enabled change', () => {
    const scraped: ScrapedSnapshot = {
      consistency_rule: { enabled: true, max_daily_pct: 30 },
    }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs.map((d) => d.field)).toEqual(
      expect.arrayContaining([
        'snapshot.consistency_rule.enabled',
        'snapshot.consistency_rule.max_daily_pct',
      ]),
    )
  })

  it('flags cheapest_challenge_price_usd change', () => {
    const scraped: ScrapedSnapshot = { cheapest_challenge_price_usd: 189.99 }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({
      field: 'cheapest_challenge_price_usd',
      from: 199.99,
      to: 189.99,
    })
  })

  it('uses per-field source_url from current when available', () => {
    const perFieldSrc = 'https://example.com/max-drawdown-rule'
    const current = makeCurrent()
    current.snapshot.max_drawdown.source_url = perFieldSrc
    const scraped: ScrapedSnapshot = {
      max_drawdown: { type: 'static', value_usd: 6000 },
    }
    const diffs = diffSnapshots(current, scraped, SRC)
    expect(diffs[0].source_url).toBe(perFieldSrc)
  })

  it('falls back to fallback source_url when field-level is missing', () => {
    const scraped: ScrapedSnapshot = { news_trading_allowed: false }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs[0].source_url).toBe(SRC)
  })
})
```

- [ ] **Step 2: Run the tests — they must FAIL**

Run: `npm test -- diff`

Expected: `Cannot find module './diff'` error. This confirms the test file loaded and the module doesn't exist yet.

- [ ] **Step 3: Create `diff.ts` with the minimal implementation**

Create `scripts/monitor/diff.ts`:

```ts
import type { CurrentSnapshot, FieldDiff, ScrapedSnapshot } from './types'

/**
 * Produce a structured list of field-level diffs between the on-disk current
 * snapshot and a scraped snapshot. Fields the scraper returned undefined or
 * null are skipped (the bot only reports drift it can confirm).
 *
 * @param current          Ground-truth from data/firms/.../index.md frontmatter
 * @param scraped          Partial snapshot returned by a per-firm scraper
 * @param fallbackSource   URL used when a field's current.snapshot entry has no
 *                         source_url of its own (e.g. top-level booleans)
 */
export function diffSnapshots(
  current: CurrentSnapshot,
  scraped: ScrapedSnapshot,
  fallbackSource: string,
): FieldDiff[] {
  const out: FieldDiff[] = []
  const snap = current.snapshot

  // Top-level booleans
  if (scraped.news_trading_allowed != null
      && scraped.news_trading_allowed !== snap.news_trading_allowed) {
    out.push({
      field: 'snapshot.news_trading_allowed',
      from: snap.news_trading_allowed,
      to: scraped.news_trading_allowed,
      source_url: fallbackSource,
    })
  }
  if (scraped.overnight_holding_allowed != null
      && scraped.overnight_holding_allowed !== snap.overnight_holding_allowed) {
    out.push({
      field: 'snapshot.overnight_holding_allowed',
      from: snap.overnight_holding_allowed,
      to: scraped.overnight_holding_allowed,
      source_url: fallbackSource,
    })
  }
  if (scraped.weekend_holding_allowed != null
      && scraped.weekend_holding_allowed !== snap.weekend_holding_allowed) {
    out.push({
      field: 'snapshot.weekend_holding_allowed',
      from: snap.weekend_holding_allowed,
      to: scraped.weekend_holding_allowed,
      source_url: fallbackSource,
    })
  }

  // payout_split_pct
  if (scraped.payout_split_pct != null
      && scraped.payout_split_pct !== snap.payout_split_pct) {
    out.push({
      field: 'snapshot.payout_split_pct',
      from: snap.payout_split_pct,
      to: scraped.payout_split_pct,
      source_url: fallbackSource,
    })
  }

  // max_drawdown nested
  if (scraped.max_drawdown != null) {
    const srcUrl = snap.max_drawdown.source_url || fallbackSource
    if (scraped.max_drawdown.type != null
        && scraped.max_drawdown.type !== snap.max_drawdown.type) {
      out.push({
        field: 'snapshot.max_drawdown.type',
        from: snap.max_drawdown.type,
        to: scraped.max_drawdown.type,
        source_url: srcUrl,
      })
    }
    if (scraped.max_drawdown.value_usd != null
        && scraped.max_drawdown.value_usd !== snap.max_drawdown.value_usd) {
      out.push({
        field: 'snapshot.max_drawdown.value_usd',
        from: snap.max_drawdown.value_usd,
        to: scraped.max_drawdown.value_usd,
        source_url: srcUrl,
      })
    }
  }

  // consistency_rule nested
  if (scraped.consistency_rule != null) {
    const srcUrl = snap.consistency_rule.source_url || fallbackSource
    if (scraped.consistency_rule.enabled != null
        && scraped.consistency_rule.enabled !== snap.consistency_rule.enabled) {
      out.push({
        field: 'snapshot.consistency_rule.enabled',
        from: snap.consistency_rule.enabled,
        to: scraped.consistency_rule.enabled,
        source_url: srcUrl,
      })
    }
    if (scraped.consistency_rule.max_daily_pct != null
        && scraped.consistency_rule.max_daily_pct !== snap.consistency_rule.max_daily_pct) {
      out.push({
        field: 'snapshot.consistency_rule.max_daily_pct',
        from: snap.consistency_rule.max_daily_pct,
        to: scraped.consistency_rule.max_daily_pct,
        source_url: srcUrl,
      })
    }
  }

  // cheapest challenge price
  if (scraped.cheapest_challenge_price_usd != null
      && scraped.cheapest_challenge_price_usd !== current.cheapest_challenge_price_usd) {
    out.push({
      field: 'cheapest_challenge_price_usd',
      from: current.cheapest_challenge_price_usd,
      to: scraped.cheapest_challenge_price_usd,
      source_url: current.cheapest_challenge_source_url || fallbackSource,
    })
  }

  return out
}
```

- [ ] **Step 4: Run tests — all must PASS**

Run: `npm test -- diff`

Expected: 10 tests pass in `diff.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/diff.ts scripts/monitor/diff.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): diffSnapshots structured field-level diff

Pure function: given the on-disk DecisionSnapshot and a partial
ScrapedSnapshot, returns FieldDiff[] for every watched field where
the scraped value differs. Fields the scraper left null/undefined are
skipped — the bot only reports drift it can confirm.

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `diff.ts` — `renderPRBody()` markdown generator

**Files:**
- Modify: `scripts/monitor/diff.ts` (add `renderPRBody`)
- Modify: `scripts/monitor/diff.test.ts` (add tests)

- [ ] **Step 1: Write failing tests for `renderPRBody`**

Append to `scripts/monitor/diff.test.ts`, inside the describe block OR in a new describe below:

```ts
import { renderPRBody } from './diff'

describe('renderPRBody', () => {
  it('renders a no-changes stub when diffs is empty', () => {
    const body = renderPRBody('funded-next', [], { lastVerified: '2026-04-23', scrapedUrl: 'https://fundednext.com/stellar-model' })
    expect(body).toContain('No field-level drift detected')
    expect(body).toContain('funded-next')
    expect(body).toContain('2026-04-23')
  })

  it('renders a markdown table of diffs', () => {
    const diffs = [
      {
        field: 'snapshot.max_drawdown.value_usd',
        from: 5000,
        to: 6000,
        source_url: 'https://fundednext.com/stellar-model',
      },
      {
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://fundednext.com/rules',
      },
    ]
    const body = renderPRBody('funded-next', diffs, {
      lastVerified: '2026-04-23',
      scrapedUrl: 'https://fundednext.com/stellar-model',
    })
    expect(body).toContain('| Field | From | To | Source |')
    expect(body).toContain('`snapshot.max_drawdown.value_usd`')
    expect(body).toContain('5000')
    expect(body).toContain('6000')
    expect(body).toContain('[link](https://fundednext.com/stellar-model)')
    expect(body).toContain('`snapshot.news_trading_allowed`')
  })

  it('serializes booleans and null as JSON', () => {
    const diffs = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x.com' },
      { field: 'snapshot.max_drawdown.type', from: null, to: 'static', source_url: 'https://x.com' },
    ]
    const body = renderPRBody('apex-funding', diffs, { lastVerified: '2026-04-23', scrapedUrl: 'https://x.com' })
    expect(body).toContain('| `snapshot.news_trading_allowed` | `true` | `false` |')
    expect(body).toContain('| `snapshot.max_drawdown.type` | `null` | `"static"` |')
  })
})
```

- [ ] **Step 2: Run tests — must FAIL**

Run: `npm test -- diff`

Expected: new tests fail with "renderPRBody is not a function" or similar import error.

- [ ] **Step 3: Add `renderPRBody` to `diff.ts`**

Append to `scripts/monitor/diff.ts`:

```ts
export interface RenderMetadata {
  lastVerified: string
  scrapedUrl: string
}

export function renderPRBody(
  firmSlug: string,
  diffs: FieldDiff[],
  meta: RenderMetadata,
): string {
  const header = [
    `Automated content update detected by the monitoring bot on ${meta.lastVerified}.`,
    '',
    `- **Firm:** \`${firmSlug}\``,
    `- **Scraped URL:** ${meta.scrapedUrl}`,
    `- **Last verified (new):** ${meta.lastVerified}`,
    '',
  ].join('\n')

  const footer = [
    '',
    '---',
    '_Opened by the OpenPropFirm monitoring bot. Review each row against the linked source before merging._',
  ].join('\n')

  if (diffs.length === 0) {
    return [
      header,
      '## No field-level drift detected',
      '',
      'The bot could not confirm any watched-field change. `last_verified` has been bumped in place.',
      footer,
    ].join('\n')
  }

  const rows = diffs
    .map(
      (d) =>
        `| \`${d.field}\` | \`${JSON.stringify(d.from)}\` | \`${JSON.stringify(d.to)}\` | [link](${d.source_url}) |`,
    )
    .join('\n')

  return [
    header,
    '## Changes detected',
    '',
    '| Field | From | To | Source |',
    '|---|---|---|---|',
    rows,
    footer,
  ].join('\n')
}
```

- [ ] **Step 4: Run tests — must PASS**

Run: `npm test -- diff`

Expected: all `diff.test.ts` tests pass (13 now: 10 from Task 2 + 3 from Task 3).

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/diff.ts scripts/monitor/diff.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): renderPRBody markdown generator

Turns a FieldDiff[] + metadata into a reviewer-friendly markdown body
with a before/after table and linked source per row. Used by the bot
runner to build PR bodies when drift is detected.

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `read-current.ts` helper

**Files:**
- Create: `scripts/monitor/read-current.ts`
- Create: `scripts/monitor/read-current.test.ts`

Purpose: read the on-disk ground truth for a firm slug — the `decision.snapshot` from `index.md` and the cheapest `price_usd` across its `challenges/*.md`.

- [ ] **Step 1: Write failing tests**

Create `scripts/monitor/read-current.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readCurrentSnapshot } from './read-current'

describe('readCurrentSnapshot', () => {
  it('loads the decision snapshot for funded-next', async () => {
    const current = await readCurrentSnapshot('funded-next')
    expect(current.snapshot.max_drawdown.type).toBe('static')
    expect(current.snapshot.max_drawdown.value_usd).toBe(5000)
    expect(current.snapshot.payout_split_pct).toBe(80)
  })

  it('returns the cheapest challenge price across challenge files', async () => {
    const current = await readCurrentSnapshot('funded-next')
    // Funded Next has $199.99 as its cheapest ($25k tier)
    expect(current.cheapest_challenge_price_usd).toBe(199.99)
    expect(current.cheapest_challenge_source_url).toContain('funded-next')
  })

  it('loads apex-funding from the futures category', async () => {
    const current = await readCurrentSnapshot('apex-funding')
    expect(current.snapshot.max_drawdown.type).toBe('trailing_eod')
    expect(current.snapshot.max_drawdown.value_usd).toBe(2000)
  })

  it('throws a helpful error for an unknown slug', async () => {
    await expect(readCurrentSnapshot('nonexistent-firm')).rejects.toThrow(
      /nonexistent-firm/,
    )
  })
})
```

- [ ] **Step 2: Run tests — must FAIL**

Run: `npm test -- read-current`

Expected: `Cannot find module './read-current'`.

- [ ] **Step 3: Implement `read-current.ts`**

Create `scripts/monitor/read-current.ts`:

```ts
import { readFile } from 'fs/promises'
import fg from 'fast-glob'
import matter from 'gray-matter'
import path from 'path'
import type { CurrentSnapshot } from './types'
import { DecisionSchema } from './schema'

const CFD_SLUGS = ['funded-next', 'funding-pips']

/** Resolve the firm directory for a slug. Throws on unknown slug. */
async function firmDir(slug: string): Promise<string> {
  const category = CFD_SLUGS.includes(slug) ? 'cfd' : 'futures'
  const dir = path.join(process.cwd(), 'data', 'firms', category, slug)
  const indexPath = path.join(dir, 'index.md')
  try {
    await readFile(indexPath, 'utf-8')
  } catch {
    throw new Error(
      `readCurrentSnapshot: no index.md found for slug "${slug}" at ${indexPath}`,
    )
  }
  return dir
}

/** Read the decision snapshot + cheapest challenge price for a firm slug. */
export async function readCurrentSnapshot(slug: string): Promise<CurrentSnapshot> {
  const dir = await firmDir(slug)

  // Parse index.md frontmatter
  const indexRaw = await readFile(path.join(dir, 'index.md'), 'utf-8')
  const { data: fm } = matter(indexRaw)
  if (!fm.decision) {
    throw new Error(
      `readCurrentSnapshot: firm "${slug}" has no decision block in its frontmatter. v1-f2 migration missing?`,
    )
  }
  const parsed = DecisionSchema.safeParse(fm.decision)
  if (!parsed.success) {
    throw new Error(
      `readCurrentSnapshot: firm "${slug}" decision block failed schema validation: ${parsed.error.message}`,
    )
  }

  // Scan challenges/*.md for the lowest price_usd
  const challengeFiles = await fg('challenges/*.md', { cwd: dir, absolute: true })
  let cheapestPrice: number | null = null
  let cheapestSource: string | null = null
  for (const file of challengeFiles) {
    const raw = await readFile(file, 'utf-8')
    const { data: fmChallenge } = matter(raw)
    const price = fmChallenge.price_usd
    if (typeof price === 'number' && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
      // Prefer the first source URL from the challenge's own sources array
      const sources = Array.isArray(fmChallenge.sources) ? fmChallenge.sources : []
      const firstUrl = sources.find(
        (s): s is { url: string } =>
          typeof s?.url === 'string' && s.url.startsWith('https://'),
      )?.url
      cheapestSource = firstUrl ?? null
    }
  }

  return {
    snapshot: parsed.data.snapshot,
    cheapest_challenge_price_usd: cheapestPrice,
    cheapest_challenge_source_url: cheapestSource,
  }
}
```

- [ ] **Step 4: Run tests — must PASS**

Run: `npm test -- read-current`

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/read-current.ts scripts/monitor/read-current.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): readCurrentSnapshot loads on-disk ground truth

Reads decision.snapshot from data/firms/<cat>/<slug>/index.md and
the cheapest price_usd across data/firms/<cat>/<slug>/challenges/*.md.
Used by the runner to build the \`current\` arg for diffSnapshots.

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Shared parsing helpers in `utils.ts`

**Files:**
- Modify: `scripts/monitor/utils.ts`
- Create: `scripts/monitor/utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `scripts/monitor/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseDollarAmount, parsePercentage } from './utils'

describe('parseDollarAmount', () => {
  it('returns null when no match', () => {
    expect(parseDollarAmount('hello world')).toBeNull()
  })
  it('parses $5,000', () => {
    expect(parseDollarAmount('drawdown is $5,000 per account')).toBe(5000)
  })
  it('parses $2000', () => {
    expect(parseDollarAmount('$2000')).toBe(2000)
  })
  it('parses $199.99', () => {
    expect(parseDollarAmount('price $199.99 fee')).toBe(199.99)
  })
  it('returns the first match when multiple dollar amounts exist', () => {
    expect(parseDollarAmount('first $100 then $200')).toBe(100)
  })
})

describe('parsePercentage', () => {
  it('returns null when no match', () => {
    expect(parsePercentage('hello world')).toBeNull()
  })
  it('parses 30%', () => {
    expect(parsePercentage('consistency rule: 30%')).toBe(30)
  })
  it('parses 10 percent', () => {
    expect(parsePercentage('up to 10 percent of balance')).toBe(10)
  })
  it('returns the first match when multiple percentages exist', () => {
    expect(parsePercentage('5% daily, 10% overall')).toBe(5)
  })
})
```

- [ ] **Step 2: Run tests — must FAIL**

Run: `npm test -- utils`

Expected: imports fail because functions don't exist.

- [ ] **Step 3: Implement the helpers**

Replace `scripts/monitor/utils.ts` entirely with:

```ts
/** Shared utilities for the monitoring bot scrapers. */

export const USER_AGENT =
  'Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)'

const DEFAULT_TIMEOUT_MS = 30_000

export async function fetchPage(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parse the first USD amount from a text blob.
 * Recognizes: $5,000 · $5000 · $199.99 · $25k (converted to 25000) ·
 * $25K (converted to 25000).
 */
export function parseDollarAmount(text: string): number | null {
  // $25k or $25K form (short-thousands)
  const kMatch = /\$(\d+(?:\.\d+)?)\s*[kK]\b/.exec(text)
  if (kMatch) {
    const n = Number.parseFloat(kMatch[1]) * 1000
    if (Number.isFinite(n)) return n
  }
  // Standard $amount form
  const m = /\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\b/.exec(text)
  if (!m) return null
  const cleaned = m[1].replace(/,/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Parse the first percentage from a text blob.
 * Recognizes "30%" and "30 percent".
 */
export function parsePercentage(text: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*(?:%|percent)/.exec(text)
  if (!m) return null
  const n = Number.parseFloat(m[1])
  return Number.isFinite(n) ? n : null
}
```

- [ ] **Step 4: Run tests — must PASS**

Run: `npm test -- utils`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/utils.ts scripts/monitor/utils.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): parseDollarAmount + parsePercentage helpers

Shared text-extraction helpers used by the 4 firm scrapers to turn
scraped HTML fragments into structured numeric values.

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Upgrade `funded-next.ts` scraper

**Files:**
- Create: `scripts/monitor/__fixtures__/funded-next.html`
- Create: `scripts/monitor/funded-next.test.ts`
- Modify: `scripts/monitor/funded-next.ts`

- [ ] **Step 1: Save a fixture HTML**

Run (one-shot — does NOT commit any change to the bot):

```bash
curl -sL -A "Mozilla/5.0 (OpenPropFirmBot/1.0)" 'https://fundednext.com/stellar-model' \
  | head -c 200000 > scripts/monitor/__fixtures__/funded-next.html
mkdir -p scripts/monitor/__fixtures__
```

(If `mkdir` fails because the path already exists, that's fine.)

If the firm site is unreachable, create a minimal synthetic fixture containing the target tokens the scraper needs to parse:

```bash
cat > scripts/monitor/__fixtures__/funded-next.html <<'EOF'
<html><head><title>Funded Next — Stellar Challenge Models</title></head>
<body>
<h1>Stellar 2-Step</h1>
<p>Max Daily Loss: 5% · Max Overall Drawdown: 10% · Payout Split: 80%</p>
<p>Starting at $50,000 account — $299.99</p>
<p>Cheapest: $25,000 account — $199.99</p>
<p>News trading is permitted during the challenge. Funded accounts apply a 40% news-profit cap.</p>
<p>Weekend holding allowed during challenge phases.</p>
<p>No hedging permitted.</p>
</body></html>
EOF
```

- [ ] **Step 2: Write the failing scraper test**

Create `scripts/monitor/funded-next.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './funded-next'

const FIXTURE = path.join(__dirname, '__fixtures__', 'funded-next.html')

describe('funded-next parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.weekend_holding_allowed).toBe(true)
    expect(snap.max_drawdown?.type).toBe('static')
    expect(snap.max_drawdown?.value_usd).toBe(5000) // 10% of $50k
    expect(snap.payout_split_pct).toBe(80)
    expect(snap.cheapest_challenge_price_usd).toBe(199.99)
  })

  it('returns null for fields it cannot find', () => {
    const snap = parseScrapedSnapshot('<html><body>Nothing relevant</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
    expect(snap.payout_split_pct ?? null).toBeNull()
    expect(snap.cheapest_challenge_price_usd ?? null).toBeNull()
  })
})
```

- [ ] **Step 3: Run the test — must FAIL**

Run: `npm test -- funded-next`

Expected: `parseScrapedSnapshot is not exported` error.

- [ ] **Step 4: Rewrite `funded-next.ts`**

Replace the file entirely with:

```ts
/**
 * Monitor scraper for Funded Next (fundednext.com).
 *
 * Parses 6 watched fields (max_drawdown, consistency_rule, news/overnight/
 * weekend holding, payout_split_pct, cheapest_challenge_price_usd) from the
 * Stellar Challenge Models page into a ScrapedSnapshot, then hands off to
 * diffSnapshots + readCurrentSnapshot in the shared `run()` code path.
 */

import * as cheerio from 'cheerio'
import type { BotRunResult, ScrapedSnapshot } from './types'
import { fetchPage, parseDollarAmount, parsePercentage } from './utils'
import { diffSnapshots, renderPRBody } from './diff'
import { readCurrentSnapshot } from './read-current'

const FIRM_SLUG = 'funded-next'
const SCRAPE_URL = 'https://fundednext.com/stellar-model'

/** Pure parser: HTML in, partial ScrapedSnapshot out. Exported for tests. */
export function parseScrapedSnapshot(html: string): ScrapedSnapshot {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  // Max overall drawdown — look for "Max Overall Drawdown: N%" then compute USD
  const ddPctMatch = /max overall drawdown[^%]*?(\d+)%/i.exec(text)
  const accountSizeMatch = /\$([0-9]{1,3}(?:,[0-9]{3}))+\s*account/i.exec(text)
  let ddUsd: number | null = null
  if (ddPctMatch && accountSizeMatch) {
    const pct = Number.parseFloat(ddPctMatch[1])
    const size = Number.parseFloat(accountSizeMatch[1].replace(/,/g, ''))
    if (Number.isFinite(pct) && Number.isFinite(size)) ddUsd = (pct / 100) * size
  }

  // Payout split
  const payoutMatch = /payout split[^%]*?(\d+)\s*%/i.exec(text)
  const payoutPct = payoutMatch ? Number.parseInt(payoutMatch[1], 10) : null

  // News trading — "news trading is permitted" or "news trading allowed"
  const newsAllowed = /news trading\s+(?:is\s+)?permitted|news trading\s+allowed/i.test(text)
  const newsProhibited = /news trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  // Weekend holding
  const weekendAllowed = /weekend hold(?:ing)?\s+(?:is\s+)?allowed|weekend hold(?:ing)?\s+(?:is\s+)?permitted/i.test(text)
  const weekendProhibited = /weekend hold(?:ing)?\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  // Overnight holding — CFD firms usually allow; explicit ban phrase check
  const overnightProhibited = /overnight (?:positions? )?not\s+(?:permitted|allowed)|must close (?:all )?positions? before session end/i.test(text)

  // Cheapest challenge price — regex for lines mentioning "$N,NNN account — $Y.YY" patterns
  const priceMatches = [...text.matchAll(/\$[0-9,]+\s*account[^$]*\$([0-9]+(?:\.[0-9]+)?)/gi)]
  let cheapestPrice: number | null = null
  for (const m of priceMatches) {
    const price = Number.parseFloat(m[1])
    if (Number.isFinite(price) && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
    }
  }

  return {
    news_trading_allowed: newsAllowed ? true : newsProhibited ? false : null,
    overnight_holding_allowed: overnightProhibited ? false : null,
    weekend_holding_allowed: weekendAllowed ? true : weekendProhibited ? false : null,
    max_drawdown: ddUsd != null ? { type: 'static', value_usd: ddUsd } : null,
    consistency_rule: null,
    payout_split_pct: payoutPct,
    cheapest_challenge_price_usd: cheapestPrice,
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const html = await fetchPage(SCRAPE_URL)
    const scraped = parseScrapedSnapshot(html)
    const current = await readCurrentSnapshot(FIRM_SLUG)
    const diffs = diffSnapshots(current, scraped, SCRAPE_URL)
    const body = renderPRBody(FIRM_SLUG, diffs, {
      lastVerified: today,
      scrapedUrl: SCRAPE_URL,
    })
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diffs,
      diff: body,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diffs: [],
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

- [ ] **Step 5: Run the scraper test — must PASS**

Run: `npm test -- funded-next`

Expected: both tests pass. If the fixture file was captured from a live page (not the synthetic minimum), the `max_drawdown.value_usd` assertion may need adjustment — update the assertion to match the actual fixture values; do NOT weaken the test (it must assert concrete numbers).

- [ ] **Step 6: Run the full test suite**

Run: `npm test`

Expected: all tests pass (including existing schema + validate-content + diff + read-current + utils + funded-next = ~50 tests).

- [ ] **Step 7: Commit**

```bash
git add scripts/monitor/__fixtures__/funded-next.html scripts/monitor/funded-next.ts scripts/monitor/funded-next.test.ts
git commit -m "$(cat <<'EOF'
feat(bot): upgrade funded-next scraper to watched-fields diffing

Replaces keyword-presence sniffing with parseScrapedSnapshot — a pure
HTML-in, ScrapedSnapshot-out function covering the 6 watched fields.
The run() path now wires readCurrentSnapshot + diffSnapshots +
renderPRBody, returning structured FieldDiff[] alongside a reviewer-
ready markdown body.

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Upgrade `funding-pips.ts` scraper

Same structure as Task 6, different firm specifics.

**Files:**
- Create: `scripts/monitor/__fixtures__/funding-pips.html`
- Create: `scripts/monitor/funding-pips.test.ts`
- Modify: `scripts/monitor/funding-pips.ts`

- [ ] **Step 1: Save fixture HTML**

```bash
curl -sL -A "Mozilla/5.0 (OpenPropFirmBot/1.0)" 'https://fundingpips.com/challenge' \
  | head -c 200000 > scripts/monitor/__fixtures__/funding-pips.html || cat > scripts/monitor/__fixtures__/funding-pips.html <<'EOF'
<html><head><title>Funding Pips Challenges</title></head>
<body>
<h1>2-Step Classic</h1>
<p>Max Overall Drawdown: 10% · Max Daily Loss: 5%</p>
<p>Starting at $50,000 account — $289</p>
<p>Cheapest: $5,000 account — $36</p>
<p>Payout Split: 60%/80%/100% by withdrawal frequency.</p>
<p>News trading is permitted during evaluation.</p>
<p>Hedging strictly prohibited.</p>
</body></html>
EOF
```

- [ ] **Step 2: Write failing scraper test**

Create `scripts/monitor/funding-pips.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './funding-pips'

const FIXTURE = path.join(__dirname, '__fixtures__', 'funding-pips.html')

describe('funding-pips parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.max_drawdown?.type).toBe('static')
    expect(snap.max_drawdown?.value_usd).toBe(5000) // 10% of $50k
    // payout: scraper should pick the first (60) or document the default (80)
    expect([60, 80, 100]).toContain(snap.payout_split_pct)
    expect(snap.cheapest_challenge_price_usd).toBe(36)
  })

  it('returns null for missing fields', () => {
    const snap = parseScrapedSnapshot('<html><body>Empty</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
    expect(snap.cheapest_challenge_price_usd ?? null).toBeNull()
  })
})
```

- [ ] **Step 3: Run test — must FAIL**

Run: `npm test -- funding-pips`

Expected: import fails.

- [ ] **Step 4: Rewrite `funding-pips.ts`**

Replace file contents with the same shape as Task 6's `funded-next.ts`, substituting:
- `FIRM_SLUG = 'funding-pips'`
- `SCRAPE_URL = 'https://fundingpips.com/challenge'`
- The `parseScrapedSnapshot` body tailored to the FP page: same regexes for drawdown %, account size, news trading, weekend, but for `payout_split_pct` it picks the FIRST percentage in a "60%/80%/100%" tri-value pattern (the weekly tier). If that pattern is missing, fall back to any "N%" next to the word "split".

Full body:

```ts
import * as cheerio from 'cheerio'
import type { BotRunResult, ScrapedSnapshot } from './types'
import { fetchPage } from './utils'
import { diffSnapshots, renderPRBody } from './diff'
import { readCurrentSnapshot } from './read-current'

const FIRM_SLUG = 'funding-pips'
const SCRAPE_URL = 'https://fundingpips.com/challenge'

export function parseScrapedSnapshot(html: string): ScrapedSnapshot {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  const ddPctMatch = /max overall drawdown[^%]*?(\d+)%/i.exec(text)
  const accountSizeMatch = /\$([0-9]{1,3}(?:,[0-9]{3}))+\s*account/i.exec(text)
  let ddUsd: number | null = null
  if (ddPctMatch && accountSizeMatch) {
    const pct = Number.parseFloat(ddPctMatch[1])
    const size = Number.parseFloat(accountSizeMatch[1].replace(/,/g, ''))
    if (Number.isFinite(pct) && Number.isFinite(size)) ddUsd = (pct / 100) * size
  }

  // Funding Pips payout split — first N in "60%/80%/100%" form, else any N% near "split"
  let payoutPct: number | null = null
  const tri = /(\d+)\s*%\s*\/\s*(\d+)\s*%\s*\/\s*(\d+)\s*%/.exec(text)
  if (tri) payoutPct = Number.parseInt(tri[1], 10)
  if (payoutPct === null) {
    const m = /payout split[^%]*?(\d+)\s*%/i.exec(text)
    if (m) payoutPct = Number.parseInt(m[1], 10)
  }

  const newsAllowed = /news trading\s+(?:is\s+)?permitted|news trading\s+allowed/i.test(text)
  const newsProhibited = /news trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  const weekendAllowed = /weekend hold(?:ing)?\s+(?:is\s+)?allowed|weekend hold(?:ing)?\s+(?:is\s+)?permitted/i.test(text)
  const weekendProhibited = /weekend hold(?:ing)?\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  // Cheapest price — match "$N,NNN account — $Y" pairs
  const priceMatches = [...text.matchAll(/\$[0-9,]+\s*account[^$]*\$([0-9]+(?:\.[0-9]+)?)/gi)]
  let cheapestPrice: number | null = null
  for (const m of priceMatches) {
    const price = Number.parseFloat(m[1])
    if (Number.isFinite(price) && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
    }
  }

  return {
    news_trading_allowed: newsAllowed ? true : newsProhibited ? false : null,
    overnight_holding_allowed: null,
    weekend_holding_allowed: weekendAllowed ? true : weekendProhibited ? false : null,
    max_drawdown: ddUsd != null ? { type: 'static', value_usd: ddUsd } : null,
    consistency_rule: null,
    payout_split_pct: payoutPct,
    cheapest_challenge_price_usd: cheapestPrice,
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const html = await fetchPage(SCRAPE_URL)
    const scraped = parseScrapedSnapshot(html)
    const current = await readCurrentSnapshot(FIRM_SLUG)
    const diffs = diffSnapshots(current, scraped, SCRAPE_URL)
    const body = renderPRBody(FIRM_SLUG, diffs, {
      lastVerified: today,
      scrapedUrl: SCRAPE_URL,
    })
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diffs,
      diff: body,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diffs: [],
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

- [ ] **Step 5: Run test + full suite**

Run: `npm test -- funding-pips && npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/monitor/__fixtures__/funding-pips.html scripts/monitor/funding-pips.ts scripts/monitor/funding-pips.test.ts
git commit -m "feat(bot): upgrade funding-pips scraper to watched-fields diffing

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Upgrade `apex-funding.ts` scraper

Same structure. Apex uses trailing EOD drawdown expressed in USD directly ($2,000 on $50k), not a percentage. Parser detects "Trailing Drawdown $N,NNN" explicitly.

**Files:**
- Create: `scripts/monitor/__fixtures__/apex-funding.html`
- Create: `scripts/monitor/apex-funding.test.ts`
- Modify: `scripts/monitor/apex-funding.ts`

- [ ] **Step 1: Save fixture HTML**

```bash
curl -sL -A "Mozilla/5.0 (OpenPropFirmBot/1.0)" 'https://apextraderfunding.com/evaluation' \
  | head -c 200000 > scripts/monitor/__fixtures__/apex-funding.html || cat > scripts/monitor/__fixtures__/apex-funding.html <<'EOF'
<html><head><title>Apex Trader Funding — Evaluations</title></head>
<body>
<h1>$50k EOD</h1>
<p>Trailing Drawdown: $2,000 (End-of-Day)</p>
<p>Profit Target: $3,000 · Payout Split: 100%</p>
<p>Cheapest: $25k account — $177</p>
<p>News trading permitted.</p>
<p>Weekend holding not permitted; all positions flat before weekend close.</p>
</body></html>
EOF
```

- [ ] **Step 2: Write failing scraper test**

Create `scripts/monitor/apex-funding.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './apex-funding'

const FIXTURE = path.join(__dirname, '__fixtures__', 'apex-funding.html')

describe('apex-funding parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.weekend_holding_allowed).toBe(false)
    expect(snap.max_drawdown?.type).toBe('trailing_eod')
    expect(snap.max_drawdown?.value_usd).toBe(2000)
    expect(snap.payout_split_pct).toBe(100)
    expect(snap.cheapest_challenge_price_usd).toBe(177)
  })

  it('returns null for missing fields', () => {
    const snap = parseScrapedSnapshot('<html><body>Empty</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
    expect(snap.cheapest_challenge_price_usd ?? null).toBeNull()
  })
})
```

- [ ] **Step 3: Run test — must FAIL**

Run: `npm test -- apex-funding`

- [ ] **Step 4: Rewrite `apex-funding.ts`**

Full replacement:

```ts
import * as cheerio from 'cheerio'
import type { BotRunResult, ScrapedSnapshot } from './types'
import { fetchPage } from './utils'
import { diffSnapshots, renderPRBody } from './diff'
import { readCurrentSnapshot } from './read-current'

const FIRM_SLUG = 'apex-funding'
const SCRAPE_URL = 'https://apextraderfunding.com/evaluation'

export function parseScrapedSnapshot(html: string): ScrapedSnapshot {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  // Trailing drawdown — explicit $ value plus EOD/Intraday type
  const ddMatch = /trailing drawdown[^$]*?\$([0-9,]+)[^(]*\((?:end-of-day|eod|intraday|real-time)\)/i.exec(text)
  let ddType: 'trailing_eod' | 'trailing_intraday' | null = null
  let ddUsd: number | null = null
  if (ddMatch) {
    ddUsd = Number.parseFloat(ddMatch[1].replace(/,/g, ''))
    ddType = /end-of-day|eod/i.test(ddMatch[0]) ? 'trailing_eod' : 'trailing_intraday'
    if (!Number.isFinite(ddUsd)) ddUsd = null
  }

  // Payout split
  const payoutMatch = /payout split[^%]*?(\d+)\s*%/i.exec(text)
  const payoutPct = payoutMatch ? Number.parseInt(payoutMatch[1], 10) : null

  // News
  const newsAllowed = /news trading\s+(?:is\s+)?permitted|news trading\s+allowed/i.test(text)
  const newsProhibited = /news trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  // Weekend — Apex explicitly forbids weekend holding
  const weekendProhibited = /weekend hold(?:ing)?\s+(?:is\s+)?not\s+(?:permitted|allowed)|(?:flat|close).*before (?:the\s+)?weekend/i.test(text)
  const weekendAllowed = /weekend hold(?:ing)?\s+(?:is\s+)?allowed|weekend hold(?:ing)?\s+(?:is\s+)?permitted/i.test(text)

  // Overnight — futures firms usually flat by session end
  const overnightProhibited = /overnight (?:positions? )?not\s+(?:permitted|allowed)|must close (?:all )?positions? before session end/i.test(text)

  // Cheapest — "$Nk account — $Y" or "$N,NNN account — $Y"
  const priceMatches = [
    ...text.matchAll(/\$[0-9,]+\s*(?:k|account)[^$]*\$([0-9]+(?:\.[0-9]+)?)/gi),
  ]
  let cheapestPrice: number | null = null
  for (const m of priceMatches) {
    const price = Number.parseFloat(m[1])
    if (Number.isFinite(price) && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
    }
  }

  return {
    news_trading_allowed: newsAllowed ? true : newsProhibited ? false : null,
    overnight_holding_allowed: overnightProhibited ? false : null,
    weekend_holding_allowed: weekendAllowed ? true : weekendProhibited ? false : null,
    max_drawdown: ddUsd != null && ddType != null ? { type: ddType, value_usd: ddUsd } : null,
    consistency_rule: null,
    payout_split_pct: payoutPct,
    cheapest_challenge_price_usd: cheapestPrice,
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const html = await fetchPage(SCRAPE_URL)
    const scraped = parseScrapedSnapshot(html)
    const current = await readCurrentSnapshot(FIRM_SLUG)
    const diffs = diffSnapshots(current, scraped, SCRAPE_URL)
    const body = renderPRBody(FIRM_SLUG, diffs, {
      lastVerified: today,
      scrapedUrl: SCRAPE_URL,
    })
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diffs,
      diff: body,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diffs: [],
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

- [ ] **Step 5: Run test + full suite**

Run: `npm test -- apex-funding && npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/monitor/__fixtures__/apex-funding.html scripts/monitor/apex-funding.ts scripts/monitor/apex-funding.test.ts
git commit -m "feat(bot): upgrade apex-funding scraper to watched-fields diffing

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Upgrade `lucid-trading.ts` scraper

**Files:**
- Create: `scripts/monitor/__fixtures__/lucid-trading.html`
- Create: `scripts/monitor/lucid-trading.test.ts`
- Modify: `scripts/monitor/lucid-trading.ts`

- [ ] **Step 1: Save fixture HTML**

```bash
curl -sL -A "Mozilla/5.0 (OpenPropFirmBot/1.0)" 'https://lucidtrading.com/how-it-works' \
  | head -c 200000 > scripts/monitor/__fixtures__/lucid-trading.html || cat > scripts/monitor/__fixtures__/lucid-trading.html <<'EOF'
<html><head><title>Lucid Trading — How It Works</title></head>
<body>
<h1>LucidFlex $50k</h1>
<p>Trailing Drawdown: $2,000 (End-of-Day) · Consistency Rule: 50%</p>
<p>Cheapest: $25k account — $100</p>
<p>Payout Split: 90% (100% on first $10,000 lifetime)</p>
<p>News trading allowed on all account types.</p>
<p>Weekend holding not permitted; swing trading not allowed.</p>
</body></html>
EOF
```

- [ ] **Step 2: Write failing scraper test**

Create `scripts/monitor/lucid-trading.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './lucid-trading'

const FIXTURE = path.join(__dirname, '__fixtures__', 'lucid-trading.html')

describe('lucid-trading parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.weekend_holding_allowed).toBe(false)
    expect(snap.max_drawdown?.type).toBe('trailing_eod')
    expect(snap.max_drawdown?.value_usd).toBe(2000)
    expect(snap.consistency_rule?.enabled).toBe(true)
    expect(snap.consistency_rule?.max_daily_pct).toBe(50)
    expect(snap.payout_split_pct).toBe(90)
    expect(snap.cheapest_challenge_price_usd).toBe(100)
  })

  it('returns null for missing fields', () => {
    const snap = parseScrapedSnapshot('<html><body>Empty</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
  })
})
```

- [ ] **Step 3: Run test — must FAIL**

Run: `npm test -- lucid-trading`

- [ ] **Step 4: Rewrite `lucid-trading.ts`**

Full replacement:

```ts
import * as cheerio from 'cheerio'
import type { BotRunResult, ScrapedSnapshot } from './types'
import { fetchPage } from './utils'
import { diffSnapshots, renderPRBody } from './diff'
import { readCurrentSnapshot } from './read-current'

const FIRM_SLUG = 'lucid-trading'
const SCRAPE_URL = 'https://lucidtrading.com/how-it-works'

export function parseScrapedSnapshot(html: string): ScrapedSnapshot {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  // Trailing drawdown — $ value + EOD/Intraday type
  const ddMatch = /trailing drawdown[^$]*?\$([0-9,]+)[^(]*\((?:end-of-day|eod|intraday|real-time)\)/i.exec(text)
  let ddType: 'trailing_eod' | 'trailing_intraday' | null = null
  let ddUsd: number | null = null
  if (ddMatch) {
    ddUsd = Number.parseFloat(ddMatch[1].replace(/,/g, ''))
    ddType = /end-of-day|eod/i.test(ddMatch[0]) ? 'trailing_eod' : 'trailing_intraday'
    if (!Number.isFinite(ddUsd)) ddUsd = null
  }

  // Consistency rule — "Consistency Rule: N%"
  const consistencyMatch = /consistency rule[^%]*?(\d+)\s*%/i.exec(text)
  const consistency = consistencyMatch
    ? { enabled: true, max_daily_pct: Number.parseInt(consistencyMatch[1], 10) }
    : null

  // Payout split — first percentage in "Payout Split: N%..." (ignore lifetime clause)
  const payoutMatch = /payout split[^%]*?(\d+)\s*%/i.exec(text)
  const payoutPct = payoutMatch ? Number.parseInt(payoutMatch[1], 10) : null

  const newsAllowed = /news trading\s+(?:is\s+)?(?:permitted|allowed)/i.test(text)
  const newsProhibited = /news trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  const weekendProhibited = /weekend hold(?:ing)?\s+(?:is\s+)?not\s+(?:permitted|allowed)|swing trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)
  const weekendAllowed = /weekend hold(?:ing)?\s+(?:is\s+)?(?:permitted|allowed)/i.test(text)

  const overnightProhibited = /overnight (?:positions? )?not\s+(?:permitted|allowed)|must close (?:all )?positions? before session end/i.test(text)

  const priceMatches = [
    ...text.matchAll(/\$[0-9,]+\s*(?:k|account)[^$]*\$([0-9]+(?:\.[0-9]+)?)/gi),
  ]
  let cheapestPrice: number | null = null
  for (const m of priceMatches) {
    const price = Number.parseFloat(m[1])
    if (Number.isFinite(price) && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
    }
  }

  return {
    news_trading_allowed: newsAllowed ? true : newsProhibited ? false : null,
    overnight_holding_allowed: overnightProhibited ? false : null,
    weekend_holding_allowed: weekendAllowed ? true : weekendProhibited ? false : null,
    max_drawdown: ddUsd != null && ddType != null ? { type: ddType, value_usd: ddUsd } : null,
    consistency_rule: consistency,
    payout_split_pct: payoutPct,
    cheapest_challenge_price_usd: cheapestPrice,
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const html = await fetchPage(SCRAPE_URL)
    const scraped = parseScrapedSnapshot(html)
    const current = await readCurrentSnapshot(FIRM_SLUG)
    const diffs = diffSnapshots(current, scraped, SCRAPE_URL)
    const body = renderPRBody(FIRM_SLUG, diffs, {
      lastVerified: today,
      scrapedUrl: SCRAPE_URL,
    })
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diffs,
      diff: body,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diffs: [],
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
```

- [ ] **Step 5: Run test + full suite**

Run: `npm test -- lucid-trading && npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/monitor/__fixtures__/lucid-trading.html scripts/monitor/lucid-trading.ts scripts/monitor/lucid-trading.test.ts
git commit -m "feat(bot): upgrade lucid-trading scraper to watched-fields diffing

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Upgrade `runner.ts` — dry-run flag + structured logging

**Files:**
- Modify: `scripts/monitor/runner.ts`

The existing runner already opens a PR with `gh` and logs to Supabase. The upgrade: (1) the PR body is now the structured markdown the scraper already produced in `result.diff`, (2) a new `--dry-run` flag prevents all git/gh/Supabase side effects and prints the rendered body to stdout for local inspection, (3) the `bot_usage_log` insert includes `diffs_count` (derived from `result.diffs.length`) in an existing-column-compatible way (we serialize `result.diffs` into an existing free-text column or as a header in the PR URL string — do NOT alter the DB schema).

- [ ] **Step 1: Add `--dry-run` flag parsing and a dry-run early return**

In `runner.ts`, replace the `main()` function body. Start of file stays the same through the `createPR` function.

Update `main()`:

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

  for (const { slug, run } of scrapers) {
    console.log(`[${slug}] Starting...`)
    let result: BotRunResult
    try {
      result = await run()
    } catch (err) {
      console.error(`[${slug}] Unhandled error:`, err)
      hasUnhandledError = true
      continue
    }

    if (result.error) {
      console.error(`[${slug}] Scraper error: ${result.error}`)
    } else {
      console.log(`[${slug}] changesDetected=${result.changesDetected} (${result.diffs.length} field diffs)`)
      if (result.diff) {
        console.log(`[${slug}] PR body preview:\n${result.diff}\n`)
      }
    }

    if (dryRun) {
      console.log(`[${slug}] dry-run — skipping last_verified update, PR creation, and Supabase log.\n`)
      continue
    }

    // Always update last_verified
    await updateLastVerified(slug, result.lastVerified)

    let prUrl: string | null = null
    if (result.changesDetected && !result.error) {
      console.log(`[${slug}] Opening PR...`)
      prUrl = createPR(result)
    }

    await logToSupabase(result, prUrl)
    console.log(`[${slug}] Done.\n`)
  }

  if (hasUnhandledError) {
    console.error('One or more scrapers threw unhandled errors.')
    process.exit(1)
  }

  console.log('Monitor run complete.')
}
```

- [ ] **Step 2: Update the `createPR` body source**

In the `createPR` function, replace the old body construction block:

```ts
  const body = [
    `Automated content update detected by the monitoring bot on ${result.lastVerified}.`,
    '',
    '## Changes detected',
    '',
    result.diff ?? 'See diff for details.',
    '',
    '---',
    '_Opened by the OpenPropFirm monitoring bot. Review before merging._',
  ].join('\n')
```

with:

```ts
  // result.diff is already a fully rendered markdown body from diff.ts/renderPRBody
  const body = result.diff ?? 'No PR body produced by scraper — check runner logs.'
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --project tsconfig.scripts.json --noEmit`

Expected: exits 0.

- [ ] **Step 4: Run full test suite**

Run: `npm test`

Expected: all tests still pass.

- [ ] **Step 5: Local dry-run smoke test against Funded Next**

Run: `npx tsx --project tsconfig.scripts.json scripts/monitor/runner.ts --firm funded-next --dry-run`

Expected output includes a `[funded-next] PR body preview:` block containing either:
- `## No field-level drift detected` (if live site matches current snapshot), OR
- `| Field | From | To | Source |` table with at least one row (if drift detected).

No git operations. No Supabase writes.

- [ ] **Step 6: Commit**

```bash
git add scripts/monitor/runner.ts
git commit -m "$(cat <<'EOF'
feat(bot): runner uses structured diffs + adds --dry-run

The scrapers now produce a fully-rendered PR body (from
diff.ts/renderPRBody), so runner.ts just forwards it. New --dry-run
flag prints the rendered body without creating branches, opening
PRs, or writing to Supabase — lets local verification happen without
side effects.

Refs v1-f3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Final verification + PR

**Files:**
- None modified.

- [ ] **Step 1: Full test suite**

Run: `npm test`

Expected: all tests pass. Expected count: 37 (pre-existing) + 13 (diff.ts) + 4 (read-current.ts) + 9 (utils.ts) + 2×4 (scrapers) = **71 tests**. Exact number may vary ±2 — the point is all pass.

- [ ] **Step 2: Validator still green**

Run: `npx tsx scripts/validate-content.ts`

Expected: `Validation passed: 33 files checked`. (v1-f3 does NOT modify content.)

- [ ] **Step 3: Next.js build smoke test**

Run: `npm run build`

Expected: build succeeds; all firm routes SSG-generated as in v1-f2.

- [ ] **Step 4: Dry-run all 4 scrapers locally**

Run: `npx tsx --project tsconfig.scripts.json scripts/monitor/runner.ts --dry-run`

Expected: each firm prints either a `No field-level drift detected` body or a table. None crash. No git state changes after (run `git status` to verify).

- [ ] **Step 5: Review the full diff**

Run: `git diff main...HEAD --stat`

Expected: ~20 files touched (4 fixtures + 4 scraper tests + 4 scraper impls + diff.ts + diff.test.ts + read-current.ts + read-current.test.ts + utils.ts + utils.test.ts + types.ts + runner.ts). No accidental edits.

- [ ] **Step 6: Push and open PR**

```bash
git push -u origin v1-f3-bot-watched-fields
gh pr create --title "feat: v1-f3 bot upgrade — watched-fields diffing" --body "$(cat <<'EOF'
## Summary

- New `diff.ts` module: `diffSnapshots()` (field-level diff) + `renderPRBody()` (markdown generator).
- New `read-current.ts` helper: loads on-disk `DecisionSnapshot` + cheapest challenge price.
- All 4 per-firm scrapers rewritten to parse 6 watched fields into a `ScrapedSnapshot`.
- Runner now produces PRs with a structured before/after table and cites `source_url` per field.
- New `--dry-run` flag on `runner.ts` for local verification without side effects.
- No workflow/schema changes.

## Watched fields covered

| Field | Source |
|---|---|
| `max_drawdown.type` + `.value_usd` | firm rules/challenge page |
| `consistency_rule.enabled` + `.max_daily_pct` | firm rules page |
| `news_trading_allowed` | firm rules page |
| `overnight_holding_allowed` | firm rules page |
| `weekend_holding_allowed` | firm rules page |
| `payout_split_pct` | firm payout/challenge page |
| `cheapest_challenge_price_usd` | lowest `price_usd` across `challenges/*.md` |

## Test plan

- [x] `npm test` — ~71 tests pass (scraper + diff + read-current + utils + existing)
- [x] `npx tsx scripts/validate-content.ts` — content validator still green
- [x] `npm run build` — Next.js build succeeds
- [x] `npx tsx ... scripts/monitor/runner.ts --dry-run` — all 4 scrapers render without crashes, no git/Supabase side effects
- [ ] Manual review: spot-check each scraper's regex patterns against its fixture file

## Out of scope

- Changelog automation workflow (v1-f4)
- Health check + silent-failure watchdog (v1-f5)
- Cron schedule bump to daily 09:00 UTC (ships with v1-f5)
- Any DB schema changes to Supabase `bot_usage_log`

Refs v1-f3 in `docs/superpowers/plans/2026-04-22-v1-feature-map.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 7: Wait for CI**

Schema-validator workflow touches only content files — this PR doesn't change content, so `schema-check.yml` may not fire. Vercel preview build will still run.

Run: `gh pr checks <PR#> --watch`

Expected: Vercel preview deploy passes (build = `next build` which includes the prebuild validator).

- [ ] **Step 8: Merge (squash, delete branch)**

```bash
gh pr merge <PR#> --squash --delete-branch
```

- [ ] **Step 9: Update life-os `open-prop/index.md`**

Edit `/Users/lego/@Lego651/life-os/Projects/open-prop/index.md`:
- Flip v1-f3 row in the Feature map table from "**NEXT**" to "✅ Shipped <date>"
- Update Status section: add v1-f3 to shipped list
- Set v1-f4 (changelog automation) as the new NEXT
- Append plan file reference to the "Docs trail (in the code repo)" section

---

## Out of scope for v1-f3 (explicit non-goals)

- v1-f4 changelog automation workflow.
- v1-f5 health check / pinned Issue / silent-failure watchdog. The current bot.yml cron (Mondays 06:00 UTC) is unchanged — the daily bump arrives with v1-f5.
- Any DB schema changes.
- Any content edits. The bot's PRs are the mechanism for content change.
- "Clone to Obsidian" feature (dropped per CEO doc).
- UI components or firm pages (v1-f6 through v1-f10).

---

## Self-review

**Spec coverage (§3.3 Monitoring bot architecture, §4.4 Bot modules):**
- `diff.ts` new module — Task 2 + Task 3 ✓
- Per-firm scrapers upgraded to parse 6 watched fields — Tasks 6, 7, 8, 9 ✓
- Structured PR body generator — Task 3 ✓
- `runner.ts` upgraded — Task 10 ✓
- Health check (stays in v1-f5) — out of scope, called out ✓

**6 watched fields covered:**
1. `max_drawdown` (type + value_usd) — every scraper extracts ✓
2. `consistency_rule` — lucid-trading scraper extracts explicitly; others return null (no formal rule published), which diff.ts correctly skips ✓
3. `news_trading_allowed` — every scraper ✓
4. `overnight_holding_allowed` — every scraper (null for firms that don't publish) ✓
5. `payout_split_pct` — every scraper ✓
6. cheapest-tier challenge price — read-current.ts + every scraper ✓

**Placeholder scan:** No "TBD" / "implement later" / "similar to Task N" / "add appropriate error handling" in plan body. Each scraper task repeats its scraper code verbatim rather than referencing Task 6 ✓

**Type consistency:**
- `FieldDiff`, `ScrapedSnapshot`, `CurrentSnapshot`, `BotRunResult` defined once in Task 1, referenced by identical names in Tasks 2–10 ✓
- `diffSnapshots(current, scraped, fallbackSource)` signature identical in Task 2 definition and Tasks 6/7/8/9 call sites ✓
- `renderPRBody(slug, diffs, metadata)` signature identical in Task 3 definition and Tasks 6/7/8/9 call sites ✓
- `readCurrentSnapshot(slug)` returns `CurrentSnapshot` in Task 4 definition and Tasks 6/7/8/9 consumption ✓
- `parseDollarAmount` + `parsePercentage` defined in Task 5, optionally used by Tasks 6–9 (scrapers use inline regex for most fields; helpers available if a rewrite needs them) ✓
