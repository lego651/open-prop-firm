# v1-f2 Data Migration — 4 Firms' `decision` Frontmatter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the `decision` frontmatter block on all 4 launch firms' `index.md` files using sourced data from each firm's official docs, then flip the validator from opt-in to required so no future firm page can ship without a decision block.

**Architecture:** This is content work, not code work. The Zod `DecisionSchema` shipped in v1-f1 (`scripts/monitor/schema.ts`) is the contract. For each firm we read `rules.md` + official firm URLs, compose the YAML block, paste it into `index.md`, and run `validate-content.ts` as the test. Each firm lands as a separate commit inside one PR. A final commit makes `decision` required and adds a regression test.

**Tech Stack:** YAML frontmatter · gray-matter · Zod (already installed) · vitest · tsx · Next.js 16 build validator.

---

## Files touched by this plan

**Modified (4 files — one per firm):**
- `data/firms/cfd/funded-next/index.md` — add `decision:` block to frontmatter
- `data/firms/cfd/funding-pips/index.md` — same
- `data/firms/futures/apex-funding/index.md` — same
- `data/firms/futures/lucid-trading/index.md` — same

**Modified (validator tightening — last task):**
- `scripts/validate-content.ts` — change `validateDecisionBlock` so a missing `decision` block on a `basic-info` file becomes an error (today it returns `[]` when absent)
- `scripts/validate-content.test.ts` — add a regression test that a `basic-info` file without a `decision` block fails validation

**No other code changes.** No React components are added in v1-f2; those land in v1-f7 / v1-f8.

---

## Decision block — the shape to fill in

Derived from `scripts/monitor/schema.ts` `DecisionSchema`. Every key is required unless noted.

```yaml
decision:
  snapshot:
    news_trading_allowed: <bool>
    overnight_holding_allowed: <bool>
    weekend_holding_allowed: <bool>
    max_drawdown:
      type: <trailing_intraday | trailing_eod | static>
      value_usd: <non-negative integer, USD>
      source_url: <https URL>
    consistency_rule:
      enabled: <bool>
      max_daily_pct: <0-100 int; REQUIRED iff enabled=true; omit when enabled=false>
      source_url: <https URL>
    payout_split_pct: <0-100 int>
    best_for: "<free text, rendered as-is in Snapshot Bar>"

  kill_you_first:   # min 1 entry
    - title: "<short phrase>"
      detail: "<one-sentence trader-voice warning>"
      source_url: <https URL>
    # add 2–4 entries per firm

  fit_score:        # 0 = ❌; 1–5 stars; Jason's opinion as trader
    ny_scalping: <0-5 int>
    swing_trading: <0-5 int>
    news_trading: <0-5 int>
    beginner_friendly: <0-5 int>
    scalable: <0-5 int>

  pre_trade_checklist:   # min 1 entry
    - id: <snake_case matching /^[a-z][a-z0-9_]*$/>
      label: "<short action-oriented phrase>"
    # 4–6 items per firm, tailored to that firm's rules

  changelog: []   # empty array valid at v1 launch; bot will append post-launch

  affiliate:
    url: null      # keep null until affiliate program approval lands; CTA won't render
    utm: "openprop"
```

### Per-firm authorship notes

- **`snapshot.*`** comes from the firm's own docs (link them in `source_url`). For firms with multiple challenge variants, use the **flagship / default evaluation tier** — Stellar 2-Step $50k for Funded Next, 2-Phase $50k for Funding Pips, 50k Full for Apex Trader Funding, 1-Step $50k for Lucid Trading — and note the tier inside `best_for`. Per-tier snapshot is a v2 concern.
- **`kill_you_first`** is opinion-layer content. Each entry is a trader-voice warning about the single biggest way this firm blows a new account in the first week. Aim for 2–4 entries.
- **`fit_score`** is Jason's subjective 0–5 rating on each dimension. 0 means "actively bad for this style" (renders as ❌). 5 means "best-in-class for this style".
- **`pre_trade_checklist`** items are per-firm, tied to that firm's specific rules (e.g., Apex checklist has a "Not breaching consistency rule" item; Funded Next checklist has a "No major news in next 5 minutes" item because of the funded-account 40% profit-count clause).
- **`affiliate.url`** is `null` in v1 until programs approve. The `VerificationBadge` + `AffiliateCTA` components (v1-f8) are already designed to null-render when URL is null.
- **`changelog`** is `[]` at migration. Post-launch, the bot + `append-changelog.yml` workflow (v1-f4) will fill it in automatically as rule changes are detected.

