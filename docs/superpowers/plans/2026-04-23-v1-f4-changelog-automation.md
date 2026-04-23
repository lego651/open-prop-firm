# v1-f4 — Changelog Automation Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a bot-labeled PR merges, a GitHub Actions workflow appends the detected drift to `decision.changelog[]` in the firm's frontmatter (deduping by `{date, field, from, to}`), commits back to `main`, and lets Vercel rebuild.

**Architecture:** A two-part job: (1) a typed, unit-tested TypeScript script `scripts/monitor/append-changelog.ts` that parses the merged PR body (same markdown table format emitted by `diff.ts:renderPRBody`), locates all firm files carrying `decision.changelog`, and prepends deduped entries via gray-matter round-trip; (2) a `append-changelog.yml` workflow gated on `pull_request.closed && merged && label:bot-update` that runs the script and commits as the bot identity. The script is split into three pure, side-effect-free modules + one thin CLI entry, with file-system and git side effects isolated at the edges.

**Tech Stack:** Node 20, TypeScript, vitest, gray-matter (already a dep), fast-glob (devDep), `tsx --project tsconfig.scripts.json`, GitHub Actions, `gh` CLI (preinstalled on `ubuntu-latest`).

---

## File structure

**New files:**
- `scripts/monitor/parse-pr-body.ts` — pure: PR body string → `{ firmSlug, lastVerified, entries: NewChangelogEntry[] }`
- `scripts/monitor/parse-pr-body.test.ts` — unit tests for the parser
- `scripts/monitor/append-changelog-core.ts` — pure: `(existing: ChangelogEntry[], incoming: NewChangelogEntry[], mergeDate: string) → ChangelogEntry[]` (prepend + dedupe)
- `scripts/monitor/append-changelog-core.test.ts` — unit tests
- `scripts/monitor/write-changelog.ts` — takes a file path + entries, round-trips frontmatter via gray-matter, returns new file contents
- `scripts/monitor/write-changelog.test.ts` — golden-file tests
- `scripts/monitor/append-changelog.ts` — CLI entry: takes `--pr-number` (required) and `--dry-run` (optional); orchestrates the three modules + side effects
- `.github/workflows/append-changelog.yml` — the workflow

**No existing files should be modified.** Keep v1-f4 isolated so review is clean.

---

## Contracts fixed across all tasks

```ts
// Defined in parse-pr-body.ts
export interface NewChangelogEntry {
  field: string       // e.g. "snapshot.news_trading_allowed"
  from: unknown       // JSON-parsed cell content
  to: unknown         // JSON-parsed cell content
  source_url: string  // extracted from [link](URL)
}

export interface ParsedPRBody {
  firmSlug: string           // e.g. "apex-funding"
  lastVerified: string       // "YYYY-MM-DD" from the PR body header
  entries: NewChangelogEntry[]  // empty when body says "No field-level drift detected"
}
```

```ts
// From scripts/monitor/schema.ts (EXISTING — do not modify)
export const ChangelogEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  field: z.string().min(1),
  from: z.unknown(),
  to: z.unknown(),
  source_url: z.string().url(),
})
export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>
```

