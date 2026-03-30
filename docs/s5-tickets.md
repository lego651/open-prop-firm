# Sprint 5 Tickets — OpenPropFirm

**Sprint Goal:** The graph view is fully featured (tooltips, controls, legend, node sizing/coloring). Auth is live with email/password + magic link. Logged-in users can use stacked comparison mode via modifier-click. The feature gate is fully functional.

**Status:** Final — PM drafted, Tech Lead challenged, decisions incorporated 2026-03-30

**Reviewed by:** PM + Tech Lead (full challenge session, all items resolved)

---

## Key Decisions Made in Challenge Session

| Decision | Choice | Rationale |
| --- | --- | --- |
| S4 review P1/P2 debt tickets (S5-01/S5-02 in draft) | Dropped — already fixed in codebase | Tech Lead audit confirmed R4-01 through R4-10 and R4-13/R4-15/R4-18 are all resolved. `validate-env` is standalone `check:env` script, `not-found.tsx`/`error.tsx`/`robots.ts`/`sitemap.ts` exist, wikilinks.ts centralized, etc. |
| Error boundaries ticket (S5-11 in draft) | Dropped — already exists | `src/app/not-found.tsx` and `src/app/error.tsx` both present and themed |
| SEO foundations ticket (S5-12 in draft) | Dropped — already exists | `robots.ts`, `sitemap.ts`, and `metadataBase` in root layout all present |
| AppShellContext timing | First ticket in sprint | Auth integration is much cleaner if shared state is in context before auth touches AppShell. Fold R4-17 (stale closeTab closure) into this refactor. |
| Google OAuth in CompareAuthGate | Remove entirely, replace with email auth CTA | v1-scope specifies email/password + magic link only. Google OAuth requires consent screen configuration and adds provider dependency. Social auth is a v2 feature. |
| Context menu on wikilinks | Deferred to S6 | v1-scope mentions it parenthetically ("or via a context menu"). Modifier-click alone satisfies the acceptance criteria. Context menu adds positioning/keyboard/dismiss complexity. |
| Supabase email confirmation | OFF for v1 launch | Reduces sign-up friction. Can enable in v2 when email deliverability is more robust. |
| Graph filter state persistence | React state only (not localStorage) | Session-only persistence is sufficient for v1. Don't gold-plate. |
| `lucid-funding` directory rename | Added as S5-09 | Graph nodes, URLs, and wikilinks all reference the wrong slug. Doing it later means more cross-references to fix. |
| P3 carry-forward items (R4-11, R4-14, R4-16) | Deferred to S6 | R4-11 is content work (third-party sources). R4-14 and R4-16 are non-blocking quality improvements. |
| Server-side Supabase client | Required for auth callback route | Install `@supabase/ssr`. Browser client (`src/lib/supabase/client.ts`) unchanged — the hook `useSupabaseUser` is provider-agnostic. |

---

## Prerequisites (before Sprint 5 begins)

These are configuration tasks, not code tickets. The founder must complete them before auth tickets can be tested.

- [ ] **Supabase email provider enabled** — In Supabase Dashboard → Authentication → Providers, ensure Email provider is ON with "Confirm email" set to OFF
- [ ] **Supabase redirect URLs configured** — In Supabase Dashboard → Authentication → URL Configuration, add:
  - `http://localhost:3000/auth/callback` (local dev)
  - `https://*.vercel.app/auth/callback` (preview deployments)
  - `https://openpropfirm.com/auth/callback` (production, when domain is ready)
- [ ] **Custom SMTP configured (Resend)** — Supabase free tier limits built-in email to ~4/hour. Configure Resend (free tier, $0) as custom SMTP in Supabase Dashboard → Settings → Auth → SMTP Settings. Without this, magic link emails will silently fail under any real usage.
- [ ] **Environment variables** — Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel project environment variables for preview and production

---

## Sprint 5 Dependency Order