---

## Branch + PR convention

- Branch: `v1-f2-data-migration`
- PR title: `feat: v1-f2 data migration — decision frontmatter for 4 firms`
- One commit per firm, plus one commit for the validator flip, plus one commit for the regression test. Keeps reviewer able to inspect each firm in isolation.

---

## Task 0: Preflight — baseline check

**Files:**
- None modified. Read-only sanity check.

- [ ] **Step 1: Confirm local branch is clean and aligned with origin/main**

Run: `git status --short && git log --oneline -3`

Expected: clean tree (or only the stashed src/ WIP from the check-in), latest commit on main is the archive-cleanup commit `4b78b2d` or newer.

- [ ] **Step 2: Create the feature branch**

Run: `git checkout -b v1-f2-data-migration`

Expected: `Switched to a new branch 'v1-f2-data-migration'`

- [ ] **Step 3: Run the baseline validator**

Run: `npx tsx scripts/validate-content.ts`

Expected: `Validation passed: N files checked` (N depends on how many files are under `data/firms/**/*.md`). No errors, because no firm currently has a `decision` block and `validateDecisionBlock` returns `[]` when absent.

- [ ] **Step 4: Run the schema unit tests**

Run: `npm test -- schema validate-content`

Expected: all 33 schema tests + 3 validate-content tests pass.

- [ ] **Step 5: Note the baseline for comparison**

Write down: total validated files count, total test count. After Task 5 this must still be green, with +1 regression test.

---

## Task 1: Funded Next — populate `decision` block

**Files:**
- Modify: `data/firms/cfd/funded-next/index.md` (frontmatter only — do not touch the markdown body)

**Primary sources the executor should open in a browser:**
- `https://fundednext.com/stellar-model` (challenge parameters, drawdown, consistency)
- `https://help.fundednext.com/en/articles/8019811-how-can-i-calculate-the-daily-loss-limit` (daily loss calc)
- `https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies` (news + hedging + EA rules)
- `https://fundednext.com/affiliate` (payout split details, affiliate program — not applied yet so `url: null`)
- The firm's own `data/firms/cfd/funded-next/rules.md` is already sourced and summarizes all of the above.

**Tier choice for `snapshot`:** Stellar 2-Step $50k (flagship evaluation).

- [ ] **Step 1: Write the `decision` block into the frontmatter**

Open `data/firms/cfd/funded-next/index.md`. Insert a new `decision:` top-level key in the frontmatter **after** the existing `sources:` array and before the closing `---`. Example starting shape — the executor fills in values from the sources above:

```yaml
decision:
  snapshot:
    news_trading_allowed: true
    overnight_holding_allowed: true
    weekend_holding_allowed: true
    max_drawdown:
      type: static
      value_usd: 5000
      source_url: 'https://fundednext.com/stellar-model'
    consistency_rule:
      enabled: false
      source_url: 'https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies'
    payout_split_pct: 80
    best_for: 'Swing + news traders — $50k Stellar 2-Step'

  kill_you_first:
    - title: '40% news-profit cap on funded accounts'
      detail: 'On funded accounts, no more than 40% of total profit may come from trades opened or closed within 5 minutes of a high-impact news event.'
      source_url: 'https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies'
    - title: 'Weekend-close required on funded accounts'
      detail: 'Challenge phase allows weekend holding; funded accounts must flatten before the weekend cutoff, which surprises challenge graduates.'
      source_url: 'https://fundednext.com/stellar-model'
    - title: 'Hedging prohibited across all phases'
      detail: 'Opposing positions on the same instrument are treated as a rule violation — including split accounts with mirrored strategies.'
      source_url: 'https://help.fundednext.com/en/articles/6781539-what-are-the-restricted-prohibited-trading-strategies'

  fit_score:
    ny_scalping: 3
    swing_trading: 4
    news_trading: 2
    beginner_friendly: 3
    scalable: 4

  pre_trade_checklist:
    - id: dd_buffer_ok
      label: 'Daily drawdown buffer > 1% of initial balance'
    - id: news_window_clear
      label: 'No high-impact news within 5 minutes (funded account)'
    - id: weekend_close_plan
      label: 'Exit plan set if holding into the weekend cutoff (funded account)'
    - id: hedging_off
      label: 'Not mirroring opposing positions across accounts'
    - id: strategy_consistency
      label: 'Strategy matches the style declared at challenge purchase'

  changelog: []

  affiliate:
    url: null
    utm: 'openprop'
```

