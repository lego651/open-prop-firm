# Sprint 5 — Code Review

**Reviewer:** Tech Lead / Code Auditor
**Date:** 2026-03-29
**Scope:** All code delivered in commit `c95d70e` — AppShellContext refactor, auth pages, AuthButton, CompareAuthGate, graph node styling, GraphControls, GraphLegend, GraphTooltip, modifier-click Panel 3
**Methodology:** Full read of all 26 changed files, cross-reference with existing hooks/context/components, architectural pattern analysis

---

## Executive Summary

Sprint 5 delivered a meaningful feature surface — auth, graph polish, and the compare flow all work end-to-end. The context refactor (`AppShellProvider`) is the right call and largely well-executed. However, the sprint introduced **one security issue** (open redirect), **two outright functional bugs** (zoom state desync, node sizing not implemented despite the ticket claiming it), and a set of architecture and UX gaps. This review identifies **15 findings** across 3 priority tiers.

---

## Findings

### Priority 1 — Security and Functional Correctness

---

#### R5-01: Open redirect vulnerability in `/auth/callback`

**Severity:** P1 — Security
**File:** `src/app/auth/callback/route.ts` (lines 7, 13)

The `next` query parameter is taken from the URL and passed directly to `new URL(next, origin)`:

```typescript
const next = searchParams.get('next') ?? '/'
return NextResponse.redirect(new URL(next, origin))
```

`new URL('https://evil.com', origin)` resolves to `https://evil.com` — the `origin` base is ignored when `next` is an absolute URL. An attacker can craft:

```
https://yoursite.com/auth/callback?code=VALID_CODE&next=https://evil.com
```

After a valid OAuth exchange the user is silently redirected off-site. This is a textbook open redirect and is considered a security vulnerability (CWE-601).

**Fix:**
- Validate that `next` starts with `/` before using it as a redirect target
- If it doesn't, fall back to `'/'`

```typescript
const rawNext = searchParams.get('next') ?? '/'
const next = rawNext.startsWith('/') ? rawNext : '/'
```

**Acceptance:**
- `?next=https://evil.com` redirects to `/` after callback
- `?next=/firms/cfd/funded-next` still redirects correctly
- Applies to both success and (implicitly) error redirect paths

---

#### R5-02: `GraphControls` zoom state desynchronises after manual scroll

**Severity:** P1 — Functional bug
**File:** `src/components/graph/GraphControls.tsx` (lines 28–39)

`zoomLevel` is initialised to `1.0` and only updated when the zoom buttons are clicked. The user can also zoom by scrolling (mouse wheel / trackpad) inside the graph canvas — `ForceGraph2D` handles this natively and does not call back into our state. After any manual scroll zoom:

- `zoomLevel` is stale (still `1.0` or whatever was last button-set)
- Clicking "Zoom In" computes `zoomLevel * 1.5` from the stale value and sets an absolute level that jumps the zoom — effectively zooming out if the user has already scrolled in deep
- The same problem applies in reverse for "Zoom Out"

The zoom buttons become unreliable after any manual interaction.

**Fix:**
- Sync `zoomLevel` from the graph via `ForceGraph2D`'s `onZoom` callback: `onZoom={({ k }) => setZoomLevel(k)}`
- Pass `onZoom` down from `GraphView` to the ref, or lift the `onZoom` handler into `GraphView` and pass the current zoom to `GraphControls`
- Alternatively, use `graphRef.current?.zoom()` — but `ForceGraph2D` does not expose a zoom getter on the ref, so `onZoom` is the correct approach

**Acceptance:**
- After manual scroll zoom, "Zoom In" and "Zoom Out" buttons zoom relative to the actual current level
- No sudden jump when clicking a zoom button after scrolling

---

#### R5-03: Node sizing by `linkCount` not implemented

**Severity:** P1 — Incomplete feature (S5-05 acceptance criterion not met)
**File:** `src/components/graph/GraphView.tsx` (line 97)

The S5-05 ticket requirement: *"nodes … sized by inbound link count."* The graph script correctly populates `linkCount` on each node. But `GraphView` uses:

```typescript
nodeRelSize={5}
```

`nodeRelSize` is a constant multiplier applied to a node's `val` property — but `nodeVal` is never set, so all nodes default to `val=1` and render identically sized. `linkCount` is fetched, stored, and ignored at render time.

**Fix:**
- Add `nodeVal={(node) => Math.max(1, (node as GraphNode).linkCount ?? 1)}` to the `ForceGraph2D` props
- Optionally cap the max size to prevent highly-linked nodes from dominating the canvas: `Math.min(Math.max(1, linkCount), 10)`