```
S5-01 (AppShellContext — foundation, unblocks everything)
  ├─→ S5-02 (Auth pages — sign-up, sign-in, callback)
  │     └─→ S5-03 (Auth integration into AppShell header)
  │           └─→ S5-04 (Update CompareAuthGate — replace Google OAuth)
  │                 └─→ S5-07 (Modifier-click to open in Panel 3)
  │
  ├─→ S5-05 (Graph node styling + GraphTooltip)     ┐
  │     └─→ S5-06 (GraphControls + GraphLegend)      │ parallel with auth
  │                                                   ┘
  └─→ S5-09 (Rename lucid-funding to lucid-trading — independent)
```

## Parallel Execution Guide

After S5-01 lands, two parallel streams open:

**Stream A — Authentication (sequential within stream)**
S5-02 → S5-03 → S5-04 → S5-07

**Stream B — Graph View (sequential within stream, parallel with Stream A)**
S5-05 → S5-06

**Stream C — Content cleanup (independent of everything)**
S5-09

S5-07 (modifier-click) is the only ticket that requires both streams to be complete — it needs AppShellContext (`openInPanel3` action) and auth (to gate comparison for logged-out users).

---

## Group A — Foundation

---

### S5-01: Extract AppShellContext

**Goal:** Move shared state out of `AppShell` into a React context so child components consume state directly without prop drilling. This unblocks clean auth integration and comparison wiring.

**Scope:**

**Step 1 — Create the context and provider:**

File: `src/contexts/AppShellContext.tsx`

Create an `AppShellProvider` and `useAppShell()` hook. The context must hold:

```typescript
type AppShellContextValue = {
  // Navigation
  activeSlug: string
  navigateTo: (slug: string) => void

  // Tabs (main panel)
  openTabs: TabItem[]
  closeTab: (slug: string) => void
  openTab: (slug: string) => void

  // Panel 3
  panel3Mode: 'graph' | 'compare'
  setPanel3Mode: (mode: 'graph' | 'compare') => void
  panel3Visible: boolean
  setPanel3Visible: (visible: boolean) => void
  compareSlug: string | null
  openInPanel3: (slug: string) => void

  // Auth
  user: User | null
  authLoading: boolean

  // Layout
  viewportWidth: number

  // Search
  isSearchOpen: boolean
  setIsSearchOpen: (open: boolean) => void
}
```

**Step 2 — Update `useSupabaseUser` to return loading state:**

File: `src/hooks/useSupabaseUser.ts`

Change the return type from `User | null` to `{ user: User | null; loading: boolean }`. Initialize `loading: true`, set to `false` after `getSession()` resolves and on every `onAuthStateChange` event.

**Step 3 — Migrate AppShell to use the provider:**

File: `src/components/layout/AppShell.tsx`

- Wrap children in `<AppShellProvider>`
- Remove all state that moved to context
- Remove prop drilling to `ContentPanel`, `GraphPanel`, `NavPanel`
- AppShell should be under 80 lines — just the provider + flex layout

**Step 4 — Update consumers:**

- `ContentPanel`: remove `activeSlug`, `openTabs`, `onTabClick`, `onTabClose`, `onNewTab`, `onTogglePanel3`, `onSearchOpen` props → use `useAppShell()`
- `TabBar`: consume from context directly
- `GraphPanel`: remove `mode`, `user`, `activeSlug`, `treeData`, `onModeToggle`, `onDismissGate`, `onNodeClick` props → use `useAppShell()`
- `NavPanel`: remove `onSearchOpen` prop → use `useAppShell()`
- `BreadcrumbBar`: consume `activeSlug` from context

**Step 5 — Fix R4-17 carry-forward (stale closure in closeTab):**

Inside the context provider's `closeTab` implementation, use a functional updater pattern for `setOpenTabs` so it never reads from a stale closure. Derive `activeSlug` from the latest state within the updater.

**Acceptance Criteria:**

- `AppShell` is under 80 lines (provider + layout only)
- `GraphPanel` receives ≤ 2 props (ref or children only)
- `ContentPanel` receives children only — all other data consumed via `useAppShell()`
- Zero behavior change — all keyboard shortcuts, panel toggles, tab operations, theme switches work identically
- `useSupabaseUser` returns `{ user, loading }` — loading is `true` on initial render, `false` after session check
- No `eslint-disable` comments for `react-hooks/exhaustive-deps` related to the refactored code
- `npm run build` passes
- `npm run lint` passes