Values above are plausible starting points sourced from the firm's public docs. The executor must **verify each value against the live source URL** and adjust (especially `max_drawdown.value_usd` which varies by tier — pick the $50k tier's actual USD value).

- [ ] **Step 2: Run the validator — must pass**

Run: `npx tsx scripts/validate-content.ts`

Expected: `Validation passed: N files checked`. If it fails, the error output shows the exact field (e.g., `field: decision.snapshot.max_drawdown.source_url` → `Invalid url`). Fix and re-run. Iterate until green.

- [ ] **Step 3: Run schema unit tests**

Run: `npm test -- schema validate-content`

Expected: all tests still pass. (These test the schema itself, not any firm content, so they should be unaffected — this is a regression check.)

- [ ] **Step 4: Commit**

```bash
git add data/firms/cfd/funded-next/index.md
git commit -m "$(cat <<'EOF'
feat(data): add decision block for Funded Next

Populates v1 decision frontmatter (snapshot, kill_you_first, fit_score,
pre_trade_checklist, changelog, affiliate) on the $50k Stellar 2-Step
flagship tier. Affiliate URL null pending program approval.

Refs v1-f2 per docs/superpowers/plans/2026-04-22-v1-feature-map.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Funding Pips — populate `decision` block

**Files:**
- Modify: `data/firms/cfd/funding-pips/index.md`

**Primary sources:**
- `https://fundingpips.com/` (homepage → challenge selector)
- `https://fundingpips.com/funding-pips-evaluation-process` (2-Phase, 1-Phase, 0-Phase, Student variants)
- `https://fundingpips.com/trading-rules` (drawdown, consistency, news, weekend)
- `https://help.fundingpips.com/` (help centre articles for edge cases)
- The firm's own `data/firms/cfd/funding-pips/rules.md`.

**Tier choice for `snapshot`:** 2-Phase $50k (flagship evaluation).

- [ ] **Step 1: Write the `decision` block into the frontmatter**

Open `data/firms/cfd/funding-pips/index.md`. Follow the exact same shape as Task 1. Use the same structure and field ordering. Populate values from Funding Pips' sources listed above — in particular:

- Funding Pips uses **trailing drawdown on current equity during evaluation**, switches to a different rule on funded accounts. Pick the evaluation-phase rule for the Snapshot Bar and note the funded-account difference in a `kill_you_first` entry.
- Funding Pips enforces a **30% consistency rule** on funded accounts (max % of total profit from any single day). `enabled: true`, `max_daily_pct: 30` — verify the exact value at the source URL.
- Funding Pips disallows news trading on the 2-Phase within 2 minutes of red-folder events; verify current window.
- `payout_split_pct` starts at 80% on the 2-Phase, scales up. Use the starting value.

- [ ] **Step 2: Run the validator — must pass**

Run: `npx tsx scripts/validate-content.ts`

Expected: still `Validation passed`. Iterate on errors exactly like Task 1.

- [ ] **Step 3: Run schema unit tests**

Run: `npm test -- schema validate-content`

Expected: all tests still pass.

- [ ] **Step 4: Commit**

