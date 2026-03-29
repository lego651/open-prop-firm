# Sprint 2 Code Review — Tech Lead Audit

**Reviewer:** Tech Lead (code auditor)
**Date:** 2026-03-29
**Scope:** All files introduced or modified in S2 commits (14 S2 commits, 30 files changed)
**Verdict:** Sprint 2 delivers the three-panel shell as specified. The architecture is sound and the ticket acceptance criteria are met. However, there are **hydration safety issues**, **performance gaps**, **accessibility violations**, and **structural debt** that should be resolved before Sprint 3 builds on top of this foundation.

---

## Severity Legend

| Level             | Meaning                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| **P0 — Critical** | Will cause bugs or crashes in production. Fix before S3 starts.                     |
| **P1 — High**     | Degrades UX, violates web standards, or creates maintenance traps. Fix in early S3. |
| **P2 — Medium**   | Code quality, performance, or consistency issues. Schedule within S3.               |
| **P3 — Low**      | Style nits, minor improvements, nice-to-haves. Can be deferred.                     |

---

## R2-01: Hydration mismatch — localStorage in useState initializers (P0)

**Files:** `src/components/layout/AppShell.tsx` (lines 38–68), `src/components/nav/NavFileTree.tsx` (lines 161–167)

**Problem:** Five `useState` lazy initializers read from `localStorage` directly:

```typescript
const [panel1Collapsed, setPanel1Collapsed] = useState<boolean>(() => {
  try {
    return JSON.parse(localStorage.getItem('panel1Collapsed') ?? 'false')
  } catch {
    return false
  }
})
```

Next.js App Router SSR-renders `'use client'` components on the server. During SSR, `localStorage` is undefined — the `catch` block returns the default. During client hydration, React re-executes the component function, the initializer reads from `localStorage` and returns the stored value. If the stored value differs from the default, the server HTML and client VDOM diverge → **hydration mismatch**.

Affected state: `panel1Collapsed`, `panel3Width`, `panel3Mode`, `openTabs` (AppShell), `expanded` (NavFileTree).

**Why it matters:** React logs warnings in dev, but in production it silently patches the DOM. This can cause visual glitches — e.g., Panel 1 flashing between collapsed/expanded, tabs appearing/disappearing, or the wrong Panel 3 width on first paint. For a static site with `force-static`, this is especially visible because the server HTML is cached and served to every visitor.

**Fix:**

1. Initialize all localStorage-backed state with static defaults (matching SSR output).
2. Add a single `useEffect` that reads all localStorage values on mount and batch-updates state.
3. Optionally: gate rendering behind a `mounted` ref to avoid the flash (show a skeleton or nothing until hydration completes).

**Acceptance:**

- `npm run build && npm run start` — open in browser, zero hydration warnings in console.
- Stored preferences (collapsed panel, open tabs, panel width) still restore correctly after refresh.
- No visible flash of default state → stored state transition.

---

## R2-02: Hydration mismatch — `typeof window` in useState initializer (P0)

**File:** `src/components/layout/AppShell.tsx` (lines 74–76)

**Problem:**

```typescript
const [viewportWidth, setViewportWidth] = useState<number>(
  typeof window !== 'undefined' ? window.innerWidth : 1280,
)
```

During SSR: evaluates to `1280`. During client hydration: evaluates to the actual viewport width. If the browser is not exactly 1280px wide, the server and client render different layouts (different panel visibility, different responsive behavior) → hydration mismatch.

**Fix:** Initialize with a constant (e.g., `0` or `1280`) and correct in the existing resize `useEffect`. Since the viewport correction `useEffect` (line 85–90) already runs on mount, move the initial viewport read there too.

**Acceptance:**

- Zero hydration warnings at any viewport width.

---

## R2-03: Nested `<button>` inside `<button>` — invalid HTML (P0)

**File:** `src/components/content/TabBar.tsx` (lines 30–55)

