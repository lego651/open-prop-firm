# Sprint 3 Tickets — OpenPropFirm

**Sprint Goal:** Content renders. A user who navigates to any firm page sees fully-rendered markdown — wikilinks resolved, verified badge shown, source footnotes listed. Search opens with Cmd+K and returns results. Graph view displays real node/edge data. The shell is clean, accessible, and keyboard-navigable.

**Status:** Final — PM drafted, Tech Lead challenged, decisions incorporated 2026-03-29

**Reviewed by:** PM + Tech Lead (full challenge session, all open questions resolved)

---

## Key Decisions Made in Challenge Session

| Decision | Choice | Rationale |
| --- | --- | --- |
| P0/P1 fixes from S2 review | Drop S3-01–S3-05 (already resolved in S2 final commit) | S2 final commit resolves all 22 findings from s2-review.md |
| Verification ticket | Single S3-01 to confirm all S2 fixes landed correctly | Fast green-light gate before Sprint 3 builds on top |
| `useTabManager` storageKey | Add `storageKey` param to decouple compare panel's tab state (S3-06a) | Compare panel needs independent tab list from main panel |
| AppShell cleanup | Collapse remaining S2 cleanup into S3-06b after storageKey lands | No behavior change — code quality only |
| `Frontmatter` type | Explicit step in S3-07 before `getPageContent` is written | Type must be defined before functions that return it |
| Root redirect | Already in `next.config.ts` — S3-08 does NOT recreate it | Confirmed present; ticket scope is FirmPage RSC only |
| Promo validity field | Read from CSS class derived from frontmatter, not re-validated at render | `status` field on frontmatter drives the CSS class; no runtime validation |
| Search excerpt stripping | Use `strip-markdown` npm package in prebuild script | Avoids writing a custom markdown stripper; well-maintained |
| Search prebuild hook | Append `&& tsx scripts/build-search-index.ts` to existing `prebuild` line in `package.json` | Existing prebuild already runs validate-content + validate-env |
| SearchModal open state | `isSearchOpen` / `setIsSearchOpen` in AppShell, prop-drilled to ContentPanel → TabBar | No context needed; one extra prop through two components |
| `command` + `dialog` UI components | Already installed (`src/components/ui/command.tsx`, `src/components/ui/dialog.tsx`) | Confirmed present — skip install step |
| `generateStaticParams` export | Must be added to FirmPage in S3-15 (currently present but needs `validSlugs` plumbing) | Needed to pass `slugToPathMap` from RSC into MarkdownRenderer |
| `ContentApiResponse` type | Add to `types/content.ts` in S3-15 as explicit step | Typed contract between RSC and client components |
| GraphPanel Suspense boundary | Suspense wraps `ContentPanelRight` (compare tab content) in AppShell / GraphPanel area | Prevents compare tab load from blocking graph canvas |
| `useTabManager` in compare panel | Reuses `useTabManager` hook with `storageKey: 'compareTab'` | Single hook, two instances, isolated state |
| Wikilink remark plugin | Use `@portaljs/remark-wiki-link` (maintained fork) | `remark-wiki-link` is unmaintained; `@portaljs` fork is actively maintained |
| VerifiedBadge placement | Sibling RSC rendered before MarkdownRenderer in FirmPage | Not injected into HTML; stacked: `<VerifiedBadge /> + <MarkdownRenderer /> + <SourceFootnotes />` |
| Arrow key navigation | Required in S3 — P1 accessibility | Tree must be fully keyboard-navigable per WAI-ARIA tree pattern |
| Graph data script | `scripts/generate-graph-data.ts` in S3 — GraphView renders real data by end of sprint | Stub replaced; `public/graph-data.json` generated at prebuild |

---

## Sprint 3 Dependency Order

```
S3-01 (verify S2 fixes — gate for all S3 work)
  └─→ S3-06a (useTabManager storageKey param — prerequisite for compare panel)
        └─→ S3-06b (AppShell cleanup — uses storageKey, removes dead code)

S3-01
  └─→ S3-07 (Frontmatter type + getPageContent utility)
        └─→ S3-08 (FirmPage RSC — VerifiedBadge + MarkdownRenderer + SourceFootnotes)
              ├─→ S3-09 (VerifiedBadge component)       ┐
              ├─→ S3-10 (MarkdownRenderer component)     │ parallel after S3-07
              └─→ S3-11 (SourceFootnotes component)      │
                    │                                    ┘
                    └─→ S3-15 (FirmPage wires all three + ContentApiResponse type)

S3-01
  └─→ S3-02 (keyboard navigation — NavFileTree arrow keys)

S3-01
  └─→ S3-12 (build-search-index.ts script)
        └─→ S3-13 (SearchModal component)
              └─→ S3-14 (wire Cmd+K in AppShell + TabBar)

S3-01
  └─→ S3-16 (generate-graph-data.ts script)
        └─→ S3-17 (GraphView component — react-force-graph-2d)
              └─→ S3-18 (wire GraphView into GraphPanel + Suspense boundary)

S3-06a (storageKey)
  └─→ S3-19 (ContentPanelRight — compare tab panel using useTabManager)
        └─→ S3-20 (wire ContentPanelRight into GraphPanel compare mode)
```

---

## Parallel Execution Guide

After S3-01 passes, the following groups can be built simultaneously by separate engineers or in separate sessions:

**Stream A — Accessibility (no content deps)**
- S3-02 (keyboard nav)

**Stream B — Content pipeline (sequential within stream)**
- S3-07 → S3-09, S3-10, S3-11 (parallel) → S3-15 (S3-08 wires all three)

**Stream C — Search (no content deps)**
- S3-12 → S3-13 → S3-14

**Stream D — Graph (no content deps)**
- S3-16 → S3-17 → S3-18

**Stream E — Compare panel**
- Requires S3-06a first, then S3-19 → S3-20

S3-06b (cleanup) can be picked up any time after S3-06a merges — it has no downstream blockers.

---

## Group A — Fixes / Verification

---

### S3-01: Verify S2 review fixes landed correctly

**Goal:** Confirm that all 22 findings from `docs/s2-review.md` were resolved in the final S2 commit before Sprint 3 builds on top. This ticket produces a written checklist, not code.

**Scope:**