```bash
git add data/firms/cfd/funding-pips/index.md
git commit -m "$(cat <<'EOF'
feat(data): add decision block for Funding Pips

Populates v1 decision frontmatter on the 2-Phase $50k flagship tier.
Consistency rule enabled per current evaluation terms; affiliate URL
null pending approval.

Refs v1-f2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Apex Trader Funding — populate `decision` block

**Files:**
- Modify: `data/firms/futures/apex-funding/index.md`

**Primary sources:**
- `https://apextraderfunding.com/` (challenge sizes + pricing)
- `https://apextraderfunding.com/faq` (rules, drawdown, consistency, news)
- `https://apextraderfunding.com/member/rules.php` (member-only detailed rules — use public FAQ only for v1)
- The firm's own `data/firms/futures/apex-funding/rules.md`.

**Tier choice for `snapshot`:** 50k Full Account (flagship evaluation).

Apex specifics the executor MUST get right:

- **Drawdown type = `trailing_intraday`** on Full accounts. This is the single biggest newbie-killer at Apex and belongs in `kill_you_first` as the #1 entry.
- **Consistency rule = enabled**: Apex enforces a 30% max-single-day rule on payouts (not during evaluation). `enabled: true`, `max_daily_pct: 30`, source_url to the FAQ. Verify the current value at source.
- **News trading = not allowed** on funded accounts during the first window (e.g., payout rules restrict trades within N minutes of major news). Confirm at source and set `news_trading_allowed` accordingly.
- **Overnight / weekend holding = not allowed** on futures accounts (sessions close nightly; weekends enforce flat).
- **payout_split_pct = 100% on first $25k, 90% after** — use 90 for the Snapshot Bar and note "First $25k @ 100%" in `best_for` or a kill_you_first entry. Verify exact numbers at source.

- [ ] **Step 1: Write the `decision` block into the frontmatter**

Open `data/firms/futures/apex-funding/index.md`. Same shape as Tasks 1–2, with the Apex specifics above. `kill_you_first` should include at minimum:

1. Trailing intraday drawdown moves with equity — locks aren't permanent
2. 30% single-day consistency rule on payouts
3. No overnight / weekend / high-impact news holding on funded accounts

- [ ] **Step 2: Run the validator — must pass**

Run: `npx tsx scripts/validate-content.ts`

Expected: `Validation passed`.

- [ ] **Step 3: Run schema unit tests**

Run: `npm test -- schema validate-content`

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add data/firms/futures/apex-funding/index.md
git commit -m "$(cat <<'EOF'
feat(data): add decision block for Apex Trader Funding

Populates v1 decision frontmatter on the 50k Full flagship tier.
Trailing intraday drawdown + 30% consistency rule flagged in
kill_you_first. Affiliate URL null pending approval.

Refs v1-f2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Lucid Trading — populate `decision` block

**Files:**
- Modify: `data/firms/futures/lucid-trading/index.md`

**Primary sources:**
- `https://lucidtrading.com/` (challenge sizes + pricing)
- `https://lucidtrading.com/rules/` (public rules page)
- `https://lucidtrading.com/faq/` (FAQ)
- The firm's own `data/firms/futures/lucid-trading/rules.md`.

**Tier choice for `snapshot`:** 1-Step $50k Combine (flagship evaluation).

Lucid specifics:

- Lucid offers 1-Step and 2-Step futures evaluations — pick the 1-Step for the Snapshot Bar.
- Drawdown type varies by tier; confirm at source. Typically **trailing EOD** on the 1-Step — `type: trailing_eod`.
- Consistency rule exists on payouts; confirm enabled state and `max_daily_pct` value at source.
- News / overnight / weekend rules differ between evaluation and funded — use funded-account rules for the Snapshot Bar (conservative).

- [ ] **Step 1: Write the `decision` block into the frontmatter**

Same shape as Tasks 1–3. At minimum 2 `kill_you_first` entries tied to Lucid-specific gotchas from the sources above.

- [ ] **Step 2: Run the validator — must pass**

Run: `npx tsx scripts/validate-content.ts`

Expected: `Validation passed`.

- [ ] **Step 3: Run schema unit tests**

Run: `npm test -- schema validate-content`

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add data/firms/futures/lucid-trading/index.md
git commit -m "$(cat <<'EOF'
feat(data): add decision block for Lucid Trading

Populates v1 decision frontmatter on the 1-Step $50k Combine flagship
tier. Affiliate URL null pending approval.

