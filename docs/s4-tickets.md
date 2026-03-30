# Sprint 4 Tickets — OpenPropFirm

**Sprint Goal:** All four firms have complete, verified, sourced markdown content in /data. The remaining S3 tech debt gaps are closed. The site is content-complete and ready for Sprint 5 (Graph View + Auth + Stacked Panels).

**Status:** Final — PM drafted, Tech Lead challenged, decisions incorporated 2026-03-29

**Reviewed by:** PM + Tech Lead (full challenge session, all items resolved)

---

## Key Decisions Made in Challenge Session

| Decision | Choice | Rationale |
| --- | --- | --- |
| S3 tech debt tickets (Groups A/B in draft) | Collapsed to a single verification ticket (S4-01) | Tech Lead audit found 22 of 24 S3 review findings already fixed in codebase. Only R3-08 (partial: script type duplication) and R3-16 (partial: no-op toggle prop) remain. |
| s4-notes.md carry-forward (graph theme reactivity) | Removed from scope — already fixed | `GraphView.tsx` already uses `MutationObserver` on `data-theme` attribute |
| P3 items from S3 review (R3-17 through R3-24) | Remain deferred to Sprint 5+ | Most already fixed in codebase. R3-21 (AppShellContext) should wait for Sprint 5 when auth changes AppShell anyway. |
| Content ticket granularity | One ticket per firm (4 tickets), parallelizable | Each firm requires independent research; content types interlink within a firm |
| Affiliate tracking ticket (S4-18 in draft) | Merged into per-firm content tickets | UTM links and transparency notes are owned by each firm's promos.md |
| Wikilink validation ticket (S4-17 in draft) | Reframed as cross-linking enrichment (S4-07) | `npm run build` already validates wikilinks; the real work is adding natural cross-links |
| Content completeness validation | New ticket (S4-02) — add placeholder detection to `validate-content.ts` | Automates the content quality gate; catches regressions in CI |
| File count reconciliation | 33 files confirmed (not 36) | Funded Next: 9, Funding Pips: 9, Apex Funding: 8, Lucid Funding: 7 |
| Dev server prebuild behavior | Document `npm run prebuild` as manual step after content changes | Modifying `npm run dev` to auto-prebuild would slow iteration; docs are sufficient |

---

## Sprint 4 Dependency Order

```
S4-01 (verify S3 fixes + close 2 gaps — gate for sprint)
  └─→ S4-02 (add placeholder detection to validator)
        └─→ S4-03 (Funded Next content)     ┐
            S4-04 (Funding Pips content)     │ fully parallel
            S4-05 (Apex Funding content)     │
            S4-06 (Lucid Funding content)    ┘
              └─→ S4-07 (cross-linking enrichment + full build verification)
```

## Parallel Execution Guide

After S4-01 and S4-02 pass (estimated: half a day), all four content tickets (S4-03 through S4-06) can be executed simultaneously by separate engineers or in separate sessions. S4-07 runs after all content lands.

---

## Group A — Verification & Tooling

---

### S4-01: Verify S3 debt fixes + close two remaining gaps

**Goal:** Confirm all 24 findings from `docs/s3-review.md` are resolved in the current codebase, then close the two remaining partial fixes.

**Scope:**

**Step 1 — Verify all S3 review fixes are present:**

Run the following and confirm zero errors:

```bash
npm run build
npm run lint
npx tsc --noEmit
```

Spot-check the following fixes in the codebase (do not modify if already correct):

- R3-01: `getPageContent` wrapped with React `cache()` — check `src/lib/content/getPageContent.ts`
- R3-02: `ContentPanelRight` handles API errors with `error` state and `r.ok` check — check `src/components/content/ContentPanelRight.tsx`
- R3-03: NavPanel search button wired (not a no-op) — check `src/components/nav/NavPanel.tsx`
- R3-04: All three client fetch effects use `AbortController` — check `ContentPanelRight.tsx`, `GraphViewLoader.tsx`, `SearchModal.tsx`
- R3-05: `slug` prop removed from `MarkdownRendererProps` — check `src/components/content/MarkdownRenderer.tsx`
- R3-06: `remark-stringify` listed in `package.json` dependencies — check `package.json`
- R3-12: `GraphView` uses `MutationObserver` on `data-theme` for theme reactivity — check `src/components/graph/GraphView.tsx`

