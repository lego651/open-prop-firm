# Sprint 4 — Code Review

**Reviewer:** Tech Lead / Code Auditor
**Date:** 2026-03-30
**Scope:** All code delivered in S4 commits (`cecfa92`, `2f1db2b`) plus surrounding architecture touched by S4 work
**Methodology:** Full read of all 38 changed files, cross-reference with existing codebase (49 src files, 4 scripts), build/lint/tsc validation, architectural pattern analysis

---

## Executive Summary

Sprint 4 delivered solid content and closed the S3 debt gaps as promised. The content quality is high — real sourced data, correct frontmatter, working wikilinks. The validator extension works. However, the sprint introduced and inherited several issues ranging from an **outright build blocker** (prebuild fails without env vars) to duplicated logic, missing error boundaries, and unsafe data flow patterns. This review identifies **18 findings** organized into 3 priority tiers.

---

## Findings

### Priority 1 — Build/CI Blockers and Data Integrity

---

#### R4-01: `prebuild` script is broken by `validate-env.ts` ordering

**Severity:** P1 — Build blocker
**Files:** `package.json` (line 6)

The `prebuild` script chains four commands:

```
tsx scripts/validate-content.ts && tsx scripts/validate-env.ts && tsx scripts/build-search-index.ts && tsx scripts/generate-graph-data.ts
```

`validate-env.ts` calls `process.exit(1)` if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. This kills the entire prebuild chain — including `build-search-index.ts` and `generate-graph-data.ts` which have **zero dependency on Supabase**. The content validation and static asset generation are unrelated to authentication.

In practice: any fresh clone, CI without Supabase configured, or contributor without `.env.local` cannot build the site **at all**, even though the site renders fine without Supabase (compare panel degrades gracefully with `CompareAuthGate`).

**Fix:**
- Move `validate-env.ts` out of the `prebuild` chain. Either:
  - (a) Make it a standalone `npm run check:env` script invoked only when needed, or
  - (b) Convert it to a warning (exit 0) instead of a hard fail, or
  - (c) Run it in `postinstall` or as a pre-dev hook only

**Acceptance:**
- `npm run prebuild` succeeds without any `.env.local` present
- `npm run build` succeeds without Supabase env vars
- Env validation still runs in some form before deploy (CI step or dev hook)

---

#### R4-02: `validate-content.ts` reads every file twice

**Severity:** P1 — Performance / correctness
**File:** `scripts/validate-content.ts`

The `main()` function reads each markdown file **twice**:
1. `validateFile()` at line 52 reads the file with `fs.readFileSync`
2. The recency check loop at line 257 reads the **same file again** with `fs.readFileSync`

With 33 files this is tolerable but wasteful. More importantly, the `validateFile` function uses **synchronous** `readFileSync` while the other two scripts (`build-search-index.ts`, `generate-graph-data.ts`) use **async** `readFile` from `fs/promises`. This is an inconsistency that will matter as the content set grows.

**Fix:**
- Return the parsed frontmatter from `validateFile` (or extract it before calling)
- Use the already-parsed `fm.last_verified` for the recency check instead of re-reading
- Migrate from `fs.readFileSync` to `fs/promises.readFile` + async flow for consistency with the other scripts

**Acceptance:**
- Each file is read exactly once during validation
- `validate-content.ts` uses async I/O consistently
- Recency check uses already-parsed frontmatter

---

#### R4-03: `validate-content.ts` does not validate source URLs

**Severity:** P1 — Data integrity gap
**File:** `scripts/validate-content.ts`

The validator checks that `sources` is a non-empty array and that source labels aren't placeholder text, but it **never validates** that:
- `source.url` is a valid URL (not empty string, not missing `https://`)
- `source.url` is not a generic root domain (e.g., just `https://fundednext.com` with no path)
- `source.label` is non-empty

S4's content ticket requirements explicitly stated "at least one source URL pointing to the specific official page (not root domain)." The validator doesn't enforce this — it trusts manual review entirely.

**Fix:**
- Add URL format validation: must start with `https://`
- Add a warning (not error) when a source URL is a bare root domain with no path
- Validate that both `url` and `label` are non-empty strings

**Acceptance:**
- `source.url` validated as a well-formed HTTPS URL
- Warning emitted for bare-domain source URLs (e.g., `https://fundednext.com` with no path segment)
- Empty `source.url` or `source.label` are errors

---

#### R4-04: No deduplication of graph edges

**Severity:** P2 — Data quality
**File:** `scripts/generate-graph-data.ts` (lines 54-64)

