# OpenPropFirm — Technical Plan

**Document Owner**: Tech Lead
**Date**: 2026-03-28
**Status**: Final — supersedes all prior technical assumptions in other documents
**Drives**: Sprint execution across all 6 sprints defined in v1-scope.md

---

## Table of Contents

1. [Critical Challenges to Existing Assumptions](#1-critical-challenges-to-existing-assumptions)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Decisions](#3-technology-decisions)
   - [3.1 Framework and Deployment](#31-framework-and-deployment)
   - [3.2 Markdown Parsing](#32-markdown-parsing)
   - [3.3 Search](#33-search)
   - [3.4 Graph Rendering](#34-graph-rendering)
   - [3.5 URL and Routing Strategy](#35-url-and-routing-strategy)
   - [3.6 Tab System and URL State](#36-tab-system-and-url-state)
   - [3.7 State Management](#37-state-management)
   - [3.8 Authentication — Supabase Auth with Google OAuth](#38-authentication--supabase-auth-with-google-oauth)
   - [3.9 LLM Integration for Monitoring Bot](#39-llm-integration-for-monitoring-bot)
   - [3.10 Panel 3 Stacked Comparison — Component Architecture](#310-panel-3-stacked-comparison--component-architecture)
   - [3.11 CSS Architecture](#311-css-architecture)
   - [3.12 Content Tree Generation](#312-content-tree-generation)
   - [3.13 Monitoring Bot Architecture](#313-monitoring-bot-architecture)
   - [3.14 Deferred to v2 — Chatbot and Payments](#314-deferred-to-v2--chatbot-and-payments)
4. [/data Folder Structure (Canonical)](#4-data-folder-structure-canonical)
5. [Sprint Task Breakdown](#5-sprint-task-breakdown)
6. [Risk Register](#6-risk-register)
7. [Setup Instructions](#7-setup-instructions)

---

## 1. Critical Challenges to Existing Assumptions

Before anything gets built, these issues need to be called out explicitly. Some are blockers if unaddressed.

### 1.1 "Next.js 14+" vs "Next.js 15" — Pick One and Mean It

The project-brief.md says "Next.js + TypeScript." The v1-scope.md says "Next.js 15 + TypeScript." The UI guide targets "Next.js 15." The key technical constraints in this prompt say "Next.js 14+ App Router."

**Decision: Next.js 15 with the App Router.** This matters because Next.js 15 made `cookies()` and `headers()` async, and the `params` prop in page components is now a Promise. The boilerplate generation command and all route/layout code must be written against Next.js 15 semantics. Do not mix in any Page Router patterns.

### 1.2 The Markdown Pipeline as Described Has a Hidden Problem

The UI guide recommends `unified + remark + rehype + rehype-react`. The problem: `rehype-react` renders server-side to a React element tree, which works, but the custom `<WikiLink>` component needs to know at render time whether its target file actually exists — so it can render as a valid link vs. a missing-link (red dotted). That requires the full set of file slugs to be passed into the renderer as context.

This is solvable but it is not trivial. The naive approach of rendering markdown on the server and passing the result to the client will not work for the missing-link detection unless the list of valid slugs is baked into the render call. The architecture section below handles this correctly.

Additionally, `rehype-react` is being deprecated in favor of `rehype-react` v8 patterns or `@mdx-js/mdx` for JSX output. For a pure markdown (non-MDX) site, the correct and stable approach is `unified` → `remark-parse` → `remark-gfm` → custom `remark-wikilinks` plugin → `remark-rehype` → `rehype-stringify` for the HTML string, then a client-side React component that takes the HTML string and maps custom element types. See Section 3.2 for the definitive decision.

### 1.3 The "Build-Time Search Index" Assumption Has an App Router Gap

The project requires a build-time Fuse.js index. The v1-scope.md says "Fuse.js index built from all /data markdown files at app startup (or Next.js build time)." These are two different things with different performance implications.

- "App startup" means the index is built on the server at request time (or in a Route Handler) — this is wrong and wasteful.
- "Build time" means the index JSON is generated during `next build` and served as a static file — this is correct.

The correct implementation: a script in `/scripts/build-search-index.ts` runs via a `prebuild` npm hook, reads all markdown files in `/data`, extracts frontmatter + first 500 chars of content, and writes a `public/search-index.json` file. The client fetches this JSON once on first search open, hydrates a Fuse instance in memory, and caches it in a module-level variable. See Section 3.3.

### 1.4 The Monitoring Bot Has a Structural Flaw

The project-brief.md says the bot "merges PR triggers Vercel redeploy, which updates `last_verified` timestamps." This is incorrect on two counts:

1. Vercel redeploy on main merge is automatic and does NOT update `last_verified`. The `last_verified` field must be written into the markdown frontmatter by the bot itself in the PR it opens. If the bot just opens a PR with content changes but doesn't update `last_verified`, the timestamp stays stale.

2. There is no mechanism described for who writes the `last_verified` timestamp if no change is detected. The timestamp is supposed to prove the data was verified on a given date — even a "no change" run should update it. The bot must write `last_verified: <today>` in every file it checks, whether or not the content changed. This means every daily bot run produces a commit/PR that touches the timestamp, which is actually the correct behavior.

**Decision**: The bot writes `last_verified` on every successful check, regardless of content diff. If content changed, the PR diff includes both content + timestamp. If no content change, the PR is timestamp-only (and the founder can merge it with one click as a "confirmed current" signal). See Section 5, Sprint 5 tasks.

### 1.5 The `[data-theme]` + Tailwind CSS Approach Requires Explicit Configuration

The UI guide correctly specifies the `[data-theme]` on `<html>` approach. However, Tailwind CSS v4 (which uses CSS-based config, not a `tailwind.config.js`) has a different way of handling custom properties and dark mode. Specifically:

- Tailwind v4 uses `@theme` directives in CSS, not a JS config file.
- The `darkMode: ["class"]` or `darkMode: ["attribute", '[data-theme="dark"]']` config from Tailwind v3 does not exist in v4 in the same form.
- Tailwind v4's dark mode is configured via `@variant dark` in the CSS.

**Decision**: The project will NOT use Tailwind's dark mode utilities (`dark:` prefix) for theming. All theme colors are CSS custom properties on `[data-theme]` selectors, as specified in the UI guide. Tailwind utility classes handle spacing, layout, flex, and sizing. Theme colors exclusively come from CSS variables. This is clean, correct, and avoids the Tailwind dark mode configuration problem entirely. The `[data-theme]` approach confirmed.

### 1.6 The Tab System Will Conflict With Next.js App Router URL State

The UI guide specifies tabs that are persisted to `localStorage` as an array of file IDs. The problem: Next.js App Router manages navigation state through the URL. If a user navigates via a wikilink, the URL changes (correctly), but the tab bar must also update. If a user clicks a tab, the URL must update. There is a bidirectional sync requirement between localStorage tab state and the URL.

This is not impossible, but the naive localStorage-only approach will cause the tab bar and the URL to desync after any browser navigation, refresh, or direct URL visit. The architecture must treat the URL as the source of truth for the currently active file, and the tab array in localStorage as secondary state that gets reconciled against the URL on mount.

**Decision**: The currently active file is always read from the URL (`/firms/cfd/funded-next/challenges/50k`). The tab array in localStorage is the list of "pinned open" files. On navigation, the new file is added to the tab array. On tab close, it's removed. On mount, the URL's current file is ensured to be in the tab array. See Section 3.4.

### 1.7 The `react-force-graph-2d` Library Has a Next.js SSR Problem

`react-force-graph-2d` uses canvas and browser APIs. It cannot render on the server. Any attempt to import it in a server component or without dynamic import will crash the build with a "window is not defined" error.

**Decision**: The `<GraphView>` component must be loaded exclusively with `next/dynamic` and `{ ssr: false }`. This is non-negotiable and must be enforced at the component boundary, not at the route level. See Section 3.5.

### 1.8 Content Model Missing the `status` Field (PM Already Flagged, Confirm Here)

The PM's OQ-8 correctly identified that the frontmatter schema needs a `status` field for defunct firms. The PM recommended adding it. The tech lead confirms and makes it canonical in the `/data` folder structure (Section 4). All content templates must include `status: active` from day one.

### 1.9 Fuse.js Scoring Will Produce Irrelevant Results Without Tuning

The PM says "Fuse.js is sufficient at launch scale" and the UI guide says the same. Both are correct about scale, but a default Fuse.js configuration on raw markdown content will produce poor results. Markdown has frontmatter, heading markers, wikilink brackets, and table pipe characters in the raw text. Searching that raw text produces noisy matches.

**Decision**: The search index builder script must strip markdown syntax from the content excerpt before writing it to the index. The index entries are structured objects with separate fields for `title`, `firm`, `type`, `slug`, and `excerpt` (cleaned plain text). Fuse is configured with `keys` weighted as: `title: 0.4`, `excerpt: 0.3`, `firm: 0.2`, `type: 0.1`. This produces relevant results at v1 scale.

### 1.10 No Mention of How the Left Nav Tree Gets Its Data

The v1-scope.md describes the file tree rendering but never specifies how the tree data is generated. The options are:

- Runtime filesystem read (server component reads `/data` at request time)
- Build-time static generation (a script generates a tree JSON that is imported)
- Both (server component at build, statically cached)

**Decision**: The file tree data is generated at build time via a server-side utility function `lib/content/getContentTree.ts` that uses `fs` to walk the `/data` directory, reads each file's frontmatter, and returns a typed `TreeNode[]` structure. This function is called in the root layout as a React Server Component — Next.js builds this once and caches it. Since all content is in the repo (no external CMS), ISR is not needed; a standard static build is sufficient. The tree data flows from the root layout server component down to the client-side `<NavPanel>` via a serialized prop.

---

## 2. Architecture Overview

### 2.1 High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                                │
│                                                                          │
│  /src                           /data                                    │
│  Next.js 15 App                 Markdown content (AGPL-3.0)  (CC-BY-NC) │
│                                                                          │
│  /scripts                       .github/workflows/                       │
│  build-search-index.ts          bot.yml (daily scrape + PR)              │
│  generate-graph-data.ts         health-check.yml                        │
└──────────────┬───────────────────────────────────────────────────────────┘
               │ push to main
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         Vercel (Production)                              │
│                                                                          │
│  next build                                                              │
│    → prebuild: build-search-index.ts → public/search-index.json         │
│    → prebuild: generate-graph-data.ts → public/graph-data.json          │
│    → Next.js static build (all content pages pre-rendered as RSC)       │
│    → Output: static HTML + JS bundles                                   │
│                                                                          │
│  Serving:                                                                │
│    /                   → redirect to /firms/cfd/funded-next             │
│    /firms/[...slug]    → dynamic RSC route, reads /data at build time   │
│    /search-index.json  → static JSON served from /public                │
│    /graph-data.json    → static JSON served from /public                │
│    /sitemap.xml        → generated by next-sitemap at build time        │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         Client Browser                                   │
│                                                                          │
│  AppShell (Client Component — manages all panel state)                  │
│  ├── NavPanel (Client — tree expand/collapse, localStorage)             │
│  │     └── FileTree (Client — recursive, gets treeData from server prop)│
│  ├── ContentPanel (Client — tab state, history stack)                   │
│  │     ├── TabBar (Client)                                              │
│  │     ├── BreadcrumbBar (Client)                                       │
│  │     └── MarkdownRenderer (Client — receives pre-rendered HTML)       │
│  │           ├── WikiLink (Client — checks validSlugs set)              │
│  │           ├── VerifiedBadge (Client)                                 │
│  │           └── SourceFootnotes (Client)                               │
│  └── GraphPanel (Client)                                                │
│        └── GraphView (Client, dynamic import, ssr:false)                │
│              ├── GraphTooltip                                            │
│              ├── GraphControls                                           │
│              └── GraphLegend                                             │
│                                                                          │
│  SearchModal (Client — portal, Cmd+K, fetches search-index.json once)  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow for a Page Load

```
1. User visits /firms/cfd/funded-next/challenges/50k

2. Next.js App Router:
   - Root layout (RSC): calls getContentTree() → passes treeData + validSlugs to AppShell
   - Page (RSC): calls getPageContent("firms/cfd/funded-next/challenges/50k")
     → reads /data/firms/cfd/funded-next/challenges/50k.md
     → parses frontmatter with gray-matter
     → processes markdown through unified pipeline → HTML string
     → returns { frontmatter, htmlContent, slug }

3. AppShell (Client Component) receives:
   - treeData: TreeNode[] (for FileTree)
   - validSlugs: Set<string> (for WikiLink resolution)
   - initialContent: { frontmatter, htmlContent, slug } (for first render)

4. Client hydrates:
   - FileTree renders from treeData
   - ContentPanel renders htmlContent via dangerouslySetInnerHTML with
     event delegation for WikiLink clicks
   - GraphView lazy-loads graph-data.json, renders canvas

5. User clicks a WikiLink:
   - Client-side navigation: router.push("/firms/...")
   - Next.js fetches the new page (RSC call for new slug)
   - AppShell updates tab state in localStorage
   - ContentPanel re-renders with new content

6. User presses Cmd+K:
   - SearchModal opens
   - First open: fetch /search-index.json → hydrate Fuse instance → cache in module var
   - User types → Fuse.search() → results rendered with highlight
```

### 2.3 Content Processing Pipeline (Build-Time)

```
/data/firms/cfd/funded-next/challenges/50k.md
              │
              ▼
        gray-matter         → { data: Frontmatter, content: string }
              │
              ▼
        unified pipeline:
          remarkParse
          remarkGfm          → handles tables, strikethrough
          remarkWikilinks    → [[target]] → custom AST node { type: "wikilink", target, display }
          remarkRehype       → converts to hast
          rehypeStringify    → HTML string with data-wikilink="target" attributes
              │
              ▼
        HTML string          → stored in page props
              │
              ▼ (client)
        MarkdownRenderer     → parses HTML, intercepts data-wikilink elements,
                               renders <WikiLink> components with validSlugs check
```

**Why HTML string + client parsing instead of rehype-react on the server:**
- `rehype-react` would require passing React component references into the server render, which breaks the RSC boundary.
- An HTML string is fully serializable across the RSC/client boundary.
- The client `MarkdownRenderer` uses a lightweight DOM walk (not a full HTML parser — it uses React's `dangerouslySetInnerHTML` for static content and event delegation for WikiLink interactivity).
- This is the pattern used by production documentation sites (Nextra, Mintlify) for the same reason.

---

## 3. Technology Decisions

### 3.1 Framework and Deployment

**Decision: Next.js 15.x, App Router, TypeScript strict mode, deployed on Vercel.**

Rationale: Non-negotiable per project constraints. All pages are statically generated at build time (no `revalidate`, no ISR) because the only content source is the git repo. When content changes (via merged PR), Vercel auto-rebuilds on the push to main. This is standard Vercel + GitHub integration — no configuration needed beyond connecting the repo.

Vercel auto-deploy on main merge: confirmed working out of the box when the GitHub repo is connected in the Vercel dashboard. Preview deployments on PRs: also automatic with no extra configuration. The GitHub bot's PRs will get preview URLs automatically, which the founder can use to verify content before merging.

### 3.2 Markdown Parsing

**Decision: `unified` ecosystem — `remark-parse` + `remark-gfm` + custom `remark-wikilinks` + `remark-rehype` + `rehype-stringify`.**

Rejected alternatives:
- `next-mdx-remote`: Built for MDX (JSX in markdown). This project uses pure markdown. MDX adds complexity (JSX compilation, security considerations) for zero benefit.
- `marked`: Fast but no plugin ecosystem. No wikilink support without patching the tokenizer. Table styling is harder. Reject.
- `@tailwindcss/typography` prose plugin: The UI guide explicitly rejects it in favor of a custom `.prose` class. Confirmed. The Tailwind prose plugin resets too aggressively and the Obsidian aesthetic requires full control.

The `remark-wikilinks` plugin does not exist as a stable community package with the exact behavior needed. The closest is `remark-wiki-link` (npm), but it needs configuration. **Decision: install `remark-wiki-link` and configure it with the correct resolver.** Configuration requires a `pageResolver` function (maps link target to URL path) and `hrefTemplate` (builds the actual href). This is a configuration task, not a custom plugin build.

```typescript
// lib/markdown.ts — definitive pipeline
import remarkWikiLink from "remark-wiki-link";

.use(remarkWikiLink, {
  pageResolver: (name: string) => [slugifyWikiTarget(name)],
  hrefTemplate: (permalink: string) => `/firms/${permalink}`,
  wikiLinkClassName: "wikilink",
  newClassName: "wikilink-missing",  // applied when target not in validPermalinks
  permalinks: validSlugs,            // array of all known slugs, passed at build time
})
```

The `validSlugs` array is generated by `lib/content/getContentTree.ts` and passed into the markdown processor at build time. This resolves the missing-link detection problem raised in Section 1.2.

### 3.3 Search

**Decision: Fuse.js v1, with a build-time index script. Pagefind explicitly rejected for v1.**

Rationale for rejecting Pagefind for v1:
- Pagefind requires the built output to be present before indexing, meaning it must run in a `postbuild` hook against the `.next` output directory.
- Pagefind generates its own static assets and requires a specific serving setup. On Vercel, the Pagefind index files need to land in the `public` directory, which means a custom build script that copies from the `.next` output. This is fiddly and breaks often when Next.js output format changes.
- For 20-30 files, Fuse.js is 20 lines of code and works perfectly. Pagefind's complexity is not justified until content exceeds 500+ documents.
- Migration path to Pagefind in v2 is straightforward: swap the `build-search-index.ts` script and the `useSearch` hook. No component changes needed.

Fuse.js configuration:
```typescript
// public/search-index.json schema (generated at prebuild)
type SearchEntry = {
  slug: string;           // "firms/cfd/funded-next/challenges/50k"
  title: string;          // from frontmatter
  firm: string;           // from frontmatter
  type: string;           // from frontmatter (challenge | rules | etc)
  category: string;       // "CFD" | "Futures"
  excerpt: string;        // first 400 chars of cleaned markdown text (no syntax)
};

// Fuse.js options
const fuseOptions = {
  keys: [
    { name: "title", weight: 0.45 },
    { name: "excerpt", weight: 0.30 },
    { name: "firm", weight: 0.15 },
    { name: "type", weight: 0.10 },
  ],
  threshold: 0.35,        // tighter than default 0.6 — reduces false positives
  includeMatches: true,   // required for keyword highlighting
  minMatchCharLength: 2,
  ignoreLocation: true,   // match anywhere in the field, not just start
};
```

The search index is fetched once via `fetch("/search-index.json")` when the `SearchModal` first opens. The Fuse instance is cached in a module-level variable (`let fuseInstance: Fuse | null = null`). Subsequent modal opens use the cached instance with zero network cost.

### 3.4 Graph Rendering

**Decision: `react-force-graph-2d` confirmed. Loaded with `next/dynamic({ ssr: false })`.**

The UI guide recommendation is correct. `react-force-graph-2d` wraps D3's force simulation with canvas rendering. At 20-30 nodes it runs at 60fps on any device. The canvas-based approach is correct for this use case (SVG would be slower and harder to style per-theme).

Critical implementation requirement: the graph must receive pre-built graph data (nodes + edges) from a static JSON file, not compute it at runtime. The `generate-graph-data.ts` prebuild script walks `/data`, extracts all `[[wikilinks]]` from each file, and builds the graph data structure. This runs in ~100ms at v1 scale.

```typescript
// public/graph-data.json schema
type GraphData = {
  nodes: Array<{
    id: string;           // slug
    label: string;        // frontmatter title
    fileType: string;     // basic-info | challenge | rules | promo | changelog
    firm: string;         // firm slug
    inboundCount: number; // computed from edges
  }>;
  links: Array<{
    source: string;       // slug of source file
    target: string;       // slug of target file
  }>;
};
```

Theme-aware node colors: the `<GraphView>` component reads `document.documentElement.getAttribute("data-theme")` on mount and when the theme changes (via a custom event `themechange` dispatched by `setTheme()`). This allows the canvas to re-draw with correct colors without a full component remount.

### 3.5 URL and Routing Strategy

**Decision: File path in `/data` maps directly to URL path. No slug transformation beyond lowercasing.**

```
/data/firms/cfd/funded-next/challenges/50k.md
→ URL: /firms/cfd/funded-next/challenges/50k
```

Next.js App Router route: `app/firms/[...slug]/page.tsx` — a catch-all dynamic route. The `params.slug` array is joined with `/` to reconstruct the file path.

```typescript
// app/firms/[...slug]/page.tsx
export async function generateStaticParams() {
  const allSlugs = await getAllSlugs(); // walks /data/firms/**/*.md
  return allSlugs.map(slug => ({ slug: slug.split("/") }));
}
```

The root path `/` redirects to the first firm's index page. Implement this as a redirect in `next.config.ts`.

### 3.6 Tab System and URL State

**Decision: URL is source of truth. Tabs are a localStorage-persisted list of recently opened slugs.**

Implementation:
- Active file slug = derived from `usePathname()` (Next.js client hook).
- Tab array = `useState` initialized from `localStorage.getItem("openTabs")`.
- On navigation: `useEffect` watching `pathname` adds the new slug to the tab array if not present.
- On tab click: `router.push("/firms/" + slug)`.
- On tab close: removes slug from array; if it was the active tab, navigate to the adjacent tab (or to empty state if last tab closed).
- On mount: reconcile — ensure current pathname slug is in the tab array.

This means the tab bar always reflects real navigation state. Deep links work correctly (the URL loads the right content; the tab array adds it automatically).

### 3.7 State Management

**Decision: No external state library (no Zustand, no Redux, no Jotai). React state + localStorage + URL only.**

Rationale: The app state is simple enough to manage with React's built-in tools:
- Panel widths and modes: `useState` in `<AppShell>`, synced to localStorage on change.
- Tab array: `useState` in `<AppShell>`, synced to localStorage on change.
- Nav tree expand state: `useState` in `<FileTree>`, synced to localStorage on change.
- Active file: derived from URL (no state needed).
- Search modal open: `useState` local to a context or in `<AppShell>`.
- Theme: CSS custom property on `<html>` + localStorage (no React state needed — CSS handles re-rendering).
- Auth session: Supabase client handles session storage internally (see Section 3.11). `user` state lives in `<AppShell>` via a `useEffect` that calls `supabase.auth.getSession()` on mount and subscribes to `onAuthStateChange`.

If the complexity grows in v2 (chatbot, payments), introduce Zustand at that point. For v1, each piece of state is local to its component or lifted to `<AppShell>`.

### 3.8 Authentication — Supabase Auth with Google OAuth

**Decision: Supabase Auth, Google OAuth only (no magic link for v1).**

**Why Google OAuth over magic link:**
Magic link requires the user to leave the app, open their email client, click a link, and return. For a comparison-focused tool where users may want to toggle the split panel mid-session, that interruption is friction at exactly the wrong moment. Google OAuth is one click, completes in the same browser session, and has near-universal availability among the target audience (prop trading researchers are not email-averse, but the one-click path is materially better UX). The implementation complexity is identical — Supabase handles both with a single function call.

Google OAuth setup: create OAuth credentials in Google Cloud Console, add the callback URL `https://<project>.supabase.co/auth/v1/callback`, configure in Supabase dashboard under Authentication > Providers. No server-side session handling needed — Supabase's client SDK manages the OAuth redirect and token exchange automatically.

**Session storage decision: Supabase client-side session + Next.js middleware for redirect protection.**

Supabase Auth stores the session in `localStorage` (its default for browser clients). The session is available immediately on the client via `supabase.auth.getSession()`. There is no server-only content being protected in v1 — the stacked comparison panel is a UI feature, not a data gate. Therefore:

- No `createServerClient` from `@supabase/ssr` is required for the gate itself.
- The Supabase client (`@/libs/supabase/client`) is used in `<AppShell>` to get the current user on mount.
- `onAuthStateChange` subscription in `<AppShell>` keeps the `user` state reactive across sign-in/sign-out.
- Middleware is NOT required for the panel gate — the gate is a client-side conditional render, not a protected route.

If a protected API route or server component is introduced in v2, add `@supabase/ssr` and `createServerClient` at that point.

**The auth gate behavior:**
- Panel 3 defaults to graph view for all users (authenticated and unauthenticated).
- The "split/stacked" toggle button in Panel 3's header is visible to all users but gated:
  - Unauthenticated: clicking the toggle renders a sign-in prompt inside Panel 3 ("Sign in with Google to compare two pages side by side"). The graph remains visible in Panel 3 until the user dismisses the prompt.
  - Authenticated: clicking the toggle switches Panel 3 to `"compare"` mode, showing a second content panel (Panel 3 renders a full `<ContentPanel>` instance with its own tab bar and URL state from the `?right=` query param).

**URL state for stacked comparison:**
Both panels use URL query params as their source of truth when in compare mode:
```
/firms/cfd/funded-next/rules?right=firms/futures/apex-funding/rules
```
- `left` panel slug: derived from the main URL path (existing behavior).
- `right` panel slug: `?right=` query param, read via `useSearchParams()` in `<AppShell>`.
- Each panel has its own `<TabBar>` instance managing its own open-tab array in `localStorage` under separate keys: `openTabs_left` and `openTabs_right`.
- Navigating within Panel 3 (compare mode) updates only the `?right=` param via `router.replace`, leaving the path unchanged.
- Drag resize between Panel 2 and Panel 3 uses the existing `<ResizeHandle>` component (already specced in Sprint 2.2) — no new resize logic is needed.
- When the user exits compare mode (toggles back to graph), the `?right=` param is removed from the URL.

**Why this is a client-side gate and not a server-side one:**
The content in both panels is publicly available markdown rendered via static pages. There is no secret data to protect. The gate exists to incentivize account creation (analytics, community, future features), not to restrict access to information. A server-side gate would add complexity (middleware, server session cookies) with no security benefit for this use case.

**Supabase package:**
Install `@supabase/supabase-js` only (not `@supabase/ssr` for v1). Create `src/libs/supabase/client.ts` that exports a singleton Supabase client initialized with the public anon key.

```typescript
// src/libs/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

The `!` non-null assertion is intentional — these vars must be present at build time. Validate their presence in `validate-content.ts` or a separate `validate-env.ts` script that runs in `prebuild`.

### 3.9 LLM Integration for Monitoring Bot

**Decision: Anthropic Claude claude-haiku-4-5 via the Anthropic Python SDK.**

**Model choice and cost justification:**
The monitoring bot's LLM task is narrow and well-defined: given a before/after HTML diff of a prop firm's challenge page, classify whether the diff represents a meaningful content change (price change, rule change, payout change) or a cosmetic/structural change (nav update, CSS class rename, marketing copy tweak). This is a structured classification task with a small context window — the diff will rarely exceed 2,000 tokens.

Claude claude-haiku-4-5 pricing (as of Q1 2026): $0.25 per million input tokens, $1.25 per million output tokens. At 2,000 input tokens and ~200 output tokens per firm per day, with 4 firms:
- Daily cost: (4 × 2,000 × $0.25/1M) + (4 × 200 × $1.25/1M) = $0.002 + $0.001 = **~$0.003/day = ~$1.10/year**

This is negligible. The cost justification is trivially satisfied. Haiku is chosen over GPT-4o-mini (OpenAI, ~$0.15/$0.60 per M tokens) not on cost grounds but on reliability of structured output: Anthropic's tool-use / structured JSON output is more consistent for classification tasks than GPT-4o-mini's function calling at short context lengths, based on public benchmarks. GPT-4o-mini is a valid alternative if the founder prefers a single vendor (OpenAI) for future chatbot work.

**LLM integration in the bot:**
```python
# scripts/monitor.py (LLM classification step)
import anthropic

def classify_diff(firm: str, before_text: str, after_text: str) -> dict:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    prompt = f"""You are reviewing a change to a prop trading firm's website.
Firm: {firm}
BEFORE:
{before_text[:1500]}

AFTER:
{after_text[:1500]}

Classify this change. Respond with JSON only:
{{
  "meaningful": true | false,
  "change_type": "price_change" | "rule_change" | "promo_change" | "structural" | "no_change",
  "summary": "one sentence describing what changed",
  "confidence": "high" | "medium" | "low"
}}"""

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(message.content[0].text)
```

The bot calls `classify_diff` only when `difflib.SequenceMatcher` detects a non-trivial diff (ratio < 0.99). Trivial diffs (whitespace, timestamp-only changes) skip the LLM call entirely to minimize token usage.

**Usage logging decision: Supabase table (not a log file).**
A flat log file in the repo would grow unboundedly and pollute the git history with bot metadata. A Supabase table provides queryable structured data that the admin page (Section 3.10) can read directly. The table is created in the Supabase dashboard with a migration SQL file committed to `supabase/migrations/`.

```sql
-- supabase/migrations/001_create_bot_usage_log.sql
create table bot_usage_log (
  id          bigserial primary key,
  run_at      timestamptz not null default now(),
  firm        text not null,
  tokens_in   integer not null default 0,
  tokens_out  integer not null default 0,
  cost_usd    numeric(10, 6) not null default 0,
  meaningful  boolean,
  change_type text,
  pr_created  boolean not null default false,
  error       text
);
```

The bot writes a row per firm per run using the Supabase REST API (via Python's `requests` — no Supabase Python client needed for a simple INSERT):
```python
requests.post(
    f"{SUPABASE_URL}/rest/v1/bot_usage_log",
    headers={"apikey": SUPABASE_SERVICE_KEY, "Content-Type": "application/json"},
    json={"firm": firm_slug, "tokens_in": ..., ...}
)
```

`SUPABASE_SERVICE_KEY` (the service role key, not the anon key) is stored as a GitHub Actions secret — this key has write access to the table and must never be exposed in client-side code.

**Admin page spec:**
Create `app/admin/page.tsx`. This page is NOT protected by auth in v1 (it is obscure-by-URL only — the founder is the only person who knows it exists). Protection can be added in v2 if needed. The page:
- Is a React Server Component that calls `getServerSideAdminData()` which reads from the `bot_usage_log` Supabase table using the service key via a server-only fetch.
- Renders a table: `Date | Firm | Tokens In | Tokens Out | Est. Cost | Change Detected | PR Created | Error`.
- Shows a summary row: total cost this month, total runs this month.
- No pagination needed at v1 scale (runs once/day × 4 firms = 120 rows/month max).
- Styled with the existing `.prose` table styles — no custom admin UI needed.

```typescript
// src/app/admin/page.tsx (RSC)
// Reads SUPABASE_SERVICE_KEY from process.env (server-only — never sent to client)
// Returns: sorted table of bot_usage_log rows, newest first
```

### 3.10 Panel 3 Stacked Comparison — Component Architecture

**This section specifies the component architecture for the stacked comparison feature. Auth gate behavior, URL state design, and the Google OAuth decision are in Section 3.8. This section covers the React component structure, content fetching, and mode switching.**

Panel 3 operates in two modes managed by `panel3Mode: "graph" | "compare"` in `<AppShell>`:

**Graph mode (default, all users):**
Panel 3 renders `<GraphPanel>` → `<GraphView>` as currently specced in Section 2.1 and Sprint 2.9.

**Compare mode (authenticated users only):**
Panel 3 renders a second full `<ContentPanel>` instance — call it `<ContentPanelRight>`. This component is architecturally identical to the primary `<ContentPanel>` (Panel 2) but:
- Reads its active slug from `useSearchParams().get("right")` instead of `usePathname()`.
- Navigates by calling `router.replace(currentPath + "?right=" + newSlug)` instead of `router.push(newPath)`.
- Its tab array is stored in `localStorage("openTabs_right")` instead of `localStorage("openTabs_left")`.
- Its `<TabBar>` gets its `onTabClick` handler wired to the `?right=` param update.

The existing `<ResizeHandle>` between Panel 2 and Panel 3 (from Sprint 2.2) is reused unchanged. The resize handle is always visible when Panel 3 is open, regardless of mode.

**Content fetching in compare mode:**
When `?right=firms/cfd/funded-next/rules` is present in the URL, the `<ContentPanelRight>` component needs to fetch and render the markdown content for that slug. Since this is a client component (Panel 3), it cannot call `getPageContent` directly (that is a server-only `fs` utility). The solution:

Create a Route Handler `app/api/content/[...slug]/route.ts` that accepts a slug, calls `getPageContent`, and returns `{ frontmatter, htmlContent }` as JSON. `<ContentPanelRight>` fetches this endpoint when its slug changes. This is a simple JSON API — no auth required since the content is public.

```typescript
// app/api/content/[...slug]/route.ts
export async function GET(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const content = await getPageContent(slug.join("/"));
  return Response.json(content);
}
```

This route is cached by Next.js (static content) and adds negligible overhead.

**Auth gate UI flow in Panel 3:**
When `panel3Mode === "compare"` is triggered by an unauthenticated user:
1. `<AppShell>` checks `user` state (from Supabase session).
2. If `user` is null, Panel 3 renders `<CompareAuthGate>` — a centered prompt: "Sign in to compare two pages" with a Google sign-in button.
3. On successful Google OAuth, `onAuthStateChange` fires, `user` is set, and Panel 3 re-renders into compare mode automatically.
4. The `<GraphView>` is NOT shown behind the auth gate — Panel 3 switches fully to the gate UI when the toggle is clicked by an unauthenticated user. If the user dismisses the gate (X button), Panel 3 returns to graph mode.

### 3.11 CSS Architecture

**Decision: Tailwind CSS v4 for layout/spacing utilities. CSS custom properties for all theme colors. Custom `.prose` class in a global CSS file for markdown typography. No Tailwind Typography plugin.**

Tailwind v4 setup:
- Configuration is in `app/globals.css` using `@import "tailwindcss"` and `@theme { }` blocks.
- Custom utilities (like `prose` element styles) go in `@layer utilities` or `@layer components` blocks.
- The theme CSS variables (`--background`, `--accent`, etc.) are defined in `styles/themes.css` and imported into `globals.css`.
- shadcn/ui uses CSS variables for its own theming. The shadcn variables must be mapped to the project's theme variables — specifically, shadcn expects `--background`, `--foreground`, `--border`, `--accent`, etc., which already match the UI guide's variable names. This is a clean fit.

The inline `<script>` for theme initialization (to prevent flash) goes in the root `layout.tsx` via a `dangerouslySetInnerHTML` script tag in the `<head>`. This is the correct pattern for Next.js App Router — the `suppressHydrationWarning` attribute is required on `<html>` to prevent React's hydration warning about the `data-theme` attribute being set before React hydrates.

```typescript
// app/layout.tsx (relevant excerpt)
<html suppressHydrationWarning>
  <head>
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var t=localStorage.getItem("theme")||"dark";document.documentElement.setAttribute("data-theme",t);})()`
      }}
    />
  </head>
```

### 3.12 Content Tree Generation

**Decision: `lib/content/getContentTree.ts` — a server-side utility using Node `fs` module, called from the root RSC layout.**

This function:
1. Walks `/data/firms/**` using `fs.readdirSync` recursively.
2. For each `.md` file, reads only the frontmatter with `gray-matter` (not the full content — performance optimization).
3. Builds a `TreeNode[]` hierarchy matching the folder structure.
4. Returns both `treeData: TreeNode[]` and `validSlugs: string[]` (array of all known file slugs).

The root layout (`app/layout.tsx`) is a React Server Component. It calls `getContentTree()` and passes `treeData` and `validSlugs` as props to `<AppShell>`. Since `<AppShell>` is a Client Component, these are serialized props (must be plain objects — no functions, no class instances).

`validSlugs` is passed into each page's markdown processor at build time via `generateStaticParams` and `getPageContent`. It is also passed to `<AppShell>` so the client-side `<WikiLink>` component can check validity for dynamically navigated content.

### 3.13 Monitoring Bot Architecture

**Decision: GitHub Actions workflow using Python (not Node.js) with `requests` + `beautifulsoup4` for scraping, `PyYAML` for frontmatter parsing, and the GitHub API via `gh` CLI or `PyGithub` for PR creation.**

Rationale for Python over Node.js for the bot:
- `beautifulsoup4` is the industry standard for HTML parsing and is more battle-tested than Node.js alternatives for structured HTML diffing.
- Python's `difflib` provides deterministic text comparison.
- GitHub Actions has Python pre-installed on all runner images — no dependency installation step needed beyond `pip install requests beautifulsoup4 PyYAML`.

Bot workflow design:
```yaml
# .github/workflows/bot.yml
name: Content Monitor
on:
  schedule:
    - cron: "0 6 * * *"   # daily at 06:00 UTC
  workflow_dispatch:        # manual trigger for testing

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run monitor
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: python scripts/monitor.py
```

The bot's `last_verified` update behavior (as corrected in Section 1.4): on every successful scrape (regardless of content change), write the current UTC timestamp to the file's `last_verified` frontmatter field. The PR will always include at minimum the timestamp update. The founder reviews and merges — even a timestamp-only PR is a meaningful "verified current" signal.

Bot health check: the bot posts a comment to a dedicated GitHub issue (issue number stored as a workflow env var, e.g., `HEALTH_CHECK_ISSUE=1`) on every run. Comment format: `[UTC timestamp] Monitor run complete. Files checked: N. Changes detected: M. PRs opened: K.` If the bot fails for any reason, the health check issue goes silent — the founder should check if no comment appears within 24 hours.

### 3.14 Deferred to v2 — Chatbot and Payments

**Chatbot: v2.** An LLM-powered chatbot that answers user questions about prop firm rules and challenges is a planned v2 feature. It is explicitly out of scope for v1. No chatbot infrastructure (vector embeddings, RAG pipeline, OpenAI Assistants API, streaming API routes, chat UI components) should be built or scaffolded in v1. The content markdown files are already well-structured for future RAG ingestion — no additional tagging or formatting is needed to prepare for v2 chatbot work.

**Stripe / payments: v2.** No payment processing, subscription management, or premium tier gating is in scope for v1. The auth layer (Section 3.8) uses free Supabase Auth with no payment requirement — signup is free and the only gate is the UI comparison feature. When payments are introduced in v2, Stripe Checkout with a Supabase-stored `subscription_status` field is the anticipated pattern, but no Stripe SDK, webhook handler, or pricing page should be built in v1. Do not install `stripe` or `@stripe/stripe-js` in v1 — it adds bundle weight for no benefit.

---

## 4. /data Folder Structure (Canonical)

This is the single source of truth. Any deviation from this structure will break the nav tree generator, the search index builder, and the graph data generator.

```
/data/
├── LICENSE                          # CC-BY-NC-SA-4.0 (full license text)
├── README.md                        # How to use this data in Obsidian
├── _templates/                      # Obsidian template files (not rendered on site)
│   ├── firm-index.md
│   ├── challenge.md
│   ├── rules.md
│   ├── promos.md
│   └── changelog.md
├── firms/
│   ├── cfd/
│   │   ├── funded-next/
│   │   │   ├── index.md
│   │   │   ├── rules.md
│   │   │   ├── promos.md
│   │   │   ├── changelog.md
│   │   │   └── challenges/
│   │   │       ├── 10k.md
│   │   │       ├── 25k.md
│   │   │       ├── 50k.md
│   │   │       ├── 100k.md
│   │   │       └── 200k.md
│   │   └── funding-pips/
│   │       ├── index.md
│   │       ├── rules.md
│   │       ├── promos.md
│   │       ├── changelog.md
│   │       └── challenges/
│   │           ├── 5k.md
│   │           ├── 10k.md
│   │           ├── 25k.md
│   │           ├── 50k.md
│   │           └── 100k.md
│   └── futures/
│       ├── apex-funding/
│       │   ├── index.md
│       │   ├── rules.md
│       │   ├── promos.md
│       │   ├── changelog.md
│       │   └── challenges/
│       │       ├── 25k.md
│       │       ├── 50k.md
│       │       ├── 100k.md
│       │       └── 300k.md
│       └── lucid-funding/
│           ├── index.md
│           ├── rules.md
│           ├── promos.md
│           ├── changelog.md
│           └── challenges/
│               ├── 10k.md
│               ├── 25k.md
│               └── 50k.md
```

### 4.1 Canonical Frontmatter Schema (All Files)

Every single `.md` file in `/data/firms/**` must have this frontmatter. No exceptions. The build will fail gracefully (skip + log warning) if a file is missing required fields, but the content validation script in `prebuild` will treat missing fields as errors.

```yaml
---
title: "Funded Next — $50k Challenge"
firm: funded-next               # kebab-case firm identifier, must match folder name
category: cfd                   # cfd | futures — must match parent folder name
type: challenge                 # basic-info | challenge | rules | promo | changelog
status: active                  # active | inactive | shutdown — REQUIRED, default active
last_verified: 2026-03-28T10:00:00Z   # ISO 8601 UTC, written by bot or manually
verified_by: manual             # bot | manual
sources:
  - url: "https://fundednext.com/challenges"
    label: "Official Challenge Page"
tags:
  - cfd
  - challenge
  - 50k
  - funded-next
---
```

**Additional fields for specific types:**

For `type: challenge`:
```yaml
challenge_size: 50000           # numeric, in USD/account currency
price_usd: 299                  # current price in USD
affiliate_available: true       # bool — does an affiliate program exist for this firm?
```

For `type: promo`:
```yaml
affiliate_available: true
```

For `type: basic-info` (index.md):
```yaml
website: "https://fundednext.com"
founded: 2022
headquarters: "Dubai, UAE"
```

### 4.2 Example Files

**`/data/firms/cfd/funded-next/index.md`**
```markdown
---
title: "Funded Next — Overview"
firm: funded-next
category: cfd
type: basic-info
status: active
last_verified: 2026-03-28T10:00:00Z
verified_by: manual
website: "https://fundednext.com"
founded: 2022
headquarters: "Dubai, UAE"
sources:
  - url: "https://fundednext.com/about"
    label: "About Funded Next"
tags:
  - cfd
  - funded-next
  - basic-info
---

# Funded Next

Funded Next is a CFD prop trading firm founded in 2022, headquartered in Dubai, UAE.

## Available Challenges

- [[funded-next/challenges/10k|$10k Challenge]]
- [[funded-next/challenges/25k|$25k Challenge]]
- [[funded-next/challenges/50k|$50k Challenge]]
- [[funded-next/challenges/100k|$100k Challenge]]
- [[funded-next/challenges/200k|$200k Challenge]]

## Rules Summary

See [[funded-next/rules|Trading Rules]] for the full ruleset.

## Active Promotions

See [[funded-next/promos|Promo Codes]] for current discounts.

> **Disclaimer**: All information sourced from official public pages. Verify before purchasing.
```

**`/data/firms/cfd/funded-next/challenges/50k.md`**
```markdown
---
title: "Funded Next — $50k Challenge"
firm: funded-next
category: cfd
type: challenge
status: active
challenge_size: 50000
price_usd: 299
last_verified: 2026-03-28T10:00:00Z
verified_by: manual
sources:
  - url: "https://fundednext.com/challenges"
    label: "Official Challenge Page"
tags:
  - cfd
  - challenge
  - 50k
  - funded-next
---

# Funded Next — $50k Challenge

**Current price: $299** · [[funded-next/promos|Check for promo codes]]

## Challenge Parameters

| Parameter | Phase 1 | Phase 2 | Funded |
|---|---|---|---|
| Account Size | $50,000 | $50,000 | $50,000 |
| Profit Target | 10% | 5% | — |
| Max Daily Drawdown | 5% | 5% | 5% |
| Max Total Drawdown | 10% | 10% | 10% |
| Min Trading Days | 5 | 5 | — |
| Time Limit | 30 days | 60 days | — |

## Payout Rules

- Payout split: 80% trader / 20% firm (scales to 95/5 with scaling plan)
- Payout frequency: on-demand after first payout period
- Scaling: account doubles after consistent profitability

## Key Rules

See [[funded-next/rules]] for the complete ruleset that applies to all accounts.

## Notes

- Trailing drawdown applies during Phase 1 only — resets at Phase 2 start.[^1]

[^1]: Confirmed from official challenge FAQ as of last_verified date.
```

**`/data/firms/cfd/funded-next/promos.md`**
```markdown
---
title: "Funded Next — Promo Codes"
firm: funded-next
category: cfd
type: promo
status: active
affiliate_available: true
last_verified: 2026-03-28T10:00:00Z
verified_by: manual
sources:
  - url: "https://fundednext.com/challenges"
    label: "Official Challenges Page"
tags:
  - cfd
  - promo
  - funded-next
---

# Funded Next — Promo Codes

> Using these codes supports OpenPropFirm at no extra cost to you.

## Active Codes

| Code | Discount | Applies To | Expiry | Source |
|---|---|---|---|---|
| `OPENPROP10` | 10% off | All challenges | Unknown | [Official page](https://fundednext.com/challenges) |

## About This Page

Promo codes are verified by our monitoring bot. If a code is not working, it may have expired since the last check. See the `last_verified` date above.

If you find a code that is not listed, please [open a PR](https://github.com/openpropfirm/openpropfirm/blob/main/CONTRIBUTING.md).
```

### 4.3 Wikilink Conventions

Wikilinks in `/data` files must use relative paths from the `/data/firms/` root, without the `.md` extension. This matches how `remark-wiki-link` resolves permalinks.

```
[[funded-next/rules]]                    → /firms/cfd/funded-next/rules
[[funded-next/challenges/50k]]           → /firms/cfd/funded-next/challenges/50k
[[funded-next/challenges/50k|$50k]]      → same target, display text "$50k"
[[apex-funding/rules]]                   → /firms/futures/apex-funding/rules
```

The `pageResolver` in `remark-wiki-link` receives the raw target string (`funded-next/rules`) and must map it to the full URL path (`/firms/cfd/funded-next/rules`). This requires a lookup map built from the content tree at build time: `{ "funded-next/rules": "firms/cfd/funded-next/rules", ... }`.

**This lookup map is the critical data structure.** It is generated by `getContentTree.ts` and must be available to both the markdown processor (build time) and the `<WikiLink>` component (runtime, for missing-link detection on dynamic navigation).

### 4.4 Files That Are NOT Rendered on the Site

The content tree walker must explicitly skip:
- `/data/README.md` — not a firm file
- `/data/LICENSE` — not markdown
- `/data/_templates/**` — template files, not content
- Any file starting with `_` (underscore prefix = excluded from site)
- Any file in a folder starting with `_`

---

## 5. Sprint Task Breakdown

### Sprint 1 — Foundation

Goal: Project skeleton, repo structure, license, infrastructure in place. Nothing user-visible, but everything buildable.

| Task | Approach | Complexity | Acceptance Criteria | Dependencies |
|---|---|---|---|---|
| **1.1 — Repo initialization** | Run `npx create-next-app@15 openpropfirm --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in the project directory. Immediately set TypeScript to strict mode in `tsconfig.json` (`"strict": true`). Install and configure Prettier with `prettier-plugin-tailwindcss`. Create `.env.example` with all anticipated env vars (see below). | S | `npm run build` succeeds. `npm run lint` passes with zero errors. Prettier formats on save. TypeScript strict mode is active (no `any` allowed without explicit override). | None |
| **1.2 — shadcn/ui initialization** | Run `npx shadcn@latest init`. Choose: TypeScript, CSS variables, no default base color (we use custom theme), no Tailwind config (v4 CSS-based). Add the specific components needed for v1: `npx shadcn@latest add button breadcrumb command dialog popover checkbox skeleton separator tooltip scroll-area badge`. Verify all components appear in `components/ui/`. | S | All 12 shadcn components install without error. `npm run build` still passes. | 1.1 |
| **1.3 — CSS and theme system** | Create `src/styles/themes.css` with all three `[data-theme]` blocks exactly as specified in UI guide Section 6.2. Create `src/styles/prose.css` with the `.prose` class skeleton (empty rules for now — populated in Sprint 3). Import both files in `app/globals.css` via `@import`. Configure `globals.css` with Tailwind v4 `@import "tailwindcss"` and map shadcn CSS variable names to the project's theme variables in an `@layer base` block. Add the anti-flash inline script to `app/layout.tsx` with `suppressHydrationWarning` on `<html>`. | S | Three themes render correctly when `data-theme` attribute is toggled on `<html>` in DevTools. No flash on page load. shadcn components visually inherit the correct colors. | 1.1, 1.2 |
| **1.4 — /data folder scaffold** | Create the complete `/data` directory structure as defined in Section 4 of this document. Create all firm folders and all content type files. Every file must contain valid YAML frontmatter with all required fields (use `status: active`, `verified_by: manual`, `last_verified: 2026-03-28T10:00:00Z`). Content body can be a single placeholder sentence. Create `/data/_templates/` with all 5 template files. Create `/data/README.md` explaining Obsidian usage. Create `/data/LICENSE` with CC-BY-NC-SA-4.0 text. | S | `ls -la data/firms/cfd/funded-next/` shows: `index.md`, `rules.md`, `promos.md`, `changelog.md`, `challenges/`. Same structure verified for all 4 firms. `gray-matter` parses every file without error (run a quick Node.js script to verify). No file is missing a required frontmatter field. | None |
| **1.5 — LICENSE files** | Add AGPL-3.0 full license text to `LICENSE` in the repo root (applies to `/src`). The `/data/LICENSE` is already created in 1.4. Add a `COMMERCIAL LICENSE` section to `README.md` with a contact email placeholder (`commercial@openpropfirm.com` — founder to set actual email). Add license badges to `README.md` for both licenses. | S | `LICENSE` file exists at repo root with AGPL-3.0 text. `/data/LICENSE` exists with CC-BY-NC-SA-4.0 text. README displays both license badges. | 1.1 |
| **1.6 — Vercel project setup** | Create Vercel project via the dashboard: connect GitHub repo, set framework to Next.js, set root directory to `/` (not `/src`). Configure production branch as `main`. Configure `NEXT_PUBLIC_SITE_URL` env var in Vercel dashboard as the production domain (placeholder for now). Create `.env.example` documenting: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_VERCEL_ANALYTICS_ID` (if using Vercel Analytics), `GITHUB_TOKEN` (bot-only, documented as GitHub Actions secret, not a Vercel env var). | S | Pushing any commit to main triggers a Vercel production build. Pushing to a branch triggers a preview build with a unique URL. The Vercel dashboard shows successful deployments. | 1.1 |
| **1.7 — Analytics setup** | Install `@vercel/analytics` (`npm install @vercel/analytics`). Add `<Analytics />` component to `app/layout.tsx`. Vercel Analytics requires no additional env var in development — it automatically tracks in production. Note: use Vercel Analytics (not Plausible) for v1 because it requires zero configuration beyond the component, is free on the Vercel hobby plan, and provides the exact metrics needed for Gate 1 (unique visitors, page views). Add Vercel Speed Insights too (`@vercel/speed-insights`) for Core Web Vitals tracking. | S | Analytics script appears in the production HTML source. Vercel Analytics dashboard shows incoming data after a page view. Speed Insights tab appears in Vercel dashboard. | 1.6 |
| **1.8 — GitHub Actions skeleton** | Create `.github/workflows/bot.yml` with: `on: schedule (cron: "0 6 * * *")` and `on: workflow_dispatch`. Single job `monitor` with `runs-on: ubuntu-latest`. Steps: `actions/checkout@v4`, then a placeholder `run: echo "Bot placeholder — Sprint 5"`. This establishes the workflow file in the repo so GitHub recognizes it. Create `.github/workflows/preview-check.yml` as an empty status-check placeholder if needed. | S | The `bot.yml` workflow appears in the GitHub Actions tab. Running it manually via `workflow_dispatch` succeeds (the placeholder echo runs). | 1.1 |
| **1.9 — Content validation prebuild script** | Create `scripts/validate-content.ts`. This script uses `glob` to find all `.md` files in `/data/firms/**`, parses each with `gray-matter`, and asserts: title present, firm present, category present, type is one of the valid enum values, status is one of the valid enum values, last_verified is a valid ISO date string, sources array is not empty. Exits with code 1 if any file fails. Add `"prebuild": "ts-node scripts/validate-content.ts"` to `package.json` scripts. | M | Running `npm run build` on a repo with a malformed frontmatter file produces an error message naming the specific file and field that failed. A clean repo builds without error. | 1.4 |

**Environment variables for `.env.example`:**
```bash
# Site configuration
NEXT_PUBLIC_SITE_URL=https://openpropfirm.com

# Analytics (set in Vercel dashboard — not needed locally)
# NEXT_PUBLIC_VERCEL_ANALYTICS_ID is auto-injected by Vercel

# Supabase (set in Vercel dashboard for production; copy from Supabase project settings)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
# SUPABASE_SERVICE_KEY — service role key; set as GitHub Actions secret only
# NEVER set SUPABASE_SERVICE_KEY as a Vercel env var or in .env.local
# It is used exclusively by the monitoring bot in GitHub Actions

# GitHub bot (set as GitHub Actions secrets — never in Vercel)
# GITHUB_TOKEN — auto-provided by GitHub Actions
# HEALTH_CHECK_ISSUE_NUMBER=1  — issue number for bot health log comments
# ANTHROPIC_API_KEY — Anthropic API key for LLM diff classification; GitHub Actions secret only
# SUPABASE_SERVICE_KEY — see above
```

---

### Sprint 2 — Shell and Navigation

Goal: Three-panel shell is functional. Navigation, tabs, themes, and responsive behavior work. Placeholder content only.

| Task | Approach | Complexity | Acceptance Criteria | Dependencies |
|---|---|---|---|---|
| **2.1 — AppShell component** | Create `src/components/layout/AppShell.tsx` as a Client Component (`"use client"`). Manages state for: `panel1Collapsed: boolean`, `panel3Width: number`, `panel3Mode: "graph" \| "compare"`, `openTabs: string[]`, `activeSlug: string`, `user: User \| null`. Initialize panel state from localStorage on mount. Initialize `user` by calling `supabase.auth.getSession()` in `useEffect` and subscribing to `supabase.auth.onAuthStateChange` — update `user` state on every auth event. Renders the three-panel flex container per Section 1.1 of the UI guide. Passes state and setters down to child components. Root layout passes `treeData` and `validSlugs` as props to AppShell. | M | AppShell renders with all three panels visible at 1280px+ viewport. Panel widths match spec. State persists on page reload. `user` is null before sign-in and populated after. | Sprint 1 complete |
| **2.2 — ResizeHandle component** | Create `src/components/layout/ResizeHandle.tsx`. Implement pointer capture drag per UI guide Section 1.2. On drag, call `onResize(newWidth)` prop. Clamp to `[280, 600]`. Persist to `localStorage("panel3Width")`. Visual states (hover, active) per spec. | S | Drag resize changes Panel 3 width. Width clamps at 280px and 600px. Width persists on reload. Hover and active visual states match spec. Cursor is `col-resize` on the element. | 2.1 |
| **2.3 — NavPanel and FileTree** | Create `src/components/nav/NavPanel.tsx`, `NavFileTree.tsx`, `NavFileTreeItem.tsx`. NavPanel receives `treeData: TreeNode[]` and `activeSlug: string`. FileTree renders recursive collapsible folders. Folder expand/collapse state stored in `localStorage("navTreeState")`. The currently active file's parent chain auto-expands on mount. Bottom bar: settings icon (non-functional placeholder — `console.log` on click is sufficient) + `<ThemeToggle>`. Per Section 2 of UI guide exactly. | M | File tree renders all 4 firms in correct CFD/Futures groupings. Clicking a folder toggles its children. Active file is highlighted. Chevron rotates on open/close. Panel collapses to 48px icon rail. Tree expand state persists on reload. Active file's parent folder is open on load. | 2.1, Sprint 1 `/data` scaffold |
| **2.4 — ThemeToggle component** | Create `src/components/ui/ThemeToggle.tsx`. Cycles `light → dark → blue → light`. On toggle: call `setTheme(nextTheme)` from `lib/theme.ts`, which sets `data-theme` on `document.documentElement` and writes to `localStorage("theme")`. Dispatch a `CustomEvent("themechange")` so the graph can re-draw. Icon changes per spec (Sun / Moon / Palette). | S | Clicking theme toggle cycles through all three themes. Colors update immediately with no flash. Theme persists on page reload. `themechange` event is dispatched. | 2.3 |
| **2.5 — TabBar component** | Create `src/components/content/TabBar.tsx`. Receives `openTabs: TabEntry[]`, `activeSlug: string`, `onTabClick`, `onTabClose`, `onNewTab` props. Tab entry: `{ slug, title }`. Each tab: min 120px, max 200px, truncated label, hover-reveal close button. `+` button calls `onNewTab` (opens SearchModal — wired in Sprint 3). Active tab has bottom accent border. Horizontal scroll with hidden scrollbar. Tab state array is managed in AppShell. | M | Tabs render correctly. Active tab is visually distinct. Closing a tab removes it and navigates to adjacent tab (or empty state if last). Multiple tabs scroll correctly. Tab state persists in localStorage. | 2.1 |
| **2.6 — BreadcrumbBar component** | Create `src/components/content/BreadcrumbBar.tsx`. Receives `activeSlug: string`. Derive breadcrumb from slug: `firms/cfd/funded-next/challenges/50k` → `CFD > Funded Next > Challenges > 50k Challenge`. Labels come from the slug segments, capitalized. Last crumb is not a link. Uses shadcn `Breadcrumb` component. Back/forward buttons use an in-app history stack (`useRef<string[]>`) — NOT `router.back()`. On navigation, push previous slug to history stack. Back button pops it and navigates. | M | Breadcrumb correctly reflects current file path. Clicking a breadcrumb link navigates to that level. Back and forward buttons work as in-app history (not browser history). Disabled state at history boundaries. | 2.5 |
| **2.7 — ContentPanel scaffold** | Create `src/components/content/ContentPanel.tsx`. Renders TabBar, BreadcrumbBar, content area (placeholder "Select a file" state), and Panel 3 toggle button. The content area renders a placeholder div for now. The Panel 3 toggle is a 28x28px icon button in the top-right of Panel 3's header (or Panel 2 header for the toggle). Mode state is managed in AppShell. | S | ContentPanel renders with TabBar and BreadcrumbBar. Placeholder empty state shows when no file is selected. | 2.5, 2.6 |
| **2.8 — Responsive behavior** | Add responsive CSS: below 1100px, Panel 3 is `display: none` by default (show/hide via AppShell state toggle button in Panel 2 header). Below 1024px, Panel 1 collapses to 48px icon rail. Below 768px, Panel 1 hides entirely and a hamburger button in Panel 2 header toggles it as an overlay. Use Tailwind breakpoint utilities for the outer layout; use inline style for the dynamic Panel 3 width (required for drag resize). | M | At 1280px: all panels visible. At 1024px: Panel 3 hidden by default, toggle button present. At 768px: hamburger nav present, full-width content. No horizontal overflow at any viewport. | 2.7 |
| **2.9 — Panel 3 scaffold** | Create `src/components/graph/GraphPanel.tsx`. Renders the Panel 3 container with header (mode toggle button). The mode toggle button switches between `graph` and `compare` modes. In `graph` mode: renders a `<GraphView>` placeholder ("Graph view coming in Sprint 5"). In `compare` mode: if `user` is null, renders `<CompareAuthGate>` (sign-in prompt with Google button — see task 2.10). If `user` is set, renders a `<ContentPanelRight>` placeholder ("Compare panel — coming in Sprint 2 auth task"). The toggle button is visible to all users; behavior is gated by auth state. | S | Panel 3 renders with header and mode toggle button. Toggle switches mode. Unauthenticated user clicking toggle sees the sign-in prompt, not the compare panel. Authenticated user clicking toggle sees the compare panel placeholder. | 2.7 |
| **2.10 — Supabase client + CompareAuthGate** | Install `@supabase/supabase-js`. Create `src/libs/supabase/client.ts` exporting the singleton Supabase client (see Section 3.8 for the exact implementation). Create `src/components/auth/CompareAuthGate.tsx`: centered UI inside Panel 3 with heading "Compare two pages side by side", subtext "Sign in to unlock the comparison panel", and a Google sign-in button that calls `supabase.auth.signInWithOAuth({ provider: "google" })`. Include a dismiss button (X) that calls `onDismiss()` prop — `<AppShell>` sets `panel3Mode` back to `"graph"` on dismiss. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.example` and to Vercel dashboard. Configure the Google OAuth provider in the Supabase project dashboard and add the production OAuth redirect URI. | M | Clicking the compare toggle as an unauthenticated user shows `<CompareAuthGate>` inside Panel 3. Clicking the Google button initiates the OAuth flow. After successful sign-in, Panel 3 renders the compare panel. Clicking dismiss returns Panel 3 to graph mode. `NEXT_PUBLIC_SUPABASE_URL` missing causes a clear build-time error (from the `!` assertion in client.ts). | 2.9 |

---

### Sprint 3 — Content Rendering

Goal: Markdown renders correctly. Wikilinks work. Search is functional. VerifiedBadge and SourceFootnotes render.

| Task | Approach | Complexity | Acceptance Criteria | Dependencies |
|---|---|---|---|---|
| **3.1 — Content utilities** | Create `src/lib/content/getContentTree.ts`: walks `/data/firms/**/*.md`, returns `TreeNode[]` and `validSlugs: string[]` and `slugToPathMap: Record<string, string>`. Create `src/lib/content/getPageContent.ts`: given a slug array, reads the corresponding `.md` file, parses with `gray-matter`, runs through unified pipeline, returns `{ frontmatter: Frontmatter, htmlContent: string, slug: string }`. Create TypeScript types in `src/types/content.ts`: `Frontmatter`, `TreeNode`, `SearchEntry`. Install: `gray-matter`, `unified`, `remark-parse`, `remark-gfm`, `remark-wiki-link`, `remark-rehype`, `rehype-stringify`. | M | `getContentTree()` returns correctly structured `TreeNode[]` for all 4 firms. `getPageContent("firms/cfd/funded-next/challenges/50k")` returns valid frontmatter and HTML. All TypeScript types compile without errors. | Sprint 1 `/data` scaffold |
| **3.2 — App Router pages** | Create `app/page.tsx`: redirects to `/firms/cfd/funded-next` (first firm's index). Create `app/firms/[...slug]/page.tsx`: calls `getPageContent`, returns `{ frontmatter, htmlContent, slug }` as props to the page component which passes them to `<AppShell>` / `<ContentPanel>`. Implement `generateStaticParams()`: calls `getAllSlugs()` and returns all slug arrays. All pages are `export const dynamic = "force-static"`. Add `generateMetadata()` using frontmatter `title` for `<title>` and first paragraph for `<meta description>`. | M | Visiting `/firms/cfd/funded-next/challenges/50k` renders the correct page. Visiting `/` redirects correctly. `next build` generates static HTML for all pages. `generateMetadata` produces correct `<title>` tags. | 3.1, Sprint 2 AppShell |
| **3.3 — MarkdownRenderer and WikiLink** | Create `src/components/content/MarkdownRenderer.tsx`. Receives `htmlContent: string` and `validSlugs: string[]`. Renders HTML via `dangerouslySetInnerHTML`. Uses event delegation: adds a `click` listener on the container element, checks if the target has a `data-wikilink` attribute, and calls `router.push()` for valid slugs or opens `SearchModal` for missing slugs. WikiLink styling is applied entirely via CSS targeting `[data-wikilink]` and `[data-wikilink-missing]` attributes. Add `[data-wikilink-missing]` CSS rule in `prose.css`. External links: `remark-rehype` handles standard markdown links; add a `rehype-external-links` plugin to add `target="_blank" rel="noopener noreferrer"` and a data attribute for the ExternalLink icon. | M | `[[funded-next/rules]]` renders as a dotted purple underline link. Clicking it navigates correctly. `[[nonexistent-page]]` renders in muted red. Clicking it opens SearchModal. External links open in new tab with ExternalLink icon. | 3.2 |
| **3.4 — Prose CSS** | Populate `src/styles/prose.css` with all `.prose` element rules from UI guide Section 3.5 exactly. All values are CSS custom properties (`var(--foreground)`, etc.) — no hardcoded hex values in this file. Include `.prose [data-wikilink]` and `.prose [data-wikilink-missing]` rules from Section 3.6. Include `.prose a[target="_blank"]::after { content: " "; }` pattern for external link icon injection (or use a React component for external links in the rehype pipeline). | M | Open any content page. H1 has bottom border. Tables have correct padding and striped rows. Code blocks are styled. Blockquotes have left accent border. Horizontal rules render. All prose styles match the UI guide specification exactly. | 3.3 |
| **3.5 — VerifiedBadge component** | Create `src/components/content/VerifiedBadge.tsx`. Receives `lastVerified: string`, `verifiedBy: "bot" \| "manual"`, `sources: Array<{ url: string, label: string }>`. Formats date with `Intl.DateTimeFormat` (not `date-fns` — no library needed for this). Renders per UI guide Section 3.4 spec. Status label shows "(automated)" or "(manual review)". | S | VerifiedBadge renders above H1 with correct date format, verified_by label, and source links. Source links open in new tab. Styling matches spec for all three themes. | 3.4 |
| **3.6 — SourceFootnotes component** | Create `src/components/content/SourceFootnotes.tsx`. Receives `sources` array from frontmatter. Renders numbered list with separator above "Sources" heading. Each entry: label + URL as a link. The markdown processor handles `[^1]` inline footnotes via `remark-footnotes` — install and add to the pipeline. `SourceFootnotes` renders the frontmatter sources separately from remark-generated footnotes (two distinct sections at page bottom). | S | Pages with frontmatter `sources` array render a Sources section at the bottom. Footnote references `[^1]` in markdown render as superscripts and link to the footnotes section at the bottom. | 3.4 |
| **3.7 — Search index builder** | Create `scripts/build-search-index.ts`. Uses `glob` to find all `.md` files in `/data/firms/**`. For each: parse frontmatter + content with `gray-matter`. Strip markdown syntax from content excerpt using a regex pass (remove `#`, `*`, `_`, `[[...]]`, `[text](url)`, `---` frontmatter lines, pipe chars from tables). Take first 400 chars of cleaned text. Output `public/search-index.json` as an array of `SearchEntry` objects. Add `"prebuild": "ts-node --project tsconfig.scripts.json scripts/build-search-index.ts && ts-node --project tsconfig.scripts.json scripts/validate-content.ts"` to `package.json`. Create `tsconfig.scripts.json` that extends the base tsconfig but targets CommonJS for script execution. | M | `npm run build` generates `public/search-index.json`. The JSON contains an entry for every `.md` file in `/data/firms/**`. Each entry has non-empty `title`, `slug`, `firm`, `type`, `excerpt`. The excerpt is clean plain text (no markdown syntax characters). | 3.1 |
| **3.8 — SearchModal component** | Create `src/components/search/SearchModal.tsx`. Uses shadcn `Command` + `Dialog`. Triggered by `Cmd+K` (global `keydown` listener in `AppShell`). On first open: fetch `/search-index.json`, instantiate Fuse with the options defined in Section 3.3 of this document, cache in module-level variable. On each keystroke: call `fuse.search(query)`, get top 10 results. Render results grouped by category (CFD / Futures) using `CommandGroup`. Highlight keyword in title and excerpt using the match indices from Fuse's `includeMatches` option — wrap matched ranges in `<mark>` tags. Enter: navigate to result. Esc: close. Empty state per spec. | L | `Cmd+K` opens modal. Typing "drawdown" returns relevant results from multiple firms. Keyword is highlighted in yellow in snippets. Enter navigates to the result. Esc closes. Empty state shows for queries with no matches. The Fuse instance is not re-created on subsequent opens (verify by checking a module-level variable). | 3.7 |
| **3.9 — Skeleton loading state** | ContentPanel: while the RSC page is loading (Next.js `loading.tsx`), show the skeleton layout from UI guide Section 3.8 and 10.5. Create `app/firms/[...slug]/loading.tsx` that renders the skeleton. Tab label pulses (CSS animation class). | S | Navigating to a new page shows the skeleton briefly before content loads. No spinner appears. | 3.2 |
| **3.10 — Content API route (for compare panel)** | Create `app/api/content/[...slug]/route.ts`. GET handler: awaits `params`, joins `slug` array to reconstruct the file path, calls `getPageContent(slug)`, returns `Response.json({ frontmatter, htmlContent, slug })`. Handles 404 (file not found) by returning `Response.json({ error: "Not found" }, { status: 404 })`. Add `export const dynamic = "force-static"` so Next.js pre-renders these at build time. | S | `GET /api/content/firms/cfd/funded-next/rules` returns valid JSON with `frontmatter` and `htmlContent` fields. `GET /api/content/firms/nonexistent` returns 404 JSON. | 3.1 |
| **3.11 — ContentPanelRight and stacked comparison** | Create `src/components/content/ContentPanelRight.tsx`. Structurally identical to `<ContentPanel>` but: reads active slug from `useSearchParams().get("right")`, navigates by calling `router.replace(pathname + "?right=" + newSlug)`, stores open tabs in `localStorage("openTabs_right")`, fetches content from `/api/content/[...slug]` instead of receiving it as a prop. Fetches on slug change via `useEffect`. Shows skeleton while loading. Wire `<ContentPanelRight>` into `<GraphPanel>` when `panel3Mode === "compare"` and `user` is non-null. The `?right=` param is removed from the URL when Panel 3 switches back to graph mode (call `router.replace(pathname)` on mode toggle). | L | In compare mode, Panel 3 renders a full content panel with its own tab bar and breadcrumb bar. Navigating a wikilink in Panel 3 updates only the `?right=` param. Navigating in Panel 2 does not affect Panel 3's slug. Both panels render correct content simultaneously. Resizing via `<ResizeHandle>` works between Panel 2 and Panel 3. Deep linking with `?right=firms/cfd/funded-next/rules` opens the correct content in Panel 3 on page load (for authenticated users). | 3.10, 2.10 |

---

### Sprint 4 — Content Creation

Goal: All four firms have complete, verified, sourced markdown content. This is primarily a writing sprint. Engineering work is minimal and focused on data integrity validation.

| Task | Approach | Complexity | Acceptance Criteria | Dependencies |
|---|---|---|---|---|
| **4.1 — Content authoring: Funded Next (CFD)** | Write all 5 content types for Funded Next: `index.md` (overview, website, founding, contacts), `challenges/` (all tiers — verify current tiers on the official site), `rules.md` (current active rules — verify on official site), `promos.md` (any affiliate codes — apply for affiliate program first), `changelog.md` (document any recent changes with dates, starting from today). Every claim must have a source URL in the frontmatter `sources` array or as a markdown footnote. All wikilinks must resolve to valid files. `last_verified` set to the date of writing, `verified_by: manual`. | L | 5/5 content files present. Zero empty `sources` arrays. Zero missing `last_verified` fields. All wikilinks in the file resolve without the missing-link (red) state in the browser. Content validation script (`scripts/validate-content.ts`) passes. | Sprint 3 content rendering complete |
| **4.2 — Content authoring: Funding Pips (CFD)** | Same process as 4.1 for Funding Pips. Apply for affiliate program. Note: verify whether Funding Pips uses a standard challenge model or a different evaluation structure — if different, the challenge tier markdown template may need an additional frontmatter field (e.g., `evaluation_type: one-phase \| two-phase`). Add this field to the frontmatter schema and templates if needed. | L | Same criteria as 4.1 for Funding Pips. Affiliate application submitted. | Sprint 3, 4.1 complete |
| **4.3 — Content authoring: Apex Funding (Futures)** | Same process as 4.1 for Apex Funding. Futures firms have different rule structures (EOD drawdown vs. trailing, NinjaTrader/Rithmic platform requirements, contract limits). Ensure rules.md captures futures-specific fields. If a futures-specific frontmatter field is needed (e.g., `platform: NinjaTrader`), add it. | L | Same criteria as 4.1 for Apex Funding. Affiliate application submitted. | Sprint 3, 4.1 complete |
| **4.4 — Content authoring: Lucid Funding (Futures)** | Same process as 4.1 for Lucid Funding. | L | Same criteria as 4.1 for Lucid Funding. Affiliate application submitted. | Sprint 3, 4.1 complete |
| **4.5 — Wikilink integrity check** | Create `scripts/check-wikilinks.ts`. Reads all `.md` files in `/data/firms/**`, extracts all `[[wikilink]]` patterns, checks each target against the set of known file slugs (from `getContentTree`), logs any missing targets. Exits with code 1 if any broken wikilinks found. Add to prebuild: `ts-node scripts/check-wikilinks.ts`. | S | Running `npm run build` fails if any content file contains a wikilink pointing to a file that does not exist. Running it on the complete 4-firm content set passes with zero broken links. | 4.1–4.4 |
| **4.6 — Obsidian compatibility spot-check** | Founder manually clones `/data` into a local Obsidian vault. Verifies: all wikilinks resolve (Obsidian shows no "unresolved links"), frontmatter renders in Obsidian's metadata view, graph view in Obsidian shows the correct file connections, no YAML parse errors. Document any compatibility issues found and fix them before Sprint 5. | S | Obsidian graph view shows nodes for all content files with correct wikilink edges. No YAML errors. No unresolved links in Obsidian's sidebar. | 4.1–4.5 |
| **4.7 — UTM link structure** | Define the UTM parameter convention for all affiliate links in promos pages. Use: `utm_source=openpropfirm&utm_medium=promos&utm_campaign=[firm-slug]`. Document this convention in `CONTRIBUTING.md` template (written in Sprint 6). Ensure all affiliate links in promos files follow this convention. If affiliate approval is pending at launch, use the official firm URL with UTMs (still trackable in Google Analytics / Vercel Analytics for click behavior, even without affiliate attribution). | S | All external links in `promos.md` files include UTM parameters. Clicking a promo link from the deployed site shows UTM parameters in the URL bar. | 4.1–4.4 |

---

### Sprint 5 — Graph View, Monitoring Bot, Legal

Goal: Graph view renders real content. Bot is live. Legal pages published. Site is functionally complete.

| Task | Approach | Complexity | Acceptance Criteria | Dependencies |
|---|---|---|---|---|
| **5.1 — Graph data builder script** | Create `scripts/generate-graph-data.ts`. Reads all `.md` files in `/data/firms/**`. For each file: extract all `[[wikilink]]` patterns. Build `nodes` array (id=slug, label=frontmatter.title, fileType, firm, inboundCount). Build `links` array (source=slug, target=resolved slug). Skip links where target slug does not exist (log a warning). Write output to `public/graph-data.json`. Add to prebuild hook after `validate-content` and `build-search-index`. | M | `public/graph-data.json` is generated at build time. Node count matches the number of `.md` files in `/data/firms/**`. Link count matches the total number of valid `[[wikilinks]]` across all files. `inboundCount` is correct for each node (spot-check: `funded-next/rules` should have the highest inbound count since all challenge files link to it). | Sprint 4 content complete |
| **5.2 — GraphView component** | Create `src/components/graph/GraphView.tsx` as a Client Component, loaded via `next/dynamic({ ssr: false })`. Fetches `public/graph-data.json` via `fetch` on mount. Uses `react-force-graph-2d`. Implements: node colors from `fileType` color map per UI guide Section 4.3 (read current theme from `document.documentElement.getAttribute("data-theme")`). Node radius formula from spec. Edge opacity rules. Listens for `themechange` custom event to re-apply colors. On node click: `router.push("/firms/" + node.id)`. On node hover: show `<GraphTooltip>`. Selected node highlight (set via `activeSlug` prop from AppShell). | L | Graph renders all nodes and edges. Node sizes vary by inbound count. Colors match the three themes. Clicking a node navigates to the correct page. The currently active file's node is highlighted. Theme change updates node colors without full remount. | 5.1 |
| **5.3 — GraphTooltip, GraphControls, GraphLegend** | Create the three overlay components per UI guide Sections 4.5, 4.7, 4.8. GraphControls: zoom in/out uses `graphRef.current.zoom()`, fit uses `graphRef.current.zoomToFit()`. Filter popover uses shadcn `Popover` + `Checkbox`. When fileTypes are filtered, pass a filtered node/link dataset to `react-force-graph-2d` (filter in component state, not in the graph-data.json). GraphLegend: static colored dots. | M | Zoom controls work. Fit button centers and fits all nodes. Filter popover shows/hides node types. Legend renders in bottom-left. Tooltip appears on hover with correct content. | 5.2 |
| **5.4 — Monitoring bot: scraper** | Create `scripts/monitor.py`. Structure: one scraper class per firm (e.g., `FundedNextScraper`, `ApexFundingScraper`). Each class has a `scrape()` method that uses `requests` to fetch the official challenge/promo page and `beautifulsoup4` to extract: challenge prices, key rule values (drawdown %, profit target %), promo codes. Store scrape targets in a config file `scripts/monitor_config.json` (not hardcoded) containing: firm slug, URLs to scrape, CSS selectors or XPath for target elements. Return a structured dict `{ firm, field, scraped_value, scraped_at }` per field. | L | Running `python scripts/monitor.py --dry-run` for Funded Next returns a structured dict of scraped values. The scraper handles HTTP errors gracefully (retries once, then fails and logs). No secrets are hardcoded. | Sprint 4 content complete |
| **5.5 — Monitoring bot: LLM diff classification** | Install `anthropic` Python package in the bot's pip requirements. Add `pip install anthropic` to the bot.yml workflow step. Implement `classify_diff(firm, before_text, after_text)` as specified in Section 3.9 of this document. Call `classify_diff` only when `difflib.SequenceMatcher` ratio is < 0.99 (skip the LLM call for trivial whitespace diffs). Parse the JSON response from Claude and use the `meaningful` field to decide whether to open a PR. Log `tokens_in`, `tokens_out`, `cost_usd` (computed as `tokens_in * 0.00000025 + tokens_out * 0.00000125`), `change_type`, and `meaningful` to the Supabase `bot_usage_log` table via REST API (see Section 3.9). The `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_KEY` are read from environment variables (GitHub Actions secrets). | M | Running the bot with a mock diff that contains a price change: `classify_diff` returns `meaningful: true, change_type: "price_change"`. Running it with a navigation-only HTML change: returns `meaningful: false, change_type: "structural"`. A row is written to `bot_usage_log` in Supabase after each firm is processed. Token counts in the log match the API response's `usage` field. | 5.4 |
| **5.5b — Monitoring bot: diff application and PR creation** | In `scripts/monitor.py`, add: read current `/data/firms/[category]/[firm]/*.md` files using `PyYAML` for frontmatter and plain text for content. Compare scraped values against current frontmatter/content values. If `classify_diff` returns `meaningful: true`: update the relevant markdown file's content AND update `last_verified` to now. If `meaningful: false` OR no scrape diff: still update `last_verified` to now (per Section 1.4 correction). Create a PR via the GitHub API using `gh` CLI: `gh pr create --title "Bot: content update [firm] [date]" --body "..."`. Branch name: `bot/update-[firm-slug]-[YYYYMMDD]`. PR body includes the `summary` from `classify_diff`. Log `pr_created: true/false` to `bot_usage_log`. | L | Running the bot manually (`workflow_dispatch`) with a meaningful diff creates a PR with updated content. Running it with no meaningful change creates a PR with only `last_verified` timestamp updates. The PR description includes the LLM-generated summary. `bot_usage_log.pr_created` is `true` when a PR was opened. | 5.5 |
| **5.6 — Supabase bot_usage_log table migration** | Create `supabase/migrations/001_create_bot_usage_log.sql` with the exact DDL from Section 3.9 of this document. Add `supabase/migrations/` to the repo. Document in the README that this migration must be run manually in the Supabase dashboard (SQL editor) before the first bot run — there is no automated migration runner in v1. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` as GitHub Actions secrets (Settings > Secrets > Actions). Note: `SUPABASE_URL` is the same value as `NEXT_PUBLIC_SUPABASE_URL` but is stored as a secret in Actions so the bot can use it without the `NEXT_PUBLIC_` prefix. | S | Migration SQL file is committed. `bot_usage_log` table exists in the Supabase project dashboard after running the migration. The bot's INSERT call (from task 5.5) successfully writes a row to the table. | None |
| **5.7 — Admin page** | Create `src/app/admin/page.tsx` as a React Server Component. In the component body, call the Supabase REST API with the service key (`process.env.SUPABASE_SERVICE_KEY`) to fetch all rows from `bot_usage_log` ordered by `run_at DESC`. Render an HTML table with columns: Date, Firm, Tokens In, Tokens Out, Est. Cost (formatted as `$0.000000`), Change Detected (Yes/No), PR Created (Yes/No), Error (truncated to 80 chars if present). Add a summary row above the table: "This month: N runs, $X.XX total cost." The page uses the standard `.prose` table styles — no custom admin CSS needed. It is unprotected in v1 (obscure-by-URL). Add a comment `// TODO v2: add auth gate to /admin` at the top of the file. Add `SUPABASE_SERVICE_KEY` to the Vercel project as a server-only (non-`NEXT_PUBLIC_`) environment variable so the RSC can read it at request time. | M | Visiting `/admin` in production renders the table with real data after at least one bot run. `SUPABASE_SERVICE_KEY` is NOT present in any client-side bundle (verify with `next build` output — it should not appear in `_next/static/`). Summary row shows correct totals. Table is sortable by date (newest first). | 5.6 |
| **5.8 — Bot health check** | In `scripts/monitor.py`, after all scraping and PR creation, use the GitHub API to post a comment to the health check issue: `gh api repos/{owner}/{repo}/issues/{HEALTH_CHECK_ISSUE_NUMBER}/comments -f body="..."`. Comment body: timestamp, firms checked, fields scraped, changes found, PRs opened, tokens used, estimated cost, any errors encountered. Store `HEALTH_CHECK_ISSUE_NUMBER` as a GitHub Actions variable (not a secret — it is not sensitive). | S | After running the bot workflow manually, a timestamped comment appears on the designated GitHub issue. The comment is formatted correctly and contains all required fields including token count and cost. | 5.5b |
| **5.9 — Create health check issue** | Manually create a GitHub issue titled "Bot Health Check Log" in the repo. Pin it. Copy the issue number and set it as a GitHub Actions variable `HEALTH_CHECK_ISSUE_NUMBER`. Add instructions in the issue body explaining the format and what to do if no comment appears for 24+ hours. | S | Issue exists, is pinned, and has the correct issue number configured in the workflow. | 5.8 |
| **5.10 — Terms of Service page** | Create `app/tos/page.tsx`. Static page with a ToS document. Use a ToS generator (Termly or Iubenda) as a starting point, customize for the project's specific context: information site (not financial advice), source attribution policy, disclaimer of liability for stale data, AGPL-3.0 and CC-BY-NC-SA-4.0 license summary, affiliate disclosure. The page uses a simple `<article>` with `.prose` class — no special layout needed (can be outside the three-panel AppShell, full-width centered). Add to site footer link in Sprint 6. **Note from CEO document**: founder should have a lawyer review before launch. Add a TODO comment in the file. | S | `/tos` is a reachable page. It contains: disclaimer of liability, affiliate disclosure, license summary, last-updated date. Renders correctly in all three themes. | Sprint 3 content rendering |
| **5.11 — Site-wide disclaimer** | Add a persistent disclaimer to the `<ContentPanel>` footer (below `<SourceFootnotes>`) on every content page: "Information sourced from public websites. Always verify directly with the firm before purchasing a challenge. Last verified: [date from frontmatter]." Style as a muted note, not a red alert — visually unobtrusive but present. Do not implement as a cookie banner or modal. | S | Disclaimer text is visible on every content page. Text is not visually alarming (no red) but is clearly present. The `last_verified` date in the disclaimer matches the frontmatter value. | 5.10 |

---

### Sprint 6 — Polish, SEO, and Launch Prep

Goal: Production-ready. SEO foundations. CONTRIBUTING.md published. Site launched.

| Task | Approach | Complexity | Acceptance Criteria | Dependencies |
|---|---|---|---|---|
| **6.1 — SEO: metadata, sitemap, robots** | `generateMetadata()` in `app/firms/[...slug]/page.tsx`: already scaffolded in Sprint 3. Complete it: `title` from frontmatter, `description` from first paragraph of cleaned content (reuse the excerpt from the search index). OpenGraph tags: `og:title`, `og:description`, `og:url` (constructed from `NEXT_PUBLIC_SITE_URL + /firms/` + slug), `og:type: article`. Install `next-sitemap` (`npm install next-sitemap`). Create `next-sitemap.config.js` with `siteUrl: process.env.NEXT_PUBLIC_SITE_URL`, `generateRobotsTxt: true`. Add `"postbuild": "next-sitemap"` to `package.json`. Canonical URLs: add `alternates.canonical` in `generateMetadata`. | M | Sitemap exists at `/sitemap.xml` and lists all firm content URLs. `robots.txt` allows all crawlers. `<title>` on each page matches the file's frontmatter title. OpenGraph preview shows correct title and description when shared on Slack/Discord. | Sprint 5 complete |
| **6.2 — CONTRIBUTING.md** | Write `CONTRIBUTING.md` at repo root. Required sections: Project overview (one paragraph), How the data is structured (point to Section 4 of this tech plan or a simplified version of it), Frontmatter schema reference (copy from Section 4.1 of this plan), How to add a new firm (step-by-step: fork, create folders, create files, check wikilinks, submit PR), How to update existing content (find the file, edit, update `last_verified` to today, add source URL, submit PR), Content standards (every claim needs a source URL, no speculation, no editorializing, cite the official firm page), PR checklist (all required frontmatter fields present, `last_verified` updated, source URLs added, wikilinks tested, validate-content script passes locally), How to run locally (`npm install`, `npm run dev`), Discord link, License acknowledgment (by contributing, you agree to CC-BY-NC-SA-4.0 for `/data`). Link CONTRIBUTING.md from README.md and from the site footer. | M | CONTRIBUTING.md is live in the repo. It is linked from the footer. A first-time contributor reading it could successfully submit a PR without asking for help. The PR checklist is specific and checkable. | Sprint 5 complete |
| **6.3 — Site footer** | Create `src/components/layout/SiteFooter.tsx`. Renders at the bottom of every content page (inside `<ContentPanel>`, below SourceFootnotes). Contents per spec: site-wide disclaimer (can reuse the 5.9 component), link to ToS, link to CONTRIBUTING.md on GitHub, affiliate disclosure ("Some links on this site are affiliate links. Using them supports the project at no cost to you."), GitHub repo link, license badges (AGPL-3.0 for code, CC-BY-NC-SA-4.0 for data), copyright line ("© 2026 OpenPropFirm contributors"). Include "About" blurb if founder decides to be named (OQ-2 — founder decision required). | S | Footer renders on all content pages. All links work. Affiliate disclosure is present. License badges display correctly. Footer is visually unobtrusive (muted text, small size). | Sprint 5 complete |
| **6.4 — Accessibility pass** | Audit all interactive elements: nav tree items, tab bar, buttons, modal, search results, graph controls. Every icon-only button must have an `aria-label`. The nav file tree must be a `<nav>` with `aria-label="Site navigation"`. The search modal must trap focus while open (`cmdk` handles this natively). The tab bar must have `role="tablist"` with `role="tab"` on each item. Keyboard navigation: Tab moves through all interactive elements; Enter activates; Esc closes modals. Focus ring: `outline: 2px solid var(--accent)` on `:focus-visible` for all interactive elements (add to `globals.css`). | M | Lighthouse accessibility score >= 90. Running `axe` browser extension on the homepage shows zero critical violations. Keyboard-only user can: navigate to any file via the tree, open search, select a result, close the modal, cycle themes, switch tabs, close a tab. | 6.3 |
| **6.5 — Cross-browser and performance** | Test on Chrome, Firefox, Safari (latest stable). Check: drag resize, canvas graph, Cmd+K (use Ctrl+K on non-Mac), theme persistence, localStorage behavior. Performance: verify `public/search-index.json` is under 50KB (it will be at v1 scale). Verify `public/graph-data.json` is under 20KB. Check Vercel Analytics Core Web Vitals after a few page views. LCP target: < 2.5s (achievable since all pages are statically generated). Check for any console errors in production build. | M | Zero console errors in production. Drag resize works in all three browsers. Canvas graph renders in all three browsers. LCP < 2.5s on Vercel production. search-index.json < 50KB. graph-data.json < 20KB. | 6.4 |
| **6.6 — Final build validation** | Run full prebuild + build sequence: `npm run build`. Verify: all 4 firms × 5 content types = ~20+ pages generated as static HTML. Sitemap lists all pages. search-index.json is present. graph-data.json is present. No TypeScript errors. No ESLint errors. No broken wikilinks (`check-wikilinks.ts` passes). Content validation script passes. Preview deployment on a pre-launch branch is fully functional before flipping to production. | S | `npm run build` completes with zero errors and zero warnings (treat TypeScript warnings as errors via `"noEmit": true` in tsconfig and `tsc --noEmit` in CI). All pre-launch checklist items from the PM doc are verified against the preview URL. | 6.5 |
| **6.7 — Google Search Console + DNS** | Purchase domain (if not already done). Point DNS to Vercel. Flip production deployment to the real domain in Vercel dashboard. Create a Google Search Console property for the domain. Download the HTML verification file and add to `/public`. Submit `/sitemap.xml`. Request indexing for the root URL. | S | Google Search Console shows the domain as verified. Sitemap is submitted and shows "Pending" or "Indexed." Production URL resolves correctly with HTTPS. | 6.6 |
| **6.8 — Launch announcement prep** | Draft launch posts for: r/Forex, r/FuturesTrading, r/PropTradingFirms (if it exists), relevant Discord servers (PropFirmMatch Discord, Apex's Discord, any futures trading communities). Draft should include: what OpenPropFirm is, why it exists (founder origin story from the brief — this is compelling), the four firms currently covered, the GitHub repo link, a call to contributors. Do NOT post until 6.6 is verified and production is live. | S | At least 3 draft posts are written and ready. The GitHub repo has a pinned discussion or issue for community questions. | 6.7 |

---

## 6. Risk Register

Technical risks not already covered in the PM document's risk register.

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| **`remark-wiki-link` permalink resolver requires the full slug map at build time** — if the slug map is not passed correctly, all wikilinks render as missing (red). This is a silent bug that won't cause a build failure. | Medium | High | Add an explicit check in `generate-graph-data.ts` and the content validation script: count valid vs. missing wikilink targets and fail the build if more than 10% of links are missing (excluding intentionally absent links). |
| **`react-force-graph-2d` canvas sizing bug** — the library has a known issue where it renders at 0x0 if the container has no explicit dimensions at mount time. | High | Medium | Always render `<GraphView>` inside a container with explicit pixel dimensions (use `useResizeObserver` or a `ref` with `getBoundingClientRect()` to pass `width` and `height` to the `ForceGraph2D` component explicitly). Never rely on `100%` CSS to size the canvas. |
| **Theme flash on first load** — if the inline anti-flash script in `<head>` is not placed before any CSS-in-JS or styled component hydration, a flash is possible. | Medium | Low | The anti-flash script must be the first element inside `<head>`, before any font or CSS imports. Test in Chrome with DevTools CPU throttling at 4x to verify no flash. |
| **Bot scraper breaks when firm redesigns their website** — CSS selectors in the scraper config become stale silently. | High | Medium | The bot must always validate that scraped values are non-empty and non-null before writing them. Empty scraped value = bot error, not a content update. Post a detailed failure comment to the health check issue with the URL and selector that failed. Do not overwrite content with empty values. |
| **Vercel's file system is read-only at runtime** — if any code attempts to write to the `/data` directory at runtime (not just build time), it will fail silently on Vercel. | Low | High | All content reads use `fs` at build time only (`generateStaticParams`, `getPageContent`). Never import `fs` in a file that is not explicitly a build-time utility or script. Enforce this with an ESLint rule: `no-restricted-imports` for `fs` in components and API routes. |
| **`dangerouslySetInnerHTML` XSS risk** — the markdown content comes from the repo, not from user input, but if community contributions are accepted via PRs, a malicious contributor could inject script tags via a markdown file. | Low | High | Add `rehype-sanitize` to the unified pipeline to strip any HTML tags that are not in the allowlist (safe HTML elements only — no `<script>`, no `onclick`). This is a one-line addition to the pipeline. The sanitize step must run before `rehype-stringify`. Test by adding a `<script>alert(1)</script>` to a test markdown file and verifying it does not execute. |
| **Graph layout is non-deterministic** — D3 force simulation starts from random initial positions, meaning the graph looks different on every render. | Medium | Low | Pass a fixed `seed` to the force simulation in `react-force-graph-2d` via `d3ForceLink`, `d3ForceManyBody` configuration, or use a deterministic layout algorithm (e.g., hierarchical layout based on firm category → firm → content type). At 20-30 nodes, either approach is acceptable. The random layout is fine for v1 — it is Obsidian behavior and users expect it. No action required for v1. |
| **`localStorage` is not available in SSR** — any component that reads localStorage during initial render will throw a "localStorage is not defined" error during server-side rendering. | High | Medium | All `localStorage` reads must be inside `useEffect` hooks or guarded with `typeof window !== "undefined"`. This is a systematic discipline requirement — enforce with a code review checklist item. |
| **Monitoring bot's GitHub Actions cron does not run if the repo has zero commits in 60 days** — GitHub disables scheduled workflows in inactive repos. | Low | Medium | The founder must maintain at least one commit per 60 days (content updates will naturally satisfy this). Document this in the bot health check issue as a "known limitation." |
| **Next.js 15 `params` is a Promise** — forgetting to `await params` in dynamic routes will cause a runtime error in Next.js 15. This is a common mistake when migrating from Next.js 14. | High | Medium | Add an ESLint rule or a linting script that checks `app/firms/[...slug]/page.tsx` for `await params` usage. Include in the PR review checklist. |
| **Google OAuth redirect URI mismatch** — if the Supabase project's OAuth callback URL does not match exactly what is configured in Google Cloud Console, the sign-in flow silently fails and the user is redirected to an error page. This is the most common OAuth setup mistake. | High | Medium | Document the exact callback URL format (`https://<project-ref>.supabase.co/auth/v1/callback`) in the setup instructions. Add a QA step in the Sprint 2 auth task: sign in through the full OAuth flow on the Vercel preview URL before considering the task done. Test on both the Vercel preview URL and the production domain separately (each requires its own authorized redirect URI in Google Cloud Console). |
| **Auth scope creep in v1** — introducing Supabase Auth creates pressure to add more auth-gated features incrementally (e.g., saved comparisons, user profiles, admin protection). Each addition extends Sprint 2 scope and delays launch. | Medium | Medium | Auth in v1 gates exactly one UI feature: the stacked comparison panel. No other v1 feature requires auth. Any auth-adjacent feature request that arrives before launch is automatically deferred to v2. The `<CompareAuthGate>` and `AppShell` `user` state are the only auth-touching code in v1. Do not add auth middleware, protected routes, or server-side session validation in v1 — the client-side `user` check in `AppShell` is sufficient and intentional. |
| **`useSearchParams()` requires `<Suspense>` boundary in Next.js 15** — any component calling `useSearchParams()` will cause the build to fail or the page to de-opt to client-side rendering without a Suspense boundary wrapping it. `<ContentPanelRight>` uses `useSearchParams()` to read `?right=`. | High | Medium | Wrap `<ContentPanelRight>` in a `<Suspense fallback={<ContentPanelSkeleton />}>` in `<GraphPanel>`. This is mandatory per Next.js 15 docs. Include as an explicit acceptance criterion in task 3.11. |
| **`?right=` URL state desync on browser back/forward** — when a user navigates back in their browser history, the `?right=` param may change or disappear while the left panel slug changes too, causing both panels to flash to unexpected content. | Medium | Low | The `?right=` state is managed via `router.replace` (not `router.push`), so it does not add to the browser history stack for right-panel-only navigation. This is intentional: the user's history reflects left-panel navigation; the right panel is a comparison overlay, not a navigation destination. The risk is low because Panel 3 compares is secondary UI. |
| **LLM classification returns invalid JSON** — Claude claude-haiku-4-5 is instructed to return JSON only, but the response may include preamble text or malformed JSON, especially on unexpected input. | Medium | Low | Wrap the `json.loads()` call in a try/except. On parse failure, log the raw response to `bot_usage_log.error` and default to `meaningful: true` (conservative — prefer false positive PR over missed content change). Add `--output json` or system-prompt enforcement ("respond with JSON only, no other text") to reduce parse failures. |
| **LLM cost spike if bot runs too frequently or diffs are unexpectedly large** — if the bot is accidentally triggered many times (e.g., via `workflow_dispatch` spam) or a firm's page returns a very large HTML response, token costs could exceed expectations. | Low | Low | Token cost at current pricing is ~$0.003/day normal operation. Even 100x the expected usage is ~$0.30/day — still negligible. The real guard is the `difflib` pre-filter (only call the LLM when the diff ratio is < 0.99) which eliminates LLM calls for unchanged pages. Add a hard `max_tokens=256` cap on the response (already in the spec). Monitor the `bot_usage_log.tokens_in` column for anomalies. |
| **Anthropic API model deprecation or pricing change** — `claude-haiku-4-5` may be deprecated or repriced. The bot currently hardcodes the model string and cost calculation. | Low | Low | The model string (`claude-haiku-4-5`) is defined as a constant at the top of `scripts/monitor.py` so it can be updated in one place. The cost calculation (`tokens_in * 0.00000025 + tokens_out * 0.00000125`) is also a named constant. When Anthropic releases a cheaper/faster model, update both constants and run one `--dry-run` test to verify the classification output quality. The `bot_usage_log` table stores raw token counts (not just cost), so historical cost can be recalculated if pricing changes retroactively. |
| **Supabase service key exposed in Vercel environment** — `SUPABASE_SERVICE_KEY` must be set as a Vercel server env var for the admin page RSC, which creates a risk: if the admin page accidentally imports a client component that reads `process.env.SUPABASE_SERVICE_KEY`, it would be bundled into the client. | Low | High | Never use `NEXT_PUBLIC_` prefix for the service key (the `NEXT_PUBLIC_` prefix causes Next.js to inline the value into client bundles). Use bare `SUPABASE_SERVICE_KEY`. Add an ESLint `no-restricted-syntax` rule that prevents any file in `src/components/` from accessing `process.env.SUPABASE_SERVICE_KEY`. The service key must only ever appear in `src/app/admin/page.tsx` and `scripts/monitor.py`. |

---

## 7. Setup Instructions

These are the exact commands to bootstrap the project from zero. Run them in order.

### Prerequisites

- Node.js >= 20.x (`node --version`)
- npm >= 10.x (`npm --version`)
- Python >= 3.10 (`python --version`) — for bot scripts only
- Git configured with your GitHub account
- Vercel CLI installed: `npm install -g vercel`
- GitHub CLI installed: `brew install gh` then `gh auth login`

### Step 1 — Initialize Next.js 15 Project

```bash
# Create the project (run from the directory where you want the repo to live)
npx create-next-app@15 openpropfirm \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-experimental-app

cd openpropfirm

# Verify Next.js version
cat package.json | grep '"next"'
# Should show: "next": "^15.x.x"
```

### Step 2 — Install Core Dependencies

```bash
# Markdown processing pipeline
npm install gray-matter unified remark-parse remark-gfm remark-wiki-link \
  remark-rehype rehype-stringify rehype-sanitize rehype-external-links \
  remark-footnotes

# Search
npm install fuse.js

# Graph (client-only, no SSR)
npm install react-force-graph-2d

# Auth
npm install @supabase/supabase-js

# Type declarations (if not bundled)
npm install -D @types/node @types/react @types/react-dom

# Scripting utilities
npm install -D ts-node glob

# SEO
npm install next-sitemap

# Analytics
npm install @vercel/analytics @vercel/speed-insights
```

### Step 3 — Initialize shadcn/ui

```bash
# Initialize shadcn (choose: TypeScript, CSS variables, neutral base color)
npx shadcn@latest init

# Add all required components
npx shadcn@latest add button breadcrumb command dialog popover \
  checkbox skeleton separator tooltip scroll-area badge
```

### Step 4 — Configure TypeScript Strict Mode

In `tsconfig.json`, verify these are set (create-next-app should set them, but confirm):

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Create `tsconfig.scripts.json` for prebuild scripts:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": ".scripts-out"
  },
  "include": ["scripts/**/*.ts"]
}
```

### Step 5 — Set Up /data Folder

```bash
# Create the canonical /data structure
mkdir -p data/firms/cfd/funded-next/challenges
mkdir -p data/firms/cfd/funding-pips/challenges
mkdir -p data/firms/futures/apex-funding/challenges
mkdir -p data/firms/futures/lucid-funding/challenges
mkdir -p data/_templates

# Create placeholder files (Sprint 1.4 task — fill with correct frontmatter)
# Do NOT run the build until all files have valid frontmatter
```

### Step 6 — Configure package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "prebuild": "ts-node --project tsconfig.scripts.json scripts/validate-content.ts && ts-node --project tsconfig.scripts.json scripts/build-search-index.ts && ts-node --project tsconfig.scripts.json scripts/generate-graph-data.ts",
    "postbuild": "next-sitemap",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "validate-content": "ts-node --project tsconfig.scripts.json scripts/validate-content.ts",
    "check-wikilinks": "ts-node --project tsconfig.scripts.json scripts/check-wikilinks.ts"
  }
}
```

### Step 7 — Connect to Vercel

```bash
# Log in to Vercel CLI
vercel login

# Link the project to Vercel (creates .vercel/project.json — do NOT commit this)
vercel link

# Add .vercel to .gitignore
echo ".vercel" >> .gitignore

# Set the production env var
vercel env add NEXT_PUBLIC_SITE_URL production
# Enter: https://openpropfirm.com (or your actual domain)

# Deploy to preview to verify the connection
vercel
```

### Step 8 — Initialize GitHub Repository

```bash
# Initialize git
git init
git add .
git commit -m "chore: initial project scaffold"

# Create repo on GitHub and push
gh repo create openpropfirm/openpropfirm --public --push --source=.

# Verify the repo is connected and visible
gh repo view
```

### Step 9 — Configure GitHub Actions Secrets

In the GitHub repository settings (Settings > Secrets and variables > Actions):

```
# GITHUB_TOKEN is automatically provided by GitHub Actions — no setup needed

# Actions SECRETS (sensitive — never log these):
ANTHROPIC_API_KEY          # Anthropic API key for LLM diff classification
                           # Get from: https://console.anthropic.com/account/keys
SUPABASE_SERVICE_KEY       # Supabase service role key (not the anon key)
                           # Get from: Supabase dashboard > Project Settings > API > service_role
SUPABASE_URL               # Same value as NEXT_PUBLIC_SUPABASE_URL but stored as a secret
                           # so the bot script can access it without the NEXT_PUBLIC_ prefix

# Actions VARIABLE (not secret — not sensitive):
HEALTH_CHECK_ISSUE_NUMBER = 1  # set this after creating the health check issue in Sprint 5
```

In Vercel project settings (Settings > Environment Variables):
```
# These are set in Vercel for the Next.js app:
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL — safe to expose (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon key — safe to expose (public, RLS-enforced)
SUPABASE_SERVICE_KEY           # Service role key — server-only, NO NEXT_PUBLIC_ prefix
                               # Required for the /admin RSC page only
```

### Step 10 — Verify First Build

```bash
# Run the full build locally to catch any issues before Vercel sees them
npm run build

# Expected output:
# - validate-content.ts runs (placeholder files with correct frontmatter pass)
# - build-search-index.ts runs and writes public/search-index.json
# - generate-graph-data.ts runs and writes public/graph-data.json
# - Next.js build compiles all pages
# - next-sitemap runs and writes public/sitemap.xml and public/robots.txt
# - Zero TypeScript errors
# - Zero ESLint errors
```

### Step 11 — Local Development Workflow

```bash
# Start development server
npm run dev
# App available at http://localhost:3000

# Note: prebuild scripts do NOT run in dev mode.
# If you change /data content and need updated search index or graph data, run:
npm run validate-content
ts-node --project tsconfig.scripts.json scripts/build-search-index.ts
ts-node --project tsconfig.scripts.json scripts/generate-graph-data.ts
# Then reload the dev server
```

### Step 12 — Python Bot Dependencies

```bash
# The bot runs in GitHub Actions (Python pre-installed on ubuntu-latest)
# For local testing:
pip install requests beautifulsoup4 PyYAML anthropic

# Test the bot locally (dry run, no PR creation):
python scripts/monitor.py --dry-run
```

---

## Appendix A — File/Directory Reference

```
openpropfirm/
├── .github/
│   └── workflows/
│       ├── bot.yml                       # Daily monitor cron + manual trigger
│       └── ci.yml                        # Type-check + lint on every PR
├── data/                                 # CC-BY-NC-SA-4.0
│   ├── LICENSE
│   ├── README.md
│   ├── _templates/
│   └── firms/
│       ├── cfd/
│       └── futures/
├── public/
│   ├── search-index.json                 # Generated by prebuild
│   ├── graph-data.json                   # Generated by prebuild
│   ├── sitemap.xml                       # Generated by postbuild
│   └── robots.txt                        # Generated by postbuild
├── supabase/
│   └── migrations/
│       └── 001_create_bot_usage_log.sql      # Run manually in Supabase SQL editor
├── scripts/
│   ├── validate-content.ts
│   ├── build-search-index.ts
│   ├── generate-graph-data.ts
│   ├── check-wikilinks.ts
│   ├── monitor.py
│   └── monitor_config.json
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root RSC layout, loads treeData
│   │   ├── page.tsx                      # Redirect to first firm
│   │   ├── globals.css                   # Tailwind v4 entry + theme + prose imports
│   │   ├── admin/
│   │   │   └── page.tsx                  # RSC admin page — bot usage log table
│   │   ├── api/
│   │   │   └── content/
│   │   │       └── [...slug]/
│   │   │           └── route.ts          # JSON content API for compare panel
│   │   ├── firms/
│   │   │   └── [...slug]/
│   │   │       ├── page.tsx              # Dynamic RSC, generateStaticParams
│   │   │       └── loading.tsx           # Skeleton loading state
│   │   └── tos/
│   │       └── page.tsx
│   ├── components/
│   │   ├── content/
│   │   │   ├── ContentPanel.tsx
│   │   │   ├── MarkdownRenderer.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── BreadcrumbBar.tsx
│   │   │   ├── VerifiedBadge.tsx
│   │   │   └── SourceFootnotes.tsx
│   │   ├── graph/
│   │   │   ├── GraphPanel.tsx
│   │   │   ├── GraphView.tsx             # dynamic import, ssr: false
│   │   │   ├── GraphTooltip.tsx
│   │   │   ├── GraphControls.tsx
│   │   │   └── GraphLegend.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx              # Root client component, all panel state
│   │   │   ├── ResizeHandle.tsx
│   │   │   └── SiteFooter.tsx
│   │   ├── nav/
│   │   │   ├── NavPanel.tsx
│   │   │   ├── NavFileTree.tsx
│   │   │   └── NavFileTreeItem.tsx
│   │   ├── search/
│   │   │   └── SearchModal.tsx
│   │   └── ui/
│   │       └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── content/
│   │   │   ├── getContentTree.ts         # RSC-safe, uses fs
│   │   │   ├── getPageContent.ts         # RSC-safe, uses fs + unified
│   │   │   └── getAllSlugs.ts
│   │   ├── markdown.ts                   # unified pipeline config
│   │   └── theme.ts                      # setTheme, getStoredTheme
│   ├── styles/
│   │   ├── themes.css                    # [data-theme] CSS custom properties
│   │   └── prose.css                     # .prose markdown typography
│   └── types/
│       ├── content.ts                    # Frontmatter, TreeNode, SearchEntry
│       └── graph.ts                      # GraphNode, GraphLink, GraphData
├── LICENSE                               # AGPL-3.0 (for /src)
├── CONTRIBUTING.md
├── README.md
├── next.config.ts
├── next-sitemap.config.js
├── tsconfig.json
├── tsconfig.scripts.json
├── .env.example
└── package.json
```

---

*This document is the technical source of truth for the OpenPropFirm v1 build. All implementation decisions in this document supersede vague or conflicting guidance in the project-brief.md, ui-guide.md, and v1-scope.md. When in doubt, the tech plan wins. Update this document when architectural decisions change — do not let it drift from reality.*