**Step 2 — Fix R3-08 remainder: eliminate duplicate types in build scripts**

Files: `scripts/generate-graph-data.ts`, `scripts/build-search-index.ts`

Both scripts define local copies of `GraphNode`, `GraphEdge`, `GraphData`, and `SearchEntry` that duplicate types in `src/types/content.ts`. Since scripts cannot use `@/` path aliases, use relative imports:

```typescript
import type { GraphNode, GraphEdge, GraphData } from '../src/types/content'
```

Remove the local type definitions from both scripts. Verify that the scripts' tsconfig allows this import path.

**Step 3 — Fix R3-16 remainder: remove no-op toggle prop from compare TabBar**

File: `src/components/content/ContentPanelRight.tsx` (line 59)

Current: `onTogglePanel3={() => {}}` — this renders a non-functional sidebar toggle button in the compare panel.

Fix: Pass `onTogglePanel3={undefined}` or omit the prop entirely. The `TabBar` component already conditionally renders the toggle button only when the prop is provided.

**Acceptance Criteria:**

- `npm run build` passes
- `npm run lint` passes
- `npx tsc --noEmit` passes
- No duplicate type definitions for `GraphNode`, `GraphEdge`, `GraphData`, or `SearchEntry` in `scripts/` — all imported from `src/types/content.ts`
- Compare panel's TabBar does not show a non-functional sidebar toggle button
- Written verification notes confirming all R3-xx findings are resolved

**Dependencies:** None — this is the sprint gate

**Estimated effort:** 1 hour

---

### S4-02: Add content completeness checks to `validate-content.ts`

**Goal:** Extend the existing content validation script to detect placeholder content, zero-value fields, and minimum content depth. This becomes the automated gatekeeper for content PRs and prevents placeholder regressions.

**Scope:**

File: `scripts/validate-content.ts`

**Step 1 — Add placeholder text detection:**

Add a check that scans the markdown body (not frontmatter) for placeholder patterns. Fail if any match:

```typescript
const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /content will be added/i,
  /to be expanded/i,
  /\bTBD\b/,
  /\bTODO\b/,
  /coming soon/i,
]
```

Also check frontmatter source labels for placeholder language:

```typescript
for (const source of fm.sources) {
  if (/to be expanded|placeholder|tbd/i.test(source.label)) {
    errors.push({ file, field: 'sources.label', message: `Source label contains placeholder text: "${source.label}"` })
  }
}
```

**Step 2 — Add zero-value field detection for active firms:**

For files where `status: active`:

- If `type === 'basic-info'` and `founded === 0`: error — "Founded year is placeholder (0)"
- If `type === 'challenge'` and `price_usd === 0`: error — "Challenge price is placeholder (0)"

**Step 3 — Add minimum content length checks:**

After stripping frontmatter, check that the markdown body exceeds a minimum character count:

| File type | Minimum body length | Rationale |
| --- | --- | --- |
| `basic-info` | 300 characters | Overview needs at least a paragraph of context |
| `challenge` | 200 characters | Must have a table + brief description |
| `rules` | 500 characters | Rules are the most content-dense pages |
| `promo` | 150 characters | At minimum: code, description, transparency note |
| `changelog` | 200 characters | At least 2-3 dated entries |

**Step 4 — Add `last_verified` recency check (warning, not error):**

If `last_verified` is more than 30 days old, emit a warning (not a build-breaking error):

```
Warning: firms/cfd/funded-next/rules.md — last_verified is 45 days old (2026-02-13)
```

**Acceptance Criteria:**

- Running `npm run prebuild` against current placeholder content **fails** with descriptive error messages
- Placeholder patterns in markdown body are detected and reported
- Zero-value `founded` and `price_usd` fields are detected for active firms
- Files below minimum content length are detected and reported
- Source labels with placeholder language are detected
- `npx tsc --noEmit` passes
- After content is written (S4-03 through S4-06), `npm run prebuild` passes

