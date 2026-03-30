# Sprint 3 Code Review — Tech Lead Audit

**Reviewer:** Tech Lead (code auditor)
**Date:** 2026-03-29
**Scope:** All files introduced or modified in S3 commits (3 S3 commits, 25 files changed, ~7000 lines added)
**Verdict:** Sprint 3 delivers the content pipeline, search, graph view, and compare panel as specified. Ticket acceptance criteria are met. However, the sprint introduced **performance regressions**, **missing error handling**, **type safety gaps**, **dead code**, and **carry-forward debt from S2** that should be resolved before Sprint 4 builds on top.

---

## Severity Legend

| Level             | Meaning                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| **P0 — Critical** | Will cause bugs or crashes in production. Fix before S4 starts.                     |
| **P1 — High**     | Degrades UX, violates web standards, or creates maintenance traps. Fix in early S4. |
| **P2 — Medium**   | Code quality, performance, or consistency issues. Schedule within S4.               |
| **P3 — Low**      | Style nits, minor improvements, nice-to-haves. Can be deferred.                     |

---

## R3-01: `getPageContent` calls `getContentTree()` on every invocation — O(n) filesystem reads per page (P0)

**File:** `src/lib/content/getPageContent.ts` (line 47)

**Problem:** Every call to `getPageContent()` invokes `await getContentTree()` to get `validSlugs` and `slugToPathMap` for wikilink resolution. `getContentTree()` reads every `.md` file's frontmatter from disk.

At build time with `force-static`, `getPageContent` is called **twice per page** — once in `generateMetadata` and once in the page component. With 26 content files, that's 52 calls × full tree scan = ~1,352 file reads at build time.

At runtime, the `/api/content/[...slug]` route handler calls `getPageContent` on every compare panel navigation. The module-level cache in `getContentTree` helps in production, but in development mode the cache is explicitly bypassed (`process.env.NODE_ENV !== 'development'`), meaning every compare panel navigation re-reads the entire filesystem.

**Fix:**
1. Compute `validSlugs` and `slugToPathMap` once and inject them into `getPageContent` as parameters, or cache them at module scope in `getPageContent.ts` separately.
2. Alternatively, since `getContentTree` already has a production cache, extract the wikilink resolution data into a dedicated cached function that doesn't rebuild the entire tree.
3. For the double-call per page (metadata + render), use React's `cache()` wrapper from `react` to deduplicate within a single request:

```typescript
import { cache } from 'react'
export const getPageContent = cache(async (slug: string): Promise<PageContent> => { ... })
```

**Acceptance:**
- `getContentTree()` is called at most once per build (or once per request in dev), not once per `getPageContent` call.
- Build time measurably decreases.
- Compare panel in dev mode doesn't trigger full filesystem scan on every navigation.

---

## R3-02: `ContentPanelRight` doesn't handle API error responses (P0)

**File:** `src/components/content/ContentPanelRight.tsx` (lines 31–37)

**Problem:** The fetch handler casts the response directly to `PageContent`:

```typescript
.then((data: PageContent) => {
  setContent(data)
  setLoading(false)
})
```

But the API route returns `ContentApiResponse`, which is `PageContent | { error: string }`. If the API returns a 404 with `{ error: 'Content not found' }`, the component will render `MarkdownRenderer` with `htmlContent` as `undefined`, causing a runtime error.

The `.catch()` handler also silently swallows errors without showing the user any feedback — just sets `loading` to false, leaving a blank panel.

**Fix:**
1. Check `r.ok` before parsing the response.
2. Narrow the response type: check for `'error' in data` before treating it as `PageContent`.
3. Add an error state and render a user-facing message when content fails to load.

```typescript
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  if (!compareSlug) return
  setLoading(true)
  setContent(null)
  setError(null)
  fetch('/api/content/' + compareSlug)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then((data) => {
      if ('error' in data) throw new Error(data.error)
      setContent(data as PageContent)
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false))
}, [compareSlug])
```

**Acceptance:**
- A bad slug in the compare panel shows an error message, not a blank panel or crash.
- Network errors are surfaced to the user.