- Read `docs/s2-review.md` findings R2-01 through R2-22
- For each finding, verify the fix is present in the current codebase:
  - R2-01: `useState` initializers use static defaults; `useEffect` reads localStorage on mount — check `AppShell.tsx`, `NavFileTree.tsx`
  - R2-02: `viewportWidth` initialized to `0` or constant; corrected in resize `useEffect` — check `useViewport.ts`
  - R2-03: TabBar tabs use `<div role="tab">` not nested `<button>` — check `TabBar.tsx`
  - R2-04: Hamburger button wired to `onHamburger` prop — check `AppShell.tsx`, `TabBar.tsx`
  - R2-05: Mobile overlay passes `collapsed={false}` — check `AppShell.tsx`
  - R2-06: `min-w-[400px]` is responsive (`min-w-0 md:min-w-[400px]`) — check `AppShell.tsx`
  - R2-07: All `<button>` elements have `type="button"` — check `BreadcrumbBar.tsx`, `GraphPanel.tsx`, `CompareAuthGate.tsx`
  - R2-08: NavFileTree has `role="treeitem"`, `tabIndex`, `onKeyDown` — check `NavFileTree.tsx` (note: S3-02 adds arrow keys; R2-08 adds base accessibility)
  - R2-09: Resize listener uses `requestAnimationFrame` debounce — check `useViewport.ts`
  - R2-10: ResizeHandle uses local ref during drag, commits on `pointerUp` — check `ResizeHandle.tsx`
  - R2-11: AppShell under 120 lines; custom hooks extracted (`useLocalStorage`, `useViewport`, `useSupabaseUser`, `useTabManager`) — check `src/hooks/`
  - R2-12: `validSlugs` removed from `AppShellProps` — check `AppShell.tsx`, `layout.tsx`
  - R2-13: Supabase client uses lazy singleton with runtime env var validation — check `src/lib/supabase/client.ts`
  - R2-14: All S2 components use `cn()` from `@/lib/utils`, not `.join(' ')` — check `NavFileTree.tsx`, `TabBar.tsx`, `ResizeHandle.tsx`, `BreadcrumbBar.tsx`
  - R2-15: `BreadcrumbBar` uses shadcn `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, etc. — check `BreadcrumbBar.tsx`
  - R2-16: `src/lib/constants.ts` exists with `LAYOUT` and `BREAKPOINTS` exports — verify all six components use constants, not magic numbers
  - Any remaining findings (R2-17 through R2-22 if they exist in the review) — check each
- Run: `npm run build` — must exit 0 with zero errors
- Run: `npm run lint` — must exit 0 with zero warnings or errors
- Run: `npx tsc --noEmit` — must exit 0

**Acceptance Criteria:**

- Written verification notes exist (comment in PR or inline code comment) confirming each R2-xx finding is resolved
- `npm run build` passes
- `npm run lint` passes
- `npx tsc --noEmit` passes
- No hydration warnings appear in browser console at `localhost:3000` (open any firm page, check DevTools console)

**Dependencies:** None — this is the sprint gate

---

## Group B — Cleanup

---

### S3-06a: Add `storageKey` parameter to `useTabManager`

**Goal:** Parameterize the localStorage key in `useTabManager` so the compare panel can maintain its own independent tab list without colliding with the main panel's `openTabs` key.

**Scope:**

- File: `src/hooks/useTabManager.ts`
- Change the hook signature from:
  ```typescript
  export function useTabManager(treeData: TreeNode[], pathname: string)
  ```
  to:
  ```typescript
  export function useTabManager(
    treeData: TreeNode[],
    pathname: string,
    storageKey = 'openTabs',
  )
  ```
- Pass `storageKey` through to the `useLocalStorage` call:
  ```typescript
  const [openTabs, setOpenTabs] = useLocalStorage<TabEntry[]>(storageKey, [])
  ```
- The default value `'openTabs'` preserves backward compatibility — existing call sites in `AppShell.tsx` require no changes
- Add a JSDoc comment above the function explaining the `storageKey` parameter:
  ```typescript
  /**
   * storageKey — localStorage key for this tab list.
   * Default: 'openTabs' (main panel).
   * Compare panel uses 'compareTab' to maintain an independent tab.
   */
  ```

**Acceptance Criteria:**

- `AppShell.tsx` call site unchanged — passes zero arguments for `storageKey`, uses default
- `npx tsc --noEmit` passes
- `npm run lint` passes
- Behavior of main panel tabs is identical to before

**Dependencies:** S3-01

---

### S3-06b: AppShell and hook cleanup

**Goal:** Remove any dead code, unused props, or TODO comments that remain after S2 review fixes were applied. Keep changes non-behavioral.

**Scope:**

- Audit `AppShell.tsx` for any remaining TODO comments referencing S2 tickets — remove them
- Audit `ContentPanel.tsx`: remove `onNewTab` prop if it is passed but never triggers a real action (it currently receives `() => {}` and does nothing — remove the prop entirely from `ContentPanelProps`, `ContentPanel`, `TabBar`, and the AppShell call site if it is wired to nothing)
  - If `TabBar` renders a "new tab" `+` button: keep the prop but wire it correctly, or remove the button if it is a stub
  - Decision rule: if the new tab button has no functionality in v1 scope, remove the button and the prop entirely
- Audit `useTabManager.ts`: confirm `findLabelInTree` is still needed; if the label is always available from `treeData` at mount, no change needed — just confirm
- Run: `npm run lint`, `npx tsc --noEmit` — both exit 0

**Acceptance Criteria:**

- Zero TODO comments referencing Sprint 2 remain in any file
- No unused props in `ContentPanel` or `TabBar`
- `npm run lint` exits 0
- `npx tsc --noEmit` exits 0
- Zero behavior change — all existing UX works identically

**Dependencies:** S3-06a (must merge first to avoid merge conflicts on `useTabManager.ts`)

---

## Group C — Content Pipeline

---

### S3-07: Define `Frontmatter` type and write `getPageContent`

**Goal:** Add the canonical `Frontmatter` TypeScript type and implement the `getPageContent` server utility that reads, parses, and processes a single markdown file into typed data consumed by the FirmPage RSC.

**Scope:**

**Step 1 — Add `Frontmatter` type to `src/types/content.ts`:**

```typescript
export type FrontmatterSource = {
  url: string
  label: string
}