**Dependencies:** None — this is the sprint foundation

**Estimated effort:** 4–5 hours

---

## Group B — Authentication

---

### S5-02: Auth pages — sign-up, sign-in, and callback

**Goal:** Build the Supabase email authentication UI: a sign-up page, a sign-in page (email/password + magic link), and a callback route handler for email redirects.

**Scope:**

**Step 1 — Install `@supabase/ssr` and create server-side client:**

```bash
npm install @supabase/ssr
```

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Step 2 — Create `/auth/sign-up` page:**

File: `src/app/auth/sign-up/page.tsx`

- Client component with email + password form
- Uses shadcn `Input`, `Button`, `Label` components
- On submit: calls `supabase.auth.signUp({ email, password })`
- Shows success message: "Check your email to confirm your account" (even with confirmation OFF, for future-proofing)
- Shows error messages for: weak password, email already registered, network error
- Link to sign-in page: "Already have an account? Sign in"
- Centered card layout, max-width 400px, consistent with app themes
- No header/nav — standalone auth page

**Step 3 — Create `/auth/sign-in` page:**

File: `src/app/auth/sign-in/page.tsx`

- Client component with two modes: email/password and magic link
- Default mode: email/password form
- "Sign in with magic link" toggle switches to email-only form
- Email/password submit: `supabase.auth.signInWithPassword({ email, password })`
- Magic link submit: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin + '/auth/callback' } })`
- After magic link send: "Check your email for a sign-in link"
- Error messages for: invalid credentials, user not found, rate limited
- Link to sign-up page: "Don't have an account? Sign up"
- Same centered card layout as sign-up

**Step 4 — Create `/auth/callback` route handler:**

File: `src/app/auth/callback/route.ts`

This is a Route Handler (not a page) that handles redirects from magic link and email confirmation emails.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createSupabaseServer()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Redirect to sign-in with error param on failure
  return NextResponse.redirect(new URL('/auth/sign-in?error=callback_failed', origin))
}
```

**Step 5 — Create auth layout:**

File: `src/app/auth/layout.tsx`

Minimal layout for auth pages — no sidebar, no tab bar. Just centered content with the app name/logo at the top and a "← Back to app" link.

**Acceptance Criteria:**

- `/auth/sign-up` renders a styled form; submitting with valid email/password creates a Supabase user
- `/auth/sign-in` renders a styled form with password and magic link modes
- Email/password sign-in works for existing users
- Magic link sends an email; clicking the link redirects through `/auth/callback` and lands the user on the app in a logged-in state
- `/auth/callback` with invalid/expired code redirects to `/auth/sign-in` with an error indicator
- Auth pages render correctly in all 3 themes (light, dark, blue)
- `@supabase/ssr` is in `package.json` dependencies
- `src/lib/supabase/server.ts` exports `createSupabaseServer()`
- `npm run build` passes
- No console errors on auth pages

**Dependencies:** S5-01 (context provides `user` and `authLoading`)

**Estimated effort:** 4–5 hours

---

### S5-03: Auth integration into AppShell header

**Goal:** Display auth state in the app header. Show a loading skeleton during auth check, user avatar/initial when logged in, or a "Sign in" link when logged out.

**Scope:**

**Step 1 — Create `AuthButton` component:**

File: `src/components/auth/AuthButton.tsx`

- Reads `user` and `authLoading` from `useAppShell()` context
- **Loading state:** Renders a `Skeleton` pill (32×20px) — no text, no flicker
- **Logged out:** Renders a "Sign in" text link → navigates to `/auth/sign-in`
- **Logged in:** Renders user initial in a small circle (24×24px, `var(--accent)` background) with a dropdown menu:
  - User email (truncated, non-interactive)
  - "Sign out" action
- Sign out calls `supabase.auth.signOut()` — the `onAuthStateChange` listener in `useSupabaseUser` updates context automatically

**Step 2 — Place AuthButton in NavPanel header:**

File: `src/components/nav/NavPanel.tsx`