---

## R3-03: `NavPanel` search button is a dead stub — TODO from S3 not completed (P1)

**File:** `src/components/nav/NavPanel.tsx` (lines 46–55)

**Problem:** The search button in the NavPanel has `onClick={() => {}}` (a no-op) and a TODO comment:

```tsx
onClick={() => {}}
```
```
{/* TODO: wire to SearchModal in Sprint 3 */}
```

S3-14 wired Cmd+K and added a search button to the TabBar, but the NavPanel's search button was not connected. Users who click "Search..." in the nav panel get no response.

**Fix:**
1. Add `onSearchOpen?: () => void` to `NavPanelProps`.
2. Pass `onSearchOpen` through from `AppShell`.
3. Wire the NavPanel search button: `onClick={onSearchOpen}`.
4. Remove the TODO comment.

**Acceptance:**
- Clicking the search bar in NavPanel opens the SearchModal.
- TODO comment removed.

---

## R3-04: No `AbortController` on client-side fetches — stale data race conditions (P1)

**Files:** `src/components/content/ContentPanelRight.tsx` (line 31), `src/components/graph/GraphViewLoader.tsx` (line 37), `src/components/search/SearchModal.tsx` (line 34)

**Problem:** Three components fire `fetch()` inside `useEffect` without `AbortController`. If the effect re-runs before the previous fetch completes (e.g., rapid compare slug changes), the stale response can overwrite the current data. In `ContentPanelRight`, rapidly switching tabs can show content for the wrong slug.

**Fix:** Add `AbortController` to each fetch effect:

```typescript
useEffect(() => {
  const controller = new AbortController()
  fetch(url, { signal: controller.signal })
    .then(...)
    .catch((err) => {
      if (err.name === 'AbortError') return
      // handle real errors
    })
  return () => controller.abort()
}, [dependency])
```

**Acceptance:**
- Rapidly switching compare panel tabs never shows content for the wrong slug.
- No "setState on unmounted component" warnings in React strict mode.

---

## R3-05: `MarkdownRenderer` accepts but ignores `slug` prop (P1)

**File:** `src/components/content/MarkdownRenderer.tsx` (line 11)

**Problem:** The component signature accepts `{ htmlContent, slug }` but destructures only `htmlContent`:

```typescript
export default function MarkdownRenderer({ htmlContent }: MarkdownRendererProps)
```

The `slug` prop is declared in the type but never used. This is dead code that confuses future developers about whether the prop is needed. ESLint doesn't catch it because destructuring a subset of props is valid TypeScript.

**Fix:** Either:
- (a) Remove `slug` from `MarkdownRendererProps` and all call sites if it's genuinely unused.
- (b) If `slug` is intended for future relative link resolution, keep the prop but add a comment explaining the planned use, and destructure it properly.

**Acceptance:**
- No unused props in the type definition.
- `npx tsc --noEmit` continues to pass.

---

## R3-06: `remark-stringify` is a phantom dependency — not in `package.json` (P1)

**File:** `scripts/build-search-index.ts` (line 7)

**Problem:** The script imports `remarkStringify` from `remark-stringify`:

```typescript
import remarkStringify from 'remark-stringify'
```

But `remark-stringify` is not listed in `package.json` (neither dependencies nor devDependencies). It resolves today because it's a transitive dependency of `unified` or `strip-markdown`, but this can break on any `npm update` if the transitive dependency changes.

**Fix:**
```bash
npm install remark-stringify
```

Or, since `strip-markdown` already strips formatting, the pipeline could use a simpler stringifier — but explicit is better than implicit regardless.

**Acceptance:**
- `remark-stringify` is listed in `package.json`.
- `rm -rf node_modules && npm ci` followed by `tsx scripts/build-search-index.ts` works.

---

## R3-07: `generate-graph-data.ts` reads every file twice (P2)

**File:** `scripts/generate-graph-data.ts` (lines 49–64, 69–85)

**Problem:** The script has two passes over all markdown files:
- First pass (line 49): reads every file to extract frontmatter → builds nodes.
- Second pass (line 69): reads every file again to extract wikilinks → builds edges.