export type Frontmatter = {
  title: string
  firm: string
  category: string
  type: FileType
  status: 'active' | 'defunct'
  last_verified: string // ISO 8601 string, e.g. "2026-03-29T00:00:00Z"
  verified_by: string
  website?: string
  founded?: number
  headquarters?: string
  sources: FrontmatterSource[]
  tags: string[]
}
```

Note: All fields match the frontmatter schema used in `/data/firms/**/*.md`. Fields are not optional unless the schema genuinely permits omission — keep `sources` as a required array (defaults to `[]` in content files).

**Step 2 — Install markdown pipeline packages:**

```bash
npm install unified remark-parse remark-gfm remark-rehype rehype-stringify @portaljs/remark-wiki-link
```

- `unified` — pipeline runner
- `remark-parse` — markdown AST parser
- `remark-gfm` — GitHub Flavored Markdown (tables, strikethrough, task lists)
- `remark-rehype` — convert remark AST to rehype AST
- `rehype-stringify` — serialize rehype AST to HTML string
- `@portaljs/remark-wiki-link` — `[[wikilink]]` syntax to `<a class="wikilink">` elements (maintained fork; use this, not `remark-wiki-link`)

**Step 3 — Create `src/lib/content/getPageContent.ts`:**

- First line: `import 'server-only'`
- Function signature:
  ```typescript
  export async function getPageContent(slug: string): Promise<{
    frontmatter: Frontmatter
    htmlContent: string
    slug: string
  }>
  ```
- Implementation:
  - Build file path: `path.join(process.cwd(), 'data', slug + '.md')` — slug is the full URL path (e.g. `firms/cfd/funded-next/rules`), file lives at `data/firms/cfd/funded-next/rules.md`
  - Exception: index files — slug `firms/cfd/funded-next` maps to `data/firms/cfd/funded-next/index.md`. Detect this by checking if the slug ends at the firm level (no `/challenges/` segment and no file extension segment beyond the firm name). Strategy: try `slug + '.md'` first; if that file does not exist, try `slug + '/index.md'`
  - Read file with `readFile(filePath, 'utf-8')`
  - Parse with `gray-matter` → extract `data` (frontmatter) and `content` (markdown body)
  - Cast `data` to `Frontmatter` — validate required fields: if `title`, `firm`, `type`, or `status` are missing, throw `new Error(\`Invalid frontmatter in \${slug}: missing required fields\`)`
  - Process markdown through the unified pipeline:
    ```typescript
    import { unified } from 'unified'
    import remarkParse from 'remark-parse'
    import remarkGfm from 'remark-gfm'
    import remarkWikiLink from '@portaljs/remark-wiki-link'
    import remarkRehype from 'remark-rehype'
    import rehypeStringify from 'rehype-stringify'
    ```
  - Configure `@portaljs/remark-wiki-link`:
    - `pathFormat: 'raw'` — keeps the raw target string (e.g. `firms/cfd/funded-next/rules`) as the `href`
    - `wikiLinkClassName: 'wikilink'` — adds CSS class for styling
    - `hrefTemplate: (permalink: string) => '/' + permalink` — produces `/firms/cfd/funded-next/rules`
  - The `slugToPathMap` from `getContentTree` is NOT needed inside `getPageContent` — the hrefTemplate uses the raw `[[target]]` value directly. Wikilinks in `/data` already use full paths (`[[firms/cfd/funded-next/rules|label]]`).
  - Return `{ frontmatter, htmlContent: String(file), slug }`

**Step 4 — Type-only exports:**

- Export `Frontmatter` and `FrontmatterSource` from `src/types/content.ts`
- All other files that need `Frontmatter` import from `@/types/content`, not from `getPageContent`

**Acceptance Criteria:**

- `src/types/content.ts` exports `Frontmatter` and `FrontmatterSource`
- `src/lib/content/getPageContent.ts` exists with `server-only` guard
- Calling `getPageContent('firms/cfd/funded-next/rules')` returns typed `{ frontmatter, htmlContent, slug }` without TypeScript errors
- Wikilinks in the output HTML render as `<a href="/firms/cfd/funded-next/rules" class="wikilink">label</a>`
- `npx tsc --noEmit` passes
- Attempting to import `getPageContent` in a `'use client'` file causes a build error (server-only guard works)

**Dependencies:** S3-01

---

### S3-08: `FirmPage` RSC — layout and data wiring

**Goal:** Replace the Sprint 2 stub in `src/app/firms/[...slug]/page.tsx` with the real RSC that fetches page content and renders the three-component stack.

**Scope:**

- File: `src/app/firms/[...slug]/page.tsx`
- The RSC calls `getPageContent(slugPath)` and passes the result to client components
- Component render order (stacked vertically, no wrapper div beyond what's needed):
  ```tsx
  <article className="mx-auto max-w-3xl px-6 py-8">
    <VerifiedBadge
      lastVerified={frontmatter.last_verified}
      status={frontmatter.status}
    />
    <MarkdownRenderer htmlContent={htmlContent} slug={slug} />
    <SourceFootnotes sources={frontmatter.sources} />
  </article>
  ```
- Keep `export const dynamic = 'force-static'` and `export async function generateStaticParams()` from the S2 stub — these must not be removed
- Add `export async function generateMetadata({ params })` for basic SEO:
  ```typescript
  export async function generateMetadata({
    params,
  }: {
    params: Promise<{ slug: string[] }>
  }) {
    const { slug } = await params
    const { frontmatter } = await getPageContent(slug.join('/'))
    return {
      title: frontmatter.title + ' — OpenPropFirm',
      description: `${frontmatter.firm} — ${frontmatter.type}`,
    }
  }
  ```
- Error handling: wrap `getPageContent` call in try/catch; on error, render a fallback `<div>` with a user-facing message and log the error server-side with `console.error`
- Do NOT use `notFound()` from `next/navigation` for missing slugs — `force-static` with `generateStaticParams` means only valid slugs are pre-rendered; a missing slug at build time is a build error, not a runtime 404

**Acceptance Criteria:**

- Visiting `http://localhost:3000/firms/cfd/funded-next` renders the `<article>` with all three child components mounted
- `<title>` in the page HTML includes the firm's frontmatter `title`
- `npm run build` passes — all slugs pre-render without error
- Server error on missing file logs to console and renders fallback message (does not throw unhandled error)

**Dependencies:** S3-07 (needs `getPageContent` and `Frontmatter`); S3-09, S3-10, S3-11 must be stubbed (return `null` or a `<div>`) before this ticket can be tested end-to-end — wire stubs first, replace with real components when those tickets land

---

### S3-09: `VerifiedBadge` component

**Goal:** Build the verified badge that displays the `last_verified` date and a status indicator, rendered as a sibling RSC above the markdown content.

**Scope:**

- File: `src/components/content/VerifiedBadge.tsx`
- This is a React Server Component (no `'use client'` directive)
- Props:
  ```typescript
  type VerifiedBadgeProps = {
    lastVerified: string // ISO 8601 date string
    status: 'active' | 'defunct'
  }
  ```
- Renders a small banner/pill above the content, not injected into the markdown HTML
- Display logic:
  - Format `lastVerified` as a human-readable date: `new Date(lastVerified).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`
  - If `status === 'defunct'`: render a red/warning badge: "This firm is no longer active"
  - If `status === 'active'`: render a green/success badge with "Last verified: [date]"
- Visual spec:
  - Pill shape: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium`
  - Active: `bg-[var(--file-type-promo)]/10 text-[var(--file-type-promo)]` with a `CheckCircle` icon (size 12) from lucide-react
  - Defunct: `bg-red-500/10 text-red-500` with an `AlertCircle` icon (size 12) from lucide-react
  - Wrapper: `<div className="mb-4">` — provides spacing before the markdown content
- The badge does not have any interactive elements — it is purely presentational

**Acceptance Criteria:**

- Active firm: green pill shows "Last verified: March 29, 2026" (or appropriate date)
- Defunct firm: red pill shows "This firm is no longer active"
- `npx tsc --noEmit` passes — no type errors
- No `'use client'` directive — this is a Server Component
- Renders correctly in all three themes (light, dark, blue) — `--file-type-promo` CSS variable must be set for all three themes (was added in S2-1, verify it exists)

**Dependencies:** S3-07 (needs `Frontmatter` type for `status` and `last_verified` fields)

---

### S3-10: `MarkdownRenderer` component

**Goal:** Build the client component that takes a pre-rendered HTML string and displays it with custom wikilink click handling and prose styling.

**Scope:**

- File: `src/components/content/MarkdownRenderer.tsx`
- Directive: `'use client'` — needs `useRouter` for wikilink navigation
- Props:
  ```typescript
  type MarkdownRendererProps = {
    htmlContent: string
    slug: string // current page slug, used for relative link resolution if needed
  }
  ```
- Rendering strategy: `dangerouslySetInnerHTML={{ __html: htmlContent }}`
  - Content is generated server-side from trusted files in `/data` — XSS risk is acceptable for this controlled source
  - Add a comment: `{/* htmlContent is generated from /data markdown files — trusted source */}`
- Wikilink click handling (event delegation — do NOT add onClick to every link):
  ```typescript
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href) return
    // Internal wikilinks start with /firms/ — intercept and use router
    if (href.startsWith('/firms/')) {
      e.preventDefault()
      router.push(href)
    }
    // External links fall through to default browser behavior
  }, [router])
  ```
- CSS class applied to the wrapper div: `prose` — this hooks into `src/styles/prose.css` which will be populated in S3-15
- Full wrapper:
  ```tsx
  <div
    className="prose"
    onClick={handleClick}
    dangerouslySetInnerHTML={{ __html: htmlContent }}
  />
  ```

**Acceptance Criteria:**

- HTML content from `getPageContent` renders visibly on the page
- Clicking a `[[wikilink]]` navigates via `router.push` (tab bar updates, URL changes)
- Clicking an external link (`href` not starting with `/firms/`) opens normally (no `preventDefault`)
- `npx tsc --noEmit` passes
- No unused imports

**Dependencies:** S3-07 (needs `getPageContent` to produce the `htmlContent` string); S3-08 (wired into FirmPage)

---

### S3-11: `SourceFootnotes` component

**Goal:** Build the source footnotes component that renders the `sources` array from frontmatter as a numbered reference list below the content.

**Scope:**

- File: `src/components/content/SourceFootnotes.tsx`
- This is a React Server Component (no `'use client'` directive)
- Props:
  ```typescript
  type SourceFootnotesProps = {
    sources: Array<{ url: string; label: string }>
  }
  ```
- Renders nothing (return `null`) if `sources` is empty or has zero items
- Visual spec:
  - Top divider: `<hr className="my-6 border-[var(--border)]" />`
  - Section heading: `<h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Sources</h2>`
  - Ordered list: `<ol className="list-decimal space-y-1 pl-5 text-sm">`
  - Each item: `<li>` containing `<a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">{label}</a>`
  - Wrapper: `<footer className="mt-8">`