**Problem:** The tab close button (`<button>` with `<X>`) is nested inside the tab button (`<button>`). This is invalid per the HTML spec — `<button>` cannot contain interactive content. Screen readers will announce this incorrectly, and some browsers may hoist the inner button out of the outer one.

```tsx
<button onClick={() => onTabClick(tab.slug)} className="...">
  <span>{tab.title}</span>
  <button
    onClick={(e) => {
      e.stopPropagation()
      onTabClose(tab.slug)
    }}
  >
    <X size={11} />
  </button>
</button>
```

**Fix:** Change the outer element from `<button>` to `<div role="tab" tabIndex={0} onKeyDown={...}>` and keep the inner close `<button>`. Or change the inner close to a `<span role="button">`.

**Acceptance:**

- HTML validator reports zero errors for the tab bar region.
- Keyboard: pressing Enter on a tab activates it; pressing Delete or clicking X closes it.
- Screen reader announces each tab correctly.

---

## R2-04: Hamburger menu trigger not wired (P1)

**File:** `src/components/layout/AppShell.tsx` (line 188)

**Problem:** S2-12 specifies that at < 768px a hamburger icon should appear in the ContentPanel/TabBar header to open the mobile nav overlay. The overlay infrastructure exists (backdrop + fixed panel at lines 167–184), but there is no trigger button to open it — only a TODO comment. At < 768px, the user has no way to access navigation.

```tsx
{
  /* TODO S2-12: pass onHamburger to ContentPanel when viewportWidth < 768 — requires ContentPanel prop update */
}
```

**Fix:**

1. Add an `onHamburger?: () => void` prop to `ContentPanel` and `TabBar`.
2. When `onHamburger` is provided, render a `Menu` icon button at the left edge of the TabBar.
3. In AppShell, pass `onHamburger={() => setPanel1OverlayOpen(true)}` when `viewportWidth < 768`.

**Acceptance:**

- At < 768px: hamburger icon visible in tab bar. Tapping opens the nav overlay.
- Tapping backdrop or navigating to a file closes the overlay.
- At >= 768px: hamburger icon is not rendered.

---

## R2-05: Mobile overlay NavPanel renders collapsed (P1)

**File:** `src/components/layout/AppShell.tsx` (lines 167–184)

**Problem:** The mobile overlay renders `<NavPanel collapsed={panel1Collapsed} .../>`. At < 1024px, `panel1Collapsed` is auto-set to `true` (line 88). At < 768px (which is also < 1024), the overlay opens with a collapsed (48px icon rail) NavPanel — the user sees just a narrow toggle icon instead of the full file tree.

**Fix:** The overlay should always pass `collapsed={false}` since it's a full-width (260px) sliding panel.

**Acceptance:**

- At < 768px: opening the nav overlay always shows the full expanded file tree, regardless of `panel1Collapsed` state.

---

## R2-06: `min-w-[400px]` on Panel 2 causes horizontal overflow on mobile (P1)

**File:** `src/components/layout/AppShell.tsx` (line 187)

**Problem:** `<div className="flex-1 min-w-[400px] ...">` forces Panel 2 to be at least 400px wide. On a 375px mobile device, this causes a horizontal scrollbar on the page and breaks the layout.

**Fix:** Remove the `min-w-[400px]` entirely, or make it responsive: `min-w-0 md:min-w-[400px]`.

**Acceptance:**

- At 375px (iPhone SE): no horizontal scrollbar, content fills full width.
- At desktop widths: Panel 2 still has reasonable minimum sizing.

---

## R2-07: Missing `type="button"` on interactive buttons (P1)

**Files:** `src/components/content/BreadcrumbBar.tsx` (lines 73, 87, 128), `src/components/graph/GraphPanel.tsx` (line 45), `src/components/auth/CompareAuthGate.tsx` (lines 13, 26)

**Problem:** Multiple `<button>` elements lack `type="button"`. The HTML default is `type="submit"`, which can cause unintended form submission if these buttons ever appear inside a `<form>` context (e.g., future search modal, settings panel).

