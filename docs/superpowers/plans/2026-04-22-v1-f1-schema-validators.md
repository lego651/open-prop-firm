# v1-f1 — Schema + Validators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define Zod schemas for the new `decision` frontmatter block and wire them into build-time + PR-time validation, so every subsequent v1 feature can assume the contract is enforced.

**Architecture:** Single Zod module at `scripts/monitor/schema.ts` becomes the source of truth — it'll be imported by the bot (v1-f3), the build-time validator (`scripts/validate-content.ts`), and eventually by the page renderer. Validation is **opt-in per file during v1-f1**: a firm file with no `decision` block passes (lets v1-f2 migrate gradually); a firm file with a malformed `decision` block fails. By end of v1-f2, every launch firm has a `decision` block.

**Tech Stack:** TypeScript 5, Zod 3.x (new dep), Vitest 2.x (new dev-dep), tsx 4.x (existing), Next.js 16.

**Spec reference:** `docs/superpowers/specs/2026-04-22-open-prop-v1-scope-design.md` §3.2, §4.5.

---

## File Structure

**Files to create:**
- `scripts/monitor/schema.ts` — Zod schemas for `Decision` block and sub-types
- `scripts/monitor/schema.test.ts` — Vitest tests for every schema
- `vitest.config.ts` — Vitest config (root-level)
- `.github/workflows/schema-check.yml` — GitHub Actions workflow: run `npm run prebuild` on any PR touching `data/firms/**/index.md`

**Files to modify:**
- `package.json` — add `zod` to deps; `vitest`, `@vitest/ui` to dev deps; add `test` script
- `scripts/validate-content.ts` — add `validateDecisionBlock()` helper; call it from `validateFile()` when `fm.decision` exists