**Acceptance Criteria:**

- Page with one or more sources renders the footnote section with correct numbering
- Page with zero sources renders nothing (no empty `<footer>`)
- Each source link opens in a new tab with `rel="noopener noreferrer"`
- `npx tsc --noEmit` passes
- No `'use client'` directive

**Dependencies:** S3-07 (needs `Frontmatter` type and `FrontmatterSource` type)

---

### S3-15: Wire `FirmPage` with prose styles, `validSlugs`, and `ContentApiResponse` type

**Goal:** Complete the content pipeline — add the `ContentApiResponse` type, populate `prose.css` with full markdown styling, and ensure `validSlugs` is available to `MarkdownRenderer` for future link validation without re-serializing through AppShell.

**Scope:**

**Step 1 — Add `ContentApiResponse` type to `src/types/content.ts`:**

```typescript
export type ContentApiResponse = {
  frontmatter: Frontmatter
  htmlContent: string
  slug: string
}
```

This type is the contract between `getPageContent` (server) and any component that consumes its output.

**Step 2 — Update `getPageContent` return type:**

- Change `getPageContent` to return `Promise<ContentApiResponse>` (was an anonymous object type)

**Step 3 — Populate `src/styles/prose.css`:**

Replace the placeholder with full prose styling. All colors must use CSS variables — no hardcoded hex values:

```css
.prose {
  color: var(--foreground);
  line-height: 1.7;
  font-size: 0.9375rem; /* 15px */
}

.prose h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--foreground);
}

.prose h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: var(--foreground);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.25rem;
}

.prose h3 {
  font-size: 1.0625rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--foreground);
}

.prose p {
  margin-top: 0;
  margin-bottom: 1rem;
}

.prose a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.prose a.wikilink {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-style: dashed;
}

.prose ul,
.prose ol {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.prose li {
  margin-bottom: 0.25rem;
}

.prose blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
  margin: 1.5rem 0;
  color: var(--muted-foreground);
  font-style: italic;
}

.prose code {
  font-family: var(--font-geist-mono, ui-monospace, monospace);
  font-size: 0.875em;
  background: var(--muted);
  border-radius: 3px;
  padding: 0.15em 0.35em;
  color: var(--foreground);
}

.prose pre {
  background: var(--muted);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.prose pre code {
  background: none;
  padding: 0;
  font-size: 0.875rem;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.prose th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: var(--muted);
  border: 1px solid var(--border);
  font-weight: 600;
  color: var(--foreground);
}

.prose td {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  color: var(--foreground);
}

.prose tr:nth-child(even) td {
  background: var(--muted)/30;
}

.prose hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.prose strong {
  font-weight: 600;
  color: var(--foreground);
}

.prose em {
  font-style: italic;
}
```

**Step 4 — Verify `generateStaticParams` in FirmPage:**

- Confirm `src/app/firms/[...slug]/page.tsx` still exports `generateStaticParams` (it must — was in the S2 stub and must not have been removed in S3-08)
- No change needed if already present

**Acceptance Criteria:**

- `ContentApiResponse` type exported from `src/types/content.ts`
- `getPageContent` return type is `Promise<ContentApiResponse>` — no anonymous object types
- Prose styles render correctly: headings have correct hierarchy, tables have borders, wikilinks have dashed underline, code blocks have background color
- All three themes (light, dark, blue) render prose content correctly — test by switching themes while viewing a firm page
- `npx tsc --noEmit` passes
- `npm run build` passes

