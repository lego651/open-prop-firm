# Sprint 1 — Tech Lead Code Review

**Reviewer**: Tech Lead (code auditor role)
**Date**: 2026-03-29
**Scope**: Full codebase audit after Sprint 1 completion (commits `36ce6b8` → `6e682bc`)
**Verdict**: Sprint 1 foundation is solid. The tickets were well-executed with correct data scaffolding, theme system, validation script, licenses, and CI skeleton. However, the audit surfaces **15 actionable tickets** ranging from dead code and CSS conflicts to build tooling and DX improvements. None are blockers for starting Sprint 2, but all should be resolved before Sprint 3 to avoid compounding technical debt.

---

## Summary of Findings

| Severity | Count | Description |
|----------|-------|-------------|
| **High** | 3 | CSS variable conflicts, `dark:` utility incompatibility, `.gitignore` silently ignoring `.env.example` |
| **Medium** | 7 | Boilerplate page, dead CSS, font mismatch, `--radius` conflict, shadcn as prod dep, no Prettier enforcement, lint warning |
| **Low** | 5 | ES target conservative, `ts-node` slow, no error boundary, doc version mismatch, validate-content types |

---

## R-01: CSS Variable System Has Three Conflicting Layers

**Severity**: High
**Files**: `src/app/globals.css`, `src/styles/themes.css`

**Problem**: Three independent systems define the same CSS custom properties (`--background`, `--foreground`, `--border`, etc.), creating a confusing cascade:

1. **`globals.css` `:root`** — shadcn default oklch values (e.g. `--background: oklch(1 0 0)`)
2. **`themes.css` `[data-theme="light"]`** — project theme hex values (e.g. `--background: #FFFFFF`)
3. **`globals.css` `@layer base :root`** — self-referencing remaps (e.g. `--background: var(--background)`)

The `[data-theme]` selectors have higher specificity than `:root`, so they "win" at runtime. This means the `:root` oklch block and the `.dark` block in `globals.css` are dead code — they are always overridden by the `data-theme` attribute set in `layout.tsx`. The `@layer base` block is worse: it contains circular variable assignments like `--background: var(--background)` (no-op) and references `--sidebar-bg` which only exists inside `[data-theme]` blocks, not at `:root` scope.

**Why it matters**: Future developers will not know which system is authoritative. The `@layer base` block also hardcodes `--destructive: #ef4444` which bypasses both the oklch and the theme-specific destructive colors. Any attempt to customize themes will hit confusion about which layer to edit.

**Actionable Steps**:
1. Remove the `:root` oklch block and `.dark` class block from `globals.css` — they are dead code, fully superseded by `themes.css`
2. Remove or rewrite the `@layer base :root` block — eliminate circular `var(--background)` → `var(--background)` assignments; keep only the mappings that actually remap a shadcn name to a different theme variable (if any)
3. Ensure shadcn components resolve their color tokens from the `[data-theme]` CSS variables defined in `themes.css` — the `@theme inline` block in `globals.css` already maps Tailwind color tokens to CSS variables, which is the correct bridge
4. Move the `--radius` definition to one place only (see R-06)

**Acceptance**:
- `globals.css` has zero `:root` or `.dark` blocks defining color values
- `@layer base` block contains only non-circular, non-redundant rules
- All three themes still render correctly (visually verify light, dark, blue)
- `npm run build` passes

---

## R-02: `dark:` Tailwind Utilities in shadcn Components Are Non-Functional

**Severity**: High
**Files**: `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/input.tsx`, `src/components/ui/input-group.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/checkbox.tsx`

**Problem**: The tech-plan (Section 1.5) explicitly states: *"The project will NOT use Tailwind's dark mode utilities (`dark:` prefix) for theming."* The architectural decision is that all theme colors come from CSS variables on `[data-theme]` selectors.

However, 6 shadcn components contain a total of 13 `dark:` utility usages (e.g. `dark:border-input`, `dark:bg-input/30`, `dark:hover:bg-input/50`). In Tailwind v4, the `dark:` variant activates based on `prefers-color-scheme: dark` or the `.dark` class — **neither of which this project uses**. The project uses `data-theme="dark"` on the `<html>` element.

This means every `dark:` style in these components is dead code that never activates. When a user switches to dark or blue theme, these components will render with their light-mode styles (the non-`dark:` values), which may look incorrect.

**Why it matters**: Buttons, inputs, badges, and checkboxes will have subtly wrong styling in dark/blue themes. For example, `dark:bg-input/30` on the outline button variant will never activate, so the button background stays as `bg-background` (white) even on a dark background.