The edge extraction loop adds a new edge for every wikilink match. If page A links to page B three times (which happens — `index.md` files commonly link to the same challenge page in different sections), the graph data will contain **three identical edges**. This inflates the JSON payload and causes visual artifacts in the force-directed graph (thicker/overlapping links).

**Fix:**
- Deduplicate edges using a Set of `source:target` strings before writing to JSON
- Consider also deduplicating bidirectional edges (A→B and B→A) into a single undirected edge if that's the intended graph semantics

**Acceptance:**
- `graph-data.json` contains at most one edge per (source, target) pair
- No duplicate link lines rendered in the graph view

---

### Priority 2 — Architecture and Code Quality

---

#### R4-05: Duplicated `WIKILINK_RE` regex across two files

**Severity:** P2 — DRY violation
**Files:** `scripts/generate-graph-data.ts` (line 11), `src/lib/content/getPageContent.ts` (line 18)

Two different wikilink regexes exist:
- Script: `/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g` — captures target only
- Library: `/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g` — captures target and alias (non-greedy)

They're functionally similar but subtly different (greedy vs non-greedy quantifiers). Both should use the same regex. Having two diverging patterns means a bug fix in one won't propagate to the other.

**Fix:**
- Extract the wikilink regex and/or a `parseWikilinks(content: string)` utility into a shared module (e.g., `src/lib/content/wikilinks.ts`)
- Have both `generate-graph-data.ts` and `getPageContent.ts` import from the same source
- Scripts can import via relative path (`../src/lib/content/wikilinks`) since they already do this for types

**Acceptance:**
- Single wikilink regex definition used by both scripts and library
- Both consumers produce identical parse results for the same input

---

#### R4-06: Client fetches don't check `response.ok` before calling `.json()`

**Severity:** P2 — Error handling
**Files:** `src/components/graph/GraphViewLoader.tsx` (line 22), `src/components/search/SearchModal.tsx` (line 34)

Both components do:
```typescript
fetch(url).then((r) => r.json()).then(setData)
```

If the server returns a 404 or 500, `r.json()` will either throw (non-JSON body) or parse an error object that gets silently set as data. `ContentPanelRight` handles this correctly by checking `data.ok`, but the other two components don't check at all.

For `SearchModal`: a failed fetch silently sets Fuse to an invalid state.
For `GraphViewLoader`: a failed fetch sets `graphData` to whatever the error body is, which could crash `ForceGraph2D`.

**Fix:**
- Add `if (!r.ok) throw new Error(...)` before `.json()` in both components
- Handle the error state (show a message or retry)

**Acceptance:**
- Both components gracefully handle non-2xx responses
- Failed fetches show an error state, not silent corruption

---

#### R4-07: No `error.tsx`, `not-found.tsx`, or `loading.tsx` boundaries

**Severity:** P2 — UX gap
**Files:** `src/app/` (missing files)

The app has zero Next.js error/loading boundaries:
- No `error.tsx` — unhandled runtime errors show a white screen (or the default Next.js error overlay in dev)
- No `not-found.tsx` — invalid slugs that bypass `generateStaticParams` show the default 404
- No `loading.tsx` — no streaming/Suspense skeleton during server-side data loading

The `FirmPage` component has a try/catch, but it returns a minimal inline error message that doesn't look like it belongs to the app. A proper `error.tsx` with retry would be better.

**Fix:**
- Add `src/app/error.tsx` (client component with reset button)
- Add `src/app/not-found.tsx` (styled 404 page consistent with the app design)
- Optionally add `src/app/firms/[...slug]/loading.tsx` with skeleton layout

**Acceptance:**
- Invalid routes show a branded 404 page
- Runtime errors show a branded error page with retry option
- Both pages match the app's dark theme and design system

---

#### R4-08: `FirmPage` `generateMetadata` throws on invalid slug

**Severity:** P2 — Build/runtime error
**File:** `src/app/firms/[...slug]/page.tsx` (lines 13-24)

`generateMetadata` calls `getPageContent` which throws on missing files. The function has no try/catch. While `generateStaticParams` should prevent this at build time, any ISR revalidation or development-time navigation to an invalid slug will crash the metadata generation. The page component itself has a try/catch, but metadata doesn't.

**Fix:**
- Wrap `generateMetadata` in try/catch
- Return a sensible fallback title on failure (e.g., "Page Not Found — OpenPropFirm")

**Acceptance:**
- `generateMetadata` never throws
- Invalid slugs get a graceful fallback title

---

#### R4-09: Unsafe `data as Frontmatter` type assertion in `getPageContent`

