# Sprint 2 Tickets — OpenPropFirm

**Sprint Goal:** The three-panel Obsidian-style shell is functional. A user can navigate the file tree, open files, use tabs, and switch themes. Content is a placeholder — real markdown rendering is Sprint 3.

**Status:** Final — PM drafted, Tech Lead challenged, decisions incorporated 2026-03-29

**Reviewed by:** PM + Tech Lead (full challenge session with 12 challenge items resolved)

---

## Key Decisions Made in Challenge Session

| Decision                                     | Choice                                             | Rationale                                         |
| -------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Root redirect location                       | `next.config.ts` redirect                          | tech-plan Section 3.5 canonical; no RSC overhead  |
| `TreeNode.id` vs `TreeNode.path`             | `id` only (full URL slug)                          | Redundant fields removed                          |
| `@supabase/supabase-js` install timing       | S2-2 (not S2-11)                                   | Type `User \| null` correctly from S2-4 onward    |
| Supabase client file path                    | `src/lib/supabase/client.ts`                       | Matches `"lib": "@/lib"` alias in components.json |
| Panel 3 visibility toggle                    | ContentPanel header — icon `PanelRight`            | Distinct from mode toggle                         |
| Panel 3 mode toggle                          | GraphPanel header — icon `Network` / `Columns2`    | Different concern, different icon                 |
| Promo file-type color                        | New CSS variable `--file-type-promo` in themes.css | Avoids magic hex values in components             |
| BreadcrumbBar category crumbs (CFD, Futures) | Non-links — display only                           | `/firms/cfd` is not a valid route                 |
| Tab-close navigation logic                   | Lives in AppShell handler                          | TabBar is purely presentational                   |
| `dark:` variant                              | Covers dark AND blue themes                        | shadcn components work in all three themes        |
| History stack SSR                            | `useRef` — only in client effects                  | No window access during SSR                       |

---

## Sprint 2 Dependency Order

```
S2-1 (tech debt cleanup — prerequisite for all)
  └─→ S2-2 (types + getContentTree + installs)
        └─→ S2-3 (routing skeleton + next.config redirect)
              └─→ S2-4 (AppShell — stubs ResizeHandle as 4px div)
                    ├─→ S2-5 (ResizeHandle — replaces stub)         ┐
                    ├─→ S2-7 (ThemeToggle + lib/theme.ts)            │ parallel
                    ├─→ S2-8 (TabBar — purely presentational)        │ after S2-4
                    └─→ S2-9 (BreadcrumbBar)                        ┘
                          │
                          ├─→ S2-6 (NavPanel + FileTree — needs S2-7 ThemeToggle)
                          └─→ S2-10 (ContentPanel assembly — needs S2-8 + S2-9)
                                └─→ S2-11 (Panel 3 + Supabase auth wiring)
                                └─→ S2-12 (Responsive behavior — retrofits AppShell)
```

S2-5, S2-7, S2-8, S2-9 can be developed in parallel after S2-4 merges.
S2-6 depends on S2-7 (ThemeToggle import for bottom bar) — develop after S2-7 or stub the import.
S2-11 and S2-12 can be developed in parallel after S2-10 merges.

---

## S2-1: Resolve remaining S1 tech debt

**Goal:** Fix the S1 review issues that affect Sprint 2 component correctness before building anything new.

**Acceptance Criteria:**

**`@variant dark` fix (R-02, partial):**

- `src/app/globals.css` line 7 updated so the dark variant covers both dark and blue themes:
  ```css
  @variant dark (&:where([data-theme="dark"], [data-theme="dark"] *, [data-theme="blue"], [data-theme="blue"] *));
  ```
- Visually verify in all three themes: `<Button>`, shadcn `<Badge>`, shadcn `<Input>`, shadcn `<Checkbox>` render correctly with no style regression

**CSS `@layer base` cleanup (R-01):**

- Remove all circular self-references from the `@layer base :root` block in `globals.css`:
  - Delete: `--background: var(--background)`, `--foreground: var(--foreground)`, `--border: var(--border)`, `--muted: var(--muted)`, `--muted-foreground: var(--muted-foreground)`, `--accent: var(--accent)`, `--accent-foreground: var(--accent-foreground)`
  - Keep (these are non-circular remaps that shadcn components require): `--input: var(--border)`, `--ring: var(--accent)`, `--primary: var(--accent)`, `--primary-foreground: var(--accent-foreground)`, `--secondary: var(--muted)`, `--secondary-foreground: var(--muted-foreground)`, `--card: var(--background)`, `--card-foreground: var(--foreground)`, `--popover: var(--sidebar-bg)`, `--popover-foreground: var(--foreground)`, `--destructive: #ef4444`, `--destructive-foreground: #ffffff`
- Add a comment above the block: `/* Non-circular shadcn variable remaps — these bridge shadcn component tokens to project theme variables */`

**Promo file-type color (new requirement surfaced in challenge session):**

- Add `--file-type-promo` CSS variable to all three `[data-theme]` blocks in `src/styles/themes.css`:
  - Light: `--file-type-promo: #2A9D4E`
  - Dark: `--file-type-promo: #3FB950`
  - Blue: `--file-type-promo: #4ADE80`

**`.gitignore` fix (R-03):**

- Replace `.env*` pattern with: `.env.local`, `.env.*.local`
- Verify: after the change, `git status` shows `.env.example` as tracked (not ignored)
- Verify: `git status` confirms `.env.local` is still ignored (create a temp `.env.local` file, run `git status`, confirm it appears untracked, then delete it)

**Prettier scripts (R-08):**

- Add to `package.json` scripts:
  ```json
  "format": "prettier --write .",
  "format:check": "prettier --check ."
  ```
- Run `npm run format` once to normalize all existing files (shadcn components will be reformatted — this is expected and produces a noisy but clean diff)
- `npm run format:check` exits 0 after running `npm run format`

**Lint warning (R-09):**

- Check `scripts/validate-content.ts` for `catch (e)` binding — if still present, change to `catch` (no binding); if already fixed, skip this step
- `npm run lint` exits with zero warnings and zero errors

**Boilerplate cleanup (R-04):**

- Replace `src/app/page.tsx` content with a bare minimum:
  ```tsx
  export default function Home() {
    return null
  }
  ```
  (This file will be replaced entirely in S2-3 — keep it minimal)