Refs v1-f2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Flip the validator — `decision` block required on `basic-info`

After all 4 firms have a decision block and validator passes green, tighten the validator so future firm pages cannot ship without one.

**Files:**
- Modify: `scripts/validate-content.ts` (the `validateDecisionBlock` function)
- Modify: `scripts/validate-content.test.ts` (add regression test)

- [ ] **Step 1: Write the failing test first**

Open `scripts/validate-content.test.ts`. Add a new test case in the existing describe block:

```ts
it('errors when a basic-info file has no decision block', () => {
  const fm = {
    title: 'Test Firm — Overview',
    firm: 'Test Firm',
    category: 'cfd',
    type: 'basic-info',
    status: 'active',
    last_verified: '2026-04-23T00:00:00Z',
    verified_by: 'manual',
    sources: [{ url: 'https://example.com/page', label: 'Test' }],
    website: 'https://example.com',
    founded: 2020,
    // no `decision` key
  }
  const errors = validateDecisionBlock(fm, 'data/firms/cfd/test-firm/index.md')
  expect(errors).toHaveLength(1)
  expect(errors[0].field).toBe('decision')
  expect(errors[0].message).toMatch(/required/i)
})
```

The test imports `validateDecisionBlock` from `./validate-content` — check the existing test file for the exact import path and follow its convention.

- [ ] **Step 2: Run the test — it must FAIL**

Run: `npm test -- validate-content`

Expected: new test fails with something like `expected [].length to be 1`. This confirms the test is wired up and the current (opt-in) behavior is what it's asserting against.

- [ ] **Step 3: Tighten `validateDecisionBlock`**

In `scripts/validate-content.ts`, replace:

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

with:

```ts
export function validateDecisionBlock(
  fm: Record<string, unknown>,
  relativePath: string,
): ValidationError[] {
  // v1-f2: decision block is required on basic-info files.
  // challenge/rules/promo/changelog files do NOT carry a decision block.
  if (fm.type === 'basic-info' && !('decision' in fm)) {
    return [
      {
        file: relativePath,
        field: 'decision',
        message: 'decision block is required on basic-info files',
      },
    ]
  }
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

- [ ] **Step 4: Run the new test — it must PASS**

Run: `npm test -- validate-content`

Expected: the new test passes. All other tests in the file also still pass.

- [ ] **Step 5: Run the full validator against real content — still must pass**

Run: `npx tsx scripts/validate-content.ts`

Expected: `Validation passed: N files checked`. Because all 4 firms now have a decision block from Tasks 1–4, the tightened validator still finds zero errors.

If this step fails, one of the firm index.md files is missing or malformed — go back to the offending task and fix.

- [ ] **Step 6: Run full schema + validator test suite**

Run: `npm test`

Expected: all tests pass (33 schema + old 3 validate-content + new 1 = 37 total).

- [ ] **Step 7: Commit**

```bash
git add scripts/validate-content.ts scripts/validate-content.test.ts
git commit -m "$(cat <<'EOF'
feat(validator): require decision block on basic-info files

Flips validateDecisionBlock from opt-in to required: a basic-info
frontmatter missing a `decision` key now fails validation. Earlier
challenge / rules / promo / changelog files remain unaffected.

Safe to flip because v1-f2 migrated all 4 launch firms in the same
PR. Prevents future firm pages from shipping without a Decision
Header contract.

Refs v1-f2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification + push + PR

**Files:**
- None modified. End-to-end check and PR creation.

- [ ] **Step 1: Full validator run**

Run: `npx tsx scripts/validate-content.ts`

Expected: `Validation passed: N files checked` with zero errors and zero warnings (warnings about stale `last_verified` dates >30d are acceptable if they existed pre-migration; new decision blocks carry no date).

- [ ] **Step 2: Full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Next.js build smoke test**

Run: `npm run build`

Expected: build completes without validation errors. (The prebuild hook runs `validate-content.ts`; Next.js 16 build reads the firm frontmatter to statically generate `/vault/*` routes.)

Note: this task does NOT require the `/firms/<slug>` route to render correctly — those components ship in v1-f7 through v1-f9. It only requires the build to succeed.