Add `<AuthButton />` to the NavPanel header area (top-right of the 48px header bar, next to the logo).

- In collapsed state (48px rail): show only the avatar circle or a person icon
- In expanded state (260px): show full AuthButton with text

**Step 3 — Verify session persistence:**

- Refresh the page while logged in → session persists (Supabase stores session in localStorage via its client SDK)
- Close and reopen the browser → session persists (localStorage survives)
- Sign out → session is cleared, `user` in context becomes `null`

**Acceptance Criteria:**

- During initial auth check: header shows skeleton pill, not "Sign in" then flash to avatar
- Logged out: "Sign in" link visible, navigates to `/auth/sign-in`
- Logged in: user initial avatar visible, dropdown shows email + sign-out
- Sign out clears session, UI immediately reflects logged-out state
- Session persists across page reloads (no re-authentication required)
- Collapsed nav shows avatar or person icon only (no text overflow)
- All states render correctly in all 3 themes
- `npm run build` passes

**Dependencies:** S5-01 (context), S5-02 (auth pages exist for navigation targets)

**Estimated effort:** 2–3 hours

---

### S5-04: Update CompareAuthGate — replace Google OAuth with email auth

**Goal:** Replace the Google OAuth button in `CompareAuthGate` with a sign-up CTA that directs users to the email auth flow.

**Scope:**

File: `src/components/auth/CompareAuthGate.tsx`

**Changes:**

1. Remove the Google OAuth button and Google SVG icon entirely
2. Remove the `getSupabase().auth.signInWithOAuth(...)` call
3. Update the copy:
   - Title: "Compare two pages side by side"
   - Description: "Create a free account to unlock the comparison panel — no payment required."
   - CTA button: "Sign up free" → navigates to `/auth/sign-up?next=/` (pass current URL as `next` param for post-auth redirect)
   - Secondary link: "Already have an account? Sign in" → `/auth/sign-in?next=/`
4. Keep the dismiss (X) button and `onDismiss` behavior unchanged

**Step 2 — Verify post-auth flow:**

After signing up/in, the user returns to the app. The `onAuthStateChange` listener in `useSupabaseUser` detects the new session, `user` in context becomes non-null, and the existing `pendingCompare` logic in `GraphPanel` should automatically switch to compare mode.

Test this end-to-end:
1. Click "Compare" toggle while logged out → CompareAuthGate appears
2. Click "Sign up free" → redirects to `/auth/sign-up`
3. Complete sign-up → redirected back to app
4. Panel 3 should be in compare mode with content loaded

**Acceptance Criteria:**

- CompareAuthGate shows email auth CTA, not Google OAuth button
- No Google OAuth code or SVG in the component
- "Sign up free" navigates to `/auth/sign-up`
- "Already have an account?" navigates to `/auth/sign-in`
- Dismiss (X) button still works — reverts to graph mode
- After completing sign-up and returning, compare mode activates automatically
- Component renders correctly in all 3 themes
- `npm run build` passes

**Dependencies:** S5-02 (auth pages must exist), S5-03 (auth state in context)

**Estimated effort:** 1–2 hours

---

## Group C — Graph View Polish

---

### S5-05: Graph node styling + GraphTooltip

**Goal:** Implement per-fileType node coloring, link-count-based node sizing, and a custom styled tooltip — replacing the current uniform nodes and browser-native tooltip.

**Scope:**

**Step 1 — Add `linkCount` to graph data pipeline:**

File: `scripts/generate-graph-data.ts`

After building edges, compute inbound link count per node:

```typescript
const linkCounts = new Map<string, number>()
for (const edge of edges) {
  linkCounts.set(edge.target, (linkCounts.get(edge.target) ?? 0) + 1)
}
// Add to each node:
nodes = nodes.map(n => ({ ...n, linkCount: linkCounts.get(n.id) ?? 0 }))
```

File: `src/types/content.ts`

Add `linkCount: number` to `GraphNode` type.

**Step 2 — Define fileType color mapping:**

File: `src/lib/graph-colors.ts`

Create a shared color mapping used by both `GraphView` and `GraphLegend`:

```typescript
export const FILE_TYPE_COLORS: Record<string, { light: string; dark: string; blue: string }> = {
  'basic-info': { light: '#7C85FF', dark: '#8B92FF', blue: '#A0AAFF' },
  'challenge':  { light: '#4CAF82', dark: '#56C290', blue: '#60CCA0' },
  'rules':      { light: '#F0A050', dark: '#F5AA60', blue: '#FFBA70' },
  'promo':      { light: '#E06080', dark: '#E87090', blue: '#F080A0' },
  'changelog':  { light: '#9B7ED0', dark: '#A88EDD', blue: '#B89EED' },
}

export function getNodeColor(fileType: string, theme: string): string { ... }
```

Colors sourced from ui-guide.md Section 4.3.

**Step 3 — Update `GraphView` for node sizing and coloring:**

File: `src/components/graph/GraphView.tsx`

- Replace `nodeRelSize={5}` with per-node sizing via `nodeVal` callback:
  ```typescript
  nodeVal={(node) => {
    const n = node as GraphNode
    return Math.max(2, 1 + (n.linkCount ?? 0) * 1.5)
  }}
  ```
- Replace uniform `nodeColor` with fileType-based coloring:
  ```typescript
  nodeColor={(node) => {
    const n = node as GraphNode
    if (n.id === activeSlug) return colors.accent
    return getNodeColor(n.type, currentTheme)
  }}
  ```
- Remove `nodeLabel` (browser tooltip) — replaced by custom tooltip
- Disable default canvas tooltip: `nodeLabel={() => ''}`
- Add `onNodeHover` callback to track hovered node in state

**Step 4 — Create `GraphTooltip` component:**

File: `src/components/graph/GraphTooltip.tsx`

- Absolutely positioned div over the graph canvas
- Triggered by `onNodeHover` in `GraphView`
- Contents: colored dot (matching fileType) + node label + link count + fileType label
- Positioned at cursor offset (+12px, +12px); flips left/up when near canvas edges
- Styled with `var(--popover-bg)`, `1px solid var(--border)`, `border-radius: 6px`
- Font: 12px for title, 11px muted for subtitle

**Step 5 — Wire tooltip into `GraphView`:**

`GraphView` tracks hovered node + mouse position in state, renders `<GraphTooltip>` conditionally.

**Acceptance Criteria:**

- `graph-data.json` includes `linkCount` on every node (run `npm run prebuild` to verify)
- Nodes are colored by fileType (basic-info = purple, challenge = green, rules = orange, promo = pink, changelog = violet)
- Active node (currently open page) has accent color highlight, overriding fileType color
- Nodes with more inbound links are visibly larger than leaf nodes
- Hovering a node shows a styled tooltip with: colored dot, file title, "N inbound links", fileType label
- Tooltip follows cursor and flips near canvas edges
- Browser-native title tooltip no longer appears
- Theme switch updates node colors without reopening the panel
- `npm run prebuild && npm run build` passes

**Dependencies:** S5-01 (context provides `activeSlug` and theme info)

**Estimated effort:** 4–5 hours

---

### S5-06: GraphControls + GraphLegend

**Goal:** Add zoom/fit controls and a fileType filter dropdown to the graph canvas, plus a color legend.

**Scope:**

**Step 1 — Expose ForceGraph2D ref in `GraphView`:**

File: `src/components/graph/GraphView.tsx`

Add a ref to the ForceGraph2D instance:

```typescript
const graphRef = useRef<ForceGraphMethods>()
// ...
<ForceGraph2D ref={graphRef} ... />
```

Expose zoom/fit methods to the controls component via a callback ref or by rendering controls inside `GraphView`.

**Step 2 — Create `GraphControls` component:**

File: `src/components/graph/GraphControls.tsx`

Overlay positioned bottom-right of the graph canvas.

- **Zoom In button:** Lucide `ZoomIn` (14px), calls `graphRef.current.zoom(currentZoom * 1.5, 300)`
- **Zoom Out button:** Lucide `ZoomOut` (14px), calls `graphRef.current.zoom(currentZoom / 1.5, 300)`
- **Fit button:** Lucide `Maximize2` (14px), calls `graphRef.current.zoomToFit(400, 40)`
- Each button: 28×28px, `background: var(--popover-bg)`, `border: 1px solid var(--border)`, `border-radius: 4px`
- Gap between buttons: 4px
- Buttons have `type="button"` and `aria-label`