**Dependencies:** S4-01 (build must pass before modifying build scripts)

**Estimated effort:** 2 hours

---

## Group B — Content Creation

Each firm ticket follows the same structure. Content must be factual, sourced from official firm websites, and written in neutral informational tone. No opinions, no recommendations, no "best firm" language.

**Content creation process per firm:**
1. Research the firm's official website and public documentation
2. Write content following the templates below
3. Set `last_verified` to the actual date of verification
4. Set source URLs to the specific page where information was found (not just the firm homepage)
5. Run `npm run prebuild` to validate — must pass before marking done

**Note on dev preview:** After writing content, run `npm run prebuild` to regenerate `search-index.json` and `graph-data.json`, then restart the dev server to see updated search results and graph data.

---

### Content Templates

All content tickets (S4-03 through S4-06) must follow these minimum structures.

**index.md template:**

```markdown
# [Firm Name] — Overview

[1-2 paragraph summary: what the firm is, what markets they serve, key differentiators]

## Company Details

| Detail | Info |
| --- | --- |
| Website | [official URL] |
| Founded | [year] |
| Headquarters | [city, country] |
| Markets | [CFD/Futures/Both] |
| Challenge Types | [list of challenge models offered] |

## Challenge Models

[Brief description of each challenge model the firm offers, with wikilinks to challenge pages]

- [[firms/.../challenges/50k|$50k Challenge]] — [one-line summary]
- ...

## Key Features

- [Feature 1]
- [Feature 2]
- ...

See also: [[firms/.../rules|Trading Rules]] · [[firms/.../promos|Promo Codes]] · [[firms/.../changelog|Changelog]]
```