NavPanel and TabBar correctly set `type="button"`, but BreadcrumbBar, GraphPanel, and CompareAuthGate do not.

**Fix:** Add `type="button"` to every `<button>` that is not a form submit button.

**Acceptance:**

- Every `<button>` in S2 components has an explicit `type` attribute.

---

## R2-08: File tree items not keyboard-accessible (P1)

**File:** `src/components/nav/NavFileTree.tsx`

**Problem:** Folder toggle and file click handlers are on `<div>` elements with no `tabIndex`, `role`, or `onKeyDown` handlers:

```tsx
<div className="flex items-center..." onClick={() => onToggleFolder(node.id)}>
```

These elements are invisible to keyboard users and screen readers. The entire file tree is inaccessible without a mouse.

**Fix:**

1. Add `role="treeitem"` to file nodes, `role="group"` to folder containers.
2. Add `tabIndex={0}` to clickable items.
3. Add `onKeyDown` handlers for Enter (activate), Space (toggle), ArrowUp/Down (navigate).
4. Consider using a `role="tree"` on the root container per WAI-ARIA tree view pattern.

**Acceptance:**

- Tab key focuses file tree items.
- Enter opens a file; Space or Enter toggles a folder.
- Screen reader announces the tree structure.

---

## R2-09: No debounce on window resize listener (P2)

**File:** `src/components/layout/AppShell.tsx` (lines 77–81)

**Problem:** The resize handler fires `setViewportWidth(window.innerWidth)` on every pixel of window resize. Each call triggers a full component re-render of AppShell and all children (NavPanel, ContentPanel, TabBar, BreadcrumbBar, GraphPanel). At 60fps during resize, that's 60 re-renders per second.

**Fix:** Debounce the resize handler to ~150ms using a `setTimeout`/`clearTimeout` pattern (no external dependency needed). Or use `requestAnimationFrame` for smoother updates.

```typescript
useEffect(() => {
  let raf: number
  const handler = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => setViewportWidth(window.innerWidth))
  }
  window.addEventListener('resize', handler)
  return () => {
    window.removeEventListener('resize', handler)
    cancelAnimationFrame(raf)
  }
}, [])
```

**Acceptance:**

- Resizing the browser window does not cause jank or excessive re-renders.
- Open React DevTools profiler → resize → re-render count stays under 10 per resize gesture.

---

## R2-10: Drag resize triggers parent re-render storm (P2)

**File:** `src/components/layout/ResizeHandle.tsx` (line 21)

**Problem:** `onResize(clamped)` is called on every `pointermove` event during drag. This calls `setPanel3Width` in AppShell, which triggers a full re-render of the entire component tree on every mouse move frame. Combined with the inline style `style={{ width: panel3Width }}`, this causes layout thrashing.

**Fix:** Use a local ref to track the width during drag. Only commit to AppShell state on `pointerUp` (end of drag). During drag, apply width directly to the DOM via a ref to avoid React re-renders:

```typescript
const panel3Ref = useRef<HTMLDivElement>(null)
// During drag: panel3Ref.current.style.width = clamped + 'px'
// On pointerUp: onResize(finalWidth)
```

Alternatively, if the smooth live preview is desired, wrap the resize handler in `requestAnimationFrame` and consider `React.memo` on child components.

**Acceptance:**

- Drag resizing is smooth at 60fps without dropped frames.
- React DevTools profiler shows minimal re-renders during drag.

---

## R2-11: Nine `useEffect` hooks in AppShell — extract custom hooks (P2)

**File:** `src/components/layout/AppShell.tsx`

**Problem:** AppShell has 9 `useEffect` hooks, 4 of which are localStorage sync:

```
useEffect — viewport resize listener
useEffect — viewport initial correction
useEffect — supabase auth session
useEffect — tab reconciliation from pathname
useEffect — persist panel1Collapsed
useEffect — persist panel3Width
useEffect — persist panel3Mode
useEffect — persist openTabs
```

This makes the component hard to reason about, test, and debug. The effect ordering and dependency interactions are non-obvious.