- [ ] **Step 4: Review the diff**

Run: `git diff main...HEAD --stat`

Expected: 6 files changed — 4 firm index.md + validate-content.ts + validate-content.test.ts. No unexpected file edits.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin v1-f2-data-migration
gh pr create --title "feat: v1-f2 data migration — decision frontmatter for 4 firms" --body "$(cat <<'EOF'
## Summary

- Populates the v1 `decision` frontmatter block on all 4 launch firms (Funded Next, Funding Pips, Apex Trader Funding, Lucid Trading) using sourced data.
- Flips `validateDecisionBlock` from opt-in to required on `basic-info` files so future firm pages can't ship without a Decision Header contract.
- Adds one regression test (now 37 tests total).

## Firms migrated

| Firm | Tier used for Snapshot Bar | Affiliate URL |
|---|---|---|
| Funded Next | Stellar 2-Step $50k | null (pending) |
| Funding Pips | 2-Phase $50k | null (pending) |
| Apex Trader Funding | 50k Full | null (pending) |
| Lucid Trading | 1-Step $50k Combine | null (pending) |

## Test plan

- [x] `npx tsx scripts/validate-content.ts` — Validation passed
- [x] `npm test` — all 37 tests pass
- [x] `npm run build` — Next.js build succeeds
- [ ] Manual review: open each firm's `index.md` in the diff and spot-check `source_url` values against the linked official pages.

Refs v1-f2 in docs/superpowers/plans/2026-04-22-v1-feature-map.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Wait for CI**

The existing `.github/workflows/schema-check.yml` will run on the PR because `data/firms/**/index.md` was touched. It runs the validator + schema tests. Expected: green.

If red, read the workflow output, fix, push, re-check.

- [ ] **Step 7: Merge**

Squash-merge (same convention as v1-f1 PR #34) when CI is green and each firm's block has been spot-checked against sources. Delete the branch after merge.

- [ ] **Step 8: Update the life-os resume-here note**

Edit `/Users/lego/@Lego651/life-os/Projects/open-prop/index.md`:
- Flip v1-f2 row from "Plan not yet written" / "NEXT" to "✅ Shipped <date>"
- Update the "Status" block's "NEXT" pointer to v1-f3 (Bot upgrade — watched-fields diffing)
- Append a one-line note: "Next plan write: `write plan for v1-f3`"

This is a single short edit, not a separate task — it closes the loop on v1-f2 and sets the next check-in up cleanly.

---

## Out of scope for v1-f2 (explicit non-goals)

These belong to later features and MUST NOT slip into this PR:

- No React components. No page routes. No theme tokens. (v1-f6, v1-f7, v1-f8, v1-f9, v1-f10)
- No bot scraper upgrades. The bot still does keyword-presence-only until v1-f3. (v1-f3, v1-f4, v1-f5)
- No affiliate URL values. `url: null` everywhere. Affiliate applications happen in parallel (per the OKR doc) but don't block the PR.
- No content edits to the markdown body of any `index.md` — only frontmatter. Body edits rot the diff and add review surface.
- No populating `changelog[]`. It stays `[]` at launch. The bot populates it post-launch via v1-f4's automation.

## Self-review

**Spec coverage (§3.2 Decision block, §4.5 Validators):**
- snapshot, kill_you_first, fit_score, pre_trade_checklist, changelog, affiliate — all 6 required top-level decision keys covered in Tasks 1–4 ✓
- Build-time validator behavior — preserved; Task 5 only tightens the "missing block" case ✓
- GitHub Actions schema check — no change needed, same validator ✓
- Opt-in → required transition — Task 5 ✓

**Placeholder scan:** No "TBD" / "TODO" / "similar to Task N" in plan body. Per-firm templates in Task 1 are example starting values the executor must verify against live sources — called out explicitly in Step 1 of each task ✓

**Type consistency:** `validateDecisionBlock` signature (`fm, relativePath`) and return type (`ValidationError[]`) match across Task 5 and the existing code ✓ The test case's error shape (`field: 'decision'`, `message` matches `/required/i`) matches what the tightened function produces ✓