**Severity:** P2 — Type safety
**File:** `src/lib/content/getPageContent.ts` (line 57)

```typescript
const frontmatter = data as Frontmatter
```

`gray-matter` returns `Record<string, unknown>`. This assertion tells TypeScript the shape is `Frontmatter` without any runtime validation. If a markdown file has malformed or missing frontmatter fields, the assertion passes silently and downstream code (metadata generation, rendering) will get `undefined` values where it expects strings.

The validator script catches this at prebuild time, but `getPageContent` runs at request time too (via the API route for compare panel). A runtime type guard would close the gap.

**Fix:**
- Add a `parseFrontmatter(data: Record<string, unknown>): Frontmatter` function with runtime checks (or use a schema library like `zod`)
- Throw a descriptive error if required fields are missing

**Acceptance:**
- `getPageContent` validates frontmatter shape at runtime
- Missing/malformed frontmatter produces a clear error message, not silent `undefined` fields

---

#### R4-10: `ContentPanelRight` error state doesn't surface the actual error

**Severity:** P3 — UX
**File:** `src/components/content/ContentPanelRight.tsx` (lines 44-48)

The catch block silently swallows non-abort errors:
```typescript
.catch((err) => {
  if (err.name === 'AbortError') return
  setLoading(false)
})
```

Network errors, JSON parse failures, etc. are silently hidden — `loading` becomes false but neither `content` nor `error` are set, leaving the user with an empty panel and no feedback.

**Fix:**
- Set `error` state in the catch block: `setError('Failed to load content. Check your connection.')`
- Optionally add the actual error message in development mode

**Acceptance:**
- Network/parse errors show a visible error message in the compare panel
- User is not left staring at a blank panel

---

### Priority 3 — Content Quality and Maintenance

---

#### R4-11: Third-party review sites used as primary sources

**Severity:** P3 — Content credibility
**Files:** Multiple content files

Several content files cite third-party review/aggregator sites as sources instead of the firm's own official documentation:

| File | Source | Issue |
| --- | --- | --- |
| `apex-funding/index.md` | `propfirmapp.com` | Not the official Apex website |
| `apex-funding/challenges/300k.md` | `proptradingvibes.com` | Blog post, not official |
| `lucid-funding/index.md` | `saveonpropfirms.com` | Aggregator, not official |
| `lucid-funding/rules.md` | `saveonpropfirms.com`, `quantvps.com` | Blog reviews, not official |
| `funding-pips/index.md` | `tradingfinder.com` | Aggregator |
| `funding-pips/rules.md` | `tradingfinder.com`, `thetrustedprop.com` | Third-party reviews |

The S4 tickets explicitly required "at least one source URL pointing to the specific official page." While each file does include a link to the firm's root domain, the detailed data is often sourced from third-party review sites rather than official help docs or pricing pages. This creates a credibility risk — third-party data can be outdated or inaccurate.

**Fix:**
- For each file flagged above, research the firm's official website/help center for equivalent official source URLs
- Move third-party sources to secondary position; ensure at least one primary source is an official `.com` domain page
- If official sources are paywalled or don't exist, add a note in the source label: "(third-party; official source unavailable)"

**Acceptance:**
- Every content file has at least one source URL from the firm's official domain (not just the root URL)
- Third-party sources are labeled as secondary references

---

#### R4-12: `lucid-funding` directory name mismatches firm name

**Severity:** P3 — Naming inconsistency
**Files:** `data/firms/futures/lucid-funding/` (all 7 files)

The data directory is named `lucid-funding` but the firm's operating entity is **Lucid Trading** (Lucid Trading Group LLC, at `lucidtrading.com`). The `index.md` file even contains a Note box explaining this discrepancy. This was acknowledged in the S4 commit message but not fixed.

The mismatch means:
- URL slugs are `/firms/futures/lucid-funding/...` (misleading)
- Graph node IDs reference "lucid-funding" (inconsistent with displayed firm name)
- Every wikilink targeting this firm uses the wrong name

**Fix:**
- Rename `data/firms/futures/lucid-funding/` to `data/firms/futures/lucid-trading/`
- Update all wikilinks across all content files referencing this firm
- Remove the workaround Note from `index.md`
- Verify: `npm run prebuild && npm run build` passes, graph data and search index reflect the new slug

**Acceptance:**
- Directory name matches the firm's actual trading name
- All wikilinks and cross-references updated
- No Note/disclaimer needed in the index file
- URLs read `/firms/futures/lucid-trading/...`

---

#### R4-13: Hardcoded default slug `firms/cfd/funded-next` in multiple places

