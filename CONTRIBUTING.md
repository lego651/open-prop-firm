# Contributing to OpenPropFirm

Thank you for helping keep prop firm data accurate and up to date. This guide covers how to add a new firm, update existing data, run the monitoring bot locally, and what to expect from the PR review process.

## Table of Contents

1. [Adding a New Firm](#adding-a-new-firm)
2. [Updating Existing Firm Data](#updating-existing-firm-data)
3. [Running the Monitor Bot Locally](#running-the-monitor-bot-locally)
4. [PR Expectations and Labels](#pr-expectations-and-labels)
5. [Content Structure Reference](#content-structure-reference)

---

## Adding a New Firm

### 1. Create the firm directory

Firms live under `data/firms/<category>/<firm-slug>/`. Categories are `cfd` or `futures`.

```
data/firms/
  cfd/
    your-firm-name/
      index.md          ← required: overview page
      rules.md          ← required: trading rules
      promos.md         ← required: promo codes (can be empty)
      changelog.md      ← required: change history
      challenges/
        25k.md          ← one file per account size offered
        50k.md
        ...
  futures/
    your-firm-name/
      ...
```

Copy the templates from `data/_templates/` as a starting point.

### 2. Required front-matter fields

Every `.md` file must include these front-matter fields:

```yaml
---
title: 'Firm Name — Page Type'       # e.g. "Funded Next — Overview"
firm: Firm Name                       # e.g. "Funded Next"
category: cfd                         # "cfd" or "futures"
type: basic-info                      # see Content Types below
status: active                        # "active" or "inactive"
last_verified: '2026-03-29T00:00:00Z' # ISO date — when you last verified this data
verified_by: manual                   # "manual" or "bot"
sources:
  - url: 'https://thefirm.com/rules'
    label: 'Firm Name — Rules Page (Official)'
---
```

**`last_verified` is required on every page.** Set it to today's date when you add or update data.

**Sources must be first-party (official firm URLs only).** Do not add third-party review sites, blog posts, or aggregators as sources — these cannot be reliably verified by the bot.

### Content Types

| `type` value | Use for |
|---|---|
| `basic-info` | Overview / company details |
| `rules` | Trading rules and restrictions |
| `promo` | Promo codes and affiliate info |
| `challenge` | Individual account/challenge specs |
| `changelog` | Historical changes |

### 3. Link pages together with wikilinks

Use `[[slug|display text]]` syntax to link between pages:

```markdown
See also: [[firms/cfd/your-firm/rules|Trading Rules]] · [[firms/cfd/your-firm/promos|Promo Codes]]
```

Wikilinks are resolved at build time. Use the full `firms/<category>/<slug>` path.

### 4. Validate before submitting

```bash
pnpm install
pnpm run build    # runs validate-content and build-search-index as prebuild steps
```

If the build passes, your content structure is valid.

---

## Updating Existing Firm Data

1. Find the relevant file under `data/firms/`
2. Edit the data and update `last_verified` to today's date
3. If you verified via the official firm website, set `verified_by: manual`
4. Run `pnpm run build` to validate

---

## Running the Monitor Bot Locally

The monitor bot scrapes firm websites, compares against local content, and optionally opens a GitHub PR when changes are detected.

### Prerequisites

- Node.js 20+
- `pnpm` installed
- GitHub CLI (`gh`) authenticated: `gh auth login`
- Supabase service role key (for logging — optional for local runs)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env.local
# Add SUPABASE_SERVICE_ROLE_KEY if you want to log results

# 3. Run the health check (verifies connectivity)
pnpm run monitor:health

# 4. Run all scrapers
pnpm run monitor

# 5. Run a single firm only
pnpm run monitor -- --firm funded-next
```

### How the bot works

1. **Health check** — verifies Supabase connectivity and `gh` auth
2. **Scrape** — each `scripts/monitor/<firm-slug>.ts` fetches the firm's website and extracts key data points
3. **Diff** — compares scraped data against local markdown content
4. **PR** — if changes are detected, commits the updated content to a branch and opens a PR with label `bot-update`
5. **Log** — inserts a row into `bot_usage_log` in Supabase

### Adding a new firm to the bot

1. Create `scripts/monitor/<firm-slug>.ts` — implement the `run(): Promise<BotRunResult>` function
2. Register the scraper in `scripts/monitor/runner.ts`
3. Test locally: `pnpm run monitor -- --firm your-firm-slug`

See `scripts/monitor/types.ts` for the `BotRunResult` interface and an existing scraper for reference.

---

## PR Expectations and Labels

### Human contributions

- Keep PRs focused — one firm or one topic per PR
- Include the `last_verified` date you used for research
- Source all data from official firm websites
- Run `pnpm run build` before opening the PR

### Bot PRs

- Opened automatically by the monitoring workflow (Mondays, 06:00 UTC)
- Title format: `[bot] <firm-slug> — content update YYYY-MM-DD`
- Label: `bot-update`
- Review the diff carefully — bot changes should be human-verified before merge

### Labels

| Label | Meaning |
|---|---|
| `bot-update` | Opened by the monitoring bot |
| `content` | New or updated firm data |
| `bug` | Bug fix in app code |
| `infra` | CI, tooling, or infrastructure changes |

---

## Content Structure Reference

### Front-matter fields

| Field | Required | Description |
|---|---|---|
| `title` | ✓ | Full page title |
| `firm` | ✓ | Firm display name |
| `category` | ✓ | `cfd` or `futures` |
| `type` | ✓ | Content type (see above) |
| `status` | ✓ | `active` or `inactive` |
| `last_verified` | ✓ | ISO date of last verification |
| `verified_by` | ✓ | `manual` or `bot` |
| `sources` | ✓ | Array of `{url, label}` — official URLs only |
| `website` | overview only | Firm's official website |
| `founded` | overview only | Year founded |
| `headquarters` | overview only | City, Country |
| `challenge_size` | challenge pages | Account size in USD |
| `price_usd` | challenge pages | Challenge fee in USD |

### Directory layout

```
data/
  _templates/       ← copy these when adding a new firm
  legal/            ← terms of service, disclaimer
  firms/
    cfd/
      <firm-slug>/
        index.md
        rules.md
        promos.md
        changelog.md
        challenges/
          <size>.md
    futures/
      <firm-slug>/
        ...
```