**Dependencies:** S3-08, S3-09, S3-10, S3-11 (all content components must exist before final wiring)

---

## Group D — Search

---

### S3-12: `build-search-index.ts` prebuild script

**Goal:** Write the script that generates `public/search-index.json` at build time, containing clean structured entries for all markdown files stripped of markdown syntax.

**Scope:**

**Step 1 — Install `strip-markdown`:**

```bash
npm install strip-markdown
```

`strip-markdown` is a remark plugin that strips all markdown formatting and returns plain text. This is the correct approach for producing clean search excerpts — no custom stripping logic needed.

**Step 2 — Create `scripts/build-search-index.ts`:**

- Uses `fast-glob` (already in `devDependencies`) to find all `data/firms/**/*.md` files
- For each file:
  - Parse with `gray-matter` to extract `data` (frontmatter) and `content` (body)
  - Strip markdown from `content` using `strip-markdown` via a minimal unified pipeline:
    ```typescript
    import { unified } from 'unified'
    import remarkParse from 'remark-parse'
    import stripMarkdown from 'strip-markdown'

    const plainText = String(
      await unified().use(remarkParse).use(stripMarkdown).process(content),
    )
    ```
  - Extract excerpt: first 500 characters of `plainText`, trimmed of whitespace
  - Build index entry:
    ```typescript
    type SearchEntry = {
      slug: string   // full URL path, e.g. "firms/cfd/funded-next/rules"
      title: string  // from frontmatter.title
      firm: string   // from frontmatter.firm
      type: string   // from frontmatter.type
      excerpt: string // first 500 chars of stripped markdown body
    }
    ```
  - Skip files where `frontmatter.title` is missing or empty
- Write the resulting array to `public/search-index.json` using `writeFile`
- Log to stdout: `Built search index: N entries written to public/search-index.json`

**Step 3 — Add to `prebuild` script in `package.json`:**

The current `prebuild` value is:
```
"prebuild": "tsx scripts/validate-content.ts && tsx scripts/validate-env.ts"
```

Change it to:
```
"prebuild": "tsx scripts/validate-content.ts && tsx scripts/validate-env.ts && tsx scripts/build-search-index.ts && tsx scripts/generate-graph-data.ts"
```

Note: `generate-graph-data.ts` is added here too (from S3-16) to keep the prebuild line consolidated. Add it now as a placeholder so S3-16 can fill in the script without touching `package.json` again.

**Step 4 — Add `public/search-index.json` to `.gitignore`:**

- Add a comment block to `.gitignore`:
  ```
  # Build artifacts — generated at prebuild, not committed
  /public/search-index.json
  /public/graph-data.json
  ```

**Acceptance Criteria:**

- `tsx scripts/build-search-index.ts` runs without error from the project root
- `public/search-index.json` is created with one entry per `.md` file in `data/firms/`
- Each entry has `slug`, `title`, `firm`, `type`, `excerpt` fields — no raw markdown syntax in `excerpt` (no `#`, `**`, `[[`, `|`, etc.)
- `npm run build` runs the script automatically via the `prebuild` hook
- `public/search-index.json` is listed in `.gitignore`
- `npx tsc --noEmit` passes (script must be TypeScript-clean)

**Dependencies:** S3-01

---

### S3-13: `SearchModal` component

**Goal:** Build the Cmd+K search modal using the already-installed `command` and `dialog` shadcn components, with Fuse.js for client-side fuzzy search over the prebuild-generated index.

**Scope:**

**Step 1 — Install Fuse.js:**

```bash
npm install fuse.js
```

**Step 2 — Create `src/components/search/SearchModal.tsx`:**

- Directive: `'use client'`
- Props:
  ```typescript
  type SearchModalProps = {
    isOpen: boolean
    onClose: () => void
  }
  ```
- State:
  - `query: string` — controlled input value
  - `results: SearchEntry[]` — Fuse.js results
  - `index: Fuse<SearchEntry> | null` — module-level ref (not state) so the index persists across modal open/close cycles

- Module-level Fuse instance (outside the component, avoids re-creation on re-render):
  ```typescript
  let fuseInstance: Fuse<SearchEntry> | null = null
  ```

- Index loading: inside a `useEffect` that runs once on first open (`isOpen && !fuseInstance`):
  ```typescript
  useEffect(() => {
    if (!isOpen || fuseInstance) return
    fetch('/search-index.json')
      .then((r) => r.json())
      .then((entries: SearchEntry[]) => {
        fuseInstance = new Fuse(entries, {
          keys: [
            { name: 'title', weight: 0.4 },
            { name: 'excerpt', weight: 0.3 },
            { name: 'firm', weight: 0.2 },
            { name: 'type', weight: 0.1 },
          ],
          threshold: 0.4,
          includeScore: true,
        })
      })
      .catch((err) => console.error('Failed to load search index:', err))
  }, [isOpen])
  ```

- Search handler: on query change, run `fuseInstance?.search(query).slice(0, 10).map(r => r.item) ?? []`

- UI structure using shadcn components (already installed):
  ```tsx
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-xl p-0">
      <Command>
        <CommandInput
          placeholder="Search firms, rules, challenges..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {results.length === 0 && query.length > 0 && (
            <CommandEmpty>No results for "{query}"</CommandEmpty>
          )}
          {results.map((entry) => (
            <CommandItem
              key={entry.slug}
              onSelect={() => {
                router.push('/' + entry.slug)
                onClose()
              }}
            >
              <span className="font-medium">{entry.title}</span>
              <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                {entry.firm} · {entry.type}
              </span>
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>
  ```

- On modal close: reset `query` to `''` and clear `results` to `[]`
- Import `useRouter` from `next/navigation` for navigation on select

**Step 3 — Define `SearchEntry` type in `src/types/content.ts`:**

```typescript
export type SearchEntry = {
  slug: string
  title: string
  firm: string
  type: string
  excerpt: string
}
```

**Acceptance Criteria:**

- Modal opens (isOpen = true): input is focused, placeholder text visible
- Typing "funded" returns results containing Funded Next entries
- Clicking a result navigates to the correct slug and closes the modal
- Modal closes on Escape key (handled by Dialog component)
- Second open of the modal does not re-fetch `/search-index.json` — Fuse instance is reused
- `npx tsc --noEmit` passes
- No unused imports

**Dependencies:** S3-12 (needs `search-index.json` to exist for testing); S3-01

---

### S3-14: Wire Cmd+K search into `AppShell` and `TabBar`

**Goal:** Connect `SearchModal` to the keyboard shortcut and a visible trigger button in the TabBar.

**Scope:**

**Step 1 — Add `isSearchOpen` state to `AppShell.tsx`:**

