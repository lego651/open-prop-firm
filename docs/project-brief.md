# OpenPropFirm — Project Brief

## Origin Story (for README / branding)

Founder personally used Obsidian to track prop firm info. A friend was amazed — "I didn't know everyone didn't do this." Decided to open-source the vault so all prop firm traders can benefit. The site IS the public version of that personal Obsidian vault.

## What It Is

An open-source, community-maintained information hub for prop firm traders. Obsidian-style UI. Content is free. Monetization comes later via affiliate promo codes and potentially paid features (TBD).

## Core Principles

- No firm bias. We render public facts with source links. Traders do their own due diligence.
- Every piece of content has a source URL and a `last_verified` timestamp.
- If users clone `/data` folder into their own Obsidian, they get the same experience as the website.
- Community contributes via GitHub PRs, just like any open-source project.

---

## Tech Stack

- **Frontend**: Next.js + TypeScript + shadcn/ui, deployed on Vercel (preview + prod)
- **Database**: GitHub repo itself — `/data` folder = all markdown content
- **Markdown**: Must be Obsidian-compatible (`[[wikilinks]]`, YAML frontmatter, standard markdown tables)
- **Auth**: Supabase (for future paid/gated features — not needed for v1 content browsing)
- **Payments**: Stripe (v2, TBD scope)
- **Monitoring bot**: GitHub Actions + LLM scraping → auto PR when firm content changes
- **No Vercel cron** — use GitHub Actions or n8n or similar free tools

---

## UI Layout (Obsidian-style, 3-panel)

### Panel 1 — Left Nav (fixed width)

- Collapsible file tree, same as Obsidian
- Search (global, full-text, highlights matches like Obsidian)
- Organized by firm type (CFD / Futures) → firm → content type

### Panel 2 — Main Content (center, draggable width)

- Renders markdown with Obsidian-compatible syntax
- Supports `[[wikilinks]]` as internal navigation
- Shows `last_verified` timestamp + source links on every page

### Panel 3 — Right Panel (graph OR second content panel)

- Default: Graph view (nodes = files, edges = `[[wikilinks]]`)
- Can switch to a second content panel to compare two pages side by side
- Toggle behavior same as Obsidian stacked editor (button on right sidebar)
- Drag resize between panel 2 and panel 3

### Themes

- Light (default), Dark, Blue — v1
- More themes in v2
- CSS variable-based theming (Obsidian-compatible approach)
- User preference stored in localStorage

### Search

- Global full-text search across all /data markdown files
- Same UX as Obsidian: fuzzy match, highlights keyword in results
- Build-time index (e.g. Pagefind or Fuse.js) — tech-lead to decide

---

## Content Model

### Firms (v1)

**CFD:**

- Funded Next
- Funding Pips

**Futures:**

- Apex Funding
- Lucid Funding

### Content Types Per Firm

```
/data/
  firms/
    cfd/
      funded-next/
        index.md          # basic info (overview, website, founding, contacts)
        challenges/
          10k.md
          50k.md
          100k.md
          ...
        rules.md          # current active rules
        promos.md         # current active promo codes (with expiry dates)
        changelog.md      # history of rule/promo/challenge changes with timestamps
    futures/
      apex-funding/
        ...
```

### Frontmatter Schema (every file)

```yaml
---
title: 'Funded Next — $50k Challenge'
firm: funded-next
type: challenge # basic-info | challenge | rules | promo | changelog
last_verified: 2026-03-28T10:00:00Z
verified_by: bot | manual
sources:
  - url: https://fundednext.com/challenges
    label: 'Official Challenge Page'
tags: [cfd, challenge, 50k]
---
```

### Sourcing Rules

- Every factual claim needs a source URL (inline footnote OR frontmatter sources array)
- Promo codes include: code, discount description, expiry date (if known), source link
- Challenge tiers include: price, profit target, drawdown rules, payout rules, source link

---

## Graph View Logic

- Nodes = markdown files
- Edges = `[[wikilink]]` references between files
- Heavier/larger nodes = more inbound links (more referenced = more important)
- Same force-directed layout as Obsidian
- Clicking a node opens that page (in panel 2 or panel 3 depending on current state)
- Tech-lead to decide rendering library (e.g. D3.js, react-force-graph, etc.)

---

## Monitoring / Auto-Update Bot

- Runs daily via GitHub Actions (free tier)
- Scrapes official firm websites for: challenge prices, rules, promo codes, expiry dates
- Uses LLM (or structured parsing) to detect changes vs current markdown
- If change detected: opens a PR with the diff
- Founder manually reviews and merges PR
- Merging PR triggers Vercel redeploy, which updates `last_verified` timestamps
- n8n or other free automation tools are acceptable alternatives

---

## Search

- Global, full-text, across all /data markdown files
- Keyword highlighting in results
- Obsidian-style UX: Cmd+K or search icon opens search modal
- Tech-lead to decide: Pagefind (static, zero-cost) vs Fuse.js vs Algolia free tier

---

## Monetization Strategy

### v1 (launch)

- Affiliate promo codes: displayed on promos pages, users encouraged to use "our code"
- Some firms auto-assign codes when you apply as affiliate — no formal deal needed to start
- No paywall, no login required for browsing

### v2 (TBD — needs CEO + PM alignment)

- Chatbot: cross-firm LLM assistant ("compare Apex vs Lucid drawdown rules")
- Possibly gate stacked panels / graph view behind login (free signup, not paid)
- Paid tier features TBD — CEO to define what's worth paywalling

---

## License (TBD — needs CEO decision)

- Goal: community can contribute content freely
- Goal: prevent someone from forking the whole project and running a paid competitor
- Options: MIT, AGPL, BSL, dual-license (CC-BY for /data, restrictive for /src)
- Reference: many open-source SaaS projects (Ghost, Plausible, Cal.com) use AGPL or similar

---

## Legal / Disclaimers

- Every page has a disclaimer: info is sourced from public websites, verify before trading
- `last_verified` timestamp on every page lets users know data freshness
- No liability for stale data — user is responsible for due diligence
- Terms of Service page required before launch
- Firm websites' scraping ToS: not a current concern (public info)

---

## Key Constraints

1. All markdown MUST be Obsidian-compatible (wikilinks, YAML frontmatter, standard markdown)
2. `/data` folder cloneable into Obsidian = same experience as website
3. No secrets in the repo (API keys go in Vercel env vars or GitHub Actions secrets)
4. Free tools preferred for monitoring/automation
5. Vercel for deployment (preview + prod)

---

## Sprint Target

6 sprints total. No fixed timeline — ship when it's right.
Founder is experienced, ships fast with AI assistance.

## Kill / Maintain Metrics (to be defined by CEO)

- TBD — CEO to set OKRs, growth targets, and kill conditions