**Step 3 — Add filter dropdown to `GraphControls`:**

- Filter button: Lucide `SlidersHorizontal` (14px), opens a shadcn `Popover`
- Popover contains checkboxes (shadcn `Checkbox`) for each fileType: basic-info, challenge, rules, promo, changelog
- All checked by default
- Unchecking a type hides those nodes and their connected edges from the graph
- Filter state is React state in `GraphView` (or `GraphViewLoader`) — not persisted to localStorage
- Edge case: if all types are unchecked, show the graph empty state ("No nodes visible")

**Step 4 — Create `GraphLegend` component:**

File: `src/components/graph/GraphLegend.tsx`

Overlay positioned bottom-left of the graph canvas.

- Shows each fileType as: colored circle (8px) + label (10px, `var(--muted-foreground)`)
- Background: `var(--popover-bg)` at 80% opacity, `border-radius: 6px`, `padding: 6px 10px`
- Uses the same `FILE_TYPE_COLORS` mapping from `src/lib/graph-colors.ts` (created in S5-05)

**Step 5 — Wire everything into `GraphView`:**

`GraphView` renders `<GraphControls>` and `<GraphLegend>` as overlay children inside the container div. Filter state lives in `GraphView` — when types are unchecked, filter `graphData.nodes` and `graphData.links` before passing to `ForceGraph2D`.

**Acceptance Criteria:**

- Zoom In / Zoom Out buttons visibly change the zoom level with smooth animation
- Fit button centers all visible nodes in the canvas
- Filter dropdown opens a popover with checkboxes for all 5 fileTypes
- Unchecking "challenge" hides all challenge nodes and their edges
- Checking it again restores them
- Unchecking all types shows an empty state (not a crash)
- Legend shows all 5 fileTypes with correct colors matching the nodes
- Controls and legend are visible and readable in all 3 themes
- Controls have aria-labels for accessibility
- `npm run build` passes

**Dependencies:** S5-05 (fileType colors and `linkCount` must be in place)

**Estimated effort:** 4–5 hours

---

## Group D — Comparison Wiring

---

### S5-07: Modifier-click to open in Panel 3

**Goal:** Allow users to Cmd/Ctrl+click on wikilinks (in rendered content) and graph nodes to open a page in Panel 3's comparison mode. This is the final piece that makes the stacked comparison feature discoverable and usable.

**Scope:**

**Step 1 — Add `openInPanel3` to AppShellContext:**

This should already be in the context from S5-01. Verify it:
- Sets `compareSlug` to the target slug
- Switches `panel3Mode` to `'compare'`
- Makes Panel 3 visible if hidden
- For logged-out users: sets `pendingCompare` flag and triggers the auth gate

**Step 2 — Intercept modifier-clicks on wikilinks in MarkdownRenderer:**

File: `src/components/content/MarkdownRenderer.tsx` (or a wrapper)

Add a delegated click handler on the markdown content container:

```typescript
const handleClick = (e: React.MouseEvent) => {
  const link = (e.target as HTMLElement).closest('a.wikilink')
  if (!link) return

  const href = link.getAttribute('href')
  if (!href) return

  if (e.metaKey || e.ctrlKey) {
    e.preventDefault()
    const slug = href.replace(/^\//, '')
    openInPanel3(slug)
  }
}
```

This intercepts clicks on `<a class="wikilink">` elements. Regular clicks navigate Panel 2 as before. Modifier-clicks open in Panel 3.

**Step 3 — Add modifier-click to graph node clicks:**

File: `src/components/graph/GraphView.tsx`

The `onNodeClick` callback in `react-force-graph-2d` receives `(node, event)`. Check `event.metaKey || event.ctrlKey`:

```typescript
onNodeClick={(node, event) => {
  const slug = (node as GraphNode).id
  if (event.metaKey || event.ctrlKey) {
    openInPanel3(slug)
  } else {
    navigateTo(slug)
  }
}}
```