```typescript
const [isSearchOpen, setIsSearchOpen] = useState(false)
```

**Step 2 — Add global keyboard shortcut in `AppShell.tsx`:**

```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setIsSearchOpen(true)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])
```

**Step 3 — Pass `onSearchOpen` prop down to `ContentPanel` and `TabBar`:**

- Add `onSearchOpen: () => void` to `ContentPanelProps` in `ContentPanel.tsx`
- Pass it through to `TabBar` as `onSearchOpen`
- Add `onSearchOpen: () => void` to `TabBarProps` in `TabBar.tsx`
- In `TabBar`, render a search icon button at the right side of the tab bar (between existing controls):
  ```tsx
  <button
    type="button"
    onClick={onSearchOpen}
    className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--muted)]"
    aria-label="Search (Cmd+K)"
    title="Search (⌘K)"
  >
    <Search size={14} />
  </button>
  ```

**Step 4 — Render `SearchModal` in `AppShell.tsx`:**

```tsx
<SearchModal
  isOpen={isSearchOpen}
  onClose={() => setIsSearchOpen(false)}
/>
```

Render it at the bottom of the AppShell return, outside the flex layout div, so it renders as a portal overlay.

**Step 5 — Pass `onSearchOpen` through the call site:**

- In `AppShell.tsx`, pass `onSearchOpen={() => setIsSearchOpen(true)}` to `ContentPanel`

**Acceptance Criteria:**

- Pressing Cmd+K (macOS) or Ctrl+K (Windows/Linux) anywhere in the app opens the search modal
- Clicking the search icon button in the TabBar opens the modal
- Pressing Escape closes the modal
- `npm run lint` passes — no unused props or imports
- `npx tsc --noEmit` passes

**Dependencies:** S3-13 (SearchModal must exist); S3-06b recommended (cleans up ContentPanel props first)

---

## Group E — Graph

---

### S3-16: `generate-graph-data.ts` prebuild script

**Goal:** Generate `public/graph-data.json` at build time, containing nodes and edges derived from the markdown wikilinks in `/data/firms/`.

**Scope:**

**Step 1 — Create `scripts/generate-graph-data.ts`:**

- Output file: `public/graph-data.json`
- Data model:
  ```typescript
  type GraphNode = {
    id: string   // full slug, e.g. "firms/cfd/funded-next/rules"
    label: string // frontmatter.title or slug-derived label
    type: string  // frontmatter.type, e.g. "rules", "challenge", "basic-info"
    firm: string  // frontmatter.firm, e.g. "funded-next"
    category: string // "cfd" or "futures"
  }

  type GraphEdge = {
    source: string // slug of the file containing the wikilink
    target: string // slug of the wikilink target
  }

  type GraphData = {
    nodes: GraphNode[]
    edges: GraphEdge[]
  }
  ```

- Algorithm:
  1. Use `fast-glob` to find all `data/firms/**/*.md` files
  2. For each file, parse frontmatter with `gray-matter` → build a `GraphNode`
  3. For each file, scan the markdown body for `[[target|label]]` or `[[target]]` patterns using a regex: `/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g`
  4. For each wikilink match:
     - The raw target is the first capture group, e.g. `firms/cfd/funded-next/rules`
     - Map it to a full slug: if it starts with `firms/`, use as-is; otherwise attempt to resolve relative to the current file's firm directory
     - If the target slug exists in the nodes set, create a `GraphEdge`
     - If the target slug does not exist, skip the edge (broken link — do not crash)
  5. Index files (`index.md`) map to the firm slug without `/index` — e.g. `data/firms/cfd/funded-next/index.md` → slug `firms/cfd/funded-next`
  6. Write `{ nodes, edges }` to `public/graph-data.json`
  7. Log: `Built graph data: N nodes, M edges written to public/graph-data.json`

- The `prebuild` script already includes `tsx scripts/generate-graph-data.ts` (added in S3-12, Step 3) — no `package.json` change needed here

**Acceptance Criteria:**

- `tsx scripts/generate-graph-data.ts` runs without error
- `public/graph-data.json` exists with `{ nodes: [...], edges: [...] }`
- Every node has `id`, `label`, `type`, `firm`, `category` fields
- Every edge references `source` and `target` slugs that exist in the nodes array — no dangling edges
- `npx tsc --noEmit` passes

**Dependencies:** S3-01; S3-12 (for `package.json` prebuild line — must run after S3-12 merges so no conflict)

---

### S3-17: `GraphView` component — `react-force-graph-2d`

**Goal:** Build the canvas-based graph visualization component that renders nodes and edges from `graph-data.json`.

**Scope:**

**Step 1 — Install `react-force-graph-2d`:**

```bash
npm install react-force-graph-2d
```

Also install types if available:
```bash
npm install --save-dev @types/react-force-graph-2d 2>/dev/null || true
```

`react-force-graph-2d` uses canvas and browser APIs — it cannot be server-rendered. The component must be loaded with `next/dynamic` and `{ ssr: false }`.

**Step 2 — Create `src/components/graph/GraphView.tsx`:**

- Directive: `'use client'`
- This file is the **inner** component — it receives graph data as props and renders the canvas
- Props:
  ```typescript
  type GraphViewProps = {
    nodes: GraphNode[]
    edges: GraphEdge[]
    activeSlug: string // currently active page — highlighted node
  }
  ```
- Import `ForceGraph2D` from `react-force-graph-2d`
- Use a `containerRef` and `useEffect` to measure the container's pixel dimensions and pass them to `ForceGraph2D` as `width` and `height` — do not hardcode dimensions
- Node rendering:
  - Active node (`node.id === activeSlug`): larger radius (8px), accent color (`var(--accent)` resolved via `getComputedStyle`)
  - Other nodes: radius 5px, muted foreground color
  - Node label: `node.label` via `nodeLabel` prop (shows on hover as tooltip)
- Link rendering: thin lines in `var(--border)` color
- On node click: dispatch to parent via `onNodeClick: (slug: string) => void` prop
- Canvas background: `var(--sidebar-bg)` resolved at mount via `getComputedStyle`
- Colors must be resolved at render time (not hardcoded) since themes change at runtime:
  ```typescript
  const styles = getComputedStyle(document.documentElement)
  const accentColor = styles.getPropertyValue('--accent').trim()
  ```

**Step 3 — Create `src/components/graph/GraphViewLoader.tsx`:**

This is the **outer** wrapper that handles the `next/dynamic` import and data fetching:

- Directive: `'use client'`
- Uses `next/dynamic` with `{ ssr: false }` to import `GraphView`
- Fetches `/graph-data.json` on mount via `useEffect`:
  ```typescript
  const [graphData, setGraphData] = useState<GraphData | null>(null)

  useEffect(() => {
    fetch('/graph-data.json')
      .then(r => r.json())
      .then(setGraphData)
      .catch(err => console.error('Failed to load graph data:', err))
  }, [])
  ```