**Acceptance:**
- Nodes with more inbound links are visually larger
- Nodes with `linkCount=0` render at base size, not invisible
- Legend or tooltip communicates that size = link count

---

### Priority 2 — Architecture and Code Quality

---

#### R5-04: `useSupabaseUser` runs `getSession` and `onAuthStateChange` concurrently — race condition

**Severity:** P2 — Correctness
**File:** `src/hooks/useSupabaseUser.ts` (lines 17–28)

The hook fires two async operations simultaneously:

```typescript
supabase.auth.getSession().then(({ data }) => {
  setUser(data.session?.user ?? null)
  setLoading(false)
})
const { data } = supabase.auth.onAuthStateChange((_, session) => {
  setUser(session?.user ?? null)
  setLoading(false)
})
```

`onAuthStateChange` fires immediately with an `INITIAL_SESSION` event on subscription — this is by Supabase design. The explicit `getSession()` call then races against it. Whichever resolves last wins, and `getSession()` can return a slightly stale session if a token refresh happened between the two calls.

The Supabase SSR docs explicitly recommend using **only** `onAuthStateChange` in client components for exactly this reason — `INITIAL_SESSION` replaces the need for `getSession()`.

**Fix:**
- Remove the `getSession()` call entirely
- Set initial `loading: true` and let `onAuthStateChange` resolve it on first fire

```typescript
useEffect(() => {
  const supabase = getSupabase()
  const { data } = supabase.auth.onAuthStateChange((_, session) => {
    setUser(session?.user ?? null)
    setLoading(false)
  })
  return () => data.subscription.unsubscribe()
}, [])
```

**Acceptance:**
- `loading` starts true, becomes false on first `onAuthStateChange` event
- No duplicate session fetches in the network tab
- Auth state still updates reactively on sign-in/sign-out

---

#### R5-05: `GraphView` recreates `graphData` on every render — simulation restarts on unrelated updates

**Severity:** P2 — Performance / UX bug
**File:** `src/components/graph/GraphView.tsx` (lines 81–91)

The filtered nodes/edges computation and `graphData` object are constructed inline without memoisation:

```typescript
const filteredNodes = nodes.filter(...).map((n) => ({ ...n }))
const filteredLinks = edges.filter(...).map((e) => ({ ... }))
const graphData = { nodes: filteredNodes, links: filteredLinks }
```

`ForceGraph2D` detects a new `graphData` reference and **restarts the force simulation** from scratch. Since `graphData` is recreated on every render, any context update that re-renders `GraphView` — including `activeSlug` changing (which happens on every navigation) — resets the graph layout and replays the animation.

This makes the graph visually unstable: it re-explodes every time the user opens a new tab.

**Fix:**
- Memoize the filtered data: `useMemo(() => { … }, [nodes, edges, hiddenTypes])`
- The `activeSlug` change should not trigger a layout reset — it only changes node colour (handled via the `nodeColor` callback, which reads `activeSlug` from the closure and is already stable)
- Do **not** spread nodes/edges into new objects unnecessarily; `ForceGraph2D` mutates nodes internally (adds `x`, `y`, `vx`, `vy`) and expects reference stability

**Acceptance:**
- Navigating between pages does not reset the graph layout
- Graph only re-simulates when nodes/edges or filter state changes
- Verifiable: graph nodes stay in the same positions after a tab click

---

#### R5-06: Theme observation logic duplicated across three graph components

**Severity:** P2 — DRY violation
**Files:** `src/components/graph/GraphView.tsx` (lines 46–55), `src/components/graph/GraphLegend.tsx` (lines 8–23), `src/components/graph/GraphTooltip.tsx` (line 14)

Three components independently handle theme detection:

- `GraphView`: `useState(resolveColors)` + `MutationObserver` on `data-theme`
- `GraphLegend`: `useState('dark')` + `useEffect` + `MutationObserver` on `data-theme`
- `GraphTooltip`: reads `document.documentElement.dataset.theme` **directly in the render phase** — no hook, no observer, not reactive to theme changes after mount

The `GraphTooltip` approach is particularly broken: it returns the theme at the moment it first renders and never updates. If the user switches themes while hovering, the tooltip colour is stale.

**Fix:**
- Extract a `useTheme(): ThemeVariant` hook to `src/hooks/useTheme.ts`
  - `useState<ThemeVariant>` initialised with the DOM value
  - `useEffect` attaching a `MutationObserver` on `document.documentElement`
  - Returns current theme
- Replace all three ad-hoc implementations with `const theme = useTheme()`