- Remove default Next.js assets from `public/`: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`

**Final verification:**

- `npm run build` passes with zero errors
- `npm run lint` passes with zero warnings or errors

**Notes:**

- Do NOT install husky/lint-staged — adds complexity for a solo AI-assisted workflow
- Do NOT change `tsconfig.json` target (R-11) — deferred to Sprint 3 (low severity, no Sprint 2 impact)
- `shadcn` is already in `devDependencies` — R-07 is already resolved, skip it
- Font stack is already correct (using Geist via `var(--font-geist-sans)`) — R-05 already resolved, skip it

**Blocks:** All other Sprint 2 tickets (CSS correctness needed before building themed components)

---

## S2-2: Types, installs, `getContentTree`, and root layout wiring

**Goal:** Install all Sprint 2 runtime dependencies, define the shared TypeScript types, build the server-side content tree generator, and wire it into the root layout.

**Acceptance Criteria:**

**Package installs:**

- `npm install gray-matter` — promotes from devDependencies to dependencies (used in the Next.js app, not just scripts)
- `npm install server-only` — enforces server-only import boundary on `getContentTree.ts`
- `npm install @supabase/supabase-js` — installed now so `User | null` types are correct in AppShell from S2-4 onward

**TypeScript types (`src/types/content.ts`):**

```typescript
export type FileType =
  | 'basic-info'
  | 'challenge'
  | 'rules'
  | 'promo'
  | 'changelog'

export type NodeRole = 'category' | 'firm' | 'challenges-folder' | 'file'

export type TreeNode = {
  id: string // full URL slug, e.g. "firms/cfd/funded-next/challenges/50k"
  label: string // display name — from frontmatter.title, or capitalized slug segment
  type: 'folder' | 'file'
  nodeRole: NodeRole // used to distinguish rendering: category header vs firm folder vs challenges sub-folder vs file
  fileType?: FileType // only for file nodes
  children?: TreeNode[]
}

export type ContentTreeResult = {
  treeData: TreeNode[] // top-level: two TreeNode[nodeRole='category'] — CFD and Futures
  validSlugs: string[] // all full slugs, e.g. ["firms/cfd/funded-next/challenges/50k", ...]
  slugToPathMap: Record<string, string> // firm-relative slug → full URL path
  // e.g. "funded-next/rules" → "firms/cfd/funded-next/rules"
  // Used by Sprint 3's wikilink resolver
}