- Shows a loading skeleton while data loads: `<Skeleton className="h-full w-full" />`
- Once loaded, renders the dynamic `GraphView` component

**Acceptance Criteria:**

- The graph canvas renders without "window is not defined" errors
- Nodes appear for all content files in `/data/firms/`
- The currently active page's node is visually highlighted
- Clicking a node navigates to that page
- Switching themes re-resolves CSS variable colors correctly (colors update on theme change)
- `npm run build` passes — no SSR errors

**Dependencies:** S3-16 (needs `graph-data.json`); S3-01

---

### S3-18: Wire `GraphViewLoader` into `GraphPanel` with Suspense boundary

**Goal:** Replace the "Graph view — coming in Sprint 5" stub in `GraphPanel` with the real `GraphViewLoader`, and add a Suspense boundary so the graph loading does not block the compare panel.

**Scope:**

- File: `src/components/graph/GraphPanel.tsx`
- Import `GraphViewLoader` from `@/components/graph/GraphViewLoader`
- Add `activeSlug: string` and `onNodeClick: (slug: string) => void` to `GraphPanelProps`:
  ```typescript
  type GraphPanelProps = {
    mode: 'graph' | 'compare'
    user: User | null
    activeSlug: string
    onNodeClick: (slug: string) => void
    onModeToggle: () => void
    onDismissGate: () => void
  }
  ```
- Replace the graph stub with:
  ```tsx
  <Suspense fallback={<Skeleton className="h-full w-full" />}>
    <GraphViewLoader
      activeSlug={activeSlug}
      onNodeClick={onNodeClick}
    />
  </Suspense>
  ```
- Update `AppShell.tsx` to pass `activeSlug={activeSlug}` and `onNodeClick={(slug) => router.push('/' + slug)}` to `GraphPanel`
- The Suspense boundary is placed around `GraphViewLoader` only — the compare panel content (`ContentPanelRight`) is a sibling, not inside this Suspense boundary

**Acceptance Criteria:**

- Opening Panel 3 in graph mode shows the force-directed graph
- Graph loads asynchronously — the rest of the UI (Panel 1, Panel 2) is not blocked during graph load
- Clicking a node in the graph navigates to that slug (URL changes, tab bar updates)
- `npx tsc --noEmit` passes
- `npm run build` passes

**Dependencies:** S3-17 (GraphViewLoader must exist); S3-06a (activeSlug flows from useTabManager)

---

## Group F — Loading States + Compare Panel

---

### S3-19: `ContentPanelRight` — compare tab panel

**Goal:** Build the right-side content panel for compare mode, which reuses `useTabManager` with an isolated storage key so compare mode has its own independently navigable tab.

**Scope:**

- File: `src/components/content/ContentPanelRight.tsx`
- Directive: `'use client'`
- Props:
  ```typescript
  type ContentPanelRightProps = {
    treeData: TreeNode[]
  }
  ```
- Uses `useTabManager(treeData, activeCompareSlug, 'compareTab')` — with `storageKey: 'compareTab'` (enabled by S3-06a)
- The `pathname` argument to `useTabManager` for the compare panel is NOT the router pathname (that drives the main panel). Instead, it should be derived from the compare panel's own active tab. Initialize with `useState` set to the first `openTabs` entry or a sensible default:
  ```typescript
  const [comparePathname, setComparePathname] = useState(
    () => openTabs[0]?.slug ? '/' + openTabs[0].slug : '/firms/cfd/funded-next'
  )
  ```
  Wait — this creates a circular dependency. The correct approach:
  - `useTabManager` needs a pathname to know which tab to open. For the compare panel, this pathname is managed locally (not from the URL router).
  - Use `useTabManager` with a local `compareSlug` state:
    ```typescript
    const [compareSlug, setCompareSlug] = useState('firms/cfd/funded-next')
    const { openTabs, activeSlug, closeTab } = useTabManager(
      treeData,
      '/' + compareSlug,
      'compareTab',
    )
    ```
  - When a tab is clicked: `setCompareSlug(slug)`
  - This means `compareSlug` drives the content shown; `useTabManager` manages the tab list persistence
- Content rendering: the compare panel shows the content for `compareSlug` by fetching it client-side. Use a `useEffect` to fetch `/firms/cfd/funded-next` etc.:

  Actually — the correct approach for the compare panel content: perform a client-side fetch to a Route Handler that returns `ContentApiResponse`. This is covered in S3-20. For now (S3-19), build the panel structure with a placeholder content area that accepts a `slug` and shows a skeleton while content loads.

  Final S3-19 scope: build the shell — `TabBar`, `BreadcrumbBar`, and a content area that shows `<Skeleton className="h-64 w-full" />` as a placeholder. The actual content fetching is wired in S3-20.

- Full component structure:
  ```tsx
  <div className="flex h-full flex-col">
    <TabBar
      openTabs={openTabs}
      activeSlug={activeSlug}
      onTabClick={(slug) => setCompareSlug(slug)}
      onTabClose={closeTab}
      onNewTab={() => {}}
      onTogglePanel3={() => {}}
      onHamburger={undefined}
    />
    <BreadcrumbBar activeSlug={activeSlug} />
    <div className="flex-1 overflow-y-auto p-6">
      <Skeleton className="mb-4 h-6 w-3/4" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
  ```

**Acceptance Criteria:**

- Compare panel renders with tab bar and breadcrumb
- Tabs in the compare panel are independent of the main panel tabs (stored under `compareTab` key in localStorage)
- Clicking a file in the FileTree while in compare mode does NOT change the compare panel tab (main panel is still the click target from NavFileTree — compare panel only changes via its own TabBar)
- `npx tsc --noEmit` passes
- No behavior regression in main panel tabs

**Dependencies:** S3-06a (storageKey param); S3-01

---

### S3-20: Wire `ContentPanelRight` into `GraphPanel` compare mode + Route Handler

**Goal:** Complete the compare panel by adding a Route Handler that serves `ContentApiResponse` for client-side fetches, and wire the compare panel to fetch and render real content.

**Scope:**

**Step 1 — Create Route Handler `src/app/api/content/[...slug]/route.ts`:**

```typescript
import { getPageContent } from '@/lib/content/getPageContent'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  const slugPath = slug.join('/')
  try {
    const data = await getPageContent(slugPath)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Content API error:', err)
    return NextResponse.json(
      { error: 'Content not found' },
      { status: 404 },
    )
  }
}
```

Note: this route is NOT `force-static` — it runs at request time for the compare panel's dynamic content needs.

**Step 2 — Update `ContentPanelRight` to fetch real content:**

