@AGENTS.md

## GitHub Issue Requirements

Every issue created must include:

1. **Title** — concise summary of the issue
2. **Description** — what the issue is about and why it matters
3. **Details** — steps to reproduce (bugs), implementation notes, or relevant context
4. **Acceptance Criteria** — clear, testable conditions that define "done"
5. **Label** (required) — at least one of: `bug`, `enhancement`, `feature`

The user will typically describe what they need at a high level. You are expected to flesh out the full issue (title, description, details, acceptance criteria, label) yourself. Use these escalation paths when details are unclear:

- **Tech details unclear** → consult `tech-lead` agent
- **UI/design unclear** → check the UI guide first, then consult `design-system-architect` agent if still unclear
- **Product questions** → consult `product-manager` agent

If none of the above resolves the ambiguity, then ask the user for clarification before starting work.

## UI Guide Rule

Before writing any frontend/UI code, consult `docs/ui-guide.md` for exact design tokens. All colors, fonts, spacing, and component styles must match the Obsidian design tokens specified there. Key requirements:

- **Colors:** Use exact hex values from the Obsidian base scale (e.g., dark bg `#1e1e1e`, text `#dadada`, border `#363636`)
- **Accent:** `hsl(254, 80%, 68%)` — purple, computed as `#7f6df2` (dark) / `#705dcf` (light)
- **Typography:** Inter font, 16px body, em-based heading scale (H1=2em, H2=1.6em, H3=1.37em, H4=1.25em, H5/H6=1.12em)
- **Monospace:** `Menlo, SFMono-Regular, Consolas, "Source Code Pro", monospace` — NOT JetBrains Mono
- **Spacing:** 4px grid system, `1rem` paragraph spacing
- **Blockquotes:** 2px left border, transparent bg, normal font style (NOT italic)
- **Tables:** Transparent bg, normal weight headers (400), muted header color
- **Bold:** `font-weight: 600` (semibold, not 700)

When in doubt, check `docs/spike/spike-obsidian-ui-tokens.md` for the source values.

## Git Commit Conventions

Prefix every commit message based on context:

- `[s1]` — working on Sprint 1 tickets (s1-tickets.md)
- `[s2]`, `[s3]`, etc. — working on the corresponding sprint
- `[bug]` — fixing a bug outside of sprint ticket work

## Known Pitfalls

### Do NOT use `@portaljs/remark-wiki-link`

This package depends on `micromark-util-symbol@1.x` / `micromark@3.x` internals but our
stack runs `remark-parse@11` → `micromark@4.x` → `micromark-util-symbol@2.x`. The major
version mismatch corrupts the parser stack at build time, crashing every page that contains
a `[[wikilink]]` with `TypeError: Cannot read properties of undefined (reading 'data')`.

**Fix (already applied):** Wikilinks are resolved by a simple regex preprocessor
(`resolveWikilinks()` in `src/lib/content/getPageContent.ts`) that converts `[[target|alias]]`
to standard markdown links _before_ the unified pipeline runs. Do not re-introduce the
`@portaljs/remark-wiki-link` package.