**Actionable Steps**:
1. Audit all `dark:` utilities across `src/components/ui/`
2. For each `dark:` usage, determine if the style is needed for the dark/blue themes
3. If needed, replace the `dark:` utility with a CSS-variable-based approach (e.g. replace `dark:bg-input/30` with a variable that changes per `[data-theme]`)
4. If not needed (the base style already works via CSS variables), remove the `dark:` utility
5. Alternatively, configure Tailwind v4 to map `dark:` to `[data-theme="dark"]` via a `@variant` directive — this would make all shadcn `dark:` utilities work with the project's theme system

**Acceptance**:
- Zero `dark:` utilities in `src/components/ui/` OR a `@variant dark` directive in globals.css that maps `dark:` to `[data-theme="dark"], [data-theme="blue"]`
- Button, input, badge, and checkbox components visually correct in all three themes
- No visual regression in light theme

---

## R-03: `.gitignore` Pattern `.env*` Silently Affects `.env.example`

**Severity**: High
**File**: `.gitignore`

**Problem**: The `.gitignore` contains `.env*` which matches `.env.example`. The file is currently tracked because it was committed before or alongside the gitignore entry. However:

- If `.env.example` is ever removed from the index (e.g. `git rm --cached`) and re-added, git will refuse to track it
- New files following the `.env.` pattern (e.g. `.env.test`, `.env.staging`) cannot be tracked even if intended
- Contributors who clone fresh may not realize `.env.example` changes are silently ignored after certain git operations

**Why it matters**: `.env.example` is a critical developer onboarding file. If it silently becomes untracked, new contributors won't know which environment variables are required.

**Actionable Steps**:
1. Replace `.env*` with specific patterns:
   ```
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local
   ```
2. Keep `.env.example` explicitly NOT ignored (it should always be committed)
3. Optionally add a comment: `# .env.example is intentionally tracked`

**Acceptance**:
- `.env.example` is not matched by any `.gitignore` pattern
- `.env.local` and other local env files are still ignored
- `git status` after editing `.env.example` shows it as modified

---

## R-04: `page.tsx` Is Still Default Create Next App Boilerplate

**Severity**: Medium
**File**: `src/app/page.tsx`

**Problem**: The landing page still renders the default Next.js starter content: "To get started, edit the page.tsx file", Vercel deploy button, and Template/Learning links. This page references `/next.svg` and `/vercel.svg` from the `public/` folder — both are also default assets.

**Why it matters**: Any Vercel preview deployment shows an unbranded boilerplate page. The S1 acceptance criteria says "Vercel preview URL is live and loads without error" which it does, but the page content is misleading for anyone visiting a preview link. More importantly, the default assets in `public/` should not ship to production.

**Actionable Steps**:
1. Replace `src/app/page.tsx` content with a minimal branded placeholder (e.g. "OpenPropFirm — Coming Soon" with the project name and a brief description)
2. Remove default Next.js assets from `public/`: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
3. The page will be fully replaced in Sprint 2 (AppShell), so keep the placeholder simple

**Acceptance**:
- `page.tsx` renders a branded placeholder, not the Next.js default
- `public/` contains no Create Next App default assets
- Build passes

---

## R-05: Font Stack Mismatch Between `themes.css` and `layout.tsx`

**Severity**: Medium
**Files**: `src/styles/themes.css`, `src/app/layout.tsx`, `src/app/globals.css`

**Problem**: Three different font declarations compete:

1. **`themes.css` `:root`**: `--font-sans: "Inter", system-ui, -apple-system, sans-serif` — but Inter is never loaded via `next/font` or a `<link>` tag
2. **`layout.tsx`**: Loads `Geist` and `Geist_Mono` via `next/font/google`, injects them as `--font-geist-sans` and `--font-geist-mono` CSS variables
3. **`globals.css` `@theme inline`**: `--font-sans: var(--font-sans)` — another circular self-reference

The result: `--font-sans` resolves to `"Inter", system-ui, ...` from themes.css, but Inter is not loaded, so the browser falls through to `system-ui`. Meanwhile, Geist is loaded and injected but never referenced by the theme system. The `@theme inline` block's `--font-heading: var(--font-sans)` and `--font-sans: var(--font-sans)` are circular no-ops.

**Why it matters**: The Geist font files are downloaded (~100KB) but never actually used for body text. The design intent is unclear — should the site use Geist or Inter?

