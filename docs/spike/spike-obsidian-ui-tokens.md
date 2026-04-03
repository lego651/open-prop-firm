# Spike: Obsidian UI Design Tokens

**Issue:** #2
**Date:** 2026-04-03
**Status:** Complete (research only, no code changes)
**Goal:** Document Obsidian's exact CSS variables and design tokens so we can audit and align our theme.

---

## Sources

- [Obsidian CSS Variables Reference](https://docs.obsidian.md/Reference/CSS+variables/CSS+variables)
- [Obsidian Colors Documentation](https://docs.obsidian.md/Reference/CSS+variables/Foundations/Colors)
- [Obsidian Typography Documentation](https://docs.obsidian.md/Reference/CSS+variables/Foundations/Typography)
- [Obsidian Headings Documentation](https://docs.obsidian.md/Reference/CSS+variables/Editor/Headings)
- [Obsidian Spacing Documentation](https://docs.obsidian.md/Reference/CSS+variables/Foundations/Spacing)
- [Obsidian v1.0.x app.css extraction (gist by efemkay)](https://gist.github.com/efemkay/31ef4faade9a094d2fb74a738519d601)
- [Obsidian Publish app.css (live)](https://publish.obsidian.md/app.css)
- [Obsidian 1.0 Theme Migration Guide](https://obsidian.md/blog/1-0-theme-migration-guide/)

---

## 1. Typography

### Font Families

| Variable | Default Value |
|---|---|
| `--font-interface` | `var(--default-font)` fallback chain |
| `--font-text` | Inherits from `--font-interface` |
| `--default-font` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` |
| `--font-monospace-default` | `Menlo, SFMono-Regular, Consolas, "Source Code Pro", monospace` |

### Font Sizes

| Variable | Value |
|---|---|
| `--font-text-size` | `16px` |
| `--font-smallest` | `0.8em` |
| `--font-smaller` | `0.875em` |
| `--font-small` | `0.933em` |
| `--font-ui-smaller` | `12px` |
| `--font-ui-small` | `13px` |
| `--font-ui-medium` | `15px` |
| `--font-ui-large` | `20px` |

### Font Weights

| Variable | Value |
|---|---|
| `--font-normal` | `400` |
| `--font-medium` | `500` |
| `--font-semibold` | `600` |
| `--font-bold` | `700` |
| `--font-weight` (body default) | `400` |
| `--bold-weight` | `600` (semibold) |

### Line Heights

| Variable | Value |
|---|---|
| `--line-height-normal` | `1.5` |
| `--line-height-tight` | `1.3` |

### Heading Typography

| Level | Size | Weight | Line-Height |
|---|---|---|---|
| H1 | `2em` | `700` | `1.2` |
| H2 | `1.6em` | `600` | `1.2` |
| H3 | `1.37em` | `600` | `1.3` |
| H4 | `1.25em` | `600` | `1.4` |
| H5 | `1.12em` | `600` | `1.5` |
| H6 | `1.12em` | `600` | `1.5` |

---

## 2. Colors

### Base Color Scale

| Variable | Light | Dark |
|---|---|---|
| `--color-base-00` | `#ffffff` | `#1e1e1e` |
| `--color-base-05` | `#fcfcfc` | `#242424` |
| `--color-base-10` | `#fafafa` | `#242424` |
| `--color-base-20` | `#f6f6f6` | `#262626` |
| `--color-base-25` | `#e3e3e3` | `#2a2a2a` |
| `--color-base-30` | `#e0e0e0` | `#363636` |
| `--color-base-35` | `#d4d4d4` | `#3f3f3f` |
| `--color-base-40` | `#bdbdbd` | `#555555` |
| `--color-base-50` | `#ababab` | `#666666` |
| `--color-base-60` | `#707070` | `#999999` |
| `--color-base-70` | `#5a5a5a` | `#bababa` |
| `--color-base-100` | `#222222` | `#dadada` |

### Semantic Color Mappings

| Variable | Light | Dark |
|---|---|---|
| `--background-primary` | `#ffffff` | `#1e1e1e` |
| `--background-primary-alt` | `#fafafa` | `#242424` |
| `--background-secondary` | `#f6f6f6` | `#262626` |
| `--background-modifier-border` | `#e0e0e0` | `#363636` |
| `--text-normal` | `#222222` | `#dadada` |
| `--text-muted` | `#5a5a5a` | `#bababa` |
| `--text-faint` | `#ababab` | `#666666` |
| `--text-on-accent` | `white` | `white` |

### Accent Color (Purple)

Base HSL: `hsl(254, 80%, 68%)`

| Variable | Light | Dark |
|---|---|---|
| `--text-accent` | `#705dcf` | `#7f6df2` |
| `--text-accent-hover` | `#7a6ae6` | `#8875ff` |
| `--interactive-accent` | `#7b6cd9` | `#483699` |
| `--interactive-accent-hover` | `#8273e6` | `#4d3ca6` |
| `--interactive-normal` | `#f2f3f5` | `#2a2a2a` |
| `--interactive-hover` | `#e9e9e9` | `#303030` |

### Extended Colors

| Variable | Light | Dark |
|---|---|---|
| `--color-red` | `#e93147` | `#fb464c` |
| `--color-orange` | `#ec7500` | `#e9973f` |
| `--color-yellow` | `#e0ac00` | `#e0de71` |
| `--color-green` | `#08b94e` | `#44cf6e` |
| `--color-cyan` | `#00bfbc` | `#53dfdd` |
| `--color-blue` | `#086ddd` | `#027aff` |
| `--color-purple` | `#7852ee` | `#a882ff` |
| `--color-pink` | `#d53984` | `#fa99cd` |

### Selection and Highlight

| Variable | Value |
|---|---|
| `--text-selection` | `hsla(var(--interactive-accent-hsl), 0.2)` |
| `--text-highlight-bg` | `rgba(255, 208, 0, 0.4)` |
| `--highlight-mix-blend-mode` | `darken` (light) / `lighten` (dark) |

---

## 3. Spacing

### 4px Grid System

| Variable | Value |
|---|---|
| `--size-2-1` | `2px` |
| `--size-2-2` | `4px` |
| `--size-2-3` | `6px` |
| `--size-4-1` | `4px` |
| `--size-4-2` | `8px` |
| `--size-4-3` | `12px` |
| `--size-4-4` | `16px` |
| `--size-4-5` | `20px` |
| `--size-4-6` | `24px` |
| `--size-4-8` | `32px` |
| `--size-4-9` | `36px` |
| `--size-4-12` | `48px` |
| `--size-4-16` | `64px` |
| `--size-4-18` | `72px` |

### Content Spacing

| Variable | Value |
|---|---|
| `--p-spacing` | `1rem` (16px) |
| `--border-width` | `1px` |

---

## 4. Code Blocks

| Property | Value |
|---|---|
| Font family | `Menlo, SFMono-Regular, Consolas, "Source Code Pro", monospace` |
| `--code-size` | `0.875em` (~14px at 16px base) |
| `--code-background` | `#fafafa` (light) / `#242424` (dark) |
| `--code-white-space` | `pre-wrap` |

### Syntax Highlighting

| Variable | Maps To |
|---|---|
| `--code-normal` | `var(--text-muted)` |
| `--code-comment` | `var(--text-faint)` |
| `--code-function` | `var(--color-yellow)` |
| `--code-keyword` | `var(--color-pink)` |
| `--code-tag` | `var(--color-red)` |
| `--code-value` | `var(--color-purple)` |
| `--code-string` | `var(--color-green)` |
| `--code-operator` | `var(--color-red)` |
| `--code-punctuation` | `var(--text-muted)` |

---

## 5. Links

| Variable | Value |
|---|---|
| `--link-color` | `var(--text-accent)` — `#705dcf` (light) / `#7f6df2` (dark) |
| `--link-color-hover` | `var(--text-accent-hover)` |
| `--link-decoration` | `underline` |
| `--link-decoration-hover` | `underline` |
| `--link-decoration-thickness` | `auto` |
| `--link-unresolved-opacity` | `0.7` |

---

## 6. Tables

| Variable | Value |
|---|---|
| `--table-background` | `transparent` |
| `--table-border-color` | `#e0e0e0` (light) / `#363636` (dark) |
| `--table-border-width` | `1px` |
| `--table-header-background` | `transparent` |
| `--table-header-weight` | `400` (normal) |
| `--table-header-color` | `var(--text-muted)` |
| `--table-row-background-hover` | `var(--background-secondary)` |
| `--table-cell-vertical-alignment` | `top` |

---

## 7. Blockquotes

| Variable | Value |
|---|---|
| `--blockquote-border-thickness` | `2px` |
| `--blockquote-border-color` | `var(--interactive-accent)` (purple) |
| `--blockquote-background-color` | `transparent` |
| `--blockquote-font-style` | `normal` |
| `--blockquote-color` | `inherit` |

---

## 8. Horizontal Rules

| Variable | Value |
|---|---|
| `--hr-color` | `#e0e0e0` (light) / `#363636` (dark) |
| `--hr-thickness` | `2px` |

---

## 9. Border Radius

| Variable | Value |
|---|---|
| `--radius-s` | `4px` |
| `--radius-m` | `8px` |
| `--radius-l` | `12px` |
| `--radius-xl` | `16px` |

---

## 10. Scrollbar

| Variable | Light | Dark |
|---|---|---|
| `--scrollbar-bg` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.05)` |
| `--scrollbar-thumb-bg` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.1)` |
| `--scrollbar-active-thumb-bg` | `rgba(0,0,0,0.2)` | `rgba(255,255,255,0.2)` |

---

## 11. Shadows

| Variable | Value |
|---|---|
| `--shadow-s` | `rgba(0,0,0,0.08) 0px 12px 24px -4px, rgba(0,0,0,0.04) 0px 8px 16px -4px` |
| `--shadow-l` | `0 14px 62px 0 rgba(0,0,0,0.25)` |

---

## 12. UI Chrome

| Variable | Value |
|---|---|
| `--ribbon-width` | `52px` |
| `--header-height` | `48px` |
| `--opacity-translucency` | `0.6` (light) / `0.75` (dark) |

---

## Summary for Web Replication

Key mappings from Obsidian tokens to our Tailwind/shadcn implementation:

| Obsidian Token | Our Tailwind Equivalent | Notes |
|---|---|---|
| `--default-font` = Inter | `font-sans` with Inter loaded via `next/font` | Already using Inter |
| `--font-text-size` = 16px | `text-base` | Default, matches |
| `--background-primary` = `#1e1e1e` (dark) | `bg-background` | Verify exact hex |
| `--background-primary-alt` = `#242424` (dark) | `bg-muted` | Secondary surfaces |
| `--background-secondary` = `#262626` (dark) | `bg-card` or `bg-popover` | Sidebar, panels |
| `--text-normal` = `#dadada` (dark) | `text-foreground` | Verify exact hex |
| `--text-muted` = `#bababa` (dark) | `text-muted-foreground` | Verify exact hex |
| `--text-accent` = `#7f6df2` (dark) | `text-primary` | Purple accent — verify |
| `--background-modifier-border` = `#363636` (dark) | `border` | Verify exact hex |
| `--p-spacing` = 1rem | `space-y-4` on prose | Paragraph gaps |
| H1 = 2em/700 | `text-4xl font-bold` | Close but verify exact em |
| H2 = 1.6em/600 | `text-2xl font-semibold` | Close but verify exact em |
| `--radius-s` = 4px | `rounded` (4px) | Matches |
| `--radius-m` = 8px | `rounded-lg` (8px) | Matches |
| `--code-background` = `#242424` (dark) | `bg-muted` on `<code>` | Verify match |
| `--blockquote-border` = 2px purple | `border-l-2 border-primary` | Verify accent color |

### Action Items for Implementation

1. **Audit `globals.css`** — compare our CSS custom properties against the exact hex values above
2. **Font loading** — confirm Inter is loaded with weights 400, 500, 600, 700
3. **Accent color** — Obsidian uses `hsl(254, 80%, 68%)` purple; verify our `--primary` matches
4. **Heading scale** — Obsidian uses em-based sizing (2em, 1.6em, 1.37em, 1.25em, 1.12em); verify our prose/typography plugin matches
5. **Code blocks** — ensure monospace font stack and 0.875em sizing
6. **Dark theme grays** — the exact gray scale (`#1e1e1e`, `#242424`, `#262626`, `#363636`) is critical for authenticity