**Fix:**

1. Extract a `useLocalStorage<T>(key, defaultValue)` custom hook that handles read-on-mount + write-on-change in a single hook. Replaces 8 lines of state+effect per localStorage key with one line.
2. Extract a `useViewport()` hook that returns `viewportWidth` and handles the resize listener + debounce.
3. Extract a `useSupabaseUser()` hook that returns `user` state and handles the auth listener.
4. Extract a `useTabManager(treeData, pathname, router)` hook that encapsulates tab reconciliation, open/close logic, and persistence.

**Acceptance:**

- AppShell is under 120 lines.
- Each custom hook is independently testable.
- Zero behavior change — same UX as before.

---

## R2-12: `validSlugs` prop passed but never used (P2)

**Files:** `src/app/layout.tsx` (line 27, 44), `src/components/layout/AppShell.tsx` (line 15, 32)

**Problem:** `validSlugs` is fetched in the root layout, passed to AppShell as a prop, destructured as `_validSlugs`, and never referenced. This serializes the entire slug array (26+ strings) from server to client on every page load for no reason.

**Fix:** Remove `validSlugs` from the `AppShellProps` interface and stop passing it from layout. If it's needed in the future (e.g., Sprint 3 for link validation), add it back then.

**Acceptance:**

- `validSlugs` is not in the AppShell props or the layout render.
- No unused variables in `npx tsc --noEmit` or ESLint output.

---

## R2-13: Supabase client eagerly created at module scope (P2)

**File:** `src/lib/supabase/client.ts`

**Problem:** The Supabase client is created at module scope:

```typescript
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
```

Issues:

1. The `!` non-null assertion silently passes `undefined` if env vars are missing (the assertion is only a compile-time hint — at runtime `undefined` is passed to `createClient`, which may throw a confusing error deep inside the SDK).
2. The client is created eagerly when the module is imported, even if auth features are never used on that page.
3. If this module is accidentally imported in a server context (e.g., via a shared util), it creates a client-side Supabase instance on the server — a subtle bug.

**Fix:**

1. Replace `!` with runtime validation: `if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')`.
2. Use a lazy singleton pattern: `let client: SupabaseClient | null = null; export function getSupabase() { if (!client) client = createClient(...); return client; }`.
3. Add a `'use client'`-only guard or keep the import chain strictly client-side.

**Acceptance:**

- Missing env vars produce a clear error message mentioning the variable name.
- Supabase client is not created until first use.

---

## R2-14: Class concatenation uses `.join(' ')` instead of `cn()` (P2)

**Files:** `NavFileTree.tsx` (line 142), `TabBar.tsx` (line 39), `ResizeHandle.tsx` (line 38), `BreadcrumbBar.tsx` (line 77)

**Problem:** All S2 components use `[...classes].join(' ')` for conditional class names:

```typescript
className={[
  'group min-w-[120px] max-w-[200px]...',
  isActive ? 'bg-[var(--background)]...' : 'bg-[var(--sidebar-bg)]...',
].join(' ')}
```