**Acceptance:**
- Single theme hook used by all graph components
- `GraphTooltip` colour updates reactively when theme changes
- Zero MutationObserver duplication

---

#### R5-07: `treeData` is in context AND prop-drilled to `NavPanel` — inconsistency

**Severity:** P2 — Architecture
**Files:** `src/components/layout/AppShell.tsx` (lines 33, 79–83), `src/components/nav/NavPanel.tsx` (line 17)

`AppShell` passes `treeData` to `AppShellProvider` (which stores it in context) AND simultaneously prop-drills it to `AppShellLayout` → `NavPanel`. `NavPanel` ignores the context and reads only from props. `GraphPanel` reads `treeData` from context via `useAppShell()`.

The same data has two entry points. Any future component needs to decide: "do I use context or props?" There is no answer because both exist. More concretely: `AppShell` currently passes `treeData` as a prop to `AppShellLayout` even though `AppShellLayout` could get it from context.

**Fix:**
- Remove `treeData` prop from `NavPanel` and `AppShellLayout`
- Have `NavPanel` consume `treeData` via `useAppShell()` (it already uses `useAppShell` for `activeSlug`)
- `AppShell` becomes: `<AppShellProvider treeData={treeData}><AppShellLayout>{children}</AppShellLayout></AppShellProvider>`

**Acceptance:**
- `NavPanel` has no `treeData` prop
- All components get `treeData` from `useAppShell()`
- `AppShell` props: only `treeData` and `children` (no internal duplication)

---

#### R5-08: `openTab` and `navigateTo` are identical functions — dead code in context

**Severity:** P2 — Dead code
**File:** `src/contexts/AppShellContext.tsx` (lines 68–74)

```typescript
const navigateTo = useCallback((slug: string) => {
  router.push('/' + slug)
}, [router])

const openTab = useCallback((slug: string) => {
  router.push('/' + slug)
}, [router])
```

Two identical callbacks, same body, same dependencies. `openTab` is exported in the context type and value but appears unused in any consumer — `ContentPanel` and `TabBar` use `navigateTo`. `openTab` is dead code that inflates the context surface and could confuse future developers about which to call.

**Fix:**
- Remove `openTab` from the context type and provider
- Grep for any callsites: `grep -r "openTab" src/` to confirm zero consumers before deleting

**Acceptance:**
- `AppShellContextValue` has no `openTab` field
- Zero remaining references to `openTab` in the codebase
- `navigateTo` is the single navigation primitive

---

### Priority 3 — UX and Maintainability

---

#### R5-09: `setTimeout` inside `setOpenTabs` updater — side effect in pure function

**Severity:** P3 — Correctness risk
**File:** `src/hooks/useTabManager.ts` (lines 64–79)

```typescript
setOpenTabs((prev) => {
  // ...
  setTimeout(() => { router.push('/' + nextSlug) }, 0)
  return newTabs
})
```

React's state updater function must be pure — called with the previous state, returns the next state, no side effects. With React 18's concurrent rendering, updater functions can be called multiple times (during tearing prevention, strict mode double-invoke, etc.). Each invocation would schedule a new `setTimeout`, potentially firing multiple navigations.

This works in practice today but is fragile. The pattern breaks the contract that makes concurrent mode safe.

**Fix:**
- Calculate the navigation target outside the updater
- Use `useEffect` to watch for the "active tab was closed" case and navigate, or do the navigation in the event handler body after calling `setOpenTabs`

```typescript
const closeTab = useCallback((slug: string) => {
  const currentSlug = activeSlugRef.current
  let nextSlug: string | null = null
  setOpenTabs((prev) => {
    const idx = prev.findIndex((t) => t.slug === slug)
    const newTabs = prev.filter((t) => t.slug !== slug)
    if (currentSlug === slug) {
      const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
      nextSlug = next ? next.slug : DEFAULT_FIRM_SLUG
    }
    return newTabs
  })
  if (nextSlug) {
    onNavigate ? onNavigate(nextSlug) : router.push('/' + nextSlug)
  }
}, [setOpenTabs, router, onNavigate])
```

**Acceptance:**
- Updater function is pure (no `setTimeout`, no router calls)
- Navigation still triggers correctly when closing the active tab
- No double-navigation in React Strict Mode

---

#### R5-10: `GraphViewLoader` swallows fetch errors — skeleton hangs forever

**Severity:** P3 — UX
**File:** `src/components/graph/GraphViewLoader.tsx` (lines 27–30)

On a failed fetch, the component logs to console but never sets an error state:

```typescript
.catch((err) => {
  if (err.name === 'AbortError') return
  console.error('Failed to load graph data:', err)
})
```

`graphData` stays `null`, and the `<Skeleton>` is rendered indefinitely. The user sees a grey placeholder with no explanation and no way to retry.

**Fix:**
- Add an `error` state; set it in the catch block
- Render an inline error message (e.g., "Graph unavailable") when in error state
- Optionally add a "Retry" button that resets the error and re-triggers the effect via a counter key

**Acceptance:**
- A failed graph data fetch shows a visible error message, not an infinite skeleton
- Error message fits within the existing panel aesthetic

---

#### R5-11: `AuthButton` sign-out has no error handling or feedback

**Severity:** P3 — UX
**File:** `src/components/auth/AuthButton.tsx` (line 92)

```typescript
onClick={() => getSupabase().auth.signOut()}
```

`signOut()` returns a Promise that is not awaited and not handled. If sign-out fails (network error), nothing happens — the user clicks "Sign out" and appears to stay logged in with no explanation. There is also no loading state, so on slow connections the button is unresponsive.

**Fix:**
- Await the `signOut()` call; extract to an async handler
- Set a transient loading state (disable button, show "Signing out…") while the call is in flight
- On error, surface a minimal error message (toast or inline)

**Acceptance:**
- "Sign out" button shows visual feedback while the request is in-flight
- Network errors are surfaced to the user
- Button is disabled during the request to prevent double-clicks

---

#### R5-12: `CompareAuthGate` auth links missing `?next` parameter

**Severity:** P3 — UX flow break
**File:** `src/components/auth/CompareAuthGate.tsx` (lines 27–36)

The "Sign up free" and "Sign in" links send users to the auth pages without a `?next` parameter:

```tsx
<Link href="/auth/sign-up">Sign up free</Link>
<Link href="/auth/sign-in">Sign in</Link>
```

The sign-in page already supports `?next` and redirects after successful auth. But because the links don't include it, after sign-up/sign-in users land at the root `/` — losing the context of why they authenticated (to open the compare panel). The compare panel doesn't auto-open after they return.

**Fix:**
- Pass `?next` encoding the current pathname so auth redirects back to the same page
- After redirect back, the compare panel won't auto-open via URL — consider storing a "pending compare" flag in `sessionStorage` that `AppShellProvider` reads on mount and restores the panel state

**Acceptance:**
- After completing auth from `CompareAuthGate`, user lands back on the page they were viewing
- Compare panel opens automatically (or at minimum, the tab they were on is restored)

---

#### R5-13: No "Forgot password?" flow

**Severity:** P3 — Auth completeness
**File:** `src/app/auth/sign-in/page.tsx`

The sign-in page has two modes (password and magic link) but no "Forgot password?" entry point. A user who signed up with a password and has forgotten it has no self-service recovery path. Magic link is available as an alternative sign-in method, but it's not surfaced as a recovery option and requires the user to know about it.

**Fix:**
- Add a "Forgot password?" link below the password field
- Route to `/auth/reset-password` — a page that calls `supabase.auth.resetPasswordForEmail()` with `emailRedirectTo` pointing to a `/auth/update-password` handler
- `/auth/update-password` receives the `code` from the reset email and calls `supabase.auth.updateUser({ password })` after exchanging the code

**Acceptance:**
- "Forgot password?" link visible on password sign-in form
- Reset email is sent; user can set a new password via the link
- Error states handled: expired links, invalid code, rate limits

---

#### R5-14: Sign-up page has no password confirmation field

**Severity:** P3 — UX
**File:** `src/app/auth/sign-up/page.tsx`

The sign-up form has a single password field. A user who types their password incorrectly creates an account they cannot access — they'd need the password reset flow (which currently doesn't exist per R5-13) to recover.

**Fix:**
- Add a "Confirm password" field
- Client-side validation before submit: if the two values don't match, show an inline error and block submission
- This is pure frontend validation; no Supabase call needed

**Acceptance:**
- Sign-up form has "Password" and "Confirm password" fields
- Submitting with mismatched passwords shows an error, does not call `supabase.auth.signUp()`
- Error clears when the user edits either field

---

#### R5-15: `ContentPanelRight` eslint-disable comments signal design smell

**Severity:** P3 — Maintainability
**File:** `src/components/content/ContentPanelRight.tsx` (lines 29–31, 41–42)

Two `// eslint-disable-next-line react-hooks/set-state-in-effect` comments appear to suppress warnings about `setState` calls inside `useEffect`. This isn't a standard React lint rule name — the actual rules are `react-hooks/exhaustive-deps` and `react/no-direct-mutation-state`. These comments are likely suppressing nothing, or suppressing a custom rule.