**Actionable Steps**:
1. Decide on one font: either Geist (already loaded in layout.tsx) or Inter (would need to be loaded via `next/font`)
2. Update `themes.css` `--font-sans` to reference the chosen font
3. Remove the circular `--font-sans: var(--font-sans)` from `globals.css` `@theme inline`
4. If Geist is chosen, set `--font-sans` in themes.css to `var(--font-geist-sans)` and remove the Inter fallback
5. If Inter is chosen, add it via `next/font/google` in layout.tsx and remove the Geist imports

**Acceptance**:
- One font family is loaded and one font family is referenced — no orphaned imports
- `--font-sans` resolves to the loaded font in all themes
- Body text renders in the chosen font (verify in DevTools → Computed → font-family)

---

## R-06: `--radius` Defined Twice With Different Values

**Severity**: Medium
**Files**: `src/styles/themes.css`, `src/app/globals.css`

**Problem**: `--radius` is set in two places:
- `themes.css` `:root`: `--radius: 6px`
- `globals.css` `:root`: `--radius: 0.625rem` (= 10px at default font size)

Since `globals.css` imports `themes.css` via `@import`, the themes.css values load first. Then the globals.css `:root` block overrides `--radius` to `0.625rem`. The `@theme inline` block in globals.css then derives all border radii from this value (`--radius-sm: calc(var(--radius) * 0.6)`, etc.).

The themes.css value of `6px` is dead — it's always overridden.