**Dedupe key:** `${date}::${field}::${JSON.stringify(from)}::${JSON.stringify(to)}`. Two entries collide when all four match; `source_url` is NOT part of the key (so a corrected source URL on a re-run doesn't cause a duplicate).

**Date used for the entry:** the merge date (UTC, YYYY-MM-DD), passed in by the CLI from `$(date -u +%F)`. Rationale: the changelog records when the change landed on the site, not when the bot first detected it — that's what users compare a rule-change to.

---

## Task 1: Parse PR body (pure function)

**Files:**
- Create: `scripts/monitor/parse-pr-body.ts`
- Test:   `scripts/monitor/parse-pr-body.test.ts`

PR body format reference (emitted by `scripts/monitor/diff.ts:renderPRBody`):

```
Automated content update detected by the monitoring bot on 2026-04-23.

- **Firm:** `apex-funding`
- **Scraped URL:** https://example.com/evaluation
- **Last verified (new):** 2026-04-23

## Changes detected

| Field | From | To | Source |
|---|---|---|---|
| `snapshot.news_trading_allowed` | `true` | `false` | [link](https://example.com/rules) |
| `snapshot.payout_split_pct` | `90` | `95` | [link](https://example.com/rules) |

---
_Opened by the OpenPropFirm monitoring bot..._
```

Or (no drift):

```
Automated content update detected by the monitoring bot on 2026-04-23.

- **Firm:** `apex-funding`
...

## No field-level drift detected

The bot could not confirm any watched-field change...
```

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/monitor/parse-pr-body.test.ts
import { describe, it, expect } from 'vitest'
import { parsePRBody } from './parse-pr-body'

const BODY_WITH_CHANGES = [
  'Automated content update detected by the monitoring bot on 2026-04-23.',
  '',
  '- **Firm:** `apex-funding`',
  '- **Scraped URL:** https://example.com/eval',
  '- **Last verified (new):** 2026-04-23',
  '',
  '## Changes detected',
  '',
  '| Field | From | To | Source |',
  '|---|---|---|---|',
  '| `snapshot.news_trading_allowed` | `true` | `false` | [link](https://example.com/rules) |',
  '| `snapshot.payout_split_pct` | `90` | `95` | [link](https://example.com/payout) |',
  '',
  '---',
  '_Opened by the OpenPropFirm monitoring bot..._',
].join('\n')

const BODY_NO_DRIFT = [
  'Automated content update detected by the monitoring bot on 2026-04-23.',
  '',
  '- **Firm:** `apex-funding`',
  '- **Scraped URL:** https://example.com/eval',
  '- **Last verified (new):** 2026-04-23',
  '',
  '## No field-level drift detected',
  '',
  'The bot could not confirm any watched-field change. `last_verified` has been bumped in place.',
].join('\n')

describe('parsePRBody', () => {
  it('extracts firm slug, lastVerified, and two entries from a drift body', () => {
    const parsed = parsePRBody(BODY_WITH_CHANGES)
    expect(parsed.firmSlug).toBe('apex-funding')
    expect(parsed.lastVerified).toBe('2026-04-23')
    expect(parsed.entries).toHaveLength(2)
    expect(parsed.entries[0]).toEqual({
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: 'https://example.com/rules',
    })
    expect(parsed.entries[1]).toEqual({
      field: 'snapshot.payout_split_pct',
      from: 90,
      to: 95,
      source_url: 'https://example.com/payout',
    })
  })

  it('returns empty entries for a no-drift body', () => {
    const parsed = parsePRBody(BODY_NO_DRIFT)
    expect(parsed.firmSlug).toBe('apex-funding')
    expect(parsed.entries).toEqual([])
  })

  it('parses string-valued cells (max_drawdown.type)', () => {
    const body = [
      '- **Firm:** `funded-next`',
      '- **Last verified (new):** 2026-04-23',
      '## Changes detected',
      '| Field | From | To | Source |',
      '|---|---|---|---|',
      '| `snapshot.max_drawdown.type` | `"trailing_intraday"` | `"trailing_eod"` | [link](https://x.com/a) |',
    ].join('\n')
    const parsed = parsePRBody(body)
    expect(parsed.entries[0]).toEqual({
      field: 'snapshot.max_drawdown.type',
      from: 'trailing_intraday',
      to: 'trailing_eod',
      source_url: 'https://x.com/a',
    })
  })

  it('throws when firm slug line is missing', () => {
    const body = '## Changes detected\n| Field | From | To | Source |\n|---|---|---|---|\n'
    expect(() => parsePRBody(body)).toThrow(/firm slug/i)
  })

  it('throws when last_verified line is missing', () => {
    const body = '- **Firm:** `apex-funding`\n## No field-level drift detected\n'
    expect(() => parsePRBody(body)).toThrow(/last verified/i)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- parse-pr-body`
Expected: FAIL with "Cannot find module './parse-pr-body'"

- [ ] **Step 3: Write minimal implementation**

```ts
// scripts/monitor/parse-pr-body.ts
export interface NewChangelogEntry {
  field: string
  from: unknown
  to: unknown
  source_url: string
}

export interface ParsedPRBody {
  firmSlug: string
  lastVerified: string
  entries: NewChangelogEntry[]
}

const FIRM_RE = /^-\s*\*\*Firm:\*\*\s*`([^`]+)`/m
const LAST_VERIFIED_RE = /^-\s*\*\*Last verified \(new\):\*\*\s*(\d{4}-\d{2}-\d{2})/m
const TABLE_ROW_RE = /^\|\s*`([^`]+)`\s*\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|\s*\[link\]\(([^)]+)\)\s*\|$/
const NO_DRIFT_RE = /##\s+No field-level drift detected/

export function parsePRBody(body: string): ParsedPRBody {
  const firmMatch = body.match(FIRM_RE)
  if (!firmMatch) throw new Error('parsePRBody: could not locate firm slug line')
  const firmSlug = firmMatch[1]

  const lvMatch = body.match(LAST_VERIFIED_RE)
  if (!lvMatch) throw new Error('parsePRBody: could not locate last verified (new) line')
  const lastVerified = lvMatch[1]

  if (NO_DRIFT_RE.test(body)) {
    return { firmSlug, lastVerified, entries: [] }
  }

  const entries: NewChangelogEntry[] = []
  for (const line of body.split('\n')) {
    const m = line.match(TABLE_ROW_RE)
    if (!m) continue
    const [, field, fromRaw, toRaw, source_url] = m
    entries.push({
      field,
      from: parseCell(fromRaw),
      to: parseCell(toRaw),
      source_url,
    })
  }
  return { firmSlug, lastVerified, entries }
}

function parseCell(raw: string): unknown {
  // Cells are JSON.stringify output wrapped in backticks in renderPRBody.
  // JSON.parse handles booleans, numbers, quoted strings. null is possible too.
  try {
    return JSON.parse(raw)
  } catch {
    // Fall back to raw string if not valid JSON (defensive).
    return raw
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- parse-pr-body`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/parse-pr-body.ts scripts/monitor/parse-pr-body.test.ts
git commit -m "[s1] v1-f4: parse bot PR body into structured changelog entries"
```

---

## Task 2: Changelog append + dedupe core (pure function)

**Files:**
- Create: `scripts/monitor/append-changelog-core.ts`
- Test:   `scripts/monitor/append-changelog-core.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/monitor/append-changelog-core.test.ts
import { describe, it, expect } from 'vitest'
import { mergeEntries } from './append-changelog-core'
import type { ChangelogEntry } from './schema'
import type { NewChangelogEntry } from './parse-pr-body'

const MERGE_DATE = '2026-04-23'

const existingEmpty: ChangelogEntry[] = []

const existingOne: ChangelogEntry[] = [
  {
    date: '2026-04-22',
    field: 'snapshot.consistency_rule.enabled',
    from: false,
    to: true,
    source_url: 'https://example.com/old',
  },
]

describe('mergeEntries', () => {
  it('prepends new entries with the merge date onto empty changelog', () => {
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
      { field: 'snapshot.payout_split_pct', from: 90, to: 95, source_url: 'https://x/b' },
    ]
    const out = mergeEntries(existingEmpty, incoming, MERGE_DATE)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({
      date: MERGE_DATE,
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: 'https://x/a',
    })
    expect(out[1].field).toBe('snapshot.payout_split_pct')
  })

  it('preserves existing entries and puts new ones on top (descending date order)', () => {
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
    ]
    const out = mergeEntries(existingOne, incoming, MERGE_DATE)
    expect(out).toHaveLength(2)
    expect(out[0].date).toBe(MERGE_DATE)
    expect(out[0].field).toBe('snapshot.news_trading_allowed')
    expect(out[1]).toEqual(existingOne[0])  // untouched
  })

  it('dedupes by {date, field, from, to} — source_url differences do not cause duplicates', () => {
    const existing: ChangelogEntry[] = [
      {
        date: MERGE_DATE,
        field: 'snapshot.news_trading_allowed',
        from: true,
        to: false,
        source_url: 'https://old.example/a',
      },
    ]
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://new.example/a' },
    ]
    const out = mergeEntries(existing, incoming, MERGE_DATE)
    expect(out).toHaveLength(1)  // duplicate skipped
    expect(out[0].source_url).toBe('https://old.example/a')  // original kept
  })

  it('does NOT dedupe when field differs', () => {
    const existing: ChangelogEntry[] = [
      { date: MERGE_DATE, field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
    ]
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.payout_split_pct', from: 90, to: 95, source_url: 'https://x/b' },
    ]
    const out = mergeEntries(existing, incoming, MERGE_DATE)
    expect(out).toHaveLength(2)
  })

  it('handles mixed new + duplicate incoming entries in one call', () => {
    const existing: ChangelogEntry[] = [
      { date: MERGE_DATE, field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
    ]
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' }, // dup
      { field: 'snapshot.payout_split_pct', from: 90, to: 95, source_url: 'https://x/b' }, // new
    ]
    const out = mergeEntries(existing, incoming, MERGE_DATE)
    expect(out).toHaveLength(2)
    expect(out[0].field).toBe('snapshot.payout_split_pct')
    expect(out[1].field).toBe('snapshot.news_trading_allowed')
  })

  it('returns a new array (does not mutate inputs)', () => {
    const existing = [...existingOne]
    const before = JSON.stringify(existing)
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
    ]
    mergeEntries(existing, incoming, MERGE_DATE)
    expect(JSON.stringify(existing)).toBe(before)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- append-changelog-core`
Expected: FAIL with "Cannot find module './append-changelog-core'"

- [ ] **Step 3: Write the implementation**

```ts
// scripts/monitor/append-changelog-core.ts
import type { ChangelogEntry } from './schema'
import type { NewChangelogEntry } from './parse-pr-body'

function dedupeKey(e: { date: string; field: string; from: unknown; to: unknown }): string {
  return `${e.date}::${e.field}::${JSON.stringify(e.from)}::${JSON.stringify(e.to)}`
}

export function mergeEntries(
  existing: ChangelogEntry[],
  incoming: NewChangelogEntry[],
  mergeDate: string,
): ChangelogEntry[] {
  const existingKeys = new Set(existing.map(dedupeKey))
  const added: ChangelogEntry[] = []
  for (const entry of incoming) {
    const candidate: ChangelogEntry = {
      date: mergeDate,
      field: entry.field,
      from: entry.from,
      to: entry.to,
      source_url: entry.source_url,
    }
    if (existingKeys.has(dedupeKey(candidate))) continue
    existingKeys.add(dedupeKey(candidate))
    added.push(candidate)
  }
  return [...added, ...existing]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- append-changelog-core`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/append-changelog-core.ts scripts/monitor/append-changelog-core.test.ts
git commit -m "[s1] v1-f4: changelog merge + dedupe core logic"
```

---

## Task 3: Frontmatter writer (gray-matter round-trip)

**Files:**
- Create: `scripts/monitor/write-changelog.ts`
- Test:   `scripts/monitor/write-changelog.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/monitor/write-changelog.test.ts
import { describe, it, expect } from 'vitest'
import { applyChangelogToFileContent } from './write-changelog'
import type { NewChangelogEntry } from './parse-pr-body'

const MERGE_DATE = '2026-04-23'

const FILE_WITH_EMPTY_CHANGELOG = `---
title: Apex
firm: Apex Trader Funding
decision:
  snapshot:
    news_trading_allowed: true
    payout_split_pct: 90
    best_for: 'intraday scalping'
  kill_you_first:
    - title: 'a'
      detail: 'b'
      source_url: 'https://x/a'
  fit_score:
    ny_scalping: 4
    swing_trading: 1
    news_trading: 4
    beginner_friendly: 2
    scalable: 3
  pre_trade_checklist:
    - id: one
      label: 'one'
  changelog: []
  affiliate:
    url: null
    utm: 'openprop'
---

# Body
Prose body intact.
`

describe('applyChangelogToFileContent', () => {
  it('prepends new entries onto an empty changelog', () => {
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
    ]
    const out = applyChangelogToFileContent(FILE_WITH_EMPTY_CHANGELOG, incoming, MERGE_DATE)
    // The full frontmatter must still parse and contain the new entry
    expect(out).toContain('field: snapshot.news_trading_allowed')
    expect(out).toContain(`date: '${MERGE_DATE}'`) // gray-matter/js-yaml emits date with quotes
    expect(out).toContain('from: true')
    expect(out).toContain('to: false')
    expect(out).toContain('# Body')
    expect(out).toContain('Prose body intact.')
  })

  it('returns file unchanged when there are no incoming entries', () => {
    const out = applyChangelogToFileContent(FILE_WITH_EMPTY_CHANGELOG, [], MERGE_DATE)
    expect(out).toBe(FILE_WITH_EMPTY_CHANGELOG)
  })

  it('throws if the file has no decision block', () => {
    const noDecision = `---\ntitle: X\n---\n\nBody\n`
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
    ]
    expect(() => applyChangelogToFileContent(noDecision, incoming, MERGE_DATE)).toThrow(/decision block/i)
  })

  it('skips duplicate entries and no-ops when all duplicates', () => {
    const withExisting = FILE_WITH_EMPTY_CHANGELOG.replace(
      'changelog: []',
      `changelog:
    - date: '${MERGE_DATE}'
      field: snapshot.news_trading_allowed
      from: true
      to: false
      source_url: 'https://x/a'`,
    )
    const incoming: NewChangelogEntry[] = [
      { field: 'snapshot.news_trading_allowed', from: true, to: false, source_url: 'https://x/a' },
    ]
    const out = applyChangelogToFileContent(withExisting, incoming, MERGE_DATE)
    // No new entry should be added — content should round-trip without duplication
    const matches = (out.match(/field: snapshot\.news_trading_allowed/g) || []).length
    expect(matches).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- write-changelog`
Expected: FAIL with "Cannot find module './write-changelog'"

- [ ] **Step 3: Write the implementation**

```ts
// scripts/monitor/write-changelog.ts
import matter from 'gray-matter'
import type { ChangelogEntry } from './schema'
import type { NewChangelogEntry } from './parse-pr-body'
import { mergeEntries } from './append-changelog-core'

/**
 * Apply changelog additions to a single markdown file's string contents.
 *
 * Round-trips the frontmatter via gray-matter, so unrelated YAML keys and the
 * body content are preserved. Prepends new entries onto decision.changelog and
 * dedupes by {date, field, from, to}.
 *
 * Returns the file as a new string. Returns the input unchanged when there are
 * no incoming entries.
 */
export function applyChangelogToFileContent(
  fileContent: string,
  incoming: NewChangelogEntry[],
  mergeDate: string,
): string {
  if (incoming.length === 0) return fileContent

  const parsed = matter(fileContent)
  const data = parsed.data as Record<string, unknown>
  const decision = data.decision as { changelog?: ChangelogEntry[] } | undefined
  if (!decision) {
    throw new Error('applyChangelogToFileContent: file has no decision block')
  }

  const existing: ChangelogEntry[] = Array.isArray(decision.changelog) ? decision.changelog : []
  const merged = mergeEntries(existing, incoming, mergeDate)
  decision.changelog = merged

  // gray-matter.stringify preserves the body and emits the frontmatter block.
  return matter.stringify(parsed.content, data)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- write-changelog`
Expected: 4 passed.

If the first test's `date: '${MERGE_DATE}'` assertion fails because js-yaml emits without quotes, relax to `expect(out).toMatch(/date:\s*['"]?2026-04-23['"]?/)` — the key requirement is parseability, not exact quoting.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/write-changelog.ts scripts/monitor/write-changelog.test.ts
git commit -m "[s1] v1-f4: frontmatter writer for changelog entries"
```

---

## Task 4: CLI entry point

**Files:**
- Create: `scripts/monitor/append-changelog.ts`

The CLI:
1. Parses `--pr-number <N>` (required), `--dry-run` (optional), `--merge-date <YYYY-MM-DD>` (optional, defaults to UTC today).
2. Fetches the PR body via `gh pr view <N> --json body -q .body`.
3. Parses the body with `parsePRBody`.
4. Resolves the firm's content directory and glob-walks for `.md` files containing `decision.changelog` frontmatter.
5. Applies `applyChangelogToFileContent` to each matching file, writing if `!dryRun`.
6. Commits + pushes (skipped if `dryRun` or no files changed).

- [ ] **Step 1: Write the implementation**

```ts
// scripts/monitor/append-changelog.ts
/**
 * Append changelog entries to a firm's frontmatter after a bot-labeled PR merges.
 *
 * Invoked from .github/workflows/append-changelog.yml with:
 *   tsx --project tsconfig.scripts.json scripts/monitor/append-changelog.ts \
 *     --pr-number ${{ github.event.pull_request.number }}
 *
 * Side effects (skipped on --dry-run):
 *   - Rewrites matching data/firms/<category>/<slug>/**\/*.md files
 *   - git add + git commit + git push to main
 */

import { readFile, writeFile } from 'fs/promises'
import { execFileSync } from 'child_process'
import path from 'path'
import { parsePRBody } from './parse-pr-body'
import { applyChangelogToFileContent } from './write-changelog'

interface Args {
  prNumber: string
  dryRun: boolean
  mergeDate: string
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> & { dryRun: boolean } = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--pr-number') out.prNumber = argv[++i]
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--merge-date') out.mergeDate = argv[++i]
  }
  if (!out.prNumber) throw new Error('--pr-number is required')
  if (!out.mergeDate) {
    out.mergeDate = new Date().toISOString().slice(0, 10) // UTC YYYY-MM-DD
  }
  return out as Args
}

function firmDir(slug: string): string {
  const cfdSlugs = ['funded-next', 'funding-pips']
  const category = cfdSlugs.includes(slug) ? 'cfd' : 'futures'
  return path.join(process.cwd(), 'data', 'firms', category, slug)
}

async function main() {
  const { prNumber, dryRun, mergeDate } = parseArgs(process.argv.slice(2))

  console.log(`[append-changelog] PR #${prNumber}, merge date ${mergeDate}${dryRun ? ', dry-run' : ''}`)

  const body = execFileSync('gh', ['pr', 'view', prNumber, '--json', 'body', '-q', '.body'], {
    encoding: 'utf-8',
  })
  const parsed = parsePRBody(body)

  if (parsed.entries.length === 0) {
    console.log(`[append-changelog] PR body reported no drift for ${parsed.firmSlug} — nothing to append.`)
    return
  }

  const dir = firmDir(parsed.firmSlug)
  const fg = (await import('fast-glob')).default
  const files = await fg('**/*.md', { cwd: dir, absolute: true })

  const updated: string[] = []
  for (const file of files) {
    const before = await readFile(file, 'utf-8')
    if (!/^\s*changelog:/m.test(before)) continue // no decision.changelog in this file
    const after = applyChangelogToFileContent(before, parsed.entries, mergeDate)
    if (after === before) continue
    if (!dryRun) await writeFile(file, after, 'utf-8')
    updated.push(file)
    console.log(`[append-changelog] ${dryRun ? 'would update' : 'updated'} ${path.relative(process.cwd(), file)}`)
  }

  if (updated.length === 0) {
    console.log('[append-changelog] no files matched — nothing to commit.')
    return
  }

  if (dryRun) {
    console.log(`[append-changelog] dry-run: ${updated.length} file(s) would be changed. Skipping git push.`)
    return
  }

  const msg = `[bot] append changelog for ${parsed.firmSlug} (PR #${prNumber})`
  execFileSync('git', ['add', 'data/firms'], { stdio: 'inherit' })
  execFileSync('git', ['commit', '-m', msg], { stdio: 'inherit' })

  // Defensive: pull --rebase in case main advanced between merge and workflow run.
  try {
    execFileSync('git', ['pull', '--rebase', 'origin', 'main'], { stdio: 'inherit' })
  } catch (err) {
    console.error('[append-changelog] rebase failed; aborting push.')
    throw err
  }
  execFileSync('git', ['push', 'origin', 'main'], { stdio: 'inherit' })
  console.log('[append-changelog] committed and pushed to main.')
}

main().catch((err) => {
  console.error('[append-changelog] failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Smoke-test locally via dry-run**

Manual prerequisite: a merged bot PR exists on GitHub (e.g. #36). Run:

```bash
npx tsx --project tsconfig.scripts.json scripts/monitor/append-changelog.ts --pr-number 36 --dry-run --merge-date 2026-04-23
```

Expected: the script prints `[append-changelog] would update data/firms/.../index.md` (or `nothing to append` if #36 had no drift). No files actually modified. No git commands run.

- [ ] **Step 3: Verify no files were touched**

Run: `git status --short`
Expected: clean tree.

- [ ] **Step 4: Commit**

```bash
git add scripts/monitor/append-changelog.ts
git commit -m "[s1] v1-f4: CLI entry point for append-changelog"
```

---

## Task 5: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/append-changelog.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/append-changelog.yml
name: Append Changelog

on:
  pull_request:
    types: [closed]

jobs:
  append-changelog:
    # Only run when a bot-labeled PR is actually merged (not just closed).
    if: github.event.pull_request.merged == true && contains(github.event.pull_request.labels.*.name, 'bot-update')
    runs-on: ubuntu-latest

    permissions:
      contents: write       # commit + push to main
      pull-requests: read   # read the merged PR body

    steps:
      - name: Checkout main
        uses: actions/checkout@v4
        with:
          ref: main
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Configure git
        run: |
          git config user.name  "OpenPropFirm Bot"
          git config user.email "bot@openpropfirm.com"

      - name: Append changelog
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx tsx --project tsconfig.scripts.json scripts/monitor/append-changelog.ts \
            --pr-number ${{ github.event.pull_request.number }}
```

- [ ] **Step 2: Validate the YAML syntax**

Run: `npx -y @github/actionlint .github/workflows/append-changelog.yml || true`
Expected: no errors. If `actionlint` is not installed, skip — CI will catch syntax errors on push.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/append-changelog.yml
git commit -m "[s1] v1-f4: append-changelog workflow on bot PR merge"
```

---

## Task 6: Full test + type check + lint

- [ ] **Step 1: Type check**

Run: `pnpm tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Full test suite**

Run: `pnpm test`
Expected: all tests pass, including the 15 new tests added in Tasks 1–3 (5 + 6 + 4).

- [ ] **Step 4: Commit any formatting fixes (if the linter auto-fixed)**

```bash
git status --short
# If clean, skip the commit below.
git add -u
git commit -m "[s1] v1-f4: lint auto-fixes"
```

---

## Task 7: Open PR

- [ ] **Step 1: Push the feature branch**

```bash
git checkout -b feat/v1-f4-changelog-automation
git push -u origin feat/v1-f4-changelog-automation
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "feat: v1-f4 changelog automation — append-changelog workflow" --body "$(cat <<'EOF'
## Summary
- On a bot-labeled PR merge, a new \`append-changelog.yml\` workflow parses the merged PR body, prepends deduped entries onto \`decision.changelog[]\`, and commits back to main.
- Three pure, unit-tested modules: PR-body parser, merge + dedupe core, frontmatter writer. One thin CLI entry.
- Dedupe key: \`{date, field, from, to}\`. \`source_url\` differences do not cause duplicates.
- Spec §5.2 critical invariant satisfied: Jason never has to remember to add a changelog entry.

## Files added
- \`scripts/monitor/parse-pr-body.ts\` + test
- \`scripts/monitor/append-changelog-core.ts\` + test
- \`scripts/monitor/write-changelog.ts\` + test
- \`scripts/monitor/append-changelog.ts\` (CLI entry)
- \`.github/workflows/append-changelog.yml\`

## Test plan
- [x] All new unit tests pass (\`pnpm test\`)
- [x] Type check clean (\`pnpm tsc --noEmit\`)
- [x] Lint clean (\`pnpm lint\`)
- [x] Local dry-run of append-changelog.ts against PR #36 reports expected behavior
- [ ] After merge: the next real bot PR that detects drift → changelog entry appears in \`decision.changelog[]\` on main within ~1 min of merge
- [ ] Re-run on the same PR body is a no-op (dedupe works)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI, then request review**

CI should run `schema-check.yml` if any `data/firms/**/index.md` changed (they shouldn't — f4 only adds scripts + workflow). Confirm green.

---

## Self-review (performed by plan author)

**1. Spec coverage (§5.2, §6 duplicate row):**
- [x] Workflow fires on `pull_request.closed + merged + label:bot-update` — §5.2 step 7
- [x] Reads PR diff (body), appends to `decision.changelog[]` — §5.2 step 7
- [x] Commits back to main → Vercel rebuild — §5.2 step 8
- [x] Dedupe by `{date, field, from, to}` — §6 risk row "Duplicate changelog entry on bot re-run"
- [x] Jason never manually appends — §5.2 critical invariant
- [x] Descending date order preserved — §8 invariant ("Changelog in descending date order"), satisfied by prepending

**2. Placeholder scan:** None. Every code block is concrete, every command has expected output, every file has a path.

**3. Type consistency:**
- `NewChangelogEntry` defined in Task 1, imported in Tasks 2 & 3. ✓
- `ChangelogEntry` imported from existing `./schema`. ✓
- `mergeEntries(existing, incoming, mergeDate)` signature matches across Tasks 2, 3, 4. ✓
- `applyChangelogToFileContent(content, entries, mergeDate)` signature consistent. ✓
- `parsePRBody(body)` return shape consistent with CLI usage. ✓

**4. Dependencies:** `gray-matter`, `fast-glob` already installed. No new npm deps. `gh` CLI preinstalled on `ubuntu-latest`. No new secrets.

**5. Scope:** Adds 5 new files + 1 workflow. Modifies none. v1-f3 PR artifacts (diff.ts body format) are consumed as an API, not modified. Tree stays clean for v1-f5.