**challenges/*.md template:**

```markdown
# [Firm Name] — $[Size] Challenge

[1-2 sentence summary of this challenge tier]

## Challenge Parameters

| Parameter | Phase 1 | Phase 2 | Funded |
| --- | --- | --- | --- |
| Price (USD) | $[amount] | — | — |
| Profit Target | [%] | [%] | — |
| Max Daily Loss | [%] | [%] | [%] |
| Max Overall Drawdown | [%] | [%] | [%] |
| Minimum Trading Days | [N] | [N] | — |
| Time Limit | [days or unlimited] | [days or unlimited] | — |
| Payout Split | — | — | [%/% or scaling] |
| Payout Frequency | — | — | [schedule] |

## Additional Details

- Refundable fee: [yes/no, conditions]
- [Any tier-specific rules or features]

See [[firms/.../rules|Trading Rules]] for complete rule details.
```

For firms with single-phase evaluations, adjust the table columns accordingly.

**rules.md template:**

```markdown
# [Firm Name] — Trading Rules

[1 paragraph overview of the firm's rule philosophy]

## Drawdown Rules

- **Daily drawdown:** [type, percentage, calculation method]
- **Overall drawdown:** [type (static/trailing), percentage, calculation method]
- **Drawdown resets:** [if applicable]

## Trading Restrictions

| Rule | Policy |
| --- | --- |
| Instruments | [allowed instruments or "all available"] |
| Lot sizes | [min/max or "no restriction"] |
| EAs / Bots | [allowed/prohibited/conditional] |
| News trading | [allowed/prohibited/restricted] |
| Weekend holding | [allowed/prohibited] |
| Hedging | [allowed/prohibited] |
| Copy trading | [allowed/prohibited] |

## Consistency Rules

[If the firm has consistency rules, document them here. If not, state "No consistency rules apply."]

## Scaling Plan

[Document the scaling plan if one exists. Include thresholds and benefits.]

## Additional Rules

- [Any other notable rules not covered above]

See [[firms/.../index|Overview]] for general firm information.
```

**promos.md template:**

```markdown
# [Firm Name] — Promo Codes

Current active promo codes for [Firm Name] challenges.

> Using codes marked with ★ supports OpenPropFirm at no extra cost to you.

## Active Codes

| Code | Discount | Expiry | Notes |
| --- | --- | --- | --- |
| `[CODE]` ★ | [X]% off | [date or "No known expiry"] | [any conditions] |

[If no affiliate code available:]
> We do not currently have an affiliate relationship with [Firm Name]. Visit their official website for the latest promotions.

## How to Use

1. Visit [firm website link with UTM: ?ref=openpropfirm or equivalent]
2. Select your challenge tier
3. Enter the promo code at checkout

See [[firms/.../challenges/50k|Available Challenges]] for challenge details.
```

**changelog.md template:**

```markdown
# [Firm Name] — Changelog

A history of notable changes to [Firm Name]'s challenges, rules, and promotions. Most recent changes first.

## [YYYY-MM-DD] — [Brief title]

[Description of change. What changed, from what to what.]

Source: [URL]

---

## [YYYY-MM-DD] — [Brief title]

[Description]

Source: [URL]
```

Minimum 3 entries per firm. If fewer than 3 changes are publicly documented, include at minimum: (1) when the firm launched or was founded, (2) one notable change, (3) current status/latest update. Clearly mark entries where the exact date is approximate with "(approximate)".

---

### S4-03: Funded Next (CFD) — Complete content

**Goal:** Replace all placeholder content for Funded Next with real, verified, sourced information from the firm's official website (https://fundednext.com).

**Files to update (9 files):**

- `data/firms/cfd/funded-next/index.md`
- `data/firms/cfd/funded-next/challenges/10k.md`
- `data/firms/cfd/funded-next/challenges/25k.md`
- `data/firms/cfd/funded-next/challenges/50k.md`
- `data/firms/cfd/funded-next/challenges/100k.md`
- `data/firms/cfd/funded-next/challenges/200k.md`
- `data/firms/cfd/funded-next/rules.md`
- `data/firms/cfd/funded-next/promos.md`
- `data/firms/cfd/funded-next/changelog.md`

**Research areas:**

- Funded Next offers multiple challenge models (Evaluation, Express, Stellar) — document the model available for each tier
- Challenge parameters: price, profit targets, drawdown rules, time limits, payout splits
- Trading rules: daily/overall drawdown type (static vs trailing), lot sizes, EA policy, news trading policy, weekend holding, hedging
- Current promo codes and affiliate program status
- Notable changelog entries: pricing changes, new challenge types, rule updates

**Frontmatter requirements:**

- `founded`: actual founding year (not 0)
- `headquarters`: actual location (not empty string)
- `price_usd`: actual USD price for each challenge tier (not 0)
- `last_verified`: set to the actual date of verification
- `verified_by: manual`
- `sources`: at least one URL per file, pointing to the specific source page (not just `https://fundednext.com`)
- `affiliate_available`: set to `true` or `false` on promos.md based on actual program status

**Content requirements:**

- Follow the content templates defined above
- All wikilinks within Funded Next files resolve to existing files
- Promos page includes transparency note and UTM-tagged affiliate links (if affiliate program exists)
- No placeholder text, no TBD/TODO markers, no "content will be added" language

**Acceptance Criteria:**

- All 9 files contain real, sourced content (no placeholders)
- Every file has at least one source URL pointing to the specific official page (not root domain)
- `npm run prebuild` passes (content validation + search index + graph data)
- Content follows the templates in this document
- All wikilinks within Funded Next files resolve
- Challenge tables have all required columns with real data
- Rules page covers at minimum: drawdown rules, trading restrictions, scaling plan

**Dependencies:** S4-02 (validator must catch placeholders before content is written, to provide CI feedback)

**Estimated effort:** 3-4 hours (research + writing + verification)

---

### S4-04: Funding Pips (CFD) — Complete content

**Goal:** Replace all placeholder content for Funding Pips with real, verified, sourced information from the firm's official website (https://fundingpips.com).

**Files to update (9 files):**

- `data/firms/cfd/funding-pips/index.md`
- `data/firms/cfd/funding-pips/challenges/5k.md`
- `data/firms/cfd/funding-pips/challenges/10k.md`
- `data/firms/cfd/funding-pips/challenges/25k.md`
- `data/firms/cfd/funding-pips/challenges/50k.md`
- `data/firms/cfd/funding-pips/challenges/100k.md`
- `data/firms/cfd/funding-pips/rules.md`
- `data/firms/cfd/funding-pips/promos.md`
- `data/firms/cfd/funding-pips/changelog.md`

**Research areas:**

- Funding Pips challenge models and evaluation structure
- Challenge parameters per tier (5k through 100k)
- Trading rules: drawdown type, instrument restrictions, EA policy, consistency rules
- Current promotions and affiliate program
- Changelog: notable pricing or rule changes

**Frontmatter and content requirements:** Same as S4-03.

**Acceptance Criteria:** Same as S4-03 but for Funding Pips (9 files).

**Dependencies:** S4-02

**Estimated effort:** 3-4 hours

---

### S4-05: Apex Funding (Futures) — Complete content

**Goal:** Replace all placeholder content for Apex Funding with real, verified, sourced information from the firm's official website (https://apextraderfunding.com or equivalent).

**Files to update (8 files):**

- `data/firms/futures/apex-funding/index.md`
- `data/firms/futures/apex-funding/challenges/25k.md`
- `data/firms/futures/apex-funding/challenges/50k.md`
- `data/firms/futures/apex-funding/challenges/100k.md`
- `data/firms/futures/apex-funding/challenges/300k.md`
- `data/firms/futures/apex-funding/rules.md`
- `data/firms/futures/apex-funding/promos.md`
- `data/firms/futures/apex-funding/changelog.md`

**Futures-specific research areas:**

- Apex uses a different model from CFD firms — document the evaluation structure accurately
- Contract specifications: which futures contracts are allowed (ES, NQ, CL, etc.)
- Trailing drawdown mechanics: end-of-day (EOD) vs real-time trailing, and how it differs from CFD static drawdown
- Activation fee model (if applicable — some futures firms require a separate activation payment after passing)
- Payout structure: how futures firm payouts differ from CFD (monthly vs bi-weekly, percentage splits)
- Scaling rules specific to futures accounts

**Challenge table adjustments for futures:**

The challenge table template should reflect futures-specific parameters. If the firm uses a single-phase evaluation (common for futures firms), remove the Phase 2 column. Add rows for:
- Trailing drawdown type (EOD trailing, real-time trailing, or static)
- Contract limits (max contracts per instrument)
- Activation fee (if applicable)

**Frontmatter and content requirements:** Same as S4-03.

**Acceptance Criteria:** Same as S4-03 but for Apex Funding (8 files), plus:

- Futures-specific rules documented accurately (trailing drawdown mechanics, contract specs)
- Challenge tables reflect futures evaluation structure (may differ from CFD 2-phase model)

**Dependencies:** S4-02

**Estimated effort:** 4-5 hours (futures firms require more research due to different mechanics)

---

### S4-06: Lucid Funding (Futures) — Complete content

**Goal:** Replace all placeholder content for Lucid Funding with real, verified, sourced information from the firm's official website.

**Files to update (7 files):**

- `data/firms/futures/lucid-funding/index.md`
- `data/firms/futures/lucid-funding/challenges/10k.md`
- `data/firms/futures/lucid-funding/challenges/25k.md`
- `data/firms/futures/lucid-funding/challenges/50k.md`
- `data/firms/futures/lucid-funding/rules.md`
- `data/firms/futures/lucid-funding/promos.md`
- `data/firms/futures/lucid-funding/changelog.md`

**Research areas:** Same futures-specific areas as S4-05. Additionally:

- Lucid Funding may have different challenge tiers and pricing structure than Apex — do not copy Apex's structure
- Document any unique features or rules that differentiate Lucid from Apex

**Frontmatter and content requirements:** Same as S4-03.

**Acceptance Criteria:** Same as S4-05 but for Lucid Funding (7 files).

**Dependencies:** S4-02

**Estimated effort:** 4-5 hours

---

## Group C — Cross-Linking & Verification

---

### S4-07: Cross-linking enrichment + full build verification

**Goal:** Add natural wikilinks between content pages (both within and across firms), then verify the full build pipeline produces correct output with real content.

**Scope:**

**Step 1 — Intra-firm linking:**

For each firm, ensure:

- `index.md` links to: all challenge pages, rules, promos, changelog
- Each `challenges/*.md` links to: rules (for drawdown clarification), index (for firm overview)
- `rules.md` links to: index, at least one challenge page (as example)
- `promos.md` links to: at least one challenge page (what the discount applies to)
- `changelog.md` links to: rules or challenges when referencing changes to them

**Step 2 — Cross-firm linking (selective, only where natural):**

Add comparison links sparingly where they provide genuine reader value:

- CFD firm overviews may link to the other CFD firm for comparison: e.g., Funded Next index links to `[[firms/cfd/funding-pips/index|Funding Pips]]` with framing like "Compare with"
- Futures firm overviews may link to the other futures firm similarly
- Do NOT cross-link CFD to Futures (different markets, not comparable)
- Do NOT add links that feel forced — cross-firm links should be natural reading paths

**Step 3 — Full pipeline verification:**

Run:

```bash
npm run prebuild && npm run build
```

Then verify:

- Search: query "drawdown" returns at least one result per firm
- Search: query each firm name returns that firm's pages
- Graph: `public/graph-data.json` contains ≥ 2 edges per firm (intra-firm links)
- Spot-check: open 4 challenge pages (one per firm) in the built site — verify tables render correctly, wikilinks work, verified badge shows correct date
- Console: zero errors in production build

**Acceptance Criteria:**

- Every firm's `index.md` links to its rules, at least one challenge, promos, and changelog
- Every `challenges/*.md` links back to its firm's rules
- Cross-firm links exist between same-market firms (CFD↔CFD, Futures↔Futures)
- Zero broken wikilinks in `/data`
- `npm run prebuild` passes
- `npm run build` passes
- Search returns relevant results for "drawdown", "funded next", "apex", "rules"
- `public/graph-data.json` shows ≥ 2 edges per firm node
- No console errors when serving the production build

**Dependencies:** S4-03, S4-04, S4-05, S4-06 (all content must be complete)

**Estimated effort:** 2-3 hours

---

## Sprint 4 Exit Criteria

The sprint is complete when ALL of the following are true:

- [ ] `npm run build` succeeds with zero warnings
- [ ] All 33 content files in `/data/firms/` contain real, sourced content (no placeholders)
- [ ] Every content file has `last_verified` set within the last 7 days
- [ ] Every content file has at least one source URL pointing to a specific official page
- [ ] Zero wikilinks point to files that don't exist
- [ ] `validate-content.ts` passes with zero errors (including new placeholder detection)
- [ ] Search for "drawdown" returns at least one result per firm
- [ ] Graph shows meaningful edges (≥ 2 per firm)
- [ ] 4 spot-checked challenge pages render correct tables without console errors
- [ ] Promos pages have UTM-tagged affiliate links (or explicit "no program" note)
- [ ] Promos pages have the transparency disclosure note
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes

---

## Summary Table

| ID | Group | Title | Est. Hours | Parallel With |
| --- | --- | --- | --- | --- |
| S4-01 | A — Verification | Verify S3 fixes + close 2 gaps | 1h | — |
| S4-02 | A — Tooling | Add placeholder detection to validator | 2h | — |
| S4-03 | B — Content | Funded Next (CFD) — 9 files | 3-4h | S4-04, S4-05, S4-06 |
| S4-04 | B — Content | Funding Pips (CFD) — 9 files | 3-4h | S4-03, S4-05, S4-06 |
| S4-05 | B — Content | Apex Funding (Futures) — 8 files | 4-5h | S4-03, S4-04, S4-06 |
| S4-06 | B — Content | Lucid Funding (Futures) — 7 files | 4-5h | S4-03, S4-04, S4-05 |
| S4-07 | C — Validation | Cross-linking + full build verification | 2-3h | — |

**Total estimated hours: ~20-24h**

The critical path is: S4-01 → S4-02 → content tickets (parallel) → S4-07. Futures firms (S4-05, S4-06) are estimated higher because futures prop firm mechanics differ from CFD and require more research.