**Severity:** P3 — Maintainability
**Files:** `src/hooks/useTabManager.ts` (line 59), `src/components/content/ContentPanelRight.tsx` (line 16)

Two components hardcode `firms/cfd/funded-next` as a fallback/default slug:
- `useTabManager`: when all tabs are closed, navigates to this slug
- `ContentPanelRight`: initial compare panel loads this slug

This means:
- If Funded Next is ever removed or renamed, both components break silently
- The "first firm" is not derived from the content tree — it's a magic string

**Fix:**
- Extract a `DEFAULT_SLUG` constant to `src/lib/constants.ts`
- Better: derive the default from the first firm node in `treeData` at runtime

**Acceptance:**
- No hardcoded firm slugs in component code
- Default slug derived from data or a single named constant

---

#### R4-14: `tsconfig.scripts.json` uses `commonjs` module but scripts use ESM imports

**Severity:** P3 — Configuration debt
**File:** `tsconfig.scripts.json`

The scripts tsconfig sets `"module": "commonjs"` but all four scripts use ESM-style `import` statements. This works because `tsx` transpiles ESM to CJS at runtime, but it's a lie in the config — the scripts are ESM source. If the project ever moves to native ESM (e.g., `"type": "module"` in `package.json`), this config will break.

Additionally, `"moduleResolution": "node"` was set to fix an S4 ticket, but this prevents the scripts from resolving `.ts` extension-less imports under newer resolution strategies.

