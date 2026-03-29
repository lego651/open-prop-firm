# OpenPropFirm — UI Implementation Guide

Version: 1.0
Stack: Next.js 15 + TypeScript + shadcn/ui + Tailwind CSS
Target: Engineers building the frontend
Design philosophy: Faithful Obsidian clone adapted for the web — dark-first, keyboard-centric, content-dense without feeling cramped.

---

## Table of Contents

1. [Layout Architecture](#1-layout-architecture)
2. [Left Navigation Panel](#2-left-navigation-panel)
3. [Content Panel (Center)](#3-content-panel-center)
4. [Graph View (Right Panel)](#4-graph-view-right-panel)
5. [Search](#5-search)
6. [Theme System](#6-theme-system)
7. [Typography](#7-typography)
8. [Component Inventory](#8-component-inventory)
9. [Spacing and Grid](#9-spacing-and-grid)
10. [States and Interactions](#10-states-and-interactions)

---

## 1. Layout Architecture

### 1.1 Three-Panel Shell

The root layout is a full-viewport horizontal flex container. No scrolling at the shell level — each panel manages its own internal scroll.

```
┌──────────────────────────────────────────────────────────────────┐
│  [260px fixed]  │  [flex-1, min 400px]  │  [320px–600px, drag]  │
│  Left Nav       │  Content Panel         │  Graph / Split Panel  │
│  Panel 1        │  Panel 2               │  Panel 3              │
└──────────────────────────────────────────────────────────────────┘
```

**Shell element (`<AppShell>`):**
- `display: flex`
- `height: 100vh`
- `overflow: hidden`
- Background: `var(--background)`

**Panel 1 — Left Nav:**
- Width: `260px` (fixed, not resizable in v1)
- Can collapse to `48px` (icon-only rail)
- Transition: `width 200ms ease`
- Background: `var(--sidebar-bg)`
- Right border: `1px solid var(--border)`

**Panel 2 — Content (center):**
- `flex: 1 1 auto`
- `min-width: 400px`
- `overflow-y: auto`
- Background: `var(--background)`

**Panel 3 — Right Panel:**
- Default width: `360px`
- Draggable range: `280px` to `600px`
- Left border: `1px solid var(--border)`
- Background: `var(--sidebar-bg)` (graph mode) or `var(--background)` (split content mode)
- Toggleable — hidden by default on load if viewport < 1100px

### 1.2 Drag-Resize Between Panel 2 and Panel 3

A `<ResizeHandle>` element sits between Panel 2 and Panel 3. This is a custom component — shadcn does not provide one.

**Behavior:**
- Element: `4px` wide, full height
- Background: transparent in default state
- Cursor: `col-resize`
- On hover: background transitions to `var(--accent)` at 40% opacity, `200ms ease`
- On active drag: background is `var(--accent)` at 80% opacity
- Drag is implemented with `onPointerDown` / `onPointerMove` / `onPointerUp` listeners on the document (not the element) to prevent losing drag when cursor moves fast
- Panel 3 min-width enforced in the drag handler: clamp to `[280, 600]px`
- Width is stored in `useState` at the `<AppShell>` level, passed as inline style to Panel 3
- Persist the last user-set width to `localStorage` key `panel3Width`, load it on mount

**Implementation note:** Use `pointer-events` capture pattern:

```typescript
const handlePointerDown = (e: React.PointerEvent) => {
  e.currentTarget.setPointerCapture(e.pointerId);
  setIsDragging(true);
};
```

### 1.3 Panel 3 Mode Toggle: Graph vs Split Content

A toggle button lives in the top-right corner of Panel 3's header bar.

**Two modes:**
- `graph` — renders the `<GraphView>` component (default)
- `split` — renders a second `<ContentPanel>` instance showing a different file

**Toggle control:**
- Icon-only button, 28x28px
- Graph mode icon: a network/graph icon (Lucide `Network` or `GitFork`)
- Split mode icon: Lucide `Columns2` (or `PanelRight`)
- Active mode button has `background: var(--muted)` and `color: var(--foreground)`
- Inactive state: `color: var(--muted-foreground)`
- Mode stored in state at `<AppShell>` level, key `panel3Mode`
- Persisted to `localStorage` key `panel3Mode`

When switching from graph to split, Panel 3 shows the most recently viewed file (tracked in a `recentFiles` stack). If no secondary file is available, show the empty state (see Section 10.4).

### 1.4 Responsive Behavior

**v1 is desktop-first. Minimum supported viewport: 1024px wide.**

| Viewport | Behavior |
|---|---|
| >= 1280px | All 3 panels visible, full layout |
| 1024px–1279px | Panel 3 hidden by default; toggle button in top-right of Panel 2 header to show it as overlay |
| < 1024px | Panel 1 collapses to icon rail (48px); Panel 3 hidden; accessible via toggle |
| < 768px | Not officially supported in v1; graceful degradation: full-width content only, nav behind hamburger |

Mobile is out of scope for v1 but the CSS must not break below 1024px — it degrades gracefully.

---

## 2. Left Navigation Panel

### 2.1 Panel Structure

```
┌─────────────────────────┐
│  [Logo + App Name]       │  48px tall header
├─────────────────────────┤
│  [Search Bar]            │  36px, Cmd+K trigger
├─────────────────────────┤
│  [File Tree]             │  flex-1, overflow-y: auto
│    CFD                   │
│      ▶ Funded Next       │
│        📄 Overview       │
│        📄 Challenges     │
│        📄 Rules          │
│    Futures               │
│      ▶ Apex Funding      │
│        ...               │
├─────────────────────────┤
│  [Bottom Bar]            │  40px tall footer
│  [Settings] [Theme]      │
└─────────────────────────┘
```

### 2.2 Logo / Header Area

- Height: `48px`
- Left padding: `12px`
- Content: Logo mark (SVG, 20x20) + "OpenPropFirm" text in `14px / font-medium`
- Color: `var(--foreground)`
- No border on bottom — relies on subtle background color difference between sidebar and content

### 2.3 Search Trigger Bar

- Full-width button, `36px` height, `8px` horizontal margin
- Appearance: rounded `6px`, border `1px solid var(--border)`, background `var(--muted)`
- Contains: magnifier icon (Lucide `Search`, 14px) + placeholder text "Search..." + Kbd shortcut badge
- Kbd badge: `⌘K` in a `<kbd>` element, `10px` font, bordered, `var(--muted-foreground)` color
- Clicking opens the `<SearchModal>` (Section 5)
- No actual input functionality here — it's a button that triggers the modal

### 2.4 File Tree

**Data structure the tree renders:**

```typescript
type TreeNode = {
  id: string;           // e.g. "funded-next/challenges/10k"
  label: string;        // display name
  type: "folder" | "file";
  fileType?: "basic-info" | "challenge" | "rules" | "promo" | "changelog";
  children?: TreeNode[];
  isOpen?: boolean;
};
```

**Top-level groupings** (not collapsible, styled as category headers):
- "CFD" — `10px` uppercase, `font-semibold`, `var(--muted-foreground)`, `16px` top margin, `8px` bottom margin, `12px` left padding
- "Futures" — same treatment

**Firm folders** (collapsible):
- Height: `28px`
- Left padding: `12px` + depth indentation (`16px` per level)
- Chevron (Lucide `ChevronRight`, 14px): rotates `90deg` when open, `200ms ease`
- Firm name: `13px / font-medium`, `var(--foreground)`
- Hover background: `var(--muted)` at 60% (use `hover:bg-muted/60`)
- Active (currently contains open file): background `var(--muted)`, text `var(--accent)`

**File items:**
- Height: `26px`
- Left padding: `12px` + firm indent + `16px` (for file-level indent)
- File icon (14px): colored by `fileType` (see icon/color map in Section 4.5)
- Label: `13px / font-normal`, `var(--foreground)`
- Active (currently open): `background: var(--nav-active-bg)`, `color: var(--nav-active-fg)`, `font-medium`
- No external link icons — all navigation is internal

**Collapse/Expand behavior:**
- Tree state stored in `localStorage` key `navTreeState` as a JSON object `{ [folderId]: boolean }`
- Default: all firm folders collapsed, except the currently active file's parent chain which is expanded
- Clicking a folder toggles its children visibility
- No animation on children appearing/disappearing (keep it instant — Obsidian-style)

### 2.5 Bottom Bar

- Height: `40px`
- `border-top: 1px solid var(--border)`
- Background: `var(--sidebar-bg)`
- Layout: `flex items-center justify-between px-3`

**Left side:** Settings icon button (Lucide `Settings`, 16px) — opens `<SettingsModal>` (v2 scope, placeholder in v1)

**Right side:** Theme toggle button — cycles through `light → dark → blue → light`. Icon changes:
- Light theme active: Lucide `Sun` (16px)
- Dark theme active: Lucide `Moon` (16px)
- Blue theme active: Lucide `Palette` (16px)

Both are icon-only buttons, `28x28px`, `border-radius: 6px`. Hover: `background: var(--muted)`.

---

## 3. Content Panel (Center)

### 3.1 Panel Structure

```
┌──────────────────────────────────────────┐
│  [Tab Bar]                                │  36px
├──────────────────────────────────────────┤
│  [Breadcrumb + Back/Fwd Nav]              │  36px
├──────────────────────────────────────────┤
│  [last_verified Badge]                    │  auto height
├──────────────────────────────────────────┤
│  [Markdown Content Area]                  │  flex-1, scroll
├──────────────────────────────────────────┤
│  [Source Footnotes]                       │  auto height
└──────────────────────────────────────────┘
```

### 3.2 Tab Bar

Modeled on Obsidian's tab bar. Tabs live in a horizontal scroll container.

**Tab item:**
- Height: `36px`
- Min-width: `120px`, max-width: `200px`
- Padding: `0 12px`
- Border-right: `1px solid var(--border)`
- Background active: `var(--background)` with `border-bottom: 2px solid var(--accent)`
- Background inactive: `var(--sidebar-bg)`
- Label: `13px`, truncated with ellipsis
- Close button (`×`, Lucide `X`, 12px): appears on hover, right side of tab
- Clicking a tab navigates to that file (updates URL and content)
- Tab state: array of open file IDs stored in `localStorage` key `openTabs`

**Tab bar container:**
- `overflow-x: auto`, scrollbar hidden (`scrollbar-width: none`)
- `border-bottom: 1px solid var(--border)`
- `+ new tab` button at far right (Lucide `Plus`, 16px, icon-only, 36x36px) — opens search modal to pick a file

### 3.3 Breadcrumb Navigation

Using shadcn `Breadcrumb` component.

Layout: `flex items-center gap-1` inside a `36px` height bar, `px-6` padding.

Structure: `CFD > Funded Next > Challenges > 10k Challenge`

- Separator: `/` in `var(--muted-foreground)`, `12px`
- Links: `13px`, `var(--muted-foreground)` — hover: `var(--foreground)`, underline
- Current page (last crumb): `13px`, `var(--foreground)`, no underline, not a link
- Back button (Lucide `ChevronLeft`, 16px) left of breadcrumb — hover: `var(--foreground)`, disabled state: 30% opacity
- Forward button (Lucide `ChevronRight`, 16px) next to back button
- Back/forward history: stored in component state as a stack, not browser history (Obsidian-style in-app history)

### 3.4 `last_verified` Badge

Shown at the top of every content page, below the breadcrumb bar, above the H1.

**Component:** `<VerifiedBadge>` (custom)

```
┌──────────────────────────────────────────────────────────────────┐
│  ✓ Last verified: March 28, 2026 · by bot · Source: [link] [link]│
└──────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Full-width bar or inline block — use full-width bar for consistency
- Background: `var(--verified-badge-bg)` (subtle green tint in light; dark olive tint in dark)
- Border: `1px solid var(--verified-badge-border)`
- Border-radius: `6px`
- Padding: `8px 12px`
- Margin-bottom: `24px`
- Font: `12px / font-normal`, `var(--verified-badge-fg)`
- Checkmark icon: Lucide `CheckCircle2`, 13px, `var(--verified-badge-fg)`
- Source links: inline `<a>` elements, `var(--accent)`, no underline default, underline on hover
- If `verified_by: bot` → append "(automated)" in muted text
- If `verified_by: manual` → append "(manual review)"

**Token values per theme — see Section 6.**

### 3.5 Markdown Content Area

Container:
- Max-width: `720px` (readable line length)
- Margin: `0 auto`
- Padding: `32px 48px` on desktop; `24px 24px` on smaller
- `overflow-y: auto` — this is the scrolling element

#### Markdown Element Styles

All styles applied via a `.prose` wrapper class (custom, not Tailwind's `@tailwindcss/typography` plugin — see note below).

**Note on Tailwind Typography:** The Tailwind `prose` plugin can be used as a base, but it must be heavily overridden to match the Obsidian aesthetic. Either use it and override, or write a custom `.prose` class. The custom approach is recommended for full control.

**Headings:**

| Element | Size | Weight | Color | Top margin | Bottom margin |
|---|---|---|---|---|---|
| H1 | 26px | 700 | `var(--foreground)` | 0 | 16px |
| H2 | 20px | 600 | `var(--foreground)` | 32px | 12px |
| H3 | 16px | 600 | `var(--foreground)` | 24px | 8px |
| H4 | 14px | 600 | `var(--foreground)` | 20px | 6px |

H1 border-bottom: `1px solid var(--border)`, padding-bottom `12px`.
H2 border-bottom: `1px solid var(--border)` at 40% opacity, padding-bottom `8px`.
H3, H4: no border.

**Paragraph:**
- Font: `15px / 1.6`, `var(--foreground)`
- Margin-bottom: `16px`

**Bold / Strong:**
- `font-weight: 600`, same color as paragraph

**Italic / Em:**
- `font-style: italic`

**Inline code:**
- Font: `var(--font-mono)`, `13px`
- Background: `var(--code-bg)`
- Color: `var(--code-fg)`
- Padding: `2px 5px`
- Border-radius: `4px`
- Border: `1px solid var(--border)`

**Code blocks (fenced):**
- Background: `var(--code-block-bg)`
- Border: `1px solid var(--border)`
- Border-radius: `6px`
- Padding: `16px`
- Font: `var(--font-mono)`, `13px / 1.5`
- Color: `var(--code-fg)`
- Overflow-x: `auto`
- Optional: line numbers in left gutter (v2 feature)
- Language label: small badge top-right of block, `10px`, `var(--muted-foreground)`

**Tables:**
- Full width within content area
- Border-collapse: `collapse`
- Header row: background `var(--muted)`, `font-weight: 600`, `13px`
- Cell: padding `8px 12px`, `border: 1px solid var(--border)`, `14px`
- Alternating row striping: even rows `var(--muted)` at 30% opacity
- Overflow: wrap in a `div` with `overflow-x: auto` for wide tables

**Blockquotes:**
- Left border: `3px solid var(--accent)`
- Padding-left: `16px`
- Margin: `16px 0`
- Color: `var(--muted-foreground)`
- Font: `15px / 1.6`, italic

**Unordered lists:**
- `list-style: disc`
- Left margin: `24px`
- Item gap: `6px`
- Nested indent: `16px` per level

**Ordered lists:**
- `list-style: decimal`
- Same spacing as unordered

**Horizontal rule:**
- `border: none; border-top: 1px solid var(--border)`
- Margin: `32px 0`

**Footnote references (inline `[^1]`):**
- Superscript, `var(--accent)`, cursor pointer
- On click: smooth scroll to footnote at page bottom

### 3.6 Wikilink Rendering

`[[wikilinks]]` are parsed and rendered as internal navigation links.

**Component:** `<WikiLink>` (custom)

**Visual treatment (must not look like a blue hyperlink):**
- Color: `var(--wikilink-fg)` (slightly brighter than body text, distinct from external links)
- Text-decoration: `underline` with `text-decoration-style: dotted`, `text-underline-offset: 3px`
- Underline color: `var(--wikilink-underline)` (muted, not the full text color)
- No icon (external links get an icon; wikilinks do not)
- Cursor: `pointer`
- On hover: `color: var(--wikilink-hover-fg)`, underline becomes solid
- On click: navigate to the linked file in the current panel (push to history stack)

**Non-existent wikilinks** (target file not found):
- Color: `var(--wikilink-missing-fg)` (muted red/salmon)
- Dotted underline in same muted red
- Cursor: `pointer`
- On click: open the search modal pre-filled with the link text (like Obsidian — invite the user to create the file or search)

**External links** (`[text](url)`):
- Color: `var(--link-fg)` (standard link color, `var(--accent)` works)
- Underline on hover only
- Icon: Lucide `ExternalLink`, 11px, displayed inline after the text, slight opacity
- Opens in new tab (`target="_blank" rel="noopener noreferrer"`)

### 3.7 Source Footnotes Section

Rendered at the bottom of every page that has frontmatter `sources` array entries.

**Component:** `<SourceFootnotes>` (custom)

```
─────────────────────────────────
Sources

[1] Official Challenge Page — https://fundednext.com/challenges
[2] ...
```

- Separator: `1px solid var(--border)`, margin-top `40px`
- "Sources" heading: `12px / font-semibold / uppercase`, `var(--muted-foreground)`, letter-spacing `0.08em`
- Each entry: `12px`, `var(--muted-foreground)`, numbered list
- Link portion: `var(--accent)`, underline on hover, opens in new tab
- Also renders markdown footnote definitions `[^1]:` as a separate block labeled "Footnotes" above Sources

### 3.8 Loading State

While markdown is being fetched/parsed:
- Replace content area with skeleton loaders (shadcn `Skeleton` component)
- Skeleton layout mimics: H1 (1 block), 3 paragraph lines, a table outline, 2 more paragraph lines
- Skeleton color: `var(--muted)` animating to `var(--muted)/60`
- No spinner — Obsidian never uses spinners for file loading

---

## 4. Graph View (Right Panel)

### 4.1 Library Recommendation

Use `react-force-graph-2d` (wrapper around D3 force simulation, canvas-based rendering). It is performant for hundreds of nodes and integrates cleanly with React.

Alternative: `@visx/network` if you want SVG-based and more design control, but canvas is faster for this use case.

### 4.2 Canvas Setup

- Fill Panel 3 completely (`width: 100%, height: 100%`)
- Background: `var(--graph-bg)` (slightly different from sidebar — very subtle)
- No scrollbars — the graph is panned/zoomed within the canvas

### 4.3 Node Design

**Default node:**
- Shape: circle
- Radius: `5px` base size
- Size scales with inbound link count: `radius = 5 + (inboundLinks * 1.5)`, capped at `22px`
- Fill color: based on `fileType` (see color map below)
- Stroke: `1.5px`, `var(--graph-node-stroke)` (slightly lighter/darker than fill)

**Node color map by `fileType`:**

| Type | Light theme | Dark theme | Blue theme |
|---|---|---|---|
| `basic-info` | `#7C85FF` | `#8B92FF` | `#A0AAFF` |
| `challenge` | `#4CAF82` | `#56C290` | `#60CCA0` |
| `rules` | `#F0A050` | `#F5AA60` | `#FFBA70` |
| `promo` | `#E06080` | `#E87090` | `#F080A0` |
| `changelog` | `#9B7ED0` | `#A88EDD` | `#B89EED` |
| `unknown` | `#909090` | `#A0A0A0` | `#B0B0B0` |

**Selected node:**
- Stroke width: `3px`
- Stroke color: `var(--accent)` (theme accent color)
- Animated pulse ring (CSS animation on a second circle, `opacity: 0 → 0.4 → 0`, `1.2s ease infinite`)

**Hovered node:**
- Opacity boost on node fill (multiply alpha by 1.2)
- Show tooltip (see 4.5)

### 4.4 Edge Design

- Color: `var(--graph-edge-color)` (very low contrast — edges are secondary)
- Width: `1px`
- Opacity: `0.3` default; `0.7` when either connected node is hovered or selected
- No arrowheads in default view (undirected visual, like Obsidian)

### 4.5 Hover Tooltip

**Component:** `<GraphTooltip>` (custom, positioned absolutely over the canvas)

Contents:
```
[colored dot] Funded Next — $50k Challenge
              12 inbound links · challenge
```

- Background: `var(--popover-bg)`, `1px solid var(--border)`, `border-radius: 6px`
- Padding: `8px 12px`
- Font: `12px`, `var(--foreground)`
- Colored dot: `8px` circle, same color as the node's `fileType` color
- Sub-line: `11px`, `var(--muted-foreground)`
- Positioned at cursor + `[12px, 12px]` offset; flips left if near right edge

### 4.6 Click Behavior

- Single click on a node: load that file in Panel 2 (center content)
- Ctrl/Cmd + click on a node: load that file in Panel 3 (split mode — auto-switches Panel 3 to split mode)

### 4.7 Mini Controls

Overlay on the bottom-right of the graph canvas, inside Panel 3.

```
[Zoom In] [Zoom Out] [Fit] | [Filter dropdown]
```

- Each button: `28x28px`, icon-only, `background: var(--popover-bg)`, `border: 1px solid var(--border)`, `border-radius: 4px`
- Gap between buttons: `4px`
- Zoom In: Lucide `ZoomIn` (14px)
- Zoom Out: Lucide `ZoomOut` (14px)
- Fit (fit all nodes in view): Lucide `Maximize2` (14px)
- Filter dropdown: Lucide `SlidersHorizontal` (14px) — opens a small popover with checkboxes per `fileType` to show/hide node types

**Filter popover:**
- Uses shadcn `Popover` component
- Checkbox list: one row per `fileType`, colored dot + label + shadcn `Checkbox`
- All checked by default
- Filtering: hides/shows nodes and their edges based on `fileType`

### 4.8 Graph Legend

Small legend overlay in the bottom-left corner of the graph canvas:

```
● basic-info   ● challenge   ● rules
● promo        ● changelog
```

- Each item: `10px`, `var(--muted-foreground)`, colored circle (`8px`)
- Background: `var(--popover-bg)` at 80% opacity, `border-radius: 6px`, `padding: 6px 10px`

---

## 5. Search

### 5.1 Triggering

- Keyboard shortcut: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- Click on the search bar in Panel 1
- Click the `+` tab button in the tab bar

### 5.2 Modal Layout

**Component:** `<SearchModal>` (custom, built on shadcn `Dialog` + `Command`)

Actually: use shadcn's `Command` component (`cmdk` under the hood) for the full implementation. It handles keyboard navigation, filtering, and grouping natively.

```
┌───────────────────────────────────────────────────────────────┐
│  🔍  [Search files and content...]                   [Esc]    │
├───────────────────────────────────────────────────────────────┤
│  CFD                                                          │
│    📄 Funded Next — $50k Challenge                            │
│       ...profit target of 10% is required...                  │
│    📄 Funded Next — Rules                                     │
│       ...trailing drawdown applies to all...                  │
│  Futures                                                      │
│    📄 Apex Funding — Overview                                 │
│       ...based in Dallas, founded 2021...                     │
└───────────────────────────────────────────────────────────────┘
```

**Modal container:**
- Max-width: `600px`, centered vertically at 30% from top (not true center — top-biased like Obsidian and Spotlight)
- Background: `var(--popover-bg)`
- Border: `1px solid var(--border)`
- Border-radius: `10px`
- Box shadow: `0 20px 60px rgba(0,0,0,0.4)` (prominent — this is a focus overlay)
- Backdrop: `rgba(0,0,0,0.5)` blur `4px`

**Input:**
- Height: `48px`
- Font: `16px`, `var(--foreground)`
- Placeholder: `var(--muted-foreground)`
- No border on input — the border is on the modal container
- Bottom border on input row: `1px solid var(--border)` separating input from results
- Search icon: Lucide `Search`, 18px, `var(--muted-foreground)`, left of input

**Result groups:**
- Group label: `11px / uppercase / font-semibold`, `var(--muted-foreground)`, `padding: 6px 12px`, `letter-spacing: 0.06em`
- Result item: `36px` min-height, `padding: 6px 12px`
- File icon (13px, colored by `fileType`) + file title (`14px`) on first line
- Context snippet (`12px`, `var(--muted-foreground)`) on second line if content match

**Keyword highlighting in snippets:**
- `<mark>` element styled: `background: var(--search-highlight-bg)`, `color: var(--search-highlight-fg)`, no border-radius, `padding: 0 1px`

**Keyboard navigation:**
- `ArrowUp` / `ArrowDown`: move selection, auto-scroll selected item into view
- `Enter`: open the selected file in Panel 2
- `Cmd+Enter`: open in Panel 3 (split mode)
- `Esc`: close modal

**Empty state:**
- Centered, `var(--muted-foreground)`, Lucide `FileQuestion` (48px), "No results for `[query]`" in `14px`

**Tech note:** Search index strategy (decide at implementation time):
- `Pagefind` — best for static sites, runs at build time, zero runtime cost, supports keyword highlighting natively
- `Fuse.js` — simpler, client-side, good enough for a few hundred markdown files
- For v1 (4 firms, ~20–30 files) Fuse.js is sufficient; migrate to Pagefind if content grows

---

## 6. Theme System

### 6.1 Architecture

Themes are implemented entirely via CSS custom properties on the `:root` (or `[data-theme]`) selector. No JavaScript color logic at render time.

**Theme application:**

```html
<html data-theme="dark">
```

Theme is set by toggling the `data-theme` attribute on `<html>`. This allows CSS to respond immediately without React re-renders.

```typescript
// lib/theme.ts
export type Theme = "light" | "dark" | "blue";

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export function getStoredTheme(): Theme {
  return (localStorage.getItem("theme") as Theme) ?? "dark";
}
```

On initial load (in a `<script>` tag in `<head>` before page render, to prevent flash):

```html
<script>
  (function() {
    const t = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", t);
  })();
</script>
```

### 6.2 All CSS Custom Properties

Defined in `styles/themes.css`:

```css
/* ─────────────────────────────────────────
   BASE TOKENS (shared structure)
───────────────────────────────────────── */

:root {
  --radius: 6px;
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace;
}

/* ─────────────────────────────────────────
   LIGHT THEME
───────────────────────────────────────── */

[data-theme="light"] {
  /* Core */
  --background:           #FFFFFF;
  --foreground:           #1A1A1A;
  --muted:                #F0F0F0;
  --muted-foreground:     #777777;
  --border:               #E0E0E0;
  --accent:               #7B61FF;
  --accent-foreground:    #FFFFFF;

  /* Sidebar / Nav */
  --sidebar-bg:           #F7F7F7;
  --nav-active-bg:        #EAE8FF;
  --nav-active-fg:        #5A48D0;

  /* Popovers / Dropdowns */
  --popover-bg:           #FFFFFF;
  --popover-border:       #E0E0E0;

  /* Code */
  --code-bg:              #F0F0F0;
  --code-block-bg:        #F5F5F5;
  --code-fg:              #C7254E;

  /* Links */
  --link-fg:              #7B61FF;
  --wikilink-fg:          #4A4A8A;
  --wikilink-underline:   #A0A0C0;
  --wikilink-hover-fg:    #7B61FF;
  --wikilink-missing-fg:  #C0504A;

  /* Verified badge */
  --verified-badge-bg:    #EFF7F2;
  --verified-badge-border:#B8DEC8;
  --verified-badge-fg:    #2D6A4F;

  /* Search */
  --search-highlight-bg:  #FFF380;
  --search-highlight-fg:  #1A1A1A;

  /* Graph */
  --graph-bg:             #FAFAFA;
  --graph-edge-color:     #BBBBBB;
  --graph-node-stroke:    rgba(0,0,0,0.15);
}

/* ─────────────────────────────────────────
   DARK THEME (default)
───────────────────────────────────────── */

[data-theme="dark"] {
  /* Core */
  --background:           #1E1E2E;
  --foreground:           #CDD6F4;
  --muted:                #2A2A3E;
  --muted-foreground:     #6C7086;
  --border:               #313244;
  --accent:               #CBA6F7;
  --accent-foreground:    #1E1E2E;

  /* Sidebar / Nav */
  --sidebar-bg:           #181825;
  --nav-active-bg:        #313244;
  --nav-active-fg:        #CBA6F7;

  /* Popovers / Dropdowns */
  --popover-bg:           #24273A;
  --popover-border:       #363A52;

  /* Code */
  --code-bg:              #2A2A3E;
  --code-block-bg:        #232336;
  --code-fg:              #F38BA8;

  /* Links */
  --link-fg:              #89B4FA;
  --wikilink-fg:          #B4BEFE;
  --wikilink-underline:   #585B70;
  --wikilink-hover-fg:    #CBA6F7;
  --wikilink-missing-fg:  #F38BA8;

  /* Verified badge */
  --verified-badge-bg:    #1E2D24;
  --verified-badge-border:#2D4A38;
  --verified-badge-fg:    #A6E3A1;

  /* Search */
  --search-highlight-bg:  #F9E2AF;
  --search-highlight-fg:  #1E1E2E;

  /* Graph */
  --graph-bg:             #181825;
  --graph-edge-color:     #45475A;
  --graph-node-stroke:    rgba(255,255,255,0.1);
}

/* ─────────────────────────────────────────
   BLUE THEME
───────────────────────────────────────── */

[data-theme="blue"] {
  /* Core */
  --background:           #0D1117;
  --foreground:           #E6EDF3;
  --muted:                #161B22;
  --muted-foreground:     #8B949E;
  --border:               #30363D;
  --accent:               #58A6FF;
  --accent-foreground:    #0D1117;

  /* Sidebar / Nav */
  --sidebar-bg:           #090D12;
  --nav-active-bg:        #1F3A5F;
  --nav-active-fg:        #79C0FF;

  /* Popovers / Dropdowns */
  --popover-bg:           #161B22;
  --popover-border:       #30363D;

  /* Code */
  --code-bg:              #161B22;
  --code-block-bg:        #0D1117;
  --code-fg:              #FF7B72;

  /* Links */
  --link-fg:              #58A6FF;
  --wikilink-fg:          #79C0FF;
  --wikilink-underline:   #21262D;
  --wikilink-hover-fg:    #A5D6FF;
  --wikilink-missing-fg:  #FF7B72;

  /* Verified badge */
  --verified-badge-bg:    #0D1F2D;
  --verified-badge-border:#133D5E;
  --verified-badge-fg:    #3FB950;

  /* Search */
  --search-highlight-bg:  #E3B341;
  --search-highlight-fg:  #0D1117;

  /* Graph */
  --graph-bg:             #090D12;
  --graph-edge-color:     #21262D;
  --graph-node-stroke:    rgba(255,255,255,0.08);
}
```

### 6.3 Adding a New Theme

Themes are fully configuration-based. To add a new theme:

1. Add a new `[data-theme="mytheme"]` block in `styles/themes.css` defining all tokens listed above.
2. Add `"mytheme"` to the `Theme` type in `lib/theme.ts`.
3. Add the theme to the cycle order in the bottom bar toggle button component.
4. (Optional) Add a theme name label to the settings modal when it exists.

No other files need to change. The theme system is intentionally isolated to CSS variables and a single utility file.

---

## 7. Typography

### 7.1 Font Stack

**Sans-serif (UI + content body):**

```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
```

Load Inter via `next/font/google`:

```typescript
// app/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
```

Use weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold).

**Monospace (code):**

```css
font-family: "JetBrains Mono", "Fira Code", "Cascadia Code",
             ui-monospace, "Courier New", monospace;
```

Load JetBrains Mono from Google Fonts. Use weight 400 only.

### 7.2 Type Scale

| Token | Size | Line height | Usage |
|---|---|---|---|
| `--text-xs` | 10px | 1.4 | Kbd badges, graph legend |
| `--text-sm` | 12px | 1.5 | Footnotes, metadata, badge text |
| `--text-base` | 13px | 1.5 | Nav items, tabs, breadcrumbs |
| `--text-body` | 15px | 1.6 | Markdown paragraph text |
| `--text-md` | 16px | 1.5 | Search input |
| `--text-h4` | 14px | 1.4 | H4 headings |
| `--text-h3` | 16px | 1.4 | H3 headings |
| `--text-h2` | 20px | 1.3 | H2 headings |
| `--text-h1` | 26px | 1.2 | H1 headings |
| `--text-lg` | 18px | 1.4 | Modal titles |

### 7.3 Content Max Width

The markdown content area has a max-width of `720px`. This is the sweet spot for readability at the default font size (15px body).

- Below 720px (Panel 2 gets narrow): content fills available width, padding reduces to `24px` each side
- Tables inside content that exceed content width: wrap in `overflow-x: auto` container

### 7.4 Markdown-Specific Typography Notes

- List items: `15px / 1.6`, same as paragraph
- Table cells: `14px / 1.5` to fit more data
- Code blocks: `13px / 1.5` with JetBrains Mono
- Blockquote text: `15px / 1.6`, italic, `var(--muted-foreground)`
- All heading anchors (H2, H3) get a `#` link on hover for deep linking (Obsidian behavior, optional for v1)

---

## 8. Component Inventory

### 8.1 shadcn/ui Components Used

Install these via `npx shadcn@latest add [component]`:

| Component | Used in | Notes |
|---|---|---|
| `button` | Nav bottom bar, graph controls, tab bar, modal close | Use `variant="ghost"` for icon buttons |
| `breadcrumb` | Content panel header | Standard shadcn breadcrumb |
| `command` | Search modal | Core of `<SearchModal>` — use `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem` |
| `dialog` | Search modal wrapper | Wrap `Command` inside `DialogContent` |
| `popover` | Graph filter popover, link previews | Standard |
| `checkbox` | Graph filter popover | One per `fileType` |
| `skeleton` | Content loading state | Replace content area during load |
| `separator` | Source footnotes divider, panel separators | `<Separator />` |
| `tooltip` | Graph controls hover labels, bottom bar icon labels | Wrap all icon-only buttons |
| `scroll-area` | Nav file tree, tab bar | Custom scrollbar styling |
| `badge` | `fileType` labels in search results | Use `variant="secondary"` |
| `dropdown-menu` | (Optional) right-click context menu on nav items | Low priority for v1 |

### 8.2 Custom Components (not in shadcn)

These must be built from scratch:

| Component | Location | Description |
|---|---|---|
| `<AppShell>` | `components/layout/AppShell.tsx` | Root 3-panel flex layout, manages panel widths and Panel 3 mode |
| `<ResizeHandle>` | `components/layout/ResizeHandle.tsx` | Draggable divider between Panel 2 and Panel 3 |
| `<NavPanel>` | `components/nav/NavPanel.tsx` | Entire left sidebar including tree, search trigger, bottom bar |
| `<FileTree>` | `components/nav/FileTree.tsx` | Recursive collapsible tree component |
| `<FileTreeItem>` | `components/nav/FileTreeItem.tsx` | Single node in the file tree (folder or file) |
| `<TabBar>` | `components/content/TabBar.tsx` | Horizontal tab strip at top of Panel 2 |
| `<ContentPanel>` | `components/content/ContentPanel.tsx` | Scrollable content area with breadcrumb, badge, markdown |
| `<MarkdownRenderer>` | `components/content/MarkdownRenderer.tsx` | Converts parsed markdown AST to React elements with custom renderers |
| `<WikiLink>` | `components/content/WikiLink.tsx` | Internal link component with navigate-on-click and missing-link state |
| `<VerifiedBadge>` | `components/content/VerifiedBadge.tsx` | `last_verified` timestamp + source links bar |
| `<SourceFootnotes>` | `components/content/SourceFootnotes.tsx` | Renders frontmatter `sources` array at page bottom |
| `<GraphView>` | `components/graph/GraphView.tsx` | Canvas-based force-directed graph via `react-force-graph-2d` |
| `<GraphTooltip>` | `components/graph/GraphTooltip.tsx` | Absolute-positioned tooltip shown on node hover |
| `<GraphControls>` | `components/graph/GraphControls.tsx` | Zoom/fit/filter overlay inside graph canvas |
| `<GraphLegend>` | `components/graph/GraphLegend.tsx` | Node type color legend overlay |
| `<SearchModal>` | `components/search/SearchModal.tsx` | Full-screen search built on shadcn `Command` |
| `<ThemeToggle>` | `components/ui/ThemeToggle.tsx` | Cycles light/dark/blue, writes to localStorage and `data-theme` |

### 8.3 Markdown Parsing Stack

Use `unified` + `remark` + `rehype` pipeline:

```
remark-parse → remark-gfm (tables, strikethrough) → remark-rehype → rehype-react
```

Custom plugins needed:
- `remark-wikilinks` — parse `[[target]]` and `[[target|display]]` into a custom AST node, then render as `<WikiLink>` in rehype-react
- Custom rehype-react component map to apply all the styles in Section 3.5

```typescript
// lib/markdown.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeReact from "rehype-react";
// import remarkWikilinks from "./remark-wikilinks"; // custom plugin

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikilinks)
  .use(remarkRehype)
  .use(rehypeReact, {
    components: {
      a: ExternalLink,
      // wikilink: WikiLink,  // from custom plugin
      table: OverflowTable,
      code: CodeBlock,
      // ... etc
    }
  });
```

---

## 9. Spacing and Grid

### 9.1 Panel Dimensions

| Panel | Property | Value |
|---|---|---|
| Panel 1 (nav) | Width (expanded) | `260px` |
| Panel 1 (nav) | Width (collapsed) | `48px` |
| Panel 1 | Transition | `width 200ms ease` |
| Panel 2 (content) | Min-width | `400px` |
| Panel 2 | Flex | `1 1 auto` |
| Panel 3 (right) | Default width | `360px` |
| Panel 3 | Min-width (drag clamp) | `280px` |
| Panel 3 | Max-width (drag clamp) | `600px` |
| ResizeHandle | Width | `4px` |
| Tab bar | Height | `36px` |
| Breadcrumb bar | Height | `36px` |
| Nav header | Height | `48px` |
| Nav bottom bar | Height | `40px` |

### 9.2 Content Area Padding

| Context | Top | Right | Bottom | Left |
|---|---|---|---|---|
| Content area (normal) | `32px` | `48px` | `48px` | `48px` |
| Content area (narrow, < 600px panel width) | `24px` | `24px` | `32px` | `24px` |
| Nav item (file) | `4px` | `12px` | `4px` | `[depth * 16px + 12px]` |
| Nav item (folder) | `4px` | `12px` | `4px` | `[depth * 16px + 12px]` |
| Search modal | `0` | `0` | `0` | `0` (managed internally by cmdk) |
| Graph controls overlay | — | `12px` | `12px` | — (bottom-right) |
| Graph legend overlay | — | — | `12px` | `12px` (bottom-left) |

### 9.3 Spacing Scale Reference

Use these values only (based on a 4px base unit):

| Token | Value | Common use |
|---|---|---|
| `space-1` | `4px` | Icon gaps, tight padding |
| `space-2` | `8px` | Internal padding, row gaps |
| `space-3` | `12px` | Nav padding, button padding |
| `space-4` | `16px` | Section spacing, indent width |
| `space-5` | `20px` | Heading margins |
| `space-6` | `24px` | Large section gaps |
| `space-8` | `32px` | Content top padding |
| `space-10` | `40px` | Bottom bar height, large margins |
| `space-12` | `48px` | Nav header height equiv, content padding |

### 9.4 Border Radius

| Context | Value |
|---|---|
| Nav items, buttons | `6px` |
| Modals, cards, popovers | `8px` or `10px` |
| Inline code | `4px` |
| Code blocks, tables | `6px` |
| Badge / kbd | `4px` |
| Tooltip | `6px` |
| Graph controls buttons | `4px` |

---

## 10. States and Interactions

### 10.1 Nav Item States

**File item:**

| State | Background | Text color | Notes |
|---|---|---|---|
| Default | transparent | `var(--foreground)` | |
| Hover | `var(--muted)` | `var(--foreground)` | `transition: background 100ms` |
| Active (open file) | `var(--nav-active-bg)` | `var(--nav-active-fg)` | `font-weight: 500` |
| Focus-visible | `var(--muted)` + `outline: 2px solid var(--accent)` | `var(--foreground)` | For keyboard navigation |

**Folder item:**

| State | Background | Chevron | Notes |
|---|---|---|---|
| Default | transparent | `var(--muted-foreground)` | |
| Hover | `var(--muted)` at 60% | `var(--foreground)` | |
| Open (children visible) | transparent | rotated 90deg | No persistent highlight |
| Contains active file | transparent | `var(--accent)` | Only the chevron changes color |

### 10.2 Link States

**Wikilinks:**

| State | Color | Underline |
|---|---|---|
| Default | `var(--wikilink-fg)` | Dotted, `var(--wikilink-underline)` |
| Hover | `var(--wikilink-hover-fg)` | Solid, `var(--wikilink-hover-fg)` |
| Active (click) | `var(--accent)` at 80% | Solid |
| Focus-visible | Default color + `outline: 2px solid var(--accent)` | Dotted |

**External links:**

| State | Color | Decoration | Icon |
|---|---|---|---|
| Default | `var(--link-fg)` | None | Visible at 50% opacity |
| Hover | `var(--link-fg)` | Underline | Icon at 100% opacity |
| Visited | `var(--link-fg)` at 70% | None | (no visited styling needed in an app context) |

**Missing wikilinks:**

| State | Color | Underline |
|---|---|---|
| Default | `var(--wikilink-missing-fg)` | Dotted, same color |
| Hover | `var(--wikilink-missing-fg)` | Solid |

### 10.3 Tab States

| State | Background | Bottom border | Text |
|---|---|---|---|
| Inactive | `var(--sidebar-bg)` | none | `var(--muted-foreground)` |
| Active | `var(--background)` | `2px solid var(--accent)` | `var(--foreground)` |
| Hover (inactive) | `var(--muted)` at 40% | none | `var(--foreground)` |
| Close button hover | — | — | Close button opacity 1 (was 0) |

### 10.4 Empty States

**Panel 2 — No file open:**
```
         [FileText icon, 48px, var(--muted-foreground)]
         Open a file from the sidebar
         or press ⌘K to search
```
- Centered vertically and horizontally in Panel 2
- Icon: `var(--muted-foreground)`, 48px
- Heading: `16px / font-medium / var(--muted-foreground)`
- Sub-text: `13px / var(--muted-foreground)`
- Keyboard shortcut badge: `<kbd>` element, `var(--muted-foreground)`

**Panel 3 (split mode) — No secondary file:**
Same as above but smaller: icon 32px, heading 14px, sub-text 12px.

**Graph view — No data:**
```
         [Network icon, 48px]
         No graph data available
```
Same treatment.

**Search — No results:**
```
         [Search icon, 36px]
         No results for "[query]"
         Try a different keyword
```

### 10.5 Loading States

**File content loading:**
- Tab label shows a subtle pulse animation on the text (not a spinner)
- Content area shows skeleton:
  - Row 1: `280px` wide block, `28px` tall (H1 placeholder)
  - Rows 2–3: `100%` wide, `14px` tall, `8px` gap (paragraph lines)
  - Row 4: full-width block `100px` tall (table placeholder)
  - Rows 5–6: `90%` and `70%` wide, `14px` tall (more paragraph lines)
- Use shadcn `Skeleton` component for each block
- Animation: shimmer left-to-right, `1.5s ease infinite`

**Graph loading:**
- Show the canvas with background color immediately
- Overlay a centered `var(--muted-foreground)` text: "Building graph..." in `13px`
- No spinner — just the text

**Search — searching:**
- `CommandList` shows a `CommandEmpty` with "Searching..." text while async results load
- If using Fuse.js (synchronous), no loading state needed — results are instant

### 10.6 Focus Management

All interactive elements must have visible focus indicators for keyboard accessibility:

- Default browser outline is removed (via Tailwind's `outline-none`) only when replaced with a custom ring
- Custom focus style: `outline: 2px solid var(--accent); outline-offset: 2px`
- Apply via Tailwind: `focus-visible:ring-2 focus-visible:ring-[var(--accent)]`
- The `focus-visible` pseudo-class ensures ring only shows for keyboard navigation, not mouse clicks
- Graph canvas: when a node is "focused" via keyboard (Tab key navigation on nodes — future v2 feature), the selected node pulse ring serves as the focus indicator

### 10.7 Transition Reference

| Interaction | Property | Duration | Easing |
|---|---|---|---|
| Nav collapse/expand | `width` | `200ms` | `ease` |
| Chevron rotate | `transform` | `200ms` | `ease` |
| Nav item hover | `background-color` | `100ms` | `ease` |
| Tab hover | `background-color` | `100ms` | `ease` |
| Resize handle hover | `background-color` | `150ms` | `ease` |
| Theme switch | All CSS variables | `150ms` | `ease` (apply `transition: color 150ms, background 150ms` to shell) |
| Search modal open | `opacity` + `transform` | `150ms` | `ease-out` (slide down 8px) |
| Search modal close | `opacity` + `transform` | `100ms` | `ease-in` |
| Graph node hover | fill opacity | `80ms` | — (canvas, not CSS) |
| Wikilink hover | `color`, `text-decoration` | `80ms` | `ease` |

---

## Appendix A: File Structure Reference

```
app/
  layout.tsx             # Root layout: applies font, theme script, AppShell
  page.tsx               # Redirects to default file or shows empty state
  [firmType]/
    [firmSlug]/
      [contentType]/
        page.tsx         # Dynamic route: loads markdown, renders ContentPanel

components/
  layout/
    AppShell.tsx
    ResizeHandle.tsx
  nav/
    NavPanel.tsx
    FileTree.tsx
    FileTreeItem.tsx
  content/
    TabBar.tsx
    ContentPanel.tsx
    MarkdownRenderer.tsx
    WikiLink.tsx
    VerifiedBadge.tsx
    SourceFootnotes.tsx
  graph/
    GraphView.tsx
    GraphTooltip.tsx
    GraphControls.tsx
    GraphLegend.tsx
  search/
    SearchModal.tsx
  ui/
    ThemeToggle.tsx

lib/
  markdown.ts            # unified processor config
  theme.ts               # Theme type + set/get helpers
  graph.ts               # Build graph data from markdown files
  remark-wikilinks.ts    # Custom remark plugin

styles/
  globals.css            # @import of tailwind, base resets
  themes.css             # All CSS custom property definitions (Section 6)
  prose.css              # .prose class for markdown content styling

data/                    # Markdown content (not in components/)
  firms/
    cfd/
      funded-next/
        index.md
        challenges/
          10k.md
          50k.md
        rules.md
        promos.md
        changelog.md
    futures/
      apex-funding/
        ...
```

---

## Appendix B: Accessibility Checklist

Before any PR merging UI code, verify:

- [ ] Color contrast: all text on backgrounds meets 4.5:1 (WCAG AA). Check `--foreground` on `--background`, `--muted-foreground` on `--sidebar-bg`, `--nav-active-fg` on `--nav-active-bg`, `--verified-badge-fg` on `--verified-badge-bg` for all 3 themes
- [ ] Nav file tree: navigable via keyboard (Tab to focus, Enter to open, Arrow keys to traverse tree)
- [ ] Search modal: keyboard trap while open (focus stays inside modal), Esc closes it, first result focused on open
- [ ] All icon-only buttons have `aria-label` attributes
- [ ] Graph view: nodes have `aria-label` via tooltip (canvas is inherently inaccessible — add an `aria-live` region that announces the current focused/selected node for screen readers)
- [ ] Tab bar: tab role, tabpanel role, `aria-selected` on active tab
- [ ] Links: external links include `aria-label` noting they open in a new tab (e.g., `aria-label="Official Challenge Page (opens in new tab)"`)
- [ ] `<VerifiedBadge>` timestamp: use `<time datetime="ISO-string">` for the date
- [ ] Reduce motion: wrap graph animations in `@media (prefers-reduced-motion: reduce)` — stop force simulation jitter, disable node pulse animations

---

## Appendix C: Obsidian Feature Parity Checklist

| Obsidian Feature | OpenPropFirm v1 | Notes |
|---|---|---|
| 3-panel layout | Yes | |
| File tree (left nav) | Yes | |
| Tabs | Yes | |
| Back/forward navigation | Yes | |
| `[[wikilinks]]` | Yes | |
| Force-directed graph | Yes | |
| Split editor (side-by-side) | Yes (Panel 3 toggle) | |
| Drag resize panels | Yes (P2/P3 only) | |
| Global search (Cmd+K) | Yes | |
| Keyword highlighting in search | Yes | |
| YAML frontmatter rendering | Partial (shown in badge, not rendered in content) | |
| Theme system | Yes (Light/Dark/Blue) | |
| Collapsible headings | No (v2) | |
| Outline panel (heading nav) | No (v2) | |
| Tag pane | No (v2) | |
| Backlinks panel | No (v2) | |
| Hover preview on wikilinks | No (v2) | |
| Mobile support | No (v1 desktop only) | |