**Files NOT touched in this feature:**
- Any firm `index.md` (that's v1-f2)
- Any component file (that's v1-f6 onward)
- Bot scrapers (that's v1-f3)

---

## Task 1: Install deps + set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install zod + vitest**

Run:
```bash
npm install zod
npm install -D vitest @vitest/ui
```

Expected: `package.json` gains `zod` under `dependencies`, `vitest` + `@vitest/ui` under `devDependencies`. `package-lock.json` updates.

- [ ] **Step 2: Add `test` script to package.json**

Modify `package.json` scripts block. Add between `"format:check"` and `"monitor"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Create `vitest.config.ts` at repo root**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['scripts/**/*.ts', 'src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
    },
  },
})
```

- [ ] **Step 4: Sanity check — run tests (no tests yet = pass with "no test files")**

Run: `npm test`

Expected: Vitest starts and reports `No test files found, exiting with code 0` (or similar). Exit code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "feat(v1-f1): add zod + vitest for schema work"
```

---

## Task 2: ChangelogEntry + ChecklistItem schemas

**Files:**
- Create: `scripts/monitor/schema.ts`
- Create: `scripts/monitor/schema.test.ts`

- [ ] **Step 1: Write failing tests for ChangelogEntry + ChecklistItem**

Create `scripts/monitor/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ChangelogEntrySchema, ChecklistItemSchema } from './schema'

describe('ChangelogEntrySchema', () => {
  it('accepts a valid entry', () => {
    const input = {
      date: '2026-04-22',
      field: 'snapshot.consistency_rule.enabled',
      from: false,
      to: true,
      source_url: 'https://apextraderfunding.com/rules',
    }
    expect(() => ChangelogEntrySchema.parse(input)).not.toThrow()
  })

  it('rejects a missing source_url', () => {
    const input = {
      date: '2026-04-22',
      field: 'snapshot.consistency_rule.enabled',
      from: false,
      to: true,
    }
    expect(() => ChangelogEntrySchema.parse(input)).toThrow()
  })

  it('rejects a non-URL source_url', () => {
    const input = {
      date: '2026-04-22',
      field: 'x',
      from: false,
      to: true,
      source_url: 'not-a-url',
    }
    expect(() => ChangelogEntrySchema.parse(input)).toThrow()
  })

  it('rejects a non-ISO-shape date string', () => {
    const input = {
      date: '22 April 2026',
      field: 'x',
      from: false,
      to: true,
      source_url: 'https://example.com',
    }
    expect(() => ChangelogEntrySchema.parse(input)).toThrow()
  })
})

describe('ChecklistItemSchema', () => {
  it('accepts a valid item', () => {
    const input = {
      id: 'news_clear',
      label: 'No major news in next 30 minutes',
    }
    expect(() => ChecklistItemSchema.parse(input)).not.toThrow()
  })

  it('rejects id with spaces', () => {
    const input = { id: 'news clear', label: 'x' }
    expect(() => ChecklistItemSchema.parse(input)).toThrow()
  })

  it('rejects empty label', () => {
    const input = { id: 'news_clear', label: '' }
    expect(() => ChecklistItemSchema.parse(input)).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- schema`

Expected: FAIL. Error: `Cannot find module './schema'` or similar.

- [ ] **Step 3: Implement minimal schemas**

Create `scripts/monitor/schema.ts`:

```ts
import { z } from 'zod'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const ChangelogEntrySchema = z.object({
  date: z.string().regex(ISO_DATE_RE, 'date must be YYYY-MM-DD'),
  field: z.string().min(1),
  from: z.unknown(),
  to: z.unknown(),
  source_url: z.string().url(),
})
export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>

export const ChecklistItemSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'id must be snake_case'),
  label: z.string().min(1),
})
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- schema`

Expected: PASS. 7 tests passing (4 for ChangelogEntry, 3 for ChecklistItem).

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/schema.ts scripts/monitor/schema.test.ts
git commit -m "feat(v1-f1): add ChangelogEntry + ChecklistItem schemas"
```

---

## Task 3: FitScore + KillYouFirstEntry schemas

**Files:**
- Modify: `scripts/monitor/schema.ts`
- Modify: `scripts/monitor/schema.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `scripts/monitor/schema.test.ts`:

```ts
import { FitScoreSchema, KillYouFirstEntrySchema } from './schema'

describe('FitScoreSchema', () => {
  it('accepts a valid score set', () => {
    const input = {
      ny_scalping: 4,
      swing_trading: 1,
      news_trading: 0,
      beginner_friendly: 2,
      scalable: 2,
    }
    expect(() => FitScoreSchema.parse(input)).not.toThrow()
  })

  it('rejects a star value > 5', () => {
    const input = {
      ny_scalping: 6,
      swing_trading: 1,
      news_trading: 0,
      beginner_friendly: 2,
      scalable: 2,
    }
    expect(() => FitScoreSchema.parse(input)).toThrow()
  })

  it('rejects a negative star value', () => {
    const input = {
      ny_scalping: -1,
      swing_trading: 1,
      news_trading: 0,
      beginner_friendly: 2,
      scalable: 2,
    }
    expect(() => FitScoreSchema.parse(input)).toThrow()
  })

  it('rejects missing keys', () => {
    const input = { ny_scalping: 4 }
    expect(() => FitScoreSchema.parse(input)).toThrow()
  })
})

describe('KillYouFirstEntrySchema', () => {
  it('accepts a valid entry', () => {
    const input = {
      title: 'Trailing DD follows equity',
      detail: 'Profits cannot be locked early',
      source_url: 'https://apextraderfunding.com/rules',
    }
    expect(() => KillYouFirstEntrySchema.parse(input)).not.toThrow()
  })

  it('rejects an empty title', () => {
    const input = {
      title: '',
      detail: 'x',
      source_url: 'https://example.com',
    }
    expect(() => KillYouFirstEntrySchema.parse(input)).toThrow()
  })

  it('rejects missing detail', () => {
    const input = {
      title: 'x',
      source_url: 'https://example.com',
    }
    expect(() => KillYouFirstEntrySchema.parse(input)).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `npm test -- schema`

Expected: FAIL for FitScoreSchema and KillYouFirstEntrySchema tests. Previous tests still PASS.

- [ ] **Step 3: Append schemas**

Append to `scripts/monitor/schema.ts`:

```ts
const Stars = z.number().int().min(0).max(5)

export const FitScoreSchema = z.object({
  ny_scalping: Stars,
  swing_trading: Stars,
  news_trading: Stars,
  beginner_friendly: Stars,
  scalable: Stars,
})
export type FitScore = z.infer<typeof FitScoreSchema>

export const KillYouFirstEntrySchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  source_url: z.string().url(),
})
export type KillYouFirstEntry = z.infer<typeof KillYouFirstEntrySchema>
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- schema`

Expected: PASS. 14 tests total.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/schema.ts scripts/monitor/schema.test.ts
git commit -m "feat(v1-f1): add FitScore + KillYouFirstEntry schemas"
```

---

## Task 4: DecisionSnapshot schema (the beefiest)

**Files:**
- Modify: `scripts/monitor/schema.ts`
- Modify: `scripts/monitor/schema.test.ts`

- [ ] **Step 1: Append failing tests**

Append:

```ts
import { DecisionSnapshotSchema } from './schema'

describe('DecisionSnapshotSchema', () => {
  const validSnapshot = {
    news_trading_allowed: false,
    overnight_holding_allowed: false,
    weekend_holding_allowed: false,
    max_drawdown: {
      type: 'trailing_intraday',
      value_usd: 2500,
      source_url: 'https://apextraderfunding.com/rules#dd',
    },
    consistency_rule: {
      enabled: true,
      max_daily_pct: 30,
      source_url: 'https://apextraderfunding.com/payouts',
    },
    payout_split_pct: 80,
    best_for: 'Intraday scalpers',
  }

  it('accepts a complete valid snapshot', () => {
    expect(() => DecisionSnapshotSchema.parse(validSnapshot)).not.toThrow()
  })

  it('accepts max_drawdown with type=trailing_eod', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, type: 'trailing_eod' },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).not.toThrow()
  })

  it('accepts max_drawdown with type=static', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, type: 'static' },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).not.toThrow()
  })

  it('rejects max_drawdown with unknown type', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, type: 'percentage' },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects payout_split_pct > 100', () => {
    const input = { ...validSnapshot, payout_split_pct: 110 }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects payout_split_pct < 0', () => {
    const input = { ...validSnapshot, payout_split_pct: -5 }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects max_drawdown with missing source_url', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { type: 'trailing_intraday', value_usd: 2500 },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects negative max_drawdown.value_usd', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, value_usd: -100 },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects consistency_rule enabled=true without max_daily_pct', () => {
    const input = {
      ...validSnapshot,
      consistency_rule: {
        enabled: true,
        source_url: 'https://example.com',
      },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('accepts consistency_rule enabled=false without max_daily_pct', () => {
    const input = {
      ...validSnapshot,
      consistency_rule: {
        enabled: false,
        source_url: 'https://example.com',
      },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- schema`

Expected: FAIL for DecisionSnapshotSchema tests. All prior tests still PASS.

- [ ] **Step 3: Append schemas**

Append to `scripts/monitor/schema.ts`:

```ts
const MaxDrawdownSchema = z.object({
  type: z.enum(['trailing_intraday', 'trailing_eod', 'static']),
  value_usd: z.number().int().nonnegative(),
  source_url: z.string().url(),
})

const ConsistencyRuleSchema = z
  .object({
    enabled: z.boolean(),
    max_daily_pct: z.number().int().min(0).max(100).optional(),
    source_url: z.string().url(),
  })
  .refine(
    (v) => !v.enabled || typeof v.max_daily_pct === 'number',
    {
      message: 'max_daily_pct is required when enabled=true',
      path: ['max_daily_pct'],
    },
  )

export const DecisionSnapshotSchema = z.object({
  news_trading_allowed: z.boolean(),
  overnight_holding_allowed: z.boolean(),
  weekend_holding_allowed: z.boolean(),
  max_drawdown: MaxDrawdownSchema,
  consistency_rule: ConsistencyRuleSchema,
  payout_split_pct: z.number().int().min(0).max(100),
  best_for: z.string().min(1),
})
export type DecisionSnapshot = z.infer<typeof DecisionSnapshotSchema>
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- schema`

Expected: PASS. 24 tests total.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/schema.ts scripts/monitor/schema.test.ts
git commit -m "feat(v1-f1): add DecisionSnapshot schema with DD type enum + consistency refinement"
```

---

## Task 5: Affiliate schema

**Files:**
- Modify: `scripts/monitor/schema.ts`
- Modify: `scripts/monitor/schema.test.ts`

- [ ] **Step 1: Append failing tests**

Append:

```ts
import { AffiliateSchema } from './schema'

describe('AffiliateSchema', () => {
  it('accepts null url with utm set', () => {
    const input = { url: null, utm: 'openprop' }
    expect(() => AffiliateSchema.parse(input)).not.toThrow()
  })

  it('accepts a valid url with utm', () => {
    const input = {
      url: 'https://apextraderfunding.com?aff=xyz',
      utm: 'openprop',
    }
    expect(() => AffiliateSchema.parse(input)).not.toThrow()
  })

  it('rejects non-URL url when not null', () => {
    const input = { url: 'not-a-url', utm: 'openprop' }
    expect(() => AffiliateSchema.parse(input)).toThrow()
  })

  it('rejects empty utm', () => {
    const input = { url: null, utm: '' }
    expect(() => AffiliateSchema.parse(input)).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- schema`

Expected: FAIL for AffiliateSchema tests.

- [ ] **Step 3: Append schema**

Append to `scripts/monitor/schema.ts`:

```ts
export const AffiliateSchema = z.object({
  url: z.string().url().nullable(),
  utm: z.string().min(1),
})
export type Affiliate = z.infer<typeof AffiliateSchema>
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- schema`

Expected: PASS. 28 tests total.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/schema.ts scripts/monitor/schema.test.ts
git commit -m "feat(v1-f1): add Affiliate schema"
```

---

## Task 6: Top-level Decision schema (composition)

**Files:**
- Modify: `scripts/monitor/schema.ts`
- Modify: `scripts/monitor/schema.test.ts`

- [ ] **Step 1: Append failing tests**

Append:

```ts
import { DecisionSchema } from './schema'

describe('DecisionSchema (top-level composition)', () => {
  const snapshot = {
    news_trading_allowed: false,
    overnight_holding_allowed: false,
    weekend_holding_allowed: false,
    max_drawdown: {
      type: 'trailing_intraday',
      value_usd: 2500,
      source_url: 'https://apextraderfunding.com/rules#dd',
    },
    consistency_rule: {
      enabled: true,
      max_daily_pct: 30,
      source_url: 'https://apextraderfunding.com/payouts',
    },
    payout_split_pct: 80,
    best_for: 'Intraday scalpers',
  }

  const validDecision = {
    snapshot,
    kill_you_first: [
      {
        title: 'Trailing DD follows equity',
        detail: 'Profits cannot be locked early',
        source_url: 'https://apextraderfunding.com/rules',
      },
    ],
    fit_score: {
      ny_scalping: 4,
      swing_trading: 1,
      news_trading: 0,
      beginner_friendly: 2,
      scalable: 2,
    },
    pre_trade_checklist: [
      { id: 'news_clear', label: 'No major news in next 30 minutes' },
    ],
    changelog: [],
    affiliate: { url: null, utm: 'openprop' },
  }

  it('accepts a complete valid decision block', () => {
    expect(() => DecisionSchema.parse(validDecision)).not.toThrow()
  })

  it('accepts changelog with entries', () => {
    const input = {
      ...validDecision,
      changelog: [
        {
          date: '2026-04-22',
          field: 'snapshot.consistency_rule.enabled',
          from: false,
          to: true,
          source_url: 'https://apextraderfunding.com/rules',
        },
      ],
    }
    expect(() => DecisionSchema.parse(input)).not.toThrow()
  })

  it('rejects an empty kill_you_first array (at least 1 required)', () => {
    const input = { ...validDecision, kill_you_first: [] }
    expect(() => DecisionSchema.parse(input)).toThrow()
  })

  it('rejects an empty pre_trade_checklist (at least 1 required)', () => {
    const input = { ...validDecision, pre_trade_checklist: [] }
    expect(() => DecisionSchema.parse(input)).toThrow()
  })

  it('rejects missing affiliate block', () => {
    const { affiliate: _affiliate, ...rest } = validDecision
    expect(() => DecisionSchema.parse(rest)).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- schema`

Expected: FAIL for DecisionSchema tests.

- [ ] **Step 3: Append top-level schema**

Append to `scripts/monitor/schema.ts`:

```ts
export const DecisionSchema = z.object({
  snapshot: DecisionSnapshotSchema,
  kill_you_first: z.array(KillYouFirstEntrySchema).min(1),
  fit_score: FitScoreSchema,
  pre_trade_checklist: z.array(ChecklistItemSchema).min(1),
  changelog: z.array(ChangelogEntrySchema),
  affiliate: AffiliateSchema,
})
export type Decision = z.infer<typeof DecisionSchema>
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npm test -- schema`

Expected: PASS. 33 tests total.

- [ ] **Step 5: Commit**

```bash
git add scripts/monitor/schema.ts scripts/monitor/schema.test.ts
git commit -m "feat(v1-f1): add top-level Decision schema composing all sub-types"
```

---

## Task 7: Extend `scripts/validate-content.ts` to validate `decision` block

**Files:**
- Modify: `scripts/validate-content.ts`
- Create: `scripts/validate-content.test.ts`

- [ ] **Step 1: Write failing test for decision-block validation**

Create `scripts/validate-content.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateDecisionBlock } from './validate-content'

describe('validateDecisionBlock', () => {
  it('returns no errors when decision block is absent', () => {
    const fm = { title: 'Funded Next', firm: 'funded-next' }
    const errors = validateDecisionBlock(fm, 'data/firms/cfd/funded-next/index.md')
    expect(errors).toEqual([])
  })

  it('returns no errors for a valid decision block', () => {
    const fm = {
      title: 'Apex',
      firm: 'apex-funding',
      decision: {
        snapshot: {
          news_trading_allowed: false,
          overnight_holding_allowed: false,
          weekend_holding_allowed: false,
          max_drawdown: {
            type: 'trailing_intraday',
            value_usd: 2500,
            source_url: 'https://apextraderfunding.com/rules',
          },
          consistency_rule: {
            enabled: true,
            max_daily_pct: 30,
            source_url: 'https://apextraderfunding.com/payouts',
          },
          payout_split_pct: 80,
          best_for: 'Intraday scalpers',
        },
        kill_you_first: [
          {
            title: 'Trailing DD',
            detail: 'Profits cannot be locked early',
            source_url: 'https://apextraderfunding.com/rules',
          },
        ],
        fit_score: {
          ny_scalping: 4,
          swing_trading: 1,
          news_trading: 0,
          beginner_friendly: 2,
          scalable: 2,
        },
        pre_trade_checklist: [
          { id: 'news_clear', label: 'No major news next 30 min' },
        ],
        changelog: [],
        affiliate: { url: null, utm: 'openprop' },
      },
    }
    const errors = validateDecisionBlock(fm, 'data/firms/futures/apex-funding/index.md')
    expect(errors).toEqual([])
  })

  it('returns errors when decision block is malformed', () => {
    const fm = {
      title: 'Apex',
      decision: { snapshot: {} },
    }
    const errors = validateDecisionBlock(fm, 'data/firms/futures/apex-funding/index.md')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatchObject({
      file: 'data/firms/futures/apex-funding/index.md',
      field: expect.stringContaining('decision'),
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- validate-content`

Expected: FAIL — `validateDecisionBlock` is not exported.

- [ ] **Step 3: Implement the helper in `scripts/validate-content.ts`**

At the top of `scripts/validate-content.ts`, add the import:

```ts
import { DecisionSchema } from './monitor/schema'
```

Near the top-level, add the exported helper (before `validateFile`):

```ts
export function validateDecisionBlock(
  fm: Record<string, unknown>,
  relativePath: string,
): ValidationError[] {
  if (!('decision' in fm)) return []
  const parsed = DecisionSchema.safeParse(fm.decision)
  if (parsed.success) return []
  return parsed.error.issues.map((issue) => ({
    file: relativePath,
    field: `decision.${issue.path.join('.')}`,
    message: issue.message,
  }))
}
```

Inside `validateFile`, the existing code has `const fm = parsed.data` around line 86. After all the existing frontmatter validation logic but **before** the function returns its `result` object (currently around line 292), add:

```ts
  // Validate decision block if present (opt-in during v1 data migration —
  // a file without a decision block passes; a file with a malformed one fails)
  const decisionErrors = validateDecisionBlock(
    fm as Record<string, unknown>,
    relativePath,
  )
  errors.push(...decisionErrors)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- validate-content`

Expected: PASS. 3 tests passing.

- [ ] **Step 5: Run `npm run prebuild` end-to-end to confirm existing 4 firms still pass (none have `decision` block yet)**

Run: `npm run prebuild`

Expected: completes without validation errors (may warn on other pre-existing issues — those are not relevant to this feature). Specifically, no errors about `decision.*` fields.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-content.ts scripts/validate-content.test.ts
git commit -m "feat(v1-f1): validate decision block in build-time content validator"
```

---

## Task 8: GitHub Actions workflow for PR schema check

**Files:**
- Create: `.github/workflows/schema-check.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/schema-check.yml`:

```yaml
name: Schema Check

on:
  pull_request:
    paths:
      - 'data/firms/**/index.md'
      - 'scripts/monitor/schema.ts'
      - 'scripts/validate-content.ts'

jobs:
  validate-frontmatter:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install deps
        run: npm ci

      - name: Run validator
        run: npx tsx scripts/validate-content.ts

      - name: Run schema unit tests
        run: npm test -- schema validate-content
```

- [ ] **Step 2: Verify the workflow YAML is syntactically valid**

Run:
```bash
npx --yes @github/actionlint-cli@latest .github/workflows/schema-check.yml 2>&1 || \
  echo "actionlint not available; skipping — manual inspection: $(cat .github/workflows/schema-check.yml | head -5)"
```

Expected: either "ok" from actionlint, or the fallback prints the first 5 lines of the YAML. No tool failure is required at this step — we're just double-checking the file is there and parseable.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/schema-check.yml
git commit -m "feat(v1-f1): PR schema check workflow"
```

---

## Task 9: Final end-to-end verification

**Files:** no new files. Verifies everything wired up correctly.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: PASS. All schema + validate-content tests pass (36+ tests total).

- [ ] **Step 2: Run full prebuild**

Run: `npm run prebuild`

Expected: completes with the existing content validator running, now with the `validateDecisionBlock` hook active. Since no firm files have a `decision` block yet, no decision-related errors.

- [ ] **Step 3: Run `next build` to confirm production build still works**

Run: `npm run build`

Expected: succeeds. If it fails on pre-existing issues unrelated to this feature (e.g., deleted sprint files referenced elsewhere), note the failure and triage — but it must not fail on anything introduced in this feature.

- [ ] **Step 4: Manual smoke test — inject a malformed `decision` block into one firm and confirm validator fails**

```bash
# Add a clearly-bad decision block to Apex's index.md
cat >> data/firms/futures/apex-funding/index.md <<'EOF'

<!-- TEMP: injected by v1-f1 verification -->
EOF
```

Then manually edit the frontmatter to include:

```yaml
decision:
  snapshot:
    news_trading_allowed: "should be boolean"
```

Run: `npm run prebuild`

Expected: FAILS with a clear error message pointing to `data/firms/futures/apex-funding/index.md` field `decision.snapshot.news_trading_allowed`.

Then revert:
```bash
git checkout data/firms/futures/apex-funding/index.md
```

Run `npm run prebuild` again. Expected: PASSES.

- [ ] **Step 5: Final commit (if any adjustments were needed) + push branch**

```bash
git status
# If anything uncommitted, review and commit. Otherwise:
git push -u origin HEAD
```

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "v1-f1: schema + validators" --body "$(cat <<'EOF'
## Summary
- Add Zod schemas for the `decision` frontmatter block (Snapshot, Kill You First, Fit Score, Checklist, Changelog, Affiliate)
- Extend `scripts/validate-content.ts` to validate `decision` blocks when present (opt-in during v1-f2 data migration)
- Add `schema-check.yml` GitHub Actions workflow for PRs touching firm frontmatter
- Install Vitest + Zod; add `test` script

## Test plan
- [ ] CI green (schema-check workflow runs)
- [ ] `npm test` passes locally — 36+ tests
- [ ] `npm run prebuild` passes on current repo (no firms have `decision` block yet)
- [ ] Manual: inject malformed decision block → prebuild fails with clear error; revert → prebuild passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

After completing all tasks, verify before merging:

1. **Spec coverage (§3.2, §4.5):** Every field listed in the spec's frontmatter example is represented in a Zod schema — ✓ snapshot (all 7 keys), kill_you_first, fit_score (5 styles), pre_trade_checklist, changelog, affiliate.

2. **No placeholders:** Grep the new files for `TODO|TBD|FIXME|XXX|\?\?\?` — should return nothing.

3. **Type consistency:** `DecisionSchema` composes exactly the 6 sub-schemas defined earlier. Type names match across tests and implementation.

4. **Ambiguity:** `validateDecisionBlock` is opt-in (no decision block = no errors). This is by design for v1-f2 gradual migration. Document this at the top of the helper function with a comment.

---

## Done criteria

- All 9 tasks complete
- Test suite passes locally (`npm test`)
- `npm run prebuild` passes
- `npm run build` passes
- PR opened
- CI green on PR
- Reviewer (or Jason self-review) has confirmed no spec requirement is missing

Only then move to v1-f2.