Get `openInPanel3` and `navigateTo` from `useAppShell()` context.

**Step 4 — Handle Panel 3 visibility:**

If Panel 3 is hidden (viewport < 1100px or user toggled it off), `openInPanel3` should:
1. Make Panel 3 visible
2. Set it to compare mode
3. Load the target page

**Step 5 — Auth gate for modifier-click:**

For logged-out users, `openInPanel3` should:
1. Store the intended slug in a `pendingCompareSlug` ref/state
2. Show the CompareAuthGate
3. After successful auth, automatically load the pending slug in Panel 3

Verify the existing `pendingCompare` logic in `GraphPanel` handles this correctly, or adapt it to work with the context-based approach.

**Acceptance Criteria:**

- **Wikilinks:** Cmd+click (Mac) / Ctrl+click (Windows/Linux) on a wikilink opens the linked page in Panel 3
- **Graph nodes:** Cmd/Ctrl+click on a graph node opens that file in Panel 3
- Regular click on wikilinks still navigates Panel 2 as before
- Regular click on graph nodes still navigates Panel 2 as before
- If Panel 3 is hidden, modifier-click makes it visible and loads the page
- **Logged-in users:** Modifier-click immediately loads content in Panel 3
- **Logged-out users:** Modifier-click shows CompareAuthGate; after auth, content loads
- Sign-out while in compare mode reverts Panel 3 to auth gate prompt
- No regressions in normal click navigation
- `npm run build` passes

**Dependencies:** S5-01 (context with `openInPanel3`), S5-04 (auth gate updated)

**Estimated effort:** 3–4 hours

---

## Group E — Content Cleanup

---

### S5-09: Rename `lucid-funding` to `lucid-trading`

**Goal:** Correct the directory name to match the firm's actual operating entity (Lucid Trading Group LLC, at `lucidtrading.com`). Fix all cross-references.

**Scope:**

**Step 1 — Rename the directory:**

```bash
mv data/firms/futures/lucid-funding data/firms/futures/lucid-trading
```

**Step 2 — Update frontmatter in all 7 Lucid files:**

Update the `firm` field from `lucid-funding` to `lucid-trading` in:
- `index.md`, `challenges/10k.md`, `challenges/25k.md`, `challenges/50k.md`, `rules.md`, `promos.md`, `changelog.md`

**Step 3 — Update wikilinks across all content files:**

Search all `.md` files for `lucid-funding` and replace with `lucid-trading`:
- Intra-firm links within Lucid files (e.g., `[[firms/futures/lucid-funding/rules|...]]`)
- Cross-firm links from other firms (e.g., Apex linking to Lucid for comparison)

**Step 4 — Remove the workaround Note from `index.md`:**

The current `index.md` has a note explaining the name discrepancy. Remove it.

**Step 5 — Rebuild and verify:**

```bash
npm run prebuild && npm run build
```

- Verify: search for "lucid" returns results with correct slugs
- Verify: graph data shows `lucid-trading` node IDs
- Verify: zero broken wikilinks

**Acceptance Criteria:**

- Directory is `data/firms/futures/lucid-trading/`
- All 7 files have `firm: lucid-trading` in frontmatter
- Zero occurrences of `lucid-funding` in any `.md` file
- URLs read `/firms/futures/lucid-trading/...`
- No disclaimer Note in the index file about the name mismatch
- `npm run prebuild` passes (no broken wikilinks, validation clean)
- `npm run build` passes
- Search and graph reflect the new slug

**Dependencies:** None — can be done anytime during the sprint

**Estimated effort:** 1–2 hours

---

## Sprint 5 Exit Criteria

The sprint is complete when ALL of the following are true:

**Graph View:**
- [ ] Graph nodes colored by fileType (5 distinct colors matching ui-guide Section 4.3)
- [ ] Node sizes vary by inbound link count (nodes with more links are visibly larger)
- [ ] Hovering a node shows a styled tooltip with title, link count, and fileType
- [ ] Zoom In / Zoom Out / Fit controls work
- [ ] Filter dropdown hides/shows nodes by fileType
- [ ] Legend shows all 5 fileTypes with correct colors
- [ ] Clicking a node opens the file in Panel 2
- [ ] Cmd/Ctrl+clicking a node opens the file in Panel 3 (or shows auth gate if logged out)

