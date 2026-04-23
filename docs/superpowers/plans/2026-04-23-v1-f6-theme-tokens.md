# v1-f6 — Theme Tokens (Opinion + Action Tints) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four theme tokens per theme — `--opinion-tint-bg`, `--opinion-tint-border`, `--action-tint-bg`, `--action-tint-border` — to `src/styles/themes.css` and document them in `docs/ui-guide.md` so v1-f7 (Decision Header) and v1-f8 (data + action components) can render amber-tinted opinion blocks and green-tinted action blocks out of the box.

**Architecture:** Pure token addition — no new components, no behavior change, no JS. Light / dark / blue themes each gain four new CSS custom properties with color values hand-picked to harmonize with the existing Obsidian base scale. `docs/ui-guide.md` grows one new subsection (§6.5 "Opinion + Action Tints") plus a row in the token reference. No existing tokens or code paths are touched.

**Tech Stack:** CSS custom properties, Markdown docs.

---

## Spec traceability

- **Spec §3.4 / §4.2** "OPINION LAYER bg: amber-tinted" and "ACTION LAYER bg: green-tinted" on the three-layer firm page architecture.
- **Spec §3.4 / §4.3 closing** "Visual separation uses two new theme tokens (`--opinion-tint` amber, `--action-tint` green) added to the existing token set from `docs/ui-guide.md`."

Token-name deviation from the spec: the spec says `--opinion-tint` + `--action-tint` (single tokens). The plan adds `*-bg` + `*-border` pairs because (a) downstream components will need a border distinct from the body surface to create visual separation from the neutral data layer, and (b) the existing codebase uses the same `{name}-bg` / `{name}-border` naming pattern for similar semantic groupings (e.g. `--verified-badge-bg` / `--verified-badge-border` / `--verified-badge-fg` in `src/styles/themes.css:65-67`). Two tokens per tint is still "two new theme tokens" in spirit — it's one bg + one border per tint, matching what the spec's diagram implies (background color + subtle boundary).

If v1-f7/f8 later discovers they also need a tinted foreground (label color), they can add `--opinion-tint-fg` + `--action-tint-fg` at that time. Deferred to keep v1-f6 minimal.

---

## File structure

**Modified files:**
- `src/styles/themes.css` — append four tokens to each of the three theme blocks (light, dark, blue). +12 lines total.
- `docs/ui-guide.md` — add a new subsection §6.5 "Opinion + Action Tints" after §6.4 "Adding a New Theme". ~40 lines.

**No new files. No component changes. No JS/TS.**

---

## Token color reference (locked before implementation)

Hand-picked to sit within the existing Obsidian-derived palette. Amber tint borrows hue from Obsidian's `--color-orange` (`#ec7500` light / `#e9973f` dark); green tint mirrors the existing `--verified-badge-bg` pattern (`#eff7f2` light / `#1e2d24` dark).

### Light theme

| Token                     | Value      | Rationale                                                                |
|---------------------------|------------|--------------------------------------------------------------------------|
| `--opinion-tint-bg`       | `#fdf7e7`  | Very subtle amber surface; contrasts cleanly with `#ffffff` `--background`. |
| `--opinion-tint-border`   | `#e7d9a9`  | One hue-step deeper than the bg; matches amber family.                   |
| `--action-tint-bg`        | `#eff7f2`  | Matches the existing `--verified-badge-bg` for visual consistency.       |
| `--action-tint-border`    | `#b8dec8`  | Matches the existing `--verified-badge-border`.                          |

### Dark theme

| Token                     | Value      | Rationale                                                                 |
|---------------------------|------------|---------------------------------------------------------------------------|
| `--opinion-tint-bg`       | `#2a230f`  | Dark amber surface; sits above `#1e1e1e` `--background` by a few luminance steps. |
| `--opinion-tint-border`   | `#4a3a18`  | Subtle amber boundary against `#363636` `--border`.                       |
| `--action-tint-bg`        | `#1e2d24`  | Matches the existing dark-mode `--verified-badge-bg`.                     |
| `--action-tint-border`    | `#2d4a38`  | Matches the existing dark-mode `--verified-badge-border`.                 |

### Blue theme

| Token                     | Value      | Rationale                                                                |
|---------------------------|------------|--------------------------------------------------------------------------|
| `--opinion-tint-bg`       | `#1f1a08`  | Dark amber surface that sits above `#0d1117` `--background`.             |
| `--opinion-tint-border`   | `#3a3018`  | Slightly lighter amber for subtle boundary.                              |
| `--action-tint-bg`        | `#0d1f2d`  | Matches the existing blue-mode `--verified-badge-bg`.                    |
| `--action-tint-border`    | `#133d5e`  | Matches the existing blue-mode `--verified-badge-border`.                |

---