Both passes call `readFile` independently, doubling the I/O. With 26 files this is ~150ms wasted, but it will scale linearly as content grows.

**Fix:** Combine into a single pass — read the file once, extract both frontmatter and wikilinks:

```typescript
for (const file of files) {
  const raw = await readFile(file, 'utf-8')
  const { data, content } = matter(raw)
  const slug = slugFromFilePath(file)

  // Build node
  nodes.push({ id: slug, label: ..., ... })
  nodeSet.add(slug)

  // Store content for wikilink extraction
  contentBySlug.set(slug, content)
}

// Second pass is just string scanning, no I/O
for (const [sourceSlug, content] of contentBySlug) {
  // extract wikilinks...
}
```

**Acceptance:**
- Each file is read exactly once.
- Output is identical.

---

## R3-08: Duplicated types across 5 files — no single source of truth (P2)

**Files:**
- `GraphNode` / `GraphEdge` / `GraphData`: defined in `GraphView.tsx`, `GraphViewLoader.tsx`, and `generate-graph-data.ts`
- `SearchEntry`: defined in `build-search-index.ts` and `types/content.ts`

**Problem:** The same types are independently defined in multiple files. If the schema changes (e.g., adding a `group` field to `GraphNode`), every copy must be updated manually. The build scripts and runtime components can silently drift out of sync.