export type TabEntry = {
  slug: string // full URL slug, e.g. "firms/cfd/funded-next/challenges/50k"
  title: string // display label from frontmatter or slug-derived
}
```

**`src/lib/content/getContentTree.ts`:**

- First line: `import 'server-only'`
- Uses Node.js `fs` module (server-only) to walk `/data/firms/**/*.md` recursively
- Reads only YAML frontmatter per file via `gray-matter` (does NOT process markdown content)
- Skips: any file or directory whose name starts with `_`, any `README.md`, any `LICENSE` file
- Returns `ContentTreeResult`:
  - `treeData`: two top-level nodes with `nodeRole: 'category'`:
    - CFD: `{ id: 'firms/cfd', label: 'CFD', type: 'folder', nodeRole: 'category', children: [<firm nodes>] }`
    - Futures: `{ id: 'firms/futures', label: 'Futures', type: 'folder', nodeRole: 'category', children: [<firm nodes>] }`
  - Each firm folder: `nodeRole: 'firm'`, label from kebab-to-title conversion (e.g. "funded-next" → "Funded Next")
  - Within each firm, children ordered: `basic-info` first, then `rules`, `promo`, `changelog`, then a `challenges-folder` node last
  - `challenges-folder` node: `{ id: 'firms/cfd/funded-next/challenges', label: 'Challenges', type: 'folder', nodeRole: 'challenges-folder', children: [<challenge file nodes>] }`
  - File nodes: `type: 'file'`, `nodeRole: 'file'`, `fileType` from `frontmatter.type`, `label` from `frontmatter.title` (fall back to capitalizing the last slug segment if title is missing)
  - `validSlugs`: flat array of all file node `id` values (no folder nodes)
  - `slugToPathMap`: maps firm-relative wikilink targets to full URL paths. For each file, key = `<firm-slug>/<relative-path>` (e.g. `funded-next/rules`), value = full URL path (e.g. `firms/cfd/funded-next/rules`)
- Exports `getStaticParams(): Array<{ slug: string[] }>` — returns all file slugs split into arrays for `generateStaticParams`. Example output: `[{ slug: ['firms', 'cfd', 'funded-next', 'challenges', '50k'] }, ...]`

**Root layout wiring (`src/app/layout.tsx`):**

- `layout.tsx` is a React Server Component (no `'use client'`)
- Calls `const { treeData, validSlugs } = await getContentTree()` at the top
- Renders `<AppShell treeData={treeData} validSlugs={validSlugs}>{children}</AppShell>`
- Since AppShell does not exist yet in this ticket, use a placeholder: `<div className="flex h-screen">{children}</div>` — it will be replaced when S2-4 merges
- The import path for `getContentTree` is `@/lib/content/getContentTree`

**Verification:**

- Create a temporary test: run `node -e "const { getContentTree } = require('./src/lib/content/getContentTree'); getContentTree().then(r => console.log(r.validSlugs.length))"` — should print 26 (or however many `.md` files are in `/data/firms/**`)
  - Actually: use `tsx src/lib/content/getContentTree.ts` with a quick `console.log` test at the bottom, then remove the test code
- `getStaticParams()` returns the correct number of entries (one per content file)
- TypeScript compiles without errors: `npx tsc --noEmit`
- Attempting to import `getContentTree` in a file with `'use client'` at the top causes a Next.js build error — verify this guard works

**Notes:**

- `gray-matter` moves from `devDependencies` to `dependencies` — also update `package.json` by hand if `npm install` doesn't auto-move it (run `npm uninstall gray-matter && npm install gray-matter` if needed)
- The `slugToPathMap` key format ("funded-next/rules") matches how wikilinks are written in the `/data` markdown files (as confirmed in `data/firms/cfd/funded-next/index.md` which uses `[[funded-next/rules|Trading Rules]]`)
- `server-only` is an ESM package. Next.js App Router handles this correctly. No additional config needed.

**Blocks:** S2-3 (needs `getStaticParams`), S2-4 (needs `ContentTreeResult` and `TreeNode` types, needs `@supabase/supabase-js` for `User | null`)

---

## S2-3: App routing skeleton

**Goal:** Create the root redirect and catch-all route so URL-based navigation works during Sprint 2 acceptance testing.

**Acceptance Criteria:**

**Root redirect (`next.config.ts`):**

- Add a redirect in `next.config.ts`:
  ```typescript
  redirects: async () => [
    { source: '/', destination: '/firms/cfd/funded-next', permanent: false },
  ]
  ```
- `src/app/page.tsx` is deleted entirely (the `next.config.ts` redirect means it's never reached)
- Visiting `http://localhost:3000/` during `npm run dev` redirects to `/firms/cfd/funded-next`

**Catch-all route (`src/app/firms/[...slug]/page.tsx`):**

- File exists with:

  ```typescript
  import { getStaticParams } from '@/lib/content/getContentTree'
  // getContentTree is server-only safe in generateStaticParams — this runs at build time, not in client context

  export const dynamic = 'force-static'
  // ^ Safety net: prevents dynamic fallback even if generateStaticParams misses a slug

  export async function generateStaticParams() {
    return getStaticParams()
  }

  export default async function FirmPage({
    params,
  }: {
    params: Promise<{ slug: string[] }>
  }) {
    const { slug } = await params
    const slugPath = slug.join('/')
    return (
      <div className="p-8 text-sm text-[var(--muted-foreground)]">
        Content for <code>{slugPath}</code> — rendering coming in Sprint 3
      </div>
    )
  }
  ```

- `await params` is required — Next.js 16 async params API (not `params.slug` directly)
- `npm run build` generates static HTML for all content pages. Run `npm run build` and verify the build output shows 26+ static pages under `/firms/`
- Zero TypeScript errors

**Notes:**

- The placeholder `<div>` content renders inside Panel 2's content area via ContentPanel's `{children}` prop (wired in S2-10). It is replaced entirely in Sprint 3's `getPageContent()` wiring.
- `dynamic = 'force-static'` comment explains the purpose — do not remove the comment.
- `getStaticParams` from `getContentTree.ts` is marked `server-only` but is safe to import in `generateStaticParams` (runs at build time on the server, not in client bundle).
- DO NOT add `notFound()` in Sprint 2 — Sprint 3 handles the case where a slug has no content file.

**Blocks:** Sprint 2 acceptance testing (navigation via file tree requires valid URLs)

---

## S2-4: AppShell component

**Goal:** Build the root client component that renders the three-panel layout, manages all panel and tab state, and initializes the Supabase session.

**Acceptance Criteria:**

**File:** `src/components/layout/AppShell.tsx` with `'use client'` directive

**Props interface:**

```typescript
type AppShellProps = {
  treeData: TreeNode[]
  validSlugs: string[]
  children: React.ReactNode
}
```

**State (all persisted to localStorage with `try/catch` guards for SSR safety):**

| State             | Type                   | localStorage key             | Initial value                    |
| ----------------- | ---------------------- | ---------------------------- | -------------------------------- |
| `panel1Collapsed` | `boolean`              | `panel1Collapsed`            | `false`                          |
| `panel3Width`     | `number`               | `panel3Width`                | `360`                            |
| `panel3Visible`   | `boolean`              | none (derived from viewport) | `false` (corrected in useEffect) |
| `panel3Mode`      | `'graph' \| 'compare'` | `panel3Mode`                 | `'graph'`                        |
| `openTabs`        | `TabEntry[]`           | `openTabs`                   | `[]`                             |
| `user`            | `User \| null`         | none (from Supabase)         | `null`                           |

**localStorage initialization pattern:**

```typescript
const [panel1Collapsed, setPanel1Collapsed] = useState<boolean>(() => {
  try {
    return JSON.parse(localStorage.getItem('panel1Collapsed') ?? 'false')
  } catch {
    return false
  }
})
```

Use the same lazy initializer pattern for all localStorage-backed state.

**Panel 3 initial visibility (SSR-safe):**

- Initial state: `false` (static — avoids hydration mismatch)
- `useEffect(() => { setPanel3Visible(window.innerWidth >= 1100) }, [])` — corrects on mount
- The layout shift from `false` → `true` on desktop is acceptable in Sprint 2 (Sprint 3 can address with a CSS-only fallback if needed)

**Tab reconciliation (uses `usePathname`):**

- `const pathname = usePathname()` — import from `next/navigation`
- Derive `activeSlug` from pathname: strip leading `/` → e.g. `firms/cfd/funded-next/challenges/50k`
- `useEffect` watching `pathname`:
  ```typescript
  useEffect(() => {
    const slug = pathname.replace(/^\//, '')
    if (!slug.startsWith('firms/')) return
    const exists = openTabs.some((t) => t.slug === slug)
    if (!exists) {
      const label =
        findLabelInTree(treeData, slug) ?? slug.split('/').pop() ?? slug
      setOpenTabs((prev) => [...prev, { slug, title: label }])
    }
  }, [pathname])
  ```
- `findLabelInTree(treeData, slug): string | null` — helper function (in the same file): walks `treeData` recursively to find the node with `id === slug` and returns its `label`. Returns `null` if not found.

**Tab close handler (logic lives here, not in TabBar):**

```typescript
const handleTabClose = (slug: string) => {
  const idx = openTabs.findIndex((t) => t.slug === slug)
  const newTabs = openTabs.filter((t) => t.slug !== slug)
  setOpenTabs(newTabs)
  if (activeSlug === slug) {
    const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
    if (next) router.push('/' + next.slug)
    else router.push('/firms/cfd/funded-next')
  }
}
```

- `const router = useRouter()` — import from `next/navigation`

**localStorage persistence (for all state that should persist):**

- `useEffect` watching each state var: `localStorage.setItem('panel1Collapsed', JSON.stringify(panel1Collapsed))`
- Same pattern for `panel3Width`, `panel3Mode`, `openTabs`
- `panel3Visible` is NOT persisted — always derived from viewport on mount

**Supabase session:**

```typescript
const [user, setUser] = useState<User | null>(null)
useEffect(() => {
  supabase.auth
    .getSession()
    .then(({ data }) => setUser(data.session?.user ?? null))
  const { data } = supabase.auth.onAuthStateChange((_, session) => {
    setUser(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}, [])
```

- `User` type imported from `@supabase/supabase-js`
- `supabase` client imported from `@/lib/supabase/client` (created in S2-11 — stub the import for now with `const supabase = null as any` until S2-11 merges, or create the client.ts file in this ticket as a two-liner)

**Layout structure:**

```tsx
<div className="flex h-screen overflow-hidden bg-[var(--background)]">
  {/* Panel 1 */}
  <div
    style={{
      width: panel1Collapsed ? 48 : 260,
      transition: 'width 200ms ease',
    }}
    className="shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--sidebar-bg)]"
  >
    {/* NavPanel goes here — placeholder until S2-6 */}
    <div className="p-2 text-xs text-[var(--muted-foreground)]">Nav panel</div>
  </div>

  {/* Panel 2 */}
  <div className="flex min-w-[400px] flex-1 flex-col overflow-hidden">
    {/* ContentPanel goes here — placeholder until S2-10 */}
    {children}
  </div>

  {/* ResizeHandle — placeholder 4px div until S2-5 */}
  <div className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-[var(--accent)]/40" />

  {/* Panel 3 */}
  {panel3Visible && (
    <div
      style={{ width: panel3Width }}
      className="flex shrink-0 flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--sidebar-bg)]"
    >
      {/* GraphPanel goes here — placeholder until S2-11 */}
      <div className="p-4 text-xs text-[var(--muted-foreground)]">Panel 3</div>
    </div>
  )}
