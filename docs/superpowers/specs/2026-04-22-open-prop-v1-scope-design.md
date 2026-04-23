# open-prop v1 — Scope Design Spec

*Date: 2026-04-22*
*Status: Design approved via brainstorming; pending final user review before writing-plans.*
*Authority: This document is the v1 source of truth. `company-roadmap-okr.md` owns business goals; this owns product scope.*

---

## 1. Overview

### What v1 is

A pre-trade decision tool for prop firm traders, covering four firms (Funded Next, Funding Pips, Apex Trader Funding, Lucid Trading). Built at `/firms/<slug>` on `openpropfirm.com`. Trader arrives, gets a 5-second decision on whether to trade the firm today, backed by a sourced data layer that is monitored daily and a labeled opinion layer authored by the founder. Monetized only by disclosed affiliate links. No paid tier, no chatbot, no gated content.

### What v1 is not

- Not a wiki. The existing 3-panel Obsidian wiki lives on at `/vault` but is **frozen during v1** — no new work, no maintenance.
- Not a chatbot, paid tier, B2B verified-badge service, commissioned-review operation, or subscription product. These are explicitly out of the roadmap entirely.
- Not the Chrome extension rule-change alert system (v2).
- Not the "How to Trade This Firm" playbook (v2).
- Not the computed Stability Indicator (v2 computes it; v1 has a UI placeholder only).
- Not a multi-language site, mobile app, or community-contribution-at-scale system.

### The v1 bet

Trust compounds when:
1. Data is sourced, timestamped, and automatically monitored for change.
2. Opinion is clearly labeled and authored by someone who actually trades the firm.
3. The user experience answers the one question the user came with — "should I trade this firm today?" — in five seconds.

v1 ships all three or it does not ship.

---

## 2. Resolved decisions (the six load-bearing choices)

These were confirmed during the brainstorming session on 2026-04-22. Changing any one of them requires revisiting the design.

| # | Decision | Resolution | Rationale |
|---|---|---|---|
| 1 | Route structure | **Hybrid.** `/firms/<slug>` = decision tool (new). `/vault` = existing Obsidian UI, frozen during v1. Both read from the same `data/firms/.../index.md`. | Preserves existing wiki investment without letting it dilute the decision-tool positioning. |
| 2 | Monitoring engine scope | **Watched-fields + keyword-catchall.** 6 revenue-critical fields parsed per firm; keyword presence as safety net. Daily cron. | Full field-level parsing for every field is too expensive for v1 time budget; snapshot-only diff generates too much noise to support the Stability Indicator moat. This hybrid hits ~80% of value at ~20% of build cost. |
| 3 | Opinion layer coverage | **Full opinion layer on all 4 launch firms** (Jason trades all four). "Opinion pending" pattern reserved for future firms he doesn't yet trade. | Opinion credibility requires real trading experience. Founder trades all 4, so full coverage is honest. |
| 4 | New data fields location | **Additive to existing `index.md` frontmatter.** Zod schema validator enforced on PR merge + at Next.js build time. | One source of truth. `/vault` and `/firms/<slug>` never diverge. Contributors edit one file. |
| 5 | Pre-Trade Checklist semantics | **Interactive + localStorage.** Per-firm, per-device state. No external data integrations in v1. | "Daily tool" claim requires interactivity; external data pulls (economic calendar, account DD) are v1.5+ scope with vendor dependencies. |
| 6 | Homepage (`/`) | **Marketing-style landing page.** Hero + 4 firm cards + disclosure + "clone to Obsidian" link. Not the Obsidian wiki at `/`. | First-5-seconds impression must match the decision-tool category claim. Obsidian UI at `/` would undermine the pivot. |

---

## 3. Architecture

### 3.1 Routes