**Authentication:**
- [ ] Sign-up page at `/auth/sign-up` — email/password creates account
- [ ] Sign-in page at `/auth/sign-in` — email/password and magic link both work
- [ ] Magic link email is sent and clicking it logs the user in
- [ ] Auth callback route handles the redirect correctly
- [ ] Auth state visible in nav header: skeleton during load, avatar when logged in, "Sign in" when logged out
- [ ] Sign-out clears session immediately
- [ ] Session persists across page reloads
- [ ] No page shows broken auth UI or unhandled loading state

**Stacked Comparison (Auth-Gated):**
- [ ] Unauthenticated user: toggle to stacked mode → sees sign-up CTA (not Google OAuth)
- [ ] Authenticated user: toggle to stacked mode → second content panel loads
- [ ] Cmd/Ctrl+click on wikilinks opens the linked page in Panel 3
- [ ] Sign-out reverts Panel 3 stacked mode to auth gate prompt
- [ ] CompareAuthGate dismiss (X) returns to graph mode

**Architecture:**
- [ ] AppShellContext exists with `useAppShell()` hook
- [ ] AppShell is under 80 lines
- [ ] No prop drilling deeper than 1 level for shared state
- [ ] `useSupabaseUser` returns `{ user, loading }`

**Content:**
- [ ] `lucid-funding` renamed to `lucid-trading` — zero occurrences of old name in codebase
- [ ] All wikilinks still resolve after rename

**Build Health:**
- [ ] `npm run prebuild` passes
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Zero console errors in production build

---

## Summary Table

| ID | Group | Title | Est. Hours | Parallel With |
| --- | --- | --- | --- | --- |
| S5-01 | A — Foundation | Extract AppShellContext | 4–5h | — |
| S5-02 | B — Auth | Auth pages (sign-up, sign-in, callback) | 4–5h | S5-05, S5-09 |
| S5-03 | B — Auth | Auth integration into AppShell header | 2–3h | S5-06 |
| S5-04 | B — Auth | Update CompareAuthGate (remove Google OAuth) | 1–2h | S5-06 |
| S5-05 | C — Graph | Graph node styling + GraphTooltip | 4–5h | S5-02, S5-09 |
| S5-06 | C — Graph | GraphControls + GraphLegend | 4–5h | S5-03, S5-04 |
| S5-07 | D — Comparison | Modifier-click to open in Panel 3 | 3–4h | — |
| S5-09 | E — Content | Rename lucid-funding to lucid-trading | 1–2h | any |

**Total estimated hours: ~24–31h**

The critical path is: S5-01 → S5-02 → S5-03 → S5-04 → S5-07. Graph work (S5-05 → S5-06) runs in parallel with auth. Content rename (S5-09) is independent.

**Recommended pace:** 1.5–2 weeks for a solo founder with AI assistance.

---

## Risk Register (Sprint-Specific)

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Supabase magic link emails don't arrive (free tier SMTP limit) | High | High | Configure Resend as custom SMTP before sprint starts (prerequisite checklist) |
| `@supabase/ssr` server client cookie handling is tricky with Next.js 16 | Medium | Medium | Follow Supabase's Next.js guide; test callback route early in S5-02 |
| ForceGraph2D ref API may not expose zoom/fit in installed version | Low | Medium | Check `react-force-graph-2d` version; upgrade if needed |
| Modifier-click interception on rendered HTML is fragile | Medium | Medium | Use delegated event handler on container; test with all link types (wikilinks, external links, non-links) |
| AppShellContext refactor introduces subtle re-render regressions | Medium | Low | Run React DevTools profiler before and after; verify no new unnecessary renders |

---

_This document was drafted by the PM and challenged by the Tech Lead. All open questions were resolved in the challenge session. Sprint acceptance criteria are the source of truth for "done."_
