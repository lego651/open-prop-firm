@AGENTS.md

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