- Replace the skeleton placeholder with actual content fetching:
  ```typescript
  const [content, setContent] = useState<ContentApiResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!compareSlug) return
    setLoading(true)
    setContent(null)
    fetch('/api/content/' + compareSlug)
      .then(r => r.json())
      .then((data: ContentApiResponse) => {
        setContent(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [compareSlug])
  ```
- Content area renders:
  - Loading: skeleton rows
  - Loaded: `<MarkdownRenderer htmlContent={content.htmlContent} slug={content.slug} />`

**Step 3 — Wire `ContentPanelRight` into `GraphPanel`:**

- Replace the "Compare panel — coming in Sprint 5" stub in `GraphPanel.tsx`:
  ```tsx
  mode === 'compare' ? (
    <Suspense fallback={<Skeleton className="h-full w-full" />}>
      <ContentPanelRight treeData={treeData} />
    </Suspense>
  ) : ...
  ```
- Add `treeData: TreeNode[]` to `GraphPanelProps` since it is needed by `ContentPanelRight`
- Update `AppShell.tsx` to pass `treeData={treeData}` to `GraphPanel`

**Acceptance Criteria:**

- Clicking the compare mode toggle (while logged in) shows the compare panel with real content
- Navigating to a different file in the FileTree does NOT change the compare panel's content — it has its own independent navigation
- Compare panel content updates when a different tab is clicked within the compare panel's own `TabBar`
- The Route Handler `GET /api/content/firms/cfd/funded-next/rules` returns a valid JSON response matching `ContentApiResponse`
- Both panels can show different content simultaneously (split comparison works)
- `npm run build` passes
- `npx tsc --noEmit` passes

**Dependencies:** S3-19, S3-10 (MarkdownRenderer), S3-07 (getPageContent), S3-18 (GraphPanel structure)

---

## Group B (continued) — Accessibility

---

### S3-02: Full keyboard navigation for `NavFileTree`

**Goal:** Implement complete WAI-ARIA tree keyboard navigation so the file tree is fully accessible without a mouse.

**Scope:**

- File: `src/components/nav/NavFileTree.tsx`
- The S2 review fix (R2-08) added `role="treeitem"`, `tabIndex`, and Enter/Space key handlers. This ticket adds the full arrow key navigation required by the WAI-ARIA tree pattern.

**Arrow key behavior (per WAI-ARIA Authoring Practices — Tree View Pattern):**

| Key | Action |
| --- | --- |
| `ArrowDown` | Move focus to the next visible treeitem (depth-first, skips collapsed children) |
| `ArrowUp` | Move focus to the previous visible treeitem |
| `ArrowRight` | If focused item is a collapsed folder: expand it. If expanded folder: move focus to first child. If file: do nothing. |
| `ArrowLeft` | If focused item is an expanded folder: collapse it. If collapsed folder or file: move focus to parent folder. |
| `Home` | Move focus to the first treeitem in the tree |
| `End` | Move focus to the last visible treeitem in the tree |
| `Enter` | If file: navigate to that slug. If folder: toggle expand/collapse. |

**Implementation approach:**

- Maintain a flat ordered list of currently visible nodes (depth-first traversal of the tree, excluding children of collapsed folders) derived from `treeData` and `expanded` state
- A `focusedId: string | null` state tracks which node has keyboard focus (separate from `activeSlug` which is the URL-based active file)
- Use `tabIndex={focusedId === node.id ? 0 : -1}` on each treeitem (roving tabindex pattern) — only one treeitem is in the natural tab order at a time
- Use a `refs` map (`useRef<Map<string, HTMLElement>>`) to call `.focus()` imperatively when focus moves via arrow keys
- The root tree container has `role="tree"` and `aria-label="File tree"`
- Folder nodes have `aria-expanded={isExpanded}` and `aria-label="{label} folder, {expanded ? 'expanded' : 'collapsed'}"`
- File nodes have `aria-label="{label}"` and `aria-selected={activeSlug === node.id}`

**Acceptance Criteria:**

- Tab key moves focus into the tree (first item receives focus)
- ArrowDown / ArrowUp navigate between visible items
- ArrowRight expands a collapsed folder; moves into an expanded folder
- ArrowLeft collapses an expanded folder; moves to parent from a file or collapsed folder
- Home / End jump to first / last visible item
- Enter on a file navigates to that page (URL changes)
- Enter on a folder toggles expand/collapse
- `npm run lint` passes
- `npx tsc --noEmit` passes
- Manual test: navigate entire tree without using a mouse

**Dependencies:** S3-01 (R2-08 base accessibility must already be in place)

---

## Summary Table

| ID | Group | Title | Est. Hours | Parallel With |
| --- | --- | --- | --- | --- |
| S3-01 | A — Verification | Verify S2 fixes | 1h | — |
| S3-02 | B — Accessibility | NavFileTree arrow keys | 3h | S3-07, S3-12, S3-16 |
| S3-06a | B — Cleanup | useTabManager storageKey | 0.5h | S3-02, S3-07, S3-12, S3-16 |
| S3-06b | B — Cleanup | AppShell + ContentPanel cleanup | 1h | S3-02, S3-07, S3-12, S3-16 |
| S3-07 | C — Content | Frontmatter type + getPageContent | 2h | S3-02, S3-12, S3-16 |
| S3-08 | C — Content | FirmPage RSC layout | 1h | after S3-07 |
| S3-09 | C — Content | VerifiedBadge component | 1h | S3-10, S3-11 (parallel) |
| S3-10 | C — Content | MarkdownRenderer component | 1.5h | S3-09, S3-11 (parallel) |
| S3-11 | C — Content | SourceFootnotes component | 1h | S3-09, S3-10 (parallel) |
| S3-15 | C — Content | prose.css + ContentApiResponse type | 1.5h | after S3-08–S3-11 |
| S3-12 | D — Search | build-search-index.ts script | 2h | S3-02, S3-07, S3-16 |
| S3-13 | D — Search | SearchModal component | 2h | after S3-12 |
| S3-14 | D — Search | Wire Cmd+K into AppShell + TabBar | 1h | after S3-13 |
| S3-16 | E — Graph | generate-graph-data.ts script | 2h | S3-02, S3-07, S3-12 |
| S3-17 | E — Graph | GraphView component | 3h | after S3-16 |
| S3-18 | E — Graph | Wire GraphView into GraphPanel | 1h | after S3-17 |
| S3-19 | F — Compare | ContentPanelRight shell | 2h | after S3-06a |
| S3-20 | F — Compare | Route Handler + wire ContentPanelRight | 2h | after S3-19, S3-10 |

**Total estimated hours: ~28h**

The critical path is: S3-01 → S3-07 → S3-08 → S3-15 (content must render before sprint is considered done). Streams C, D, E, F can all be developed in parallel after S3-01 clears.