**Actionable Steps**:
1. Remove `--radius: 6px` from `themes.css` `:root` (it's dead)
2. Keep the `--radius: 0.625rem` in one canonical location (globals.css `:root` or `@theme inline`)
3. Document the chosen radius as the project standard

**Acceptance**:
- `--radius` is defined in exactly one place
- All `--radius-*` derived values are consistent
- Shadcn component border radii are visually correct

---

## R-07: `shadcn` CLI Package Listed as Production Dependency

**Severity**: Medium
**File**: `package.json`

**Problem**: `"shadcn": "^4.1.1"` is in `dependencies` instead of `devDependencies`. shadcn is a CLI code-generation tool — it scaffolds component files into your project but has no runtime code. It should never be in the production bundle.

**Why it matters**: Increases `node_modules` install size in production. If tree-shaking fails or the module is imported anywhere, it could bloat the client bundle. It also signals to contributors that shadcn is a runtime dependency, which is incorrect.

**Actionable Steps**:
1. Move `shadcn` from `dependencies` to `devDependencies` in `package.json`
2. Run `npm install` to update the lockfile

**Acceptance**:
- `shadcn` appears under `devDependencies` in package.json
- `npm run build` still succeeds
- No runtime imports of `shadcn` exist in `src/`

---

## R-08: No Prettier Enforcement in CI or Pre-Commit

**Severity**: Medium
**Files**: `.prettierrc`, `package.json`

**Problem**: Prettier is configured (`.prettierrc` with `singleQuote: true`, `semi: false`) and installed as a devDependency, but:
- No `format` or `format:check` script in `package.json`
- No pre-commit hook (no husky, lint-staged, or similar)
- No CI step that checks formatting

The shadcn-generated components use double quotes and no semicolons (the semi matches, but quotes don't). This means the Prettier config exists but is not being enforced on generated or manually written code.

**Why it matters**: Formatting inconsistencies will accumulate across Sprints 2–6 as more code is written. Without enforcement, the config is a suggestion, not a standard.

**Actionable Steps**:
1. Add scripts to `package.json`:
   ```json
   "format": "prettier --write .",
   "format:check": "prettier --check ."
   ```
2. Run `npm run format` once to normalize all existing files
3. (Optional but recommended) Install `husky` + `lint-staged` for pre-commit formatting:
   ```bash
   npm install -D husky lint-staged
   npx husky init
   ```
4. Add `format:check` to the CI pipeline when one is created

**Acceptance**:
- `npm run format:check` exits 0 after running `npm run format`
- All `.ts`, `.tsx`, `.css`, `.json` files in `src/` follow the Prettier config
- (Optional) Pre-commit hook runs `lint-staged` with Prettier

---

## R-09: Lint Warning — Unused Variable in `validate-content.ts`

**Severity**: Medium
**File**: `scripts/validate-content.ts`

**Problem**: `npm run lint` produces one warning:
```
scripts/validate-content.ts:31:12 — 'e' is defined but never used (@typescript-eslint/no-unused-vars)
```

This is in the `catch (e)` block of the frontmatter parsing try/catch.

**Actionable Steps**:
1. Replace `catch (e)` with `catch` (no binding) — TypeScript 4.0+ supports omitting the catch binding entirely:
   ```ts
   } catch {
     return [{ file: relativePath, field: 'frontmatter', message: 'Failed to parse YAML frontmatter' }]
   }
   ```

**Acceptance**:
- `npm run lint` produces zero warnings
- Validation script still catches and reports frontmatter parse errors correctly

---

## R-10: `globals.css` `.dark` Class Block Is Dead CSS

**Severity**: Medium
**File**: `src/app/globals.css`

**Problem**: `globals.css` contains a `.dark { ... }` class-based block with 30+ CSS variable definitions. The project uses `data-theme="dark"` on the `<html>` element — the `.dark` class is never applied anywhere. This block was auto-generated by `shadcn init` and is completely unused.

**Actionable Steps**:
1. Remove the entire `.dark { ... }` block from `globals.css`
2. Verify dark theme still works (it is driven by `themes.css` `[data-theme="dark"]`, not the `.dark` class)

**Acceptance**:
- No `.dark` class block in `globals.css`
- Dark theme renders correctly
- `npm run build` passes

---

## R-11: `tsconfig.json` Targets ES2017 — Unnecessarily Conservative

**Severity**: Low
**File**: `tsconfig.json`

**Problem**: `"target": "ES2017"` causes TypeScript to downlevel modern syntax (optional chaining, nullish coalescing, etc.) in server-side code. Next.js handles browser transpilation via its own bundler (Turbopack/SWC), so the tsconfig target only affects non-bundled execution (e.g. `ts-node` scripts). ES2017 is 9 years old and forces unnecessary polyfills.

**Actionable Steps**:
1. Change `"target"` to `"ES2022"` in `tsconfig.json`
2. Verify `npm run build` and `npm run prebuild` still work
3. Verify `tsconfig.scripts.json` (which extends `tsconfig.json`) still works with `ts-node`

**Acceptance**:
- `tsconfig.json` target is `ES2022`
- Build and prebuild scripts pass without errors

---

## R-12: `ts-node` Is Slow and Has ESM Compatibility Issues

**Severity**: Low
**Files**: `package.json`, `tsconfig.scripts.json`

**Problem**: The `prebuild` script uses `ts-node` for running `scripts/validate-content.ts`. `ts-node` is known for:
- Slow startup (~500ms+ overhead)
- ESM compatibility issues requiring the `"module": "commonjs"` workaround in `tsconfig.scripts.json`
- Fragile resolution with newer TypeScript features

The project already works around this by maintaining a separate `tsconfig.scripts.json` with `"module": "commonjs"`.

**Actionable Steps**:
1. Replace `ts-node` with `tsx` (a faster, ESM-compatible alternative):
   ```bash
   npm install -D tsx
   npm uninstall ts-node
   ```
2. Update `package.json` prebuild script:
   ```json
   "prebuild": "tsx scripts/validate-content.ts"
   ```
3. `tsx` does not need `tsconfig.scripts.json` — but keep it in case other tools need it, or remove if unused

**Acceptance**:
- `npm run prebuild` runs successfully with `tsx`
- Prebuild is noticeably faster (typically 3-5x faster startup)
- Build still passes end-to-end

---

## R-13: No `not-found.tsx` or `error.tsx` Error Boundaries

**Severity**: Low
**Files**: `src/app/` (missing files)

**Problem**: The app has no custom 404 page (`not-found.tsx`) or error boundary (`error.tsx`). Next.js provides defaults, but:
- The default 404 is generic and unbranded
- The default error boundary shows a raw error in development and a generic message in production
- Sprint 2's routing (`/firms/[...slug]`) will produce 404s for invalid URLs

**Actionable Steps**:
1. Create `src/app/not-found.tsx` with a branded 404 page (minimal — project name, "page not found", link to home)
2. Create `src/app/error.tsx` with a `"use client"` error boundary that shows a user-friendly error message
3. Both pages should use the project's theme variables for consistent styling

**Acceptance**:
- Visiting a non-existent route shows the custom 404 page
- A simulated error shows the custom error boundary
- Both pages respect the active theme

---

## R-14: Documentation Version Mismatch — "Next.js 15" vs Actual 16.2.1

**Severity**: Low
**Files**: `docs/s1-tickets.md`, `docs/tech-plan.md`, `docs/v1-scope.md`

**Problem**: Sprint docs consistently reference "Next.js 15" but `package.json` shows `"next": "16.2.1"`. The README correctly says "Next.js 16". The s1-tickets S1-1 title reads "Initialize Next.js 15 app" and the tech-plan Section 1.1 discusses "Next.js 15" semantics.

**Why it matters**: Next.js 16 has different APIs and behaviors from 15. If developers follow the tech-plan literally, they may use deprecated patterns. The docs should reflect reality.

**Actionable Steps**:
1. Update `docs/s1-tickets.md`: replace "Next.js 15" references with "Next.js 16"
2. Update `docs/tech-plan.md`: replace "Next.js 15" references with "Next.js 16"
3. Update `docs/v1-scope.md`: replace "Next.js 15" references with "Next.js 16"
4. Review any API-specific guidance in the tech-plan to ensure it matches Next.js 16 semantics

**Acceptance**:
- No reference to "Next.js 15" in any doc that describes the current project
- Version references match `package.json`

---

## R-15: `validate-content.ts` Lacks TypeScript Types for Frontmatter

**Severity**: Low
**File**: `scripts/validate-content.ts`

**Problem**: The `fm` variable is typed as `{ [key: string]: any }` (the return type of `gray-matter`'s `.data`). Every field access (`fm.title`, `fm.firm`, `fm.category`, etc.) is untyped. The script validates at runtime but gets zero TypeScript assistance — typos in field names (e.g. `fm.challange_size`) would not be caught by the compiler.

**Actionable Steps**:
1. Define a `ContentFrontmatter` interface:
   ```ts
   interface ContentFrontmatter {
     title?: string
     firm?: string
     category?: string
     type?: string
     status?: string
     last_verified?: string
     verified_by?: string
     sources?: Array<{ url: string; label: string }>
     challenge_size?: number
     price_usd?: number
     website?: string
     [key: string]: unknown
   }
   ```
2. Cast `parsed.data` to `ContentFrontmatter` at the top of `validateFile()`
3. (Optional) Consider using Zod for schema validation in a future refactor — Zod produces better error messages and handles type narrowing automatically

**Acceptance**:
- `validateFile()` uses a typed interface for frontmatter access
- All field name accesses are checked at compile time
- `npm run prebuild` still works correctly

---

## Priority Order for Execution

| Priority | Ticket | Effort | Sprint |
|----------|--------|--------|--------|
| 1 | **R-01**: CSS variable conflicts | 30 min | Before S2 |
| 2 | **R-02**: `dark:` utility fix | 45 min | Before S2 |
| 3 | **R-10**: Remove dead `.dark` block | 5 min | With R-01 |
| 4 | **R-06**: `--radius` duplication | 5 min | With R-01 |
| 5 | **R-05**: Font stack mismatch | 15 min | With R-01 |
| 6 | **R-03**: `.gitignore` fix | 5 min | Before S2 |
| 7 | **R-04**: Replace boilerplate page | 15 min | Before S2 |
| 8 | **R-07**: Move shadcn to devDeps | 2 min | Before S2 |
| 9 | **R-09**: Fix lint warning | 2 min | Before S2 |
| 10 | **R-08**: Prettier enforcement | 20 min | Before S2 |
| 11 | **R-11**: ES target update | 2 min | Before S2 |
| 12 | **R-12**: Replace ts-node with tsx | 10 min | Before S2 |
| 13 | **R-13**: Error boundaries | 20 min | Start of S2 |
| 14 | **R-14**: Doc version mismatch | 15 min | Before S2 |
| 15 | **R-15**: Frontmatter types | 15 min | Before S2 |

**Total estimated effort**: ~3.5 hours

---

## What Sprint 1 Got Right

Credit where due — the following were executed well:

- **Data scaffold is comprehensive**: All 4 firms × all content types with correct frontmatter that passes validation. Challenge tiers match the tech-plan spec.
- **Validation script is solid**: `validate-content.ts` catches all required frontmatter fields, handles type-specific validation, and integrates cleanly into the build pipeline.
- **Theme system design is correct**: The three-theme `[data-theme]` approach with CSS variables is the right architecture for this project. The implementation just needs cleanup.
- **License files are complete**: Both AGPL-3.0 and CC-BY-NC-SA-4.0 are in place with the commercial license contact.
- **GitHub Actions skeleton is clean**: Correct cron schedule, no `push` trigger, manual dispatch works.
- **`.env.example` is well-documented**: Clear comments, security warnings for service keys, and setup instructions.
- **`tsconfig.json` has `strict: true`**: Good TypeScript discipline from day one.
- **Commit messages are clean**: Descriptive, scoped to sprint, with co-author attribution.

---

*This review should be addressed before Sprint 2 begins. Tickets R-01 through R-10 (high + medium severity) are recommended for a single cleanup commit. Low-severity tickets can be batched separately.*