The project has `cn()` (clsx + tailwind-merge) installed and used by all shadcn components. The `.join(' ')` pattern doesn't deduplicate classes and doesn't resolve Tailwind conflicts (e.g., if both branches set `bg-*`, the last one doesn't reliably win).

**Fix:** Replace `.join(' ')` with `cn()` from `@/lib/utils` in all S2 components.

**Acceptance:**

- Zero occurrences of `.join(' ')` for className construction in S2 components.
- All conditional classNames use `cn()`.

---

## R2-15: BreadcrumbBar doesn't use shadcn Breadcrumb components (P2)

**File:** `src/components/content/BreadcrumbBar.tsx`

**Problem:** The S2-9 ticket mentions `<BreadcrumbLink>` and `<BreadcrumbPage>`, and the project has `@/components/ui/breadcrumb.tsx` installed. But BreadcrumbBar builds its own breadcrumb from raw `<span>` and `<button>` elements, ignoring the pre-built accessible components.

The shadcn `Breadcrumb` components include:

- Correct `aria-label="breadcrumb"` on the `<nav>`
- `role="link"` and `aria-disabled` on page items
- `role="presentation"` and `aria-hidden` on separators
- Proper `<ol>` / `<li>` semantic structure

The custom implementation has none of this.

**Fix:** Refactor BreadcrumbBar to compose shadcn `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, and `BreadcrumbSeparator` components. Keep the back/forward buttons and slug-to-breadcrumb logic.

**Acceptance:**

- Breadcrumb renders as `<nav aria-label="breadcrumb"><ol>...</ol></nav>`.
- Separators are `aria-hidden`.
- Screen reader announces breadcrumb navigation correctly.

---

## R2-16: Magic numbers scattered across components (P2)

**Files:** Multiple

**Problem:** Layout dimensions and breakpoints are hardcoded as magic numbers across at least 6 files:

| Value  | Used in           | Meaning                      |
| ------ | ----------------- | ---------------------------- |
| `260`  | AppShell, overlay | Panel 1 expanded width       |
| `48`   | AppShell          | Panel 1 collapsed width      |
| `400`  | AppShell          | Panel 2 min-width            |
| `360`  | AppShell          | Panel 3 default width        |
| `280`  | ResizeHandle      | Panel 3 min width            |
| `600`  | ResizeHandle      | Panel 3 max width            |
| `768`  | AppShell          | Mobile breakpoint            |
| `1024` | AppShell          | Tablet breakpoint            |
| `1100` | AppShell          | Panel 3 auto-hide breakpoint |
| `1280` | AppShell          | Panel 3 overlay breakpoint   |

If any of these need to change, you'd have to grep across the entire codebase and hope you found them all.

**Fix:** Create `src/lib/constants.ts` with named exports:

```typescript
export const LAYOUT = {
  PANEL1_WIDTH: 260,
  PANEL1_COLLAPSED: 48,
  PANEL2_MIN_WIDTH: 400,
  PANEL3_DEFAULT_WIDTH: 360,
  PANEL3_MIN_WIDTH: 280,
  PANEL3_MAX_WIDTH: 600,
} as const

export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  PANEL3_AUTO_HIDE: 1100,
  PANEL3_OVERLAY: 1280,
} as const
```

**Acceptance:**

- Zero raw numeric layout/breakpoint values in component files.
- All dimensions reference constants from `src/lib/constants.ts`.

---

## R2-17: `getContentTree()` is sync but declared `async` (P3)

**File:** `src/lib/content/getContentTree.ts` (line 130)

**Problem:** `getContentTree()` is declared `async` but uses only synchronous `fs.readFileSync` and `fs.readdirSync` calls internally. The returned Promise resolves immediately. This is misleading — callers `await` it expecting potential async work, but there is none.

**Fix:** Either:

- (a) Remove `async` and return the result directly. Callers can still `await` a non-Promise value.
- (b) Convert to truly async with `fs.promises.readFile` and `fs.promises.readdir` — this is the better long-term choice as it won't block the event loop during build with many files.

**Acceptance:**

- If option (a): function signature has no `async`, returns `ContentTreeResult` directly.
- If option (b): uses `fs/promises` throughout, no `readFileSync` or `readdirSync` calls.

---

## R2-18: eslint-disable comments suppress real dependency issues (P2)

**Files:** `AppShell.tsx` (line 117), `GraphPanel.tsx` (line 35), `NavFileTree.tsx` (line 190)

**Problem:** Three `useEffect` hooks suppress `react-hooks/exhaustive-deps` warnings:

1. **AppShell tab reconciliation** (line 109–118): Missing `openTabs` and `treeData` in deps. If `treeData` changes between renders (unlikely but possible if layout re-fetches), the effect uses stale data.

2. **GraphPanel auth transition** (line 30–36): Missing `onModeToggle` in deps. `onModeToggle` is `() => setPanel3Mode(m => ...)` — an inline arrow created fresh each render. The effect captures a stale closure. If the user switches modes rapidly while auth resolves, the wrong mode could be set.

3. **NavFileTree ancestor expansion** (line 169–191): Missing `treeData` in deps. If tree data changes, ancestor lookup uses stale data.

**Fix:**

1. For AppShell: wrap the check in a functional update or use `useRef` for `openTabs`.
2. For GraphPanel: stabilize `onModeToggle` with `useCallback` in AppShell, or use a ref for the callback.
3. For NavFileTree: add `treeData` to deps (it's stable in practice since it comes from a server-rendered layout).

**Acceptance:**

- Zero `eslint-disable` comments for `react-hooks/exhaustive-deps` in S2 files.

---

## R2-19: Back/forward history stacks grow unbounded (P3)

**File:** `src/components/content/BreadcrumbBar.tsx` (lines 25–26)

**Problem:** `backStack` and `forwardStack` are `useRef<string[]>([])` with items pushed on every navigation. Over a long session with heavy navigation (e.g., comparing 50 firms), these arrays grow without bound. Each entry is a slug string (~40 chars), so memory impact is minimal, but it's still unbounded growth with no cap.

**Fix:** Cap the stacks at a reasonable limit (e.g., 100 entries). When pushing to a full stack, shift the oldest entry.

**Acceptance:**

- After 200 navigations, `backStack.current.length <= 100`.

---

## R2-20: Inconsistent formatting — single vs double quotes (P3)

**Files:** All S2 components

**Problem:** Some files use single quotes (NavPanel, ThemeToggle, NavFileTree, TabBar, BreadcrumbBar, GraphPanel, CompareAuthGate), while others use double quotes (AppShell, ContentPanel). This suggests Prettier ran inconsistently, or files were added in different sessions without a format pass.

**Fix:** Run `npm run format` and verify `npm run format:check` passes. Consider adding a pre-commit hook (even a simple `npx prettier --write --staged` script) to prevent drift.

**Acceptance:**

- `npm run format:check` exits 0.
- All `.tsx` and `.ts` files in `src/` use the same quote style.

---

## R2-21: Prop drilling — consider context for deeply shared state (P3)

**File:** `src/components/layout/AppShell.tsx`

**Problem:** AppShell currently passes state through 2–3 levels of prop drilling:

```
AppShell → ContentPanel → TabBar (openTabs, activeSlug, onTabClick, onTabClose, onNewTab, onTogglePanel3)
AppShell → ContentPanel → BreadcrumbBar (activeSlug)
AppShell → NavPanel → NavFileTree (treeData, activeSlug)
AppShell → GraphPanel → CompareAuthGate (onDismiss)
```

Sprint 3 will add search modal, markdown rendering, and wikilink navigation — all of which need access to `activeSlug`, `openTabs`, `treeData`, or navigation callbacks. The prop drilling will deepen.

**Fix (for Sprint 3):** Create an `AppShellContext` with `useAppShell()` hook. Move shared state (`activeSlug`, `openTabs`, `panel3Visible`, `viewportWidth`, navigation callbacks) into the context. Components consume what they need directly without prop threading.

**Acceptance:**

- `ContentPanel` and `TabBar` no longer receive `activeSlug`, `openTabs`, etc. as props — they use `useAppShell()`.
- AppShell component is under 80 lines (just the provider + layout).
- Zero behavior change.

---

## R2-22: TooltipProvider wrapped per-component instead of at layout root (P3)

**File:** `src/components/nav/ThemeToggle.tsx` (line 40)

**Problem:** `ThemeToggle` wraps itself in `<TooltipProvider>`. The S2-7 ticket notes "TooltipProvider must wrap the component or be at layout level." Per-component wrapping works but creates unnecessary React context overhead and means every component that uses tooltips must remember to add its own provider.

The S2-8 ticket specifies a tooltip on the Panel 3 toggle ("Toggle sidebar") and the S2-11 ticket specifies tooltips on the mode toggle — neither of these has `TooltipProvider`, so those `title` attributes are used as fallbacks instead.

**Fix:** Add a single `<TooltipProvider>` in `layout.tsx` (wrapping `<AppShell>`) or at the top of `AppShell`. Remove per-component `<TooltipProvider>` wrappers. Replace `title` attributes with proper shadcn `Tooltip` components.

**Acceptance:**

- One `<TooltipProvider>` in the app, at or near the root.
- All interactive icons that have `title` attributes use proper shadcn `Tooltip` instead.

---

## R2-23: `getContentTree()` re-reads filesystem on every layout render (P3)

**File:** `src/app/layout.tsx` (line 27), `src/lib/content/getContentTree.ts`

**Problem:** `getContentTree()` reads from the filesystem (reading every `.md` file's frontmatter) on every server render of the root layout. With `force-static` on the pages, the layout is rendered at build time and cached — so this is fine in production. But in `next dev`, the layout re-renders on every navigation, meaning the filesystem is re-read repeatedly.

For 26 files this is negligible, but if the content grows to hundreds of firms/files, it could slow down dev mode.

**Fix (low priority):** Add in-memory caching to `getContentTree()` with a simple module-level variable:

```typescript
let cached: ContentTreeResult | null = null
export async function getContentTree() {
  if (cached) return cached
  // ... build tree ...
  cached = result
  return result
}
```

For dev mode, invalidate on file changes via a timestamp check or skip caching entirely.

**Acceptance:**

- In `next dev`, navigating between 10 pages does not re-read the filesystem 10 times.
- `npm run build` still generates correct static pages.

---

## Summary — Recommended Sprint 3 Prerequisite Fixes

Before starting Sprint 3 feature work, resolve these tickets:

| Ticket | Severity | Effort  | Description                                   |
| ------ | -------- | ------- | --------------------------------------------- |
| R2-01  | P0       | Medium  | Hydration: localStorage useState initializers |
| R2-02  | P0       | Small   | Hydration: typeof window in useState          |
| R2-03  | P0       | Small   | Invalid nested buttons in TabBar              |
| R2-04  | P1       | Small   | Wire hamburger menu trigger                   |
| R2-05  | P1       | Trivial | Fix overlay NavPanel collapsed prop           |
| R2-06  | P1       | Trivial | Remove min-w-[400px] on mobile                |
| R2-07  | P1       | Small   | Add type="button" to all buttons              |
| R2-08  | P1       | Medium  | Keyboard accessibility for file tree          |

**Estimated total effort for P0+P1:** ~1 developer-day

Schedule within Sprint 3:

| Ticket | Severity | Effort  | Description                          |
| ------ | -------- | ------- | ------------------------------------ |
| R2-09  | P2       | Small   | Debounce resize listener             |
| R2-10  | P2       | Medium  | Optimize drag resize performance     |
| R2-11  | P2       | Medium  | Extract custom hooks from AppShell   |
| R2-12  | P2       | Trivial | Remove unused validSlugs prop        |
| R2-13  | P2       | Small   | Lazy Supabase client with validation |
| R2-14  | P2       | Small   | Replace .join(' ') with cn()         |
| R2-15  | P2       | Medium  | Use shadcn Breadcrumb components     |
| R2-16  | P2       | Small   | Extract layout constants             |
| R2-18  | P2       | Medium  | Fix useEffect dependency issues      |

Defer to Sprint 4+:

| Ticket | Severity | Effort  | Description                         |
| ------ | -------- | ------- | ----------------------------------- |
| R2-17  | P3       | Small   | Make getContentTree truly async     |
| R2-19  | P3       | Trivial | Cap history stack size              |
| R2-20  | P3       | Trivial | Run formatter for consistent quotes |
| R2-21  | P3       | Medium  | AppShellContext for prop drilling   |
| R2-22  | P3       | Small   | Root-level TooltipProvider          |
| R2-23  | P3       | Small   | Cache getContentTree in dev         |