</div>
```

**Verification:**

- At 1280px+ viewport: all three panels visible, no horizontal overflow
- `panel1Collapsed` toggling works: AppShell exposes `setPanel1Collapsed` (will be connected to NavPanel's collapse button in S2-6)
- State persists on page reload: open browser, note Panel 3 width, reload, Panel 3 width is the same
- TypeScript compiles without errors: `npx tsc --noEmit`

**Notes:**

- The Supabase client stub (`const supabase = null as any`) is acceptable only for this ticket — S2-11 creates the real client.ts and the stub must be replaced. Mark it with `// TODO: replace with real client in S2-11`
- `children` from `page.tsx` renders inside the Panel 2 `<div>` — ContentPanel (S2-10) will wrap this properly. In Sprint 2, the raw `{children}` renders the placeholder div from S2-3's `page.tsx`.
- `usePathname`, `useRouter`, and `useSearchParams` all require the component to be a Client Component (already `'use client'`)

**Blocks:** S2-5, S2-6, S2-7, S2-8, S2-9, S2-10, S2-11, S2-12

---

## S2-5: ResizeHandle component

**Goal:** Build the drag-resize handle between Panel 2 and Panel 3 per ui-guide Section 1.2.

**Acceptance Criteria:**

**File:** `src/components/layout/ResizeHandle.tsx`

**Props:** `{ onResize: (newWidth: number) => void }`

**Element dimensions:** `4px` wide, `100%` height, `cursor: col-resize`

**Pointer capture drag implementation:**

```typescript
const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
  e.currentTarget.setPointerCapture(e.pointerId)
  setIsDragging(true)
}
const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
  if (!isDragging) return
  // Panel 3 width = distance from pointer to right edge of viewport
  const newWidth = window.innerWidth - e.clientX
  const clamped = Math.min(600, Math.max(280, newWidth))
  onResize(clamped)
}
const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
  e.currentTarget.releasePointerCapture(e.pointerId)
  setIsDragging(false)
  // Notify AppShell to persist Panel 3 width — handled by AppShell's useEffect watching panel3Width
}
```

**Visual states:**

- Default: `bg-transparent`
- Hover: `bg-[var(--accent)]/40` with `transition-colors duration-200`
- Active drag: `bg-[var(--accent)]/80`

**Persistence:** ResizeHandle does NOT write to localStorage. It calls `onResize(clamped)` which updates AppShell's `panel3Width` state. AppShell's `useEffect` watching `panel3Width` persists to `localStorage('panel3Width')`.

**Verification:**

- Drag the handle: Panel 3 width changes in real time
- Width clamps at 280px (minimum) and 600px (maximum)
- Panel 3 width persists after drag + page reload
- Hover: accent color fades in on hover, intensifies when dragging
- Cursor is `col-resize` on the element
- AppShell updated to use `<ResizeHandle onResize={setPanel3Width} />` in place of the stub 4px div

**Notes:**

- This approach (pointer capture on the element) supersedes the ui-guide's suggestion of `document` listeners — pointer capture is cleaner and handles fast cursor movement correctly.
- The `window.innerWidth - e.clientX` formula assumes Panel 3 is anchored to the right edge of the viewport. This is correct for the full-viewport flex layout.

**Blocks:** AppShell ResizeHandle stub replacement

---

## S2-6: NavPanel + FileTree

**Goal:** Build the left navigation panel with collapsible file tree, bottom bar, and correct rendering of the 4-firm content structure per ui-guide Section 2.

**Acceptance Criteria:**

**Files:**

- `src/components/nav/NavPanel.tsx` — `'use client'`
- `src/components/nav/NavFileTree.tsx` — `'use client'`

**NavPanel (`src/components/nav/NavPanel.tsx`):**

Props:

```typescript
type NavPanelProps = {
  treeData: TreeNode[]
  activeSlug: string
  collapsed: boolean
  onToggleCollapse: () => void
}
```

Structure (flex column, full height):

- Header (48px): collapse toggle button (Lucide `PanelLeft`, 16px) on left; when not collapsed, show "OpenPropFirm" text in 14px font-medium; when collapsed, show only the icon
- Search trigger (36px): visible only when not collapsed; full-width button with 8px horizontal margin, rounded-md border, `bg-[var(--muted)]`; contains Lucide `Search` (14px) + "Search..." placeholder text + `<kbd>⌘K</kbd>` badge; clicking it is a no-op for now (`onClick={() => {}}` with a `// TODO: wire to SearchModal in Sprint 3` comment)
- File tree (flex-1, overflow-y-auto): `<NavFileTree>` — hidden (or icon-only) when collapsed
- Bottom bar (40px): `border-t border-[var(--border)]`; flex row; Settings icon (Lucide `Settings`, 16px, left) — `onClick={() => console.log('settings — v2')}` — ; ThemeToggle (right, from `src/components/nav/ThemeToggle`)

When `collapsed`:

- Header: only the toggle button
- Search trigger: hidden
- File tree: hidden (Panel 1 is 48px wide — just show the toggle button icon)
- Bottom bar: hidden (too narrow)