```
openpropfirm.com
├── /                          Landing page (new in v1)
│     Hero + FirmCardGrid + disclosure link + "clone to Obsidian" link
│
├── /firms                     Firm index page (new in v1)
│     FirmCardGrid with Snapshot Bar previews
│
├── /firms/[slug]              Decision-tool firm page (new in v1)
│     slug = funded-next | funding-pips | apex-funding | lucid-trading
│     Reads data/firms/{cfd|futures}/<slug>/index.md
│     Renders three-layer page (data / opinion / action)
│
├── /vault                     Existing Obsidian UI (frozen during v1)
│     3-panel layout, file tree, content panel, graph view
│
├── /about                     Static (new in v1)
├── /disclosure                Affiliate + sourcing policy (new in v1)
└── /terms                     ToS + disclaimer (new in v1)
```

### 3.2 Data architecture

Single source: `data/firms/<type>/<slug>/index.md` frontmatter.

Existing fields (unchanged):
```yaml
---
title: "Apex Trader Funding"
firm: apex-funding
type: basic-info
last_verified: 2026-04-22T14:30:00Z
verified_by: bot
sources:
  - url: https://apextraderfunding.com/rules
    label: Official Rules
---
```

v1 additions (new, additive to same frontmatter):
```yaml
decision:
  snapshot:
    news_trading_allowed: false
    overnight_holding_allowed: false
    weekend_holding_allowed: false
    max_drawdown:
      type: trailing_intraday    # trailing_intraday | trailing_eod | static
      value_usd: 2500
      source_url: https://apextraderfunding.com/rules#dd
    consistency_rule:
      enabled: true
      max_daily_pct: 30
      source_url: ...
    payout_split_pct: 80
    best_for: "Intraday scalpers"   # free-text label, rendered as-is in Snapshot Bar; no enum constraint

  kill_you_first:
    - title: "Trailing DD follows equity"
      detail: "Profits can't be locked early; aggressive scaling early = violation"
      source_url: ...

  fit_score:
    ny_scalping: 4        # 0-5; 0 renders as ❌
    swing_trading: 1
    news_trading: 0
    beginner_friendly: 2
    scalable: 2

  pre_trade_checklist:
    - id: news_clear
      label: "No major news in next 30 minutes"
    - id: dd_buffer
      label: "Daily DD buffer > 1%"
    - id: consistency_ok
      label: "Not violating consistency rule"
    - id: session_close
      label: "All trades will close before session end"

  changelog:
    - date: 2026-04-22
      field: snapshot.consistency_rule.enabled
      from: false
      to: true
      source_url: ...

  affiliate:
    url: null                  # set when approval lands; null = CTA not rendered
    utm: "openprop"
```

The schema validator (Zod) runs at two gates:
- **Next.js build time.** Validates every firm's frontmatter. Malformed file fails the build; Vercel does not deploy; previous version stays live.
- **GitHub Actions on PR merge.** Same validator, same rules. Blocks merge. Applies to both bot PRs and human PRs.

### 3.3 Monitoring bot architecture

Upgrade path from the existing bot (which does keyword-presence-only):

```
   GitHub Actions cron @ 09:00 UTC daily
                 │
                 ▼
      scripts/monitor/runner.ts
                 │
   ┌─────────────┴─────────────┐
   ▼                           ▼
per-firm scraper (×4)       schema.ts (Zod)
   │
   │  1. Fetch firm's rules/FAQ page HTML
   │  2. Parse 6 watched fields into DecisionSnapshot shape
   │  3. Run keyword-presence catchall on the body
   │
   ▼
returns BotRunResult
                 │
                 ▼
      diff.ts: compare scraped fields vs
      current frontmatter decision.snapshot
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
   change      no-change   error/timeout
     │           │           │
     ▼           ▼           ▼
  open PR     update      log error to
  with diff   last_       bot_usage_log
  body +      verified    do NOT update
  suggested   only        last_verified
  changelog
  entry
     │
     ▼
  Jason reviews PR, verifies against live
  firm page, merges
     │
     ▼
  append-changelog.yml workflow runs
  on merge: reads PR diff, appends
  entry to decision.changelog[],
  commits back to main
     │
     ▼
  Vercel rebuilds; new Snapshot Bar +
  changelog entry live within minutes
```