More importantly, they signal a recognised code smell: the component has dual-control state — `externalSlug` (prop, set by context from cmd+click) and `compareSlug` (local state, set by tab bar interactions). The effect syncing between them is the "derived state from props" anti-pattern that causes unexpected re-sync.

The current approach works but will become fragile if more external control points are added.

**Fix:**
- Remove the non-standard eslint-disable comments (they do nothing for standard React lint rules)
- Evaluate whether `compareSlug` state and `externalSlug` prop can be merged: the parent (`GraphPanel`) already holds `compareSlug` via `useAppShell()`. `ContentPanelRight` could accept a controlled `slug` prop + `onSlugChange` callback, making it fully controlled and removing the sync effect

**Acceptance:**
- No eslint-disable comments in the file
- Component behaviour is unchanged
- Either the sync pattern is intentional and documented in a comment explaining the invariant, or the state is lifted to eliminate the effect

---

## Summary Table

| ID | Priority | Category | Title | Est. Hours |
| --- | --- | --- | --- | --- |
| R5-01 | P1 | Security | Open redirect in `/auth/callback` | 0.5h |
| R5-02 | P1 | Bug | GraphControls zoom state desync after manual scroll | 1h |
| R5-03 | P1 | Feature gap | Node sizing by `linkCount` not implemented | 0.5h |
| R5-04 | P2 | Correctness | `useSupabaseUser` double session fetch race | 1h |
| R5-05 | P2 | Performance | `GraphView` graphData recreated every render — simulation resets on navigation | 1.5h |
| R5-06 | P2 | DRY | Theme observation duplicated across 3 graph components | 1h |
| R5-07 | P2 | Architecture | `treeData` in context AND prop-drilled to `NavPanel` | 1h |
| R5-08 | P2 | Dead code | `openTab` identical to `navigateTo` | 0.5h |
| R5-09 | P3 | Correctness | `setTimeout` inside `setState` updater in `useTabManager` | 1h |
| R5-10 | P3 | UX | `GraphViewLoader` swallows errors — skeleton hangs | 0.5h |
| R5-11 | P3 | UX | `AuthButton` sign-out no error handling | 0.5h |
| R5-12 | P3 | UX | `CompareAuthGate` missing `?next` on auth links | 1h |
| R5-13 | P3 | Auth | No "Forgot password?" flow | 2h |
| R5-14 | P3 | UX | Sign-up page no password confirmation field | 0.5h |
| R5-15 | P3 | Maintainability | `ContentPanelRight` eslint-disable comments + dual-control smell | 1h |

**Total estimated hours: ~13h**

---

## Recommended Fix Order

```
R5-01 (security fix — ship immediately, 30 min)

R5-02 + R5-03 (graph functional bugs — parallel, blocks S5 acceptance)
  └─→ R5-05 (graphData memoisation — fix alongside R5-02 graph work)
        └─→ R5-06 (useTheme hook — clean up while touching graph files)

R5-04 (auth hook — small, standalone, ships clean auth)
  └─→ R5-11 (sign-out error handling — touches auth layer, do together)
        └─→ R5-13 + R5-14 (password reset + confirmation — complete auth flow)
              └─→ R5-12 (next param on auth links — last auth UX polish)

R5-07 + R5-08 (context cleanup — parallel, low risk)
  └─→ R5-09 (closeTab side effect — touches same hook area)

R5-10 + R5-15 (isolated cleanup — any time)
```

---

## Notes

- **What S5 did well:** The `AppShellProvider` extraction is clean and the stale-closure fix from R4-17 (activeSlugRef + functional updater) was correctly applied. Auth pages are well-structured with good error message mapping and the magic link flow is a solid UX choice. `GraphControls` and `GraphLegend` overlays look right architecturally. The modifier-click pattern for Panel 3 is elegant.
- **Biggest risk:** R5-01 is a security issue that should ship before the site goes public. R5-02 and R5-03 are visible failures that undermine S5-05's acceptance criteria — node sizes are all identical and zoom buttons are unreliable after any manual interaction.
- **Auth completeness:** With R5-13 unimplemented, any user who signs up with a password and forgets it is locked out permanently (no reset flow). This should be treated as a P2 if the auth feature is considered "done" at the end of S5.
- **Carry-forward from S4:** R4-07 (error boundaries) and R4-18 (robots/sitemap) remain open. Neither is blocking S5 but they're worth rolling into the next sprint's debt closure pass.