**Fix:**
- Change to `"module": "nodenext"` and `"moduleResolution": "nodenext"`
- Or simply rely on the `tsx` runner and remove the scripts tsconfig entirely (tsx doesn't use it; it has its own transpilation)
- If removing, verify `npx tsc --noEmit` still passes (it uses the main tsconfig which excludes scripts from compilation)

**Acceptance:**
- Scripts tsconfig accurately reflects the module system in use
- `npm run prebuild` still works
- `npx tsc --noEmit` still passes

---

#### R4-15: No wikilink validation in the prebuild pipeline

**Severity:** P3 — Content quality gate
**Files:** `scripts/validate-content.ts`, `scripts/generate-graph-data.ts`

The validator checks frontmatter and body text but **does not validate that wikilinks resolve to existing slugs**. Broken wikilinks silently become dead links in the rendered site. The S4-07 ticket claimed "npm run build already validates wikilinks," but it doesn't — `next build` only validates that the static pages in `generateStaticParams` build successfully. Dead internal links are rendered as `<a href="/some-wrong-path">` and 404 at runtime.

The graph data script has the node set and wikilink extraction — it could emit warnings for unresolvable links, or this could be a separate validation step.

**Fix:**
- Add a wikilink resolution check to `validate-content.ts`:
  - Parse all wikilinks from each file's body
  - Resolve each target against the content tree's slug set
  - Emit an error for any unresolvable wikilink
- Alternative: add a `--check-links` flag to `generate-graph-data.ts` that warns on edges pointing to non-existent nodes

**Acceptance:**
- `npm run prebuild` fails (or warns) if any wikilink target doesn't match an existing content slug
- Zero silent dead links in the built site

---

#### R4-16: Search index excerpt truncation is naive

**Severity:** P3 — Search quality
**File:** `scripts/build-search-index.ts` (line 46)

```typescript
const excerpt = plainText.trim().slice(0, 500)
```

This takes the first 500 characters of the stripped markdown, which is often just the title repeated plus the "Company Details" table header. For challenge pages, this means the search excerpt is `Funded Next — $50k Stellar Challenge The Funded Next $50,000 Stellar Challenge is available in three variants...` — useful. But for rules pages, the first 500 chars are mostly boilerplate intro text and don't contain the keywords users would search for (like "drawdown," "hedging," "news trading").

**Fix:**
- Consider a smarter excerpt strategy: first non-heading paragraph, or first N characters after skipping the H1 title
- Or generate multiple searchable text segments and let Fuse.js search the full body (not just 500 chars)
- At minimum, strip the H1 title from the excerpt since it's already in the `title` field

**Acceptance:**
- Search excerpts contain substantive content, not just repeated titles
- Searching for "hedging" surfaces rules pages that mention it (even if it's past the 500-char mark)

---

#### R4-17: `ContentPanelRight` uses a stale closure in `closeTab`

**Severity:** P3 — Bug (edge case)
**File:** `src/hooks/useTabManager.ts` (lines 52-68)

The `closeTab` callback reads `openTabs` and `activeSlug` from the closure, but these are potentially stale because `useCallback` depends on `[openTabs, activeSlug, ...]`. This creates a new function reference on every tab change, which cascades re-renders through `TabBar`. More critically, rapid successive closes could read stale `openTabs`.

**Fix:**
- Use a functional updater pattern for `setOpenTabs` inside `closeTab` (similar to how the effect at line 43 already does)
- Derive `activeSlug` from the current state rather than the closure
- Or use `useRef` to hold the latest `openTabs` and read from the ref

**Acceptance:**
- `closeTab` always operates on the latest tab list
- Rapid successive tab closes don't produce inconsistent state
- `TabBar` doesn't re-render unnecessarily when only content changes

---

#### R4-18: No `robots.txt` or sitemap generation

**Severity:** P3 — SEO / launch readiness
**Files:** `src/app/` (missing)

The site generates 36 static pages but has:
- No `robots.txt` (search engines may or may not index)
- No `sitemap.xml` (search engines won't discover all pages efficiently)
- No `generateMetadata` at the root layout level beyond basic title/description

For a content site targeting SEO (prop firm comparison), this is a meaningful gap.

**Fix:**
- Add `src/app/robots.ts` exporting a `robots()` function
- Add `src/app/sitemap.ts` using `generateStaticParams` data to build the sitemap
- Enhance root `metadata` with `metadataBase`, Open Graph defaults, and canonical URL

**Acceptance:**
- `/robots.txt` returns proper directives
- `/sitemap.xml` lists all 36+ content pages with appropriate changefreq/priority
- Root layout sets `metadataBase` for proper OG URL resolution

---

## Summary Table

| ID | Priority | Category | Title | Est. Hours |
| --- | --- | --- | --- | --- |
| R4-01 | P1 | Build | Prebuild broken by validate-env ordering | 0.5h |
| R4-02 | P1 | Performance | validate-content reads every file twice | 1h |
| R4-03 | P1 | Data | Validator doesn't check source URLs | 1h |
| R4-04 | P2 | Data | No deduplication of graph edges | 0.5h |
| R4-05 | P2 | DRY | Duplicated wikilink regex | 1h |
| R4-06 | P2 | Error handling | Client fetches don't check response.ok | 0.5h |
| R4-07 | P2 | UX | No error/not-found/loading boundaries | 2h |
| R4-08 | P2 | Build | generateMetadata throws on invalid slug | 0.5h |
| R4-09 | P2 | Type safety | Unsafe `data as Frontmatter` assertion | 1.5h |
| R4-10 | P3 | UX | ContentPanelRight swallows errors silently | 0.5h |
| R4-11 | P3 | Content | Third-party review sites as primary sources | 2h |
| R4-12 | P3 | Naming | lucid-funding directory name mismatch | 1h |
| R4-13 | P3 | Maintainability | Hardcoded default slug in multiple places | 0.5h |
| R4-14 | P3 | Config | tsconfig.scripts.json module mismatch | 0.5h |
| R4-15 | P3 | Content | No wikilink validation in prebuild | 2h |
| R4-16 | P3 | Search | Search excerpt truncation is naive | 1h |
| R4-17 | P3 | Bug | Stale closure in closeTab callback | 1h |
| R4-18 | P3 | SEO | No robots.txt or sitemap generation | 1.5h |

**Total estimated hours: ~18h**

---

## Recommended Fix Order

```
R4-01 (prebuild fix — unblocks everything)
  └─→ R4-02 + R4-03 (validator improvements — parallel)
        └─→ R4-04 + R4-05 (data pipeline — parallel)
              └─→ R4-15 (wikilink validation — depends on R4-05)

R4-06 + R4-08 + R4-10 (error handling — all independent, parallel)
  └─→ R4-07 (error boundaries — builds on error handling patterns)
        └─→ R4-09 (runtime validation — last type safety piece)

R4-11 + R4-12 (content fixes — parallel, can be done anytime)
R4-13 + R4-14 + R4-16 + R4-17 (cleanup — parallel, low urgency)
R4-18 (SEO — pre-launch, not blocking dev)
```

---

## Notes

- **What S4 did well:** The content quality is genuinely good. Challenge parameters are detailed, rules are comprehensive, frontmatter is consistent, and wikilinks create a useful navigation web. The validator extension catches real issues. The S3 debt closure was thorough.
- **What to watch:** The content pipeline (4 sequential scripts) is getting heavy. At 33 files it's fast, but at 100+ files the synchronous reads in validate-content and the unbounded `Promise.all` in the other scripts will need attention.
- **Carry-forward risk:** R4-01 is currently masked because `.env.local` exists on the dev machine, but any fresh clone or CI environment will hit it immediately.