**Fix:**
1. Define `GraphNode`, `GraphEdge`, `GraphData` in `src/types/content.ts` and export them.
2. In `GraphView.tsx` and `GraphViewLoader.tsx`, import from `@/types/content`.
3. For `generate-graph-data.ts` (a script that can't use `@/` path aliases), either:
   - Use a relative import path (`../../src/types/content`), or
   - Create a shared `types.ts` in `scripts/` that re-exports from `src/types/content.ts` via the scripts tsconfig.
4. Remove the duplicate `SearchEntry` from `build-search-index.ts` — import from `@/types/content` (or relative path).

**Acceptance:**
- Each graph/search type is defined once in `types/content.ts`.
- All consumers import from the single source.

---

## R3-09: `findParentId` uses `undefined as unknown as null` type coercion hack (P2)

**File:** `src/components/nav/NavFileTree.tsx` (line 77)

**Problem:**

```typescript
return undefined as unknown as null
```

This is a double type coercion to work around the function's return type of `string | null`. The actual issue is that the function has an implicit `undefined` return when no match is found in any branch. The coercion masks a type error instead of fixing the logic.

**Fix:** Add an explicit `return null` at the end of the function:

```typescript
function findParentId(nodes: TreeNode[], targetId: string, parentId: string | null = null): string | null {
  for (const node of nodes) {
    if (node.id === targetId) return parentId
    if (node.children) {
      const found = findParentId(node.children, targetId, node.id)
      if (found !== null) return found
    }
  }
  return null
}
```

The check should also be `if (found !== null)` rather than `if (found !== undefined)` to match the return type.

**Acceptance:**
- No `as unknown as` coercions in the file.
- Arrow-left keyboard navigation still works correctly (move to parent folder).

---

## R3-10: `ResizeHandle` still causes re-render storm during drag (P2)

**File:** `src/components/layout/ResizeHandle.tsx` (line 25)

**Problem:** The S2 review (R2-10) recommended using a local ref during drag and only committing to parent state on `pointerUp`. The current implementation adds `requestAnimationFrame` throttling, which reduces frequency but still calls `onResize(clamped)` → `setPanel3Width` in AppShell → full tree re-render on every animation frame during drag.

At 60fps, that's 60 React re-renders per second of the entire AppShell tree (NavPanel, ContentPanel, TabBar, GraphPanel, etc.) while dragging.

**Fix:** Use a local ref to apply width directly to the DOM during drag, commit to state only on `pointerUp`:

```typescript
const panel3Ref = useRef<HTMLDivElement>(null) // passed from AppShell or found via DOM traversal
// During drag: panel3Ref.current.style.width = clamped + 'px'
// On pointerUp: onResize(finalWidth) // single state update
```

If passing a ref is too invasive, alternatively use `React.memo` on all AppShell children to prevent cascading re-renders.

**Acceptance:**
- React DevTools profiler shows ≤ 2 re-renders during a drag gesture (start + end).
- Drag feels smooth at 60fps.

---

## R3-11: `NavFileTree` recomputes visible node list on every keypress (P2)

**File:** `src/components/nav/NavFileTree.tsx` (line 287)

**Problem:** `handleKeyDown` calls `buildVisibleList(treeData, expanded)` on every keyboard event. `buildVisibleList` walks the entire tree recursively to produce a flat array. For a 26-node tree this is negligible, but it's called inside a `useCallback` that also depends on `expanded` — meaning the callback is recreated on every expand/collapse, and every child re-renders.

**Fix:** Memoize the visible list:

```typescript
const visibleList = useMemo(
  () => buildVisibleList(treeData, expanded),
  [treeData, expanded],
)
```

Then use `visibleList` inside `handleKeyDown` via a ref to avoid adding it to the callback's dependency array:

```typescript
const visibleListRef = useRef(visibleList)
visibleListRef.current = visibleList
```

**Acceptance:**
- `buildVisibleList` runs only when `treeData` or `expanded` changes, not on every keypress.
- Arrow key navigation still works correctly.

---

## R3-12: `GraphView` resolves CSS variables on every render (P2)

**File:** `src/components/graph/GraphView.tsx` (lines 46–52)

**Problem:** CSS variables are resolved via `getComputedStyle(document.documentElement)` at the top of the render function body. This runs on every re-render — including when `dimensions` change (from ResizeObserver), when `activeSlug` changes, etc. `getComputedStyle` is relatively expensive as it forces style recalculation.

Additionally, the `typeof document !== 'undefined'` guard is unnecessary since the component is loaded with `{ ssr: false }`.

**Fix:**
1. Move CSS variable resolution into a `useMemo` or `useState` + `useEffect`, resolving only on mount and on theme changes (via `MutationObserver` on `data-theme`).
2. Remove the `typeof document` guard.
3. This also addresses the s4-notes.md carry-forward about theme reactivity.

```typescript
const [colors, setColors] = useState(() => resolveColors())

useEffect(() => {
  const observer = new MutationObserver(() => setColors(resolveColors()))
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}, [])
```

**Acceptance:**
- `getComputedStyle` is called at most once per theme change, not on every render.
- Switching themes updates graph colors without needing to close/reopen the panel.

---

## R3-13: `ContentApiResponse` union type has no discriminant — impossible to narrow safely (P2)

**File:** `src/types/content.ts` (line 64)

**Problem:**

```typescript
export type ContentApiResponse = PageContent | { error: string }
```

Both `PageContent` and `{ error: string }` are plain objects with no shared discriminant field. TypeScript can narrow this with `'error' in data`, but there's nothing preventing a `PageContent` from also having an `error` field in the future. The client code in `ContentPanelRight` doesn't even attempt to narrow — it just casts.

**Fix:** Add a discriminant field or use a wrapper:

```typescript
export type ContentApiResponse =
  | { ok: true; data: PageContent }
  | { ok: false; error: string }
```

Update the API route and client code to use the discriminant.

Or, simpler: keep the current shape but add an `ok` boolean:

```typescript
// In the route handler:
return NextResponse.json({ ...data, ok: true })
// Error case:
return NextResponse.json({ ok: false, error: 'Content not found' }, { status: 404 })
```

**Acceptance:**
- The response type has a discriminant field.
- Client code narrows the type before accessing `htmlContent`.

---

## R3-14: `useTabManager` closes tabs via main router even in compare panel (P2)

**File:** `src/hooks/useTabManager.ts` (lines 42–53)

**Problem:** The `closeTab` function uses `router.push()` to navigate when closing the active tab:

```typescript
if (activeSlug === slug) {
  const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
  router.push(next ? '/' + next.slug : '/firms/cfd/funded-next')
}
```

When `useTabManager` is used by `ContentPanelRight` (compare panel with `storageKey: 'compareTab'`), closing a tab triggers a URL change in the main router — navigating the main panel instead of the compare panel. This is because `useRouter()` always returns the global Next.js router.

**Fix:** Make `closeTab` accept an optional navigation callback, or separate the "close tab from list" logic from the "navigate after close" logic:

```typescript
export function useTabManager(
  treeData: TreeNode[],
  pathname: string,
  storageKey = 'openTabs',
  onNavigate?: (slug: string) => void,
)
```

The compare panel passes its own `onNavigate` (e.g., `setCompareSlug`). The main panel uses the default `router.push`.

**Acceptance:**
- Closing a tab in the compare panel does NOT change the URL or the main panel's content.
- Closing a tab in the main panel still navigates correctly.

---

## R3-15: `/api/content/[...slug]` has no caching headers (P2)

**File:** `src/app/api/content/[...slug]/route.ts`

**Problem:** The compare panel fetches content via this API route on every tab switch. The response has no `Cache-Control` header, so each navigation triggers a full server round-trip with filesystem reads.

For content that only changes at build time (markdown files in `/data`), responses should be cached aggressively.

**Fix:** Add caching headers:

```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
  },
})
```

Or, cache in the client with a simple in-memory map to avoid re-fetching content that was already loaded.

**Acceptance:**
- Switching back to a previously viewed compare tab doesn't trigger a network request.
- Response includes appropriate `Cache-Control` header.

---

## R3-16: `ContentPanelRight` passes no-op handlers to `TabBar` (P2)

**File:** `src/components/content/ContentPanelRight.tsx` (lines 47)

**Problem:**

```typescript
<TabBar
  ...
  onTogglePanel3={() => {}}
/>
```

The compare panel's TabBar renders a "Toggle sidebar" button (the `PanelRight` icon) that does nothing when clicked. This is confusing UX — the button is visible and clickable but has no effect.

**Fix:** Either:
- (a) Hide the toggle button in the compare panel by making `onTogglePanel3` optional in `TabBarProps` and conditionally rendering the button (same pattern as `onHamburger`).
- (b) Wire it to close the compare panel / switch back to graph mode.

**Acceptance:**
- The compare panel's TabBar does not show a non-functional sidebar toggle button.

---

## R3-17: `VerifiedBadge` doesn't distinguish `inactive` from `shutdown` (P3)

**File:** `src/components/content/VerifiedBadge.tsx` (line 9)

**Problem:** The `status` type includes `'active' | 'inactive' | 'shutdown'`, but the component only checks `status === 'active'` and treats everything else as "no longer active":

```typescript
const isActive = status === 'active'
```

An `inactive` firm (temporarily paused) and a `shutdown` firm (permanently closed) are meaningfully different states that users would want to distinguish.

**Fix:** Add a third visual variant:

| Status | Badge | Color |
| --- | --- | --- |
| `active` | "Last verified: [date]" | Green |
| `inactive` | "This firm is currently inactive" | Yellow/amber |
| `shutdown` | "This firm has permanently shut down" | Red |

**Acceptance:**
- Each of the three statuses renders a visually distinct badge.

---

## R3-18: Module-level `fuseInstance` in `SearchModal` — HMR and testing hazard (P3)

**File:** `src/components/search/SearchModal.tsx` (line 25)

**Problem:**

```typescript
let fuseInstance: Fuse<SearchEntry> | null = null
```

Module-level state persists across HMR cycles in development. If the search index format changes during development, the stale Fuse instance will return results based on the old index structure until the page is hard-refreshed.

In tests, module-level state leaks between test cases unless manually reset.

**Fix:** Move the Fuse instance into a `useRef` inside the component:

```typescript
const fuseRef = useRef<Fuse<SearchEntry> | null>(null)
```

The `useRef` persists across renders (same as module-level for single-instance) but is properly scoped to the component lifecycle and resets on HMR.

**Acceptance:**
- No module-level mutable state in `SearchModal.tsx`.
- Search still works identically (index loaded once, reused on subsequent opens).

---

## R3-19: `build-search-index.ts` and `generate-graph-data.ts` process files sequentially (P3)

**Files:** `scripts/build-search-index.ts` (line 50), `scripts/generate-graph-data.ts` (line 49)

**Problem:** Both scripts iterate files with a `for...of` loop and `await readFile()` sequentially. With 26 files, each taking ~5ms to read and parse, that's ~130ms per script. Not a problem today, but scales linearly.

**Fix:** Parallelize file processing:

```typescript
const entries = await Promise.all(
  files.map(async (file) => {
    const raw = await readFile(file, 'utf-8')
    const { data, content } = matter(raw)
    // ...
    return entry
  }),
)
```

**Acceptance:**
- Build scripts complete faster with large file counts.
- Output is identical.

---

## R3-20: `prose.css` missing styles for wikilink-missing class (P3)

**File:** `src/styles/prose.css`

**Problem:** `getPageContent` configures the wikilink plugin with `newClassName: 'wikilink-missing'` for broken links. But `prose.css` only styles `.wikilink` — there's no `.wikilink-missing` rule. Broken wikilinks render visually identical to valid ones, giving users no visual signal that a link is dead.

**Fix:** Add a distinct style:

```css
.prose a.wikilink-missing {
  color: var(--muted-foreground);
  text-decoration: line-through;
  text-decoration-style: dashed;
  cursor: not-allowed;
  opacity: 0.6;
}
```

**Acceptance:**
- Broken wikilinks are visually distinguishable from valid ones (strikethrough + muted color).

---

## R3-21: Prop drilling still growing — S2 R2-21 unresolved (P3)

**File:** `src/components/layout/AppShell.tsx`

**Problem:** The S2 review flagged prop drilling through 2–3 levels and recommended creating an `AppShellContext`. Sprint 3 added even more props:
- `onSearchOpen` now threads through `AppShell → ContentPanel → TabBar`
- `treeData` now threads through `AppShell → GraphPanel → ContentPanelRight`
- `activeSlug` threads through `AppShell → GraphPanel → GraphViewLoader → GraphView`
- `onNodeClick` threads through `AppShell → GraphPanel → GraphViewLoader → GraphView`

The prop surface area has expanded from S2. AppShell currently manages 11 distinct pieces of state and passes 7+ props to `ContentPanel` and 7 props to `GraphPanel`.

**Fix (Sprint 4):** Create an `AppShellContext` with a `useAppShell()` hook. Move shared state and callbacks into the context. Components consume directly without prop threading.

**Acceptance:**
- `ContentPanel` and `GraphPanel` props are reduced to ≤ 3 each.
- AppShell renders the context provider + layout structure only.

---

## R3-22: `getPageContent` path resolution is fragile (P3)

**File:** `src/lib/content/getPageContent.ts` (line 33)

**Problem:**

```typescript
const filePath = path.join(FIRMS_DIR, '..', slug + '.md')
```

`FIRMS_DIR` is `data/firms`, so this goes up to `data/` then appends the slug. This means the slug must always include the `firms/` prefix (e.g., `firms/cfd/funded-next/rules`). The `..` traversal is non-obvious and could break if the directory structure changes.

There's also no check for path traversal attacks — a slug like `../../../etc/passwd` would resolve to a real system path. In practice this is mitigated by `force-static` (only pre-generated slugs are served), but the API route handler at `/api/content/[...slug]` is dynamic and accepts arbitrary input.

**Fix:**
1. Replace the path construction with explicit logic:
   ```typescript
   const filePath = path.join(process.cwd(), 'data', slug + '.md')
   ```
2. Add path traversal protection in the API route:
   ```typescript
   if (slugPath.includes('..') || !slugPath.startsWith('firms/')) {
     return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
   }
   ```

**Acceptance:**
- Path construction doesn't use `..` traversal.
- API route rejects slugs with `..` or that don't start with `firms/`.

---

## R3-23: No `index.md` fallback in `getPageContent` (P3)

**File:** `src/lib/content/getPageContent.ts` (lines 35–39)

**Problem:** The S3-07 ticket spec explicitly called for an `index.md` fallback:

> "Exception: index files — slug `firms/cfd/funded-next` maps to `data/firms/cfd/funded-next/index.md`. Try `slug + '.md'` first; if that file does not exist, try `slug + '/index.md'`"

The current implementation only tries `slug + '.md'`:

```typescript
const filePath = path.join(FIRMS_DIR, '..', slug + '.md')
```

For firm index pages (slug `firms/cfd/funded-next`), this works because `getStaticParams` generates slugs that already map to the index file via `getContentTree`'s slug logic. But if any code path passes a bare firm slug (e.g., from the compare panel or a future feature), it will fail.

**Fix:** Add the fallback:

```typescript
let filePath = path.join(process.cwd(), 'data', slug + '.md')
try {
  await access(filePath)
} catch {
  filePath = path.join(process.cwd(), 'data', slug, 'index.md')
}
```

**Acceptance:**
- `getPageContent('firms/cfd/funded-next')` resolves to `index.md` without relying on slug pre-processing.

---

## R3-24: Settings button in NavPanel logs to console (P3)

**File:** `src/components/nav/NavPanel.tsx` (line 71)

**Problem:**

```typescript
onClick={() => console.log('settings — v2')}
```

This `console.log` is a development stub that will appear in production console output. Users who open DevTools will see random "settings — v2" messages.

**Fix:** Replace with a no-op `() => {}` or remove the button entirely if settings aren't planned for the near term. If kept, add `aria-disabled="true"` and muted styling to signal it's not functional.

**Acceptance:**
- No `console.log` stubs in production code.

---

## Summary — Recommended Sprint 4 Prerequisite Fixes

Before starting Sprint 4 feature work, resolve these:

| Ticket | Severity | Effort | Description |
| --- | --- | --- | --- |
| R3-01 | P0 | Medium | Cache getContentTree / React cache for getPageContent |
| R3-02 | P0 | Small | Handle API error responses in ContentPanelRight |
| R3-03 | P1 | Small | Wire NavPanel search button to SearchModal |
| R3-04 | P1 | Small | Add AbortController to all client fetch effects |
| R3-05 | P1 | Trivial | Remove unused `slug` prop from MarkdownRenderer |
| R3-06 | P1 | Trivial | Add `remark-stringify` to package.json |

**Estimated total effort for P0+P1:** ~0.5 developer-day

Schedule within Sprint 4:

| Ticket | Severity | Effort | Description |
| --- | --- | --- | --- |
| R3-07 | P2 | Small | Single-pass file reading in generate-graph-data.ts |
| R3-08 | P2 | Small | Consolidate duplicated types into types/content.ts |
| R3-09 | P2 | Trivial | Fix findParentId type coercion hack |
| R3-10 | P2 | Medium | Local ref during drag resize to prevent re-render storm |
| R3-11 | P2 | Small | Memoize visible node list in NavFileTree |
| R3-12 | P2 | Small | Memoize CSS variable resolution in GraphView + theme reactivity |
| R3-13 | P2 | Small | Add discriminant to ContentApiResponse union type |
| R3-14 | P2 | Small | Fix useTabManager closeTab routing in compare panel |
| R3-15 | P2 | Small | Add caching headers to content API route |
| R3-16 | P2 | Small | Remove non-functional toggle button from compare TabBar |

Defer to Sprint 5+:

| Ticket | Severity | Effort | Description |
| --- | --- | --- | --- |
| R3-17 | P3 | Small | Distinct badges for inactive vs shutdown status |
| R3-18 | P3 | Trivial | Move fuseInstance from module-level to useRef |
| R3-19 | P3 | Small | Parallelize build script file processing |
| R3-20 | P3 | Trivial | Add prose style for wikilink-missing class |
| R3-21 | P3 | Medium | AppShellContext to reduce prop drilling |
| R3-22 | P3 | Small | Fix path resolution + add traversal protection |
| R3-23 | P3 | Trivial | Add index.md fallback in getPageContent |
| R3-24 | P3 | Trivial | Remove console.log stub from settings button |