**Watched fields — the SAME 6 across every firm (not per-firm overrides):** `max_drawdown`, `consistency_rule`, `news_trading_allowed`, `overnight_holding_allowed`, `payout_split_pct`, cheapest-tier challenge price (sourced from the firm's `challenges/*.md`, lowest-priced tier). Uniform coverage means the Snapshot Bar renders the same shape on every firm page — a trader scanning across firms never wonders "why is this field missing on that firm?"

**Health check:** runner.ts posts to a pinned GitHub Issue on every run ("✅ 2026-04-22 09:00 UTC — 4/4 scrapers OK"). Separate tiny workflow alerts Jason on 24h silence via GitHub email notification. Silent failure is the single failure mode that quietly destroys the trust asset and must be caught.

### 3.4 Three-layer page architecture

Every `/firms/<slug>` page renders in three visually-separated zones. Never mix.

```
┌─────────────────────────────────────────────────────┐
│ [DATA LAYER]   bg: slate/neutral                    │
│   SnapshotBar                                       │
│   RuleBreakdown (from rules.md body)                │
│   Changelog                                         │
│   VerificationBadge                                 │
├─────────────────────────────────────────────────────┤
│ [OPINION LAYER]   bg: amber-tinted                  │
│   KillYouFirstList                                  │
│   FitScoreTable                                     │
│   "Founder's opinion" label on every block          │
├─────────────────────────────────────────────────────┤
│ [ACTION LAYER]   bg: green-tinted                   │
│   PreTradeChecklist                                 │
│   AffiliateCTA (only renders if affiliate.url set)  │
└─────────────────────────────────────────────────────┘
```

Visual separation uses two new theme tokens (`--opinion-tint` amber, `--action-tint` green) added to the existing token set from `docs/ui-guide.md`.

---

## 4. Components

### 4.1 New pages

| Component | Path | Purpose | Depends on |
|---|---|---|---|
| LandingPage | `app/page.tsx` | Hero + 4 firm cards + disclosure link | FirmCardGrid, Hero |
| FirmsIndexPage | `app/firms/page.tsx` | Grid of all firms with Snapshot Bar previews | FirmCardGrid |
| FirmDetailPage | `app/firms/[slug]/page.tsx` | Three-layer firm page | DecisionHeader cluster, RuleBreakdown, PreTradeChecklist, Changelog, AffiliateCTA, VerificationBadge, SourcesFooter |
| DisclosurePage | `app/disclosure/page.tsx` | Affiliate + sourcing + data-vs-opinion policy | — |

### 4.2 New UI components

**Decision Header cluster** (data + opinion, renders at top of every firm page):

| Component | Props | Layer | What it does |
|---|---|---|---|
| SnapshotBar | `{ snapshot: DecisionSnapshot }` | data | Row of binary chips, each sourced |
| KillYouFirstList | `{ warnings: KillYouFirstEntry[] }` | opinion | 2–3 firm-specific account killers; "Founder's opinion" label |
| FitScoreTable | `{ fitScore: FitScore }` | opinion | Grid of trading-style × stars; 0 stars = ❌ |

**Below the Decision Header:**

| Component | Props | Layer | What it does |
|---|---|---|---|
| RuleBreakdown | `{ body: Markdown }` | data | Four collapsible sections (Drawdown / News / Holding / Payout); example + implication format |
| Changelog | `{ entries: ChangelogEntry[] }` | data | Vertical list, date + field + before/after + source; Stability Indicator **UI placeholder** (renders "—" in v1) |
| PreTradeChecklist | `{ items: ChecklistItem[], firmSlug: string }` | action | Interactive checklist; localStorage key `checklist:<firmSlug>`; user-initiated reset only — no auto-reset on date change, session, or app reload |
| AffiliateCTA | `{ firmSlug: string, url: string \| null }` | action | Single disclosed button with UTM; **renders nothing if url is null** |
| VerificationBadge | `{ lastVerified: Date, verifiedBy: 'bot' \| 'manual' }` | data | Badge with hover-link to sources; renders amber-warning if > 7 days stale |

**Landing-page-only:**

| Component | Props | What it does |
|---|---|---|
| Hero | — | Headline, subhead, "Browse firms" CTA |
| FirmCardGrid | `{ firms: FirmMeta[] }` | Responsive grid of FirmCards |
| FirmCard | `{ firm: FirmMeta }` | Card: name, 3 Snapshot chips, Fit Score highlight, link to `/firms/<slug>` |

### 4.3 Reused existing components

Must not duplicate — pull from current codebase:
- SourcesFooter
- ThemeProvider + theme tokens (extend with `--opinion-tint`, `--action-tint`)
- Layout shell + nav (add one new nav link: `/firms`)

### 4.4 Bot modules

| Module | Path | Purpose |
|---|---|---|
| Per-firm scraper ×4 | `scripts/monitor/<slug>.ts` | Upgrade existing files to parse 6 watched fields + keyword catchall |
| runner.ts | `scripts/monitor/runner.ts` | Upgrade existing file; aggregates BotRunResult[], opens PR via `gh` CLI |
| schema.ts (new) | `scripts/monitor/schema.ts` | Zod schemas for DecisionSnapshot, KillYouFirstEntry, FitScore, ChecklistItem, ChangelogEntry; single source of truth |
| diff.ts (new) | `scripts/monitor/diff.ts` | Structured diff + human-readable PR body generator |

### 4.5 Build-time validators

| Validator | When | Behavior |
|---|---|---|
| Frontmatter validator | `next build` | Reads every `data/firms/.../index.md`; validates against schema.ts; fails build on any malformed file |
| GitHub Actions schema check | On PR touching `data/firms/**/index.md` | Runs same validator; blocks merge |

---

## 5. Data flows

### 5.1 Visitor lands on a firm page

Static at build time except the checklist. No runtime DB calls.

1. Browser GETs `/firms/apex-funding`.
2. Next.js App Router resolves `app/firms/[slug]/page.tsx`.
3. Server-side: reads `data/firms/futures/apex-funding/index.md`, parses with `gray-matter`, validates with Zod.
4. Renders Decision Header cluster + RuleBreakdown + Changelog + PreTradeChecklist + AffiliateCTA + VerificationBadge.
5. HTML served. Client hydrates PreTradeChecklist; reads `localStorage['checklist:apex-funding']` to restore saved state.

### 5.2 Daily bot run → PR → merge → rebuild

1. GitHub Actions cron fires at 09:00 UTC.
2. `runner.ts` invokes each of 4 scrapers in parallel.
3. Each scraper fetches the firm's page, parses 6 watched fields, runs keyword catchall, returns `BotRunResult`.
4. For each result:
   - **Change detected:** `diff.ts` generates PR body with before/after + source snapshot + suggested changelog entry. `gh pr create` opens a PR labeled `bot-update`.
   - **No change:** update `last_verified` timestamp in place, commit directly to main.
   - **Error/timeout:** log to `bot_usage_log` with error string. Do NOT update `last_verified`.
5. runner.ts posts a comment on the pinned GitHub Issue: "✅ 2026-04-22 09:00 UTC — X/Y scrapers OK, Z errors."
6. Jason reviews the bot PR on GitHub, verifies against the firm's live page, merges.
7. `append-changelog.yml` workflow fires on merge: reads the PR diff, appends an entry to `decision.changelog[]`, commits back to main.
8. Vercel rebuilds and deploys. New Snapshot Bar values + changelog entry + updated `last_verified` live within minutes.

**Critical invariant:** the changelog append is automated on merge. Jason must never be the one to remember to add a changelog entry; it happens as a side effect of the merge action. This is what makes the changelog reliable over time.

### 5.3 Jason edits content manually

1. Jason edits `index.md` frontmatter locally.
2. Commits + pushes to a branch.
3. Opens PR.
4. `schema-validator.yml` workflow validates frontmatter against `schema.ts`.
5. If valid: PR green, Jason merges, Vercel rebuilds.
6. If invalid: PR red, merge blocked, Jason fixes and re-pushes.

Same validator as build-time and bot-PR checks. One schema contract across all authoring paths.

### 5.4 User interacts with Pre-Trade Checklist

1. User opens `/firms/apex-funding`.
2. `PreTradeChecklist` mounts; reads `localStorage.getItem('checklist:apex-funding')`.
3. If found, restores saved checked-state. If not, renders all unchecked.
4. User taps a checkbox; React state updates; `localStorage.setItem(...)` persists.
5. After ≥1 box checked, a "Reset for today" link is visible. Click clears state.
6. No server involvement. No account. No analytics on tap events in v1.

**Graceful degradation:** `setItem`/`getItem` wrapped in try/catch. If localStorage is disabled (private browsing) or quota exceeded, the checklist falls back to in-memory React state and works for the session.

---

## 6. Error handling

Every failure mode that can affect trust or the deploy pipeline is listed here.

| Failure | Where | Behavior |
|---|---|---|
| Firm site unreachable / timeout | Bot scraper | Return error; do NOT update `last_verified`; log to `bot_usage_log` |
| Watched field unparseable today (was fine yesterday) | Bot scraper | Return error with field name; health comment flags it; Jason inspects + updates scraper manually |
| Bot silent > 24 hours | Health-check workflow | Email Jason via GitHub notification |
| Malformed frontmatter | `next build` | Validator throws; build fails; Vercel does not deploy; previous deploy stays live |
| Malformed frontmatter in PR | GitHub Actions schema check | PR check fails; merge blocked |
| Unknown firm slug | `app/firms/[slug]/page.tsx` | Standard 404 via `notFound()` |
| Firm has no `decision` block yet | FirmDetailPage | Render placeholder "Full decision layer coming — see rules below"; data + rules + sources still render |
| Affiliate URL absent (null) | AffiliateCTA | Render nothing; no dead buttons ever |
| localStorage disabled / quota exceeded | PreTradeChecklist | Fall back to in-memory state; still works for session |
| `last_verified` > 7 days old | VerificationBadge | Amber warning "⚠ Stale — last verified N days ago"; still renders |
| Duplicate changelog entry on bot re-run | append-changelog.yml | Dedupe by `{date, field, from, to}`; skip if already present |

The one failure we do not attempt to catch in code: a rule change the bot fundamentally misses because the firm's HTML didn't change in any detectable way. That is a content-accuracy risk mitigated by a weekly manual spot-check ritual, not by automation.

---

## 7. Testing

Scoped tightly. Brand-protecting tests first; code-protecting tests second; explicit non-goals listed so scope doesn't drift.

### Must-have (ship v1 with these)

| Test | Target | Why |
|---|---|---|
| Schema validator unit tests | `schema.ts` | Schema is the single source of truth; one bad release = four firms misrendering |
| Bot diff unit tests | `diff.ts` | Wrong diffs → wrong changelog → trust damage |
| Per-firm scraper fixture tests ×4 | `scripts/monitor/<slug>.ts` | Catches field-parse regressions when firms tweak HTML |
| Build-time validator integration test | `next build` flow | Protects deploy pipeline |
| FirmDetailPage smoke test | rendering pipeline | Given valid fixture, page renders without throwing |

### Should-have (nice if time permits)

- E2E Playwright: landing → firm card → firm page → affiliate click
- PreTradeChecklist persistence: check, reload, still checked; reset, cleared
- Bot runner integration test with mocked `fetch`

### Explicit non-goals in v1

- Visual regression on Decision Header (moves too fast early)
- `/vault` graph view rendering (frozen)
- Full accessibility audit (basic keyboard nav only; full audit in v2)
- Load testing (no scale concern at launch)
- Contract testing between bot and firm-website HTML (caught by daily health check, not tests)

### Manual pre-deploy verification

Before every production deploy (not just launch), Jason personally clicks through each of the 4 firm pages on staging. 10-minute ritual. Written into `docs/manual-qa.md`.

Checks:
- Snapshot Bar values match the firm's live rules page right now
- Kill You First + Fit Score render amber, clearly labeled
- Pre-Trade Checklist items are firm-specific, not placeholder
- Affiliate CTA links to correct firm with correct UTM (or is absent if unapproved)
- Changelog in descending date order
- Last-verified timestamp present and recent

---

## 8. Deferred — explicit list of what v1 does NOT build

Locked out of v1. Each lives in a future version or is dropped entirely.

| Item | Where it lives |
|---|---|
| Chrome extension rule-change alerts | v2 |
| "How to Trade This Firm" playbook per firm | v2 |
| Stability Indicator as computed metric | v2 (UI placeholder only in v1) |
| Email alerts on rule changes | v2 |
| 10-firm coverage | v2 (v1 ships 4) |
| 15+ firm coverage | v3 |
| External contributor infrastructure at scale | v3 |
| SEO authority features (structured data, comparison pages) | v3 |
| Mobile app | out of roadmap |
| Multi-language support | out of roadmap |
| LLM chatbot / AI assistant | dropped entirely |
| Paid tier / subscriptions / gated content | dropped entirely |
| Commissioned reviews | dropped entirely |
| B2B verified-firm badges | dropped entirely |
| Strategy marketplace | belongs to a different product (not open-prop) |
| Coaching tools / trader CRM | belongs to TraderOS |

---

## 9. Success criteria (gate 1, 60 days post-launch)

Pulled from `company-roadmap-okr.md`:

| Metric | Kill threshold | Green light for v2 |
|---|---|---|
| Unique visitors (month 2) | < 200/month | ≥ 500/month |
| Bounce rate | > 80% | < 65% |
| GitHub stars | < 20 | ≥ 50 |
| Affiliate program approvals | 0/4 | 2/4+ |

Kill-gate action if triggered: freeze repo, write post-mortem, static-archive the domain. No v2 investment.

---

## 10. Constraints and assumptions

- **Day-0 gate.** v1 build does not start until physio-os v0 ships AND the V-Health meeting (end of May 2026) has been attended. If physio-os slips, v1 slips 1:1.
- **Weekly build schedule.** Mon / Fri / Sat / Sun only. Tue / Wed / Thu = trading sessions, off-limits. Realistic velocity: 8–12 hrs/week.
- **Solo build.** Jason alone. No contractor, no agency, no community labor on the critical path.
- **Existing codebase state.** 22+ PRs already merged building the Obsidian 3-panel UI. All 4 firms have wiki-shaped markdown in `data/firms/`. Monitoring bot exists but does keyword-presence-only. v1 adds layers; does not rewrite.
- **Affiliate approvals are admin, not code.** Applications must be submitted Day 1 of build. Approval lead time (weeks) is non-negotiable; v1 ships with whichever affiliates have approved and `AffiliateCTA` renders nothing for the others.
- **Trading is #0 priority.** Any week where a trading session is disrupted by v1 work is a failed week, regardless of product output.

---

## 11. Reference documents

- `docs/company-roadmap-okr.md` — business goals, OKRs, kill gates (source of truth for those)
- `docs/project-brief.md` — original product vision from 2026-03-28 (pre-pivot)
- `docs/bot.md` — existing bot infrastructure; will be extended, not replaced
- `docs/ui-guide.md` — design tokens (extend with 2 new tint tokens)
- `docs/source-reference-guide.md` — existing frontmatter sourcing conventions
- `docs/manual-qa.md` — pre-deploy verification checklist (extend for v1)
- `/Users/lego/@Lego651/life-os/Projects/open-prop/ceo-feedback-synthesis.md` — CEO 2 + CEO 3 pivot rationale
- `/Users/lego/@Lego651/life-os/Projects/open-prop/vision-diagrams.md` — 5 long-term vision diagrams
- `/Users/lego/@Lego651/open-prop-firm/docs/product-scope-v1-v2-v3.md` — Mathieu + PM scope doc

---

*End of v1 spec. Next step: writing-plans skill breaks this into feature-level implementation plans (v1-f1, v1-f2, ...).*