**NavFileTree (`src/components/nav/NavFileTree.tsx`):**

Props:

```typescript
type NavFileTreeProps = {
  treeData: TreeNode[]
  activeSlug: string
}
```

Category headers (rendered from `nodeRole: 'category'` nodes):

- Non-collapsible label: 10px uppercase, font-semibold, `var(--muted-foreground)`, 16px top margin, 8px bottom, 12px left padding
- No chevron, no click handler

Firm folders (rendered from `nodeRole: 'firm'` nodes):

- 28px height, flex row, 12px left padding, depth indentation
- Lucide `ChevronRight` (14px), rotates 90° when open (`transition-transform duration-200`)
- Firm name: 13px font-medium, `var(--foreground)`
- Hover: `hover:bg-[var(--muted)]/60`
- Active (contains the active file): `bg-[var(--muted)] text-[var(--accent)]`

Challenges sub-folder (rendered from `nodeRole: 'challenges-folder'` nodes):

- Same rendering as firm folders but at depth+1 indentation (28px more left padding)

File items (rendered from `nodeRole: 'file'` nodes):

- 26px height, flex row, 12px left padding + depth indent
- File type icon (14px, colored):
  - `basic-info` → Lucide `Info`, color `var(--muted-foreground)`
  - `challenge` → Lucide `Trophy`, color `var(--accent)`
  - `rules` → Lucide `BookOpen`, color `var(--foreground)`
  - `promo` → Lucide `Tag`, color `var(--file-type-promo)` (CSS variable added in S2-1)
  - `changelog` → Lucide `History`, color `var(--muted-foreground)`
- Label: 13px font-normal `var(--foreground)`
- Active (id === activeSlug): `bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] font-medium`
- Clicking a file: `router.push('/' + node.id)` — use `useRouter` from `next/navigation`

Folder expand/collapse state:

- `useState<Record<string, boolean>>` initialized from `localStorage('navTreeState')` with `try/catch`
- On mount: auto-expand the parent chain of `activeSlug`:
  - Walk `treeData` to find all ancestor folder nodes of the active file
  - Set their `id` to `true` in the expand state
  - Auto-expand overrides localStorage state (active file's chain is always visible)
  - Save the overridden state back to localStorage
- Clicking a folder: toggles its entry in the state, saves to localStorage
- No animation on children appearing (instant — Obsidian-style)

AppShell wiring:

- AppShell updated to render `<NavPanel treeData={treeData} activeSlug={activeSlug} collapsed={panel1Collapsed} onToggleCollapse={() => setPanel1Collapsed(v => !v)} />` inside Panel 1, replacing the placeholder

**Verification:**

- File tree renders all 4 firms in correct CFD/Futures groupings
- Funded Next shows 5 challenge files under a "Challenges" sub-folder
- Clicking a firm folder expands/collapses it; state persists on reload
- Clicking a file navigates to the correct URL (Panel 2 placeholder content updates)
- Active file is highlighted in the tree
- Active file's parent folders are open on load
- Panel 1 collapses to 48px icon rail; toggle button visible; clicking re-expands
- ThemeToggle in bottom bar works (theme changes immediately)

**Notes:**

- `activeSlug` is derived in AppShell from `usePathname()` (stripping leading `/`) and passed down as a prop
- The challenges sub-folder node has no click handler — it's a collapsible container only

**Blocks:** AppShell NavPanel placeholder replacement

---

## S2-7: ThemeToggle + `lib/theme.ts`

**Goal:** Build the theme cycling utility and the ThemeToggle button so theme switching works cleanly across all three themes and dispatches the event needed by the Sprint 5 graph.

**Acceptance Criteria:**

**`src/lib/theme.ts`:**

```typescript
export type Theme = 'light' | 'dark' | 'blue'
export const THEMES: Theme[] = ['light', 'dark', 'blue']

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme) // key must match anti-flash script in layout.tsx
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
}

export function getTheme(): Theme {
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'light' || t === 'dark' || t === 'blue') return t
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored && THEMES.includes(stored)) return stored
  return 'dark'
}
```

**`src/components/nav/ThemeToggle.tsx`** (`'use client'`):

- `useState<Theme>('dark')` as initial state (static, SSR-safe)
- `useEffect(() => { setCurrentTheme(getTheme()) }, [])` — correct from DOM on mount
- On click: `const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]; setTheme(next); setCurrentTheme(next)`
- Icon: Lucide `Sun` for light, `Moon` for dark, `Palette` for blue — 16px
- Button: 28×28px, `rounded-md`, `hover:bg-[var(--muted)]`
- Wrap with shadcn `Tooltip` showing the current theme name (e.g. "Dark theme") — `TooltipProvider` must wrap the component or be at layout level

**Verification:**

- Clicking toggle cycles light → dark → blue → light
- Colors update immediately with no visible flash or transition delay between themes
- Theme persists on page reload (the anti-flash inline script in layout.tsx uses `localStorage.getItem('theme')` with the same key)
- `window.dispatchEvent` test: run `window.addEventListener('themechange', e => console.log(e.detail))` in browser console, then click toggle — event fires with correct `{ theme: '...' }`
- All three themes render the sidebar, content area, and buttons with correct colors

**Notes:**

- `localStorage` key is `'theme'` — this must match the anti-flash script in `layout.tsx` exactly. Do not use `'theme-preference'` or any other key.
- `getTheme()` and `setTheme()` use `document` which only exists on the client. Never call them during SSR. The ThemeToggle component guards this with the `useEffect` initial correction.

**Blocks:** S2-6 (NavPanel bottom bar imports ThemeToggle)

---

## S2-8: TabBar component

**Goal:** Build the purely presentational tab bar that receives open tabs as props and calls handlers for all state changes. No state, no localStorage, no navigation logic lives here.

**Acceptance Criteria:**

**File:** `src/components/content/TabBar.tsx` — `'use client'`

**Props:**

```typescript
type TabBarProps = {
  openTabs: TabEntry[]
  activeSlug: string
  onTabClick: (slug: string) => void
  onTabClose: (slug: string) => void
  onNewTab: () => void
  onTogglePanel3: () => void // shows/hides Panel 3 — the VISIBILITY toggle button lives here
}
```

**Structure:**

- Outer container: `flex items-center border-b border-[var(--border)] h-9 overflow-hidden`
- Tabs scroll container: `flex-1 flex overflow-x-auto` with CSS scrollbar hiding:

  ```css
  /* In globals.css @layer components or inline style */
  .tab-scroll::-webkit-scrollbar {
    display: none;
  }
  .tab-scroll {
    scrollbar-width: none;
  }
  ```

  Use a className `tab-scroll` — avoid Tailwind arbitrary pseudo-element variants for this.

- Each tab item (`<button>`):
  - `min-w-[120px] max-w-[200px] h-9 px-3 shrink-0 flex items-center gap-1.5 border-r border-[var(--border)] relative`
  - Active tab: `bg-[var(--background)] border-b-2 border-b-[var(--accent)]`
  - Inactive tab: `bg-[var(--sidebar-bg)] hover:bg-[var(--muted)]`
  - Label: `text-[13px] truncate flex-1`, `var(--foreground)`
  - Close button (`×`): Lucide `X` (11px), appears on hover only (`opacity-0 group-hover:opacity-100`), `onClick={e => { e.stopPropagation(); onTabClose(tab.slug) }}`
  - Tab `onClick`: `onTabClick(tab.slug)`

- `+` new tab button (after tabs scroll container):
  - Lucide `Plus` 16px, 36×36px, `shrink-0`, `hover:bg-[var(--muted)]`
  - `onClick={onNewTab}` — no-op for Sprint 2 (will open SearchModal in Sprint 3); add `// TODO: wire to SearchModal in Sprint 3` comment

- Panel 3 visibility toggle button (far right of TabBar, or in a separate header row):
  - Lucide `PanelRight` 16px, 28×28px, `rounded-md`, `hover:bg-[var(--muted)]`
  - `onClick={onTogglePanel3}`
  - Tooltip: "Toggle sidebar"
  - **This is the VISIBILITY toggle — it shows/hides Panel 3. It is NOT the mode toggle (graph/compare) which lives in GraphPanel.**

**Verification:**

- Multiple tabs render in a horizontal scroll container; tabs wider than container scroll correctly
- Active tab has bottom accent border; inactive tabs have sidebar background
- Hovering a tab reveals the close button
- Close button click calls `onTabClose(slug)` — does NOT navigate (navigation is AppShell's job)
- Tab click calls `onTabClick(slug)` — does NOT navigate directly
- `+` button renders at far right (does nothing in Sprint 2)
- Panel 3 visibility toggle is present and visible

**Notes:**

- NO state management in TabBar. NO localStorage writes. NO router.push calls. This is a pure presentational component.
- Tab state (`openTabs`), localStorage persistence, and close-then-navigate logic all live in AppShell (S2-4).

**Blocks:** S2-10 (ContentPanel renders TabBar)

---

## S2-9: BreadcrumbBar component

**Goal:** Build the breadcrumb navigation with in-app back/forward history stack per ui-guide Section 3.3.

**Acceptance Criteria:**

**File:** `src/components/content/BreadcrumbBar.tsx` — `'use client'`

**Props:** `{ activeSlug: string }`

**This component does NOT call `usePathname()` directly** — it receives `activeSlug` as a prop from ContentPanel (which receives it from AppShell).

**Slug-to-breadcrumb formatting:**

- Strip leading `firms/` from `activeSlug`
- Split remaining path on `/`
- Segment labels:
  - `'cfd'` → `'CFD'` (special-case)
  - `'futures'` → `'Futures'` (special-case)
  - `'challenges'` → `'Challenges'`
  - All other segments: `segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')`
- Example: `firms/cfd/funded-next/challenges/50k` → segments `['CFD', 'Funded Next', 'Challenges', '50k']`
- **Category segments ('CFD', 'Futures') are rendered as non-links** (no valid `/firms/cfd` route exists)
- All other segments except the last are rendered as `<BreadcrumbLink>` pointing to `'/firms/' + cumulativePath`
- Last segment is rendered as `<BreadcrumbPage>` (not a link)

**Layout:** 36px height bar, `px-6` padding, flex row, `border-b border-[var(--border)]`

**Back/Forward buttons:**

```typescript
const backStack = useRef<string[]>([])
const forwardStack = useRef<string[]>([])
const prevSlug = useRef<string>('')

useEffect(() => {
  if (prevSlug.current && prevSlug.current !== activeSlug) {
    backStack.current.push(prevSlug.current)
    forwardStack.current = [] // new navigation clears forward history
    setCanGoBack(backStack.current.length > 0)
    setCanGoForward(false)
  }
  prevSlug.current = activeSlug
}, [activeSlug])
```

- `canGoBack` and `canGoForward`: `useState<boolean>` used only to trigger re-renders for button disabled state (refs don't trigger re-renders)
- Back button (Lucide `ChevronLeft`, 16px): `disabled` + 30% opacity when `!canGoBack`; on click: `const slug = backStack.current.pop(); forwardStack.current.push(activeSlug); setCanGoForward(true); setCanGoBack(backStack.current.length > 0); router.push('/' + slug)`
- Forward button (Lucide `ChevronRight`, 16px): `disabled` + 30% opacity when `!canGoForward`; same pattern

**History stack does NOT persist to localStorage** — resets on page reload (Obsidian-style)

**Verification:**

- Navigate to 3 different pages → back button works, navigating to the previously visited pages in order
- After going back, forward button enables; forward navigates correctly
- Breadcrumb shows correct segments for any content page slug
- "CFD" and "Futures" segments are plain text (not links)
- `npx tsc --noEmit` passes

**Notes:**

- The `router` here is `const router = useRouter()` from `next/navigation`
- The `prevSlug.current = ''` on first render means the first navigation (page load) does not add anything to the back stack — this is correct behavior

**Blocks:** S2-10 (ContentPanel renders BreadcrumbBar)

---

## S2-10: ContentPanel assembly

**Goal:** Wire TabBar, BreadcrumbBar, and the content area into the ContentPanel component, and update AppShell to use it.

**Acceptance Criteria:**

**File:** `src/components/content/ContentPanel.tsx` — `'use client'`

**Props:**

```typescript
type ContentPanelProps = {
  openTabs: TabEntry[]
  activeSlug: string
  onTabClick: (slug: string) => void
  onTabClose: (slug: string) => void
  onNewTab: () => void
  onTogglePanel3: () => void
  children: React.ReactNode
}
```

**Layout (flex column, 100% height):**

```tsx
<div className="flex h-full flex-col">
  <TabBar
    openTabs={openTabs}
    activeSlug={activeSlug}
    onTabClick={onTabClick}
    onTabClose={onTabClose}
    onNewTab={onNewTab}
    onTogglePanel3={onTogglePanel3}
  />
  <BreadcrumbBar activeSlug={activeSlug} />
  <div className="flex-1 overflow-y-auto">{children}</div>
</div>
```

**AppShell wiring:**

- AppShell derives `activeSlug` from `usePathname()`: `const activeSlug = pathname.replace(/^\//, '')`
- AppShell renders `<ContentPanel>` inside Panel 2, replacing the previous placeholder:
  ```tsx
  <ContentPanel
    openTabs={openTabs}
    activeSlug={activeSlug}
    onTabClick={(slug) => router.push('/' + slug)}
    onTabClose={handleTabClose}
    onNewTab={() => {}} // TODO: wire to SearchModal in Sprint 3
    onTogglePanel3={() => setPanel3Visible((v) => !v)}
  >
    {children}
  </ContentPanel>
  ```
- `children` is the output from `page.tsx` (the placeholder div from S2-3)

**Verification:**

- All three panels render correctly at 1280px+
- Navigating to `/firms/cfd/funded-next/challenges/50k`:
  - TabBar shows a tab labeled "Funded Next — $50k Challenge"
  - BreadcrumbBar shows: CFD > Funded Next > Challenges > 50k
  - Content area shows the placeholder div from S2-3
  - Back/forward buttons work after navigating to multiple pages
- Closing a tab removes it; closing the active tab navigates to adjacent tab
- Panel 3 visibility toggle in TabBar shows/hides Panel 3

**Blocks:** S2-11, S2-12

---

## S2-11: Panel 3 scaffold, Supabase client, CompareAuthGate

**Goal:** Build Panel 3 (GraphPanel) with mode toggle, create the real Supabase client, and implement the auth gate so Panel 3 behavior is complete for Sprint 2.

**Acceptance Criteria:**

**Supabase client (`src/lib/supabase/client.ts`):**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- Replace the AppShell stub (`const supabase = null as any`) with `import { supabase } from '@/lib/supabase/client'`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be in `.env.local` for local testing; if missing, the `!` non-null assertion throws at runtime (intentional — clear failure signal)

**Env var prebuild validation:**

- Add `scripts/validate-env.ts`:
  ```typescript
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.error('Missing required env vars:', missing.join(', '))
    process.exit(1)
  }
  console.log('Env validation passed')
  ```
- Update `package.json` `"prebuild"`:
  ```json
  "prebuild": "tsx scripts/validate-content.ts && tsx scripts/validate-env.ts"
  ```
- Local dev does NOT fail on missing vars (only `prebuild` runs this, not `dev`)

**GraphPanel (`src/components/graph/GraphPanel.tsx`):** `'use client'`

Props:

```typescript
type GraphPanelProps = {
  mode: 'graph' | 'compare'
  user: User | null
  onModeToggle: () => void // called when mode switch is confirmed (user authenticated, or back to graph)
  onDismissGate: () => void // called when auth gate is dismissed — AppShell resets mode to 'graph'
}
```

Structure:

- Header (40px): `flex items-center justify-between px-3 border-b border-[var(--border)]`
  - Left: "Graph" label in 12px font-medium `var(--muted-foreground)` (or "Compare" when in compare mode)
  - Right: mode toggle button — **this is the MODE toggle (graph ↔ compare), NOT the visibility toggle**
    - Icon: Lucide `Network` (16px) when in graph mode; Lucide `Columns2` (16px) when in compare mode
    - `onClick`: handle mode toggle click (see logic below)
    - Tooltip: "Switch to compare mode" / "Switch to graph view"
- Body (flex-1, overflow-hidden):
  - Graph mode: `<div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">Graph view — coming in Sprint 5</div>`
  - Compare mode + `user !== null`: `<div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">Compare panel — coming in Sprint 5</div>`
  - Compare mode + `user === null`: `<CompareAuthGate onDismiss={onDismissGate} />`

Mode toggle click logic (inside GraphPanel, using local state):

```typescript
const [pendingCompare, setPendingCompare] = useState(false)

const handleModeToggleClick = () => {
  if (mode === 'compare') {
    // switching back to graph — always allowed
    onModeToggle()
  } else {
    // switching to compare
    if (user) {
      onModeToggle() // authenticated — switch immediately
    } else {
      setPendingCompare(true) // not authenticated — show gate but don't switch mode yet
    }
  }
}
```

When `user` becomes non-null (auth state change in AppShell flows down as prop):

```typescript
useEffect(() => {
  if (user && pendingCompare) {
    setPendingCompare(false)
    onModeToggle() // transition to compare mode now that user is authenticated
  }
}, [user])
```

**CompareAuthGate (`src/components/auth/CompareAuthGate.tsx`):** `'use client'`

Props: `{ onDismiss: () => void }`

Layout: centered vertically and horizontally inside Panel 3:

```tsx
<div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
  <button
    onClick={onDismiss}
    className="absolute top-3 right-3 p-1 rounded hover:bg-[var(--muted)]"
    aria-label="Dismiss"
  >
    <X size={14} />
  </button>
  <h3 className="text-sm font-semibold text-[var(--foreground)]">
    Compare two pages side by side
  </h3>
  <p className="text-xs text-[var(--muted-foreground)]">
    Sign in with Google to unlock the comparison panel
  </p>
  <button
    onClick={() => supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })}
    className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
  >
    <svg ...Google G logo SVG... />
    Sign in with Google
  </button>
</div>
```

- The `window.location.origin` access is inside a click handler (client-side only) — safe from SSR
- `supabase` imported from `@/lib/supabase/client`

**AppShell wiring:**

- AppShell renders `<GraphPanel>` inside Panel 3, replacing the placeholder:
  ```tsx
  <GraphPanel
    mode={panel3Mode}
    user={user}
    onModeToggle={() =>
      setPanel3Mode((m) => (m === 'graph' ? 'compare' : 'graph'))
    }
    onDismissGate={() => setPanel3Mode('graph')}
  />
  ```

**Verification:**

- Panel 3 renders with header showing mode toggle button
- Unauthenticated user clicks mode toggle → `<CompareAuthGate>` appears in Panel 3; graph view text is gone
- Clicking X in auth gate → Panel 3 returns to graph placeholder
- Clicking Google sign-in button → browser redirects to Google OAuth (requires configured Supabase project and real env vars)
- After successful auth, `onAuthStateChange` fires → `user` state in AppShell updates → GraphPanel transitions to compare placeholder
- `npx tsc --noEmit` passes

**Notes:**

- Google OAuth requires a configured Supabase project with Google provider enabled AND `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Without this setup by the founder (documented in S1-8), the Google sign-in button will error. The component is correct — the env/OAuth setup is a manual founder step.
- The Google G logo SVG can be found at https://developers.google.com/identity/branding-guidelines or use a simple "G" text as a placeholder for Sprint 2.

**Blocks:** Sprint 2 acceptance criteria (auth gate fully functional)

---

## S2-12: Responsive behavior

**Goal:** Implement viewport breakpoints so the three-panel layout degrades gracefully at smaller widths.

**Acceptance Criteria:**

**New AppShell state (retrofit S2-4):**

- `panel1OverlayOpen: boolean` — `false` by default, `true` when hamburger menu is open (< 768px)
- No new localStorage keys for these — they reset on reload (viewport-derived)

**Viewport behavior:**

| Viewport        | Panel 1                                        | Panel 2    | Panel 3                                 | Notes                                                                    |
| --------------- | ---------------------------------------------- | ---------- | --------------------------------------- | ------------------------------------------------------------------------ |
| ≥ 1280px        | 260px visible                                  | flex-1     | 360px visible by default                | Full layout                                                              |
| 1100px – 1279px | 260px visible                                  | flex-1     | Hidden by default; overlay when toggled | `panel3Visible: false` on mount                                          |
| < 1100px        | 260px visible                                  | flex-1     | Always hidden                           | Panel 3 toggle button in TabBar still present but clicking shows overlay |
| < 1024px        | Auto-collapse to 48px rail                     | flex-1     | Always hidden                           | On mount: `setPanel1Collapsed(true)` if viewport < 1024px                |
| < 768px         | Hidden (display none); hamburger opens overlay | Full width | Always hidden                           | Panel 1 overlays content when hamburger is open                          |

**Implementation — viewport detection in AppShell (single useEffect on mount):**

```typescript
useEffect(() => {
  const w = window.innerWidth
  if (w < 1100) setPanel3Visible(false)
  if (w < 1024) setPanel1Collapsed(true)
  // < 768px is handled by CSS class + panel1OverlayOpen state
}, [])
```

**Panel 3 overlay (1100px – 1279px):**

- When `panel3Visible` is `true` at < 1280px, Panel 3 renders as `position: fixed` overlay on the right edge, not as a flex sibling
- Add to AppShell render logic: `const isOverlay = panel3Visible && viewportWidth < 1280`
- Overlay style: `position: fixed, right: 0, top: 0, height: 100vh, z-index: 50`
- Semi-transparent backdrop: `<div className="fixed inset-0 bg-black/20 z-40" onClick={() => setPanel3Visible(false)} />` (renders only when overlay is open)
- Need `viewportWidth` state: `const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280)` + resize listener in `useEffect`

**Hamburger menu (< 768px):**

- TabBar (or ContentPanel header) renders a Lucide `Menu` (20px) button when `viewportWidth < 768`
- `onClick={() => setPanel1OverlayOpen(true)}` — add `onHamburger` prop to ContentPanel/TabBar
- Panel 1 overlay: `position: fixed, left: 0, top: 0, height: 100vh, width: 260px, z-index: 50` — renders when `panel1OverlayOpen && viewportWidth < 768`
- Clicking outside (backdrop) closes it: `setPanel1OverlayOpen(false)`

**Drag resize and ResizeHandle visibility:**

- ResizeHandle hidden when Panel 3 is not a flex sibling: `{panel3Visible && viewportWidth >= 1280 && <ResizeHandle ... />}`

**Verification:**

- At ≥ 1280px viewport: three panels visible, no overflow
- Resize browser to 1100px: Panel 3 disappears; clicking Panel 3 toggle shows it as an overlay
- Resize to < 1024px: Panel 1 auto-collapses to icon rail
- Resize to < 768px: Panel 1 is hidden; hamburger icon appears; clicking hamburger opens Panel 1 as overlay
- No horizontal scrollbar at any tested viewport
- `npm run build` passes

**Notes:**

- The layout shift (initial `false` → viewport-corrected) is acceptable in Sprint 2. On desktop, users may see Panel 3 appear after the first paint. Sprint 3 can address with a CSS-only fallback (`@media` show/hide) if the flash is visually problematic.
- `window.addEventListener('resize', ...)` listener in AppShell should update `viewportWidth` state. Add `() => window.removeEventListener('resize', handler)` cleanup.

**Blocks:** Sprint 2 acceptance criteria (responsive behavior)

---

## Sprint 2 Acceptance Criteria Checklist

The following criteria from `docs/v1-scope.md` must all pass before Sprint 2 is declared complete:

- [ ] All three panels render at ≥ 1280px viewport
- [ ] Panel 1 collapses to 48px rail and expands back
- [ ] Drag resize works: grab the handle, drag, Panel 3 width updates, width persists on reload
- [ ] Tabs open and close. Navigating to a file via the tree opens it in Panel 2 and adds a tab
- [ ] Breadcrumb reflects the correct hierarchy
- [ ] Back and forward buttons work as an in-app history stack (not browser history)
- [ ] Theme cycles light → dark → blue → light
- [ ] Theme persists on page reload. No theme flash on load
- [ ] Below 1024px: Panel 3 is hidden
- [ ] Below 768px: content fills full width, nav is behind a hamburger
- [ ] File tree state (which folders are open) persists on reload
- [ ] Panel 3 mode toggle button is visible; stacked mode shows a static "sign in to unlock" prompt for unauthenticated users

---

## Notes on What Sprint 2 Does NOT Build

- No markdown rendering (Sprint 3). Content area shows a `<div>` placeholder.
- No search modal wiring (Sprint 3). Search trigger and `+` tab button are stubs.
- No graph view (Sprint 5). Panel 3 graph mode shows a placeholder text.
- No compare panel content (Sprint 5). Authenticated users see a compare placeholder.
- No production Google OAuth (founder must configure Supabase + Google Cloud Console from S1-8 instructions).
- No `getPageContent()` — markdown pipeline is Sprint 3.
- No `generate-graph-data.ts` script — graph data is Sprint 5.