## Task 1: Add opinion + action tint tokens to all three theme blocks

**Files:**
- Modify: `src/styles/themes.css` — append four CSS custom properties at the end of each of the three `[data-theme='…']` blocks. The file has three themes (light, dark, blue), so this is 3 × 4 = 12 additions, grouped per theme.

Current file ends each theme block with `--file-type-promo`. Insert the four new tokens RIGHT AFTER `--file-type-promo` in each block, prefixed with a `/* Decision page tints (v1-f6) */` section header so they're discoverable.

### Step 1 — Edit the light theme block

Using the Edit tool, locate this exact text (the light theme's final block):

```css
  /* File type colors */
  --file-type-promo: #2a9d4e;
}

/* ─────────────────────────────────────────
   DARK THEME (default)
```

Replace with:

```css
  /* File type colors */
  --file-type-promo: #2a9d4e;

  /* Decision page tints (v1-f6) — consumed by v1-f7 Decision Header + v1-f8 action components */
  --opinion-tint-bg: #fdf7e7;       /* subtle amber surface */
  --opinion-tint-border: #e7d9a9;   /* one hue-step deeper than bg */
  --action-tint-bg: #eff7f2;        /* matches --verified-badge-bg */
  --action-tint-border: #b8dec8;    /* matches --verified-badge-border */
}

/* ─────────────────────────────────────────
   DARK THEME (default)
```

### Step 2 — Edit the dark theme block

Locate:

```css
  /* File type colors */
  --file-type-promo: #3fb950;
}

/* ─────────────────────────────────────────
   BLUE THEME (GitHub-inspired, non-Obsidian)
```

Replace with:

```css
  /* File type colors */
  --file-type-promo: #3fb950;

  /* Decision page tints (v1-f6) — consumed by v1-f7 Decision Header + v1-f8 action components */
  --opinion-tint-bg: #2a230f;       /* dark amber surface */
  --opinion-tint-border: #4a3a18;   /* subtle amber boundary */
  --action-tint-bg: #1e2d24;        /* matches --verified-badge-bg */
  --action-tint-border: #2d4a38;    /* matches --verified-badge-border */
}

/* ─────────────────────────────────────────
   BLUE THEME (GitHub-inspired, non-Obsidian)
```

### Step 3 — Edit the blue theme block

The blue theme's final line is `--file-type-promo: #4ade80;` followed by the closing `}`. There's no subsequent theme block, so the edit needs to match the last closing brace cleanly.

Locate:

```css
  /* File type colors */
  --file-type-promo: #4ade80;
}
```

Replace with:

```css
  /* File type colors */
  --file-type-promo: #4ade80;

  /* Decision page tints (v1-f6) — consumed by v1-f7 Decision Header + v1-f8 action components */
  --opinion-tint-bg: #1f1a08;       /* dark amber surface */
  --opinion-tint-border: #3a3018;   /* subtle amber boundary */
  --action-tint-bg: #0d1f2d;        /* matches --verified-badge-bg */
  --action-tint-border: #133d5e;    /* matches --verified-badge-border */
}
```

Note the blue theme is at the END of the file — make sure the final `}` is preserved (no trailing comma, no accidental double-close).

### Step 4 — Verify the file still parses

Run a minimal sanity check — the file is pure CSS so the test suite doesn't cover it, but Next.js's build step validates it at prebuild time via `tailwindcss` compilation.

```bash
pnpm tsc --noEmit
```

Expected: clean. (Not a CSS check, but catches any TS/JSX files that accidentally got touched.)

```bash
grep -c '^  --opinion-tint-bg:' src/styles/themes.css
```

Expected: `3` (one per theme).

```bash
grep -c '^  --action-tint-bg:' src/styles/themes.css
```

Expected: `3`.

```bash
grep -c '^  --opinion-tint-border:' src/styles/themes.css
```

Expected: `3`.

```bash
grep -c '^  --action-tint-border:' src/styles/themes.css
```

Expected: `3`.

### Step 5 — Commit

```bash
git add src/styles/themes.css
git commit -m "$(cat <<'EOF'
feat: v1-f6 opinion + action tint tokens across three themes

Adds four CSS custom properties per theme (light / dark / blue):
--opinion-tint-bg + -border, --action-tint-bg + -border. Pre-positions
the Decision Header cluster (v1-f7) and action components (v1-f8) to
render amber-tinted opinion blocks and green-tinted action blocks with
no component-level color decisions. No behavior change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Document the new tokens in docs/ui-guide.md

**Files:**
- Modify: `docs/ui-guide.md` — add a new subsection `### 6.5 Opinion + Action Tints` immediately after the existing `### 6.4 Adding a New Theme` section.

### Step 1 — Locate the insertion point

`docs/ui-guide.md:964` starts `### 6.4 Adding a New Theme`. The section continues through line ~975 and ends before `## 7. Typography` at line 977. The new §6.5 goes between the end of §6.4 and the start of §7.

Use the Read tool to view lines 964–977 and confirm the exact text of the last line of §6.4, which will be the anchor for the Edit. Typically it's the closing of a code block followed by a blank line before `## 7. Typography`.

### Step 2 — Insert the new §6.5 subsection

Append this block immediately before `## 7. Typography`:

```markdown
### 6.5 Opinion + Action Tints

The firm detail page (`/firms/<slug>`) is rendered as three stacked layers — **data** (neutral), **opinion** (amber-tinted), and **action** (green-tinted). Two theme-token families separate the opinion and action layers visually from the neutral data above them.

**Token reference (defined in `src/styles/themes.css`):**

| Token                    | Purpose                              | Light      | Dark       | Blue       |
|--------------------------|--------------------------------------|------------|------------|------------|
| `--opinion-tint-bg`      | Surface for OPINION layer blocks     | `#fdf7e7`  | `#2a230f`  | `#1f1a08`  |
| `--opinion-tint-border`  | Subtle border separating from data   | `#e7d9a9`  | `#4a3a18`  | `#3a3018`  |
| `--action-tint-bg`       | Surface for ACTION layer blocks      | `#eff7f2`  | `#1e2d24`  | `#0d1f2d`  |
| `--action-tint-border`   | Subtle border separating from opinion| `#b8dec8`  | `#2d4a38`  | `#133d5e`  |

**Usage contract for v1-f7 / v1-f8 components:**

- `<KillYouFirstList>`, `<FitScoreTable>`, and any future "founder's opinion" block use `background: var(--opinion-tint-bg)` and `border: 1px solid var(--opinion-tint-border)`. Label text (e.g. "Founder's opinion") stays `var(--muted-foreground)`.
- `<PreTradeChecklist>`, `<AffiliateCTA>`, and any future "action" block use `background: var(--action-tint-bg)` and `border: 1px solid var(--action-tint-border)`.
- Foreground text inside both layers inherits the theme's `var(--foreground)` — do NOT override text color from the tint palette. If a future component needs a tinted label color, add `--opinion-tint-fg` / `--action-tint-fg` at that time; do not invent ad-hoc colors.
- Do not apply tint tokens to the DATA layer (Snapshot Bar, RuleBreakdown, Changelog). The data layer uses the neutral `var(--background)` so the three-layer separation is legible.

**Accessibility:**

Both tint backgrounds are low-saturation and designed to preserve WCAG AA contrast against `var(--foreground)`:
- Light: `#fdf7e7` bg + `#222222` fg → contrast ratio ~14:1 (far above AA's 4.5:1 threshold).
- Dark: `#2a230f` bg + `#dadada` fg → contrast ratio ~11:1.
- Blue: `#1f1a08` bg + `#e6edf3` fg → contrast ratio ~14:1.

If a future component adds a semi-transparent overlay on top of a tint, re-run a contrast check (WebAIM contrast checker is fine) before merging.
```

### Step 3 — Verify the doc still reads clean

- `wc -l docs/ui-guide.md` should grow by roughly 40 lines.
- Visually skim: the new §6.5 sits between §6.4 and §7 with no broken heading levels.
- `grep -n '^## \|^### ' docs/ui-guide.md | head -50` — confirm `### 6.5 Opinion + Action Tints` appears in the correct position.

### Step 4 — Commit

```bash
git add docs/ui-guide.md
git commit -m "$(cat <<'EOF'
docs: v1-f6 document opinion + action tint tokens in ui-guide

New §6.5 subsection documents the four new tokens, the light/dark/blue
values, a usage contract for v1-f7 / v1-f8 downstream consumers, and a
contrast check confirming WCAG AA compliance across all three themes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Visual smoke-test

No unit tests — CSS tokens have no behavior. Validation is: does Next.js build cleanly, and do the new tokens actually resolve in the browser's computed styles?

### Step 1 — Build check

```bash
pnpm build
```

Expected: build completes with no CSS errors. Tailwind's compiler parses `src/app/globals.css` which imports `src/styles/themes.css`. If there's a syntax error in our new tokens (missing semicolon, unbalanced brace), the build fails loudly here.

Allow known warnings (pre-existing React-hook lints in `src/components/content/ContentPanelRight.tsx` surface on some Next.js versions — those are not introduced by this PR).

### Step 2 — Dev server + devtools spot-check

```bash
pnpm dev
```

Open `http://localhost:3000/vault` (or any page — the tokens are defined globally). In browser devtools:

1. Select `<html>`.
2. In the Styles panel, filter by `tint`.
3. Confirm all four tokens resolve:
   - `--opinion-tint-bg`
   - `--opinion-tint-border`
   - `--action-tint-bg`
   - `--action-tint-border`

Expected computed values depend on `data-theme`:
- If `data-theme="dark"` (default): `#2a230f`, `#4a3a18`, `#1e2d24`, `#2d4a38`
- Toggle the data-theme attribute in the Elements panel and confirm values change correctly.

If devtools show "(unset)" or a wrong value, the token didn't land in that theme block — fix and re-verify.

### Step 3 — Take a screenshot (optional, nice for PR body)

```bash
# from devtools, select <html>, take a "node screenshot" of the computed styles pane
```

Attach to the PR if you want. Not required.

### Step 4 — Stop the dev server

Ctrl-C out of `pnpm dev`. No file changes expected from this task; verify:

```bash
git status --short
```

Expected: clean tree.

No commit needed for this task — it's verification only.

---

## Task 4: Push + PR

### Step 1 — Full test + type check

```bash
pnpm tsc --noEmit
pnpm test
```

Expected: tsc clean, all tests pass (no test count change — this is a CSS+docs change). Lint may show the pre-existing warnings; ignore.

### Step 2 — Commit the plan doc

```bash
git add docs/superpowers/plans/2026-04-23-v1-f6-theme-tokens.md
git commit -m "$(cat <<'EOF'
docs: v1-f6 plan

Reference artifact kept alongside the v1-f1..f5 plans.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Step 3 — Push

```bash
git push -u origin feat/v1-f6-theme-tokens
```

(Assumption: the implementer starts on a fresh branch `feat/v1-f6-theme-tokens` off `main`.)

### Step 4 — Open the PR

```bash
gh pr create --title "feat: v1-f6 theme tokens — opinion + action tints" --body "$(cat <<'EOF'
## Summary

Adds four CSS custom properties per theme — \`--opinion-tint-bg\` / \`--opinion-tint-border\` / \`--action-tint-bg\` / \`--action-tint-border\` — across the light / dark / blue themes in \`src/styles/themes.css\`. Pre-positions v1-f7 (Decision Header) and v1-f8 (data + action components) to render amber-tinted opinion blocks and green-tinted action blocks without component-level color decisions.

## What shipped

- \`src/styles/themes.css\` (+12 lines across 3 theme blocks)
- \`docs/ui-guide.md\` (new §6.5 Opinion + Action Tints with token table, usage contract, and WCAG contrast check)
- \`docs/superpowers/plans/2026-04-23-v1-f6-theme-tokens.md\` — plan artifact.

## Design notes

- Token-name deviation from spec §3.4: \`--opinion-tint\` single-token becomes \`--opinion-tint-bg\` + \`--opinion-tint-border\` pair, matching the existing \`--verified-badge-bg\` / \`--verified-badge-border\` convention in the same file.
- Color values hand-picked to harmonize with Obsidian's base scale. Light + dark action tints reuse the exact hex values as the existing \`--verified-badge\` palette for visual consistency with "verified" metadata across the site.
- No foreground token (\`--opinion-tint-fg\`) yet — v1-f7/f8 components can use inherited \`var(--foreground)\` for body text and \`var(--muted-foreground)\` for labels. Add later if needed.

## Test plan

- [x] \`pnpm build\` clean — no CSS syntax errors
- [x] \`pnpm tsc --noEmit\` clean
- [x] \`pnpm test\` — test count unchanged
- [x] Devtools spot-check — all four tokens resolve across dark / light / blue themes
- [ ] After merge: v1-f7 opens a PR that renders KillYouFirstList with \`var(--opinion-tint-bg)\` — first real consumer

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (performed by plan author)

**1. Spec coverage:**
- [x] §3.4 / §4.2 "OPINION LAYER bg: amber-tinted" → `--opinion-tint-bg` Task 1.
- [x] §3.4 / §4.2 "ACTION LAYER bg: green-tinted" → `--action-tint-bg` Task 1.
- [x] §3.4 closing "two new theme tokens added to the existing token set from `docs/ui-guide.md`" → Task 2 documents the addition in the exact location.
- [x] Dark-mode variants → Task 1 adds values to dark + blue theme blocks as well as light.

**2. Placeholder scan:** None. Every color value is hand-specified, every edit has a target text block with enough context to uniquely match.

**3. Type consistency:**
- Token names are identical across all three themes (`--opinion-tint-bg`, `--opinion-tint-border`, `--action-tint-bg`, `--action-tint-border`).
- The `feat(v1-f6):` commit prefix is used in Task 1 / 2 commit messages, matching the repo's convention from v1-f4 / v1-f5.

**4. Scope:**
- 2 modified files, 1 new plan doc, 0 new deps, 0 new components, 0 tests. Pure token + docs addition. Feature is intentionally narrow — Jason can unblock v1-f7 / v1-f8 in under an hour.
