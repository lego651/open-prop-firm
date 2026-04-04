# Sprint 6 Review — Code Audit

> **Auditor**: Tech Lead / Code Auditor
> **Date**: 2026-03-30
> **Commit**: `99cb1c0` — `[s6] complete sprint 6 — bot, legal, SEO, analytics, content debt`
> **Scope**: All 46 files changed, 2,010 lines added

---

## Critical Findings

### R6-01 · S6-09 left broken YAML frontmatter in 14+ content files

**Severity**: Critical (build-breaking — partially fixed)
**Files**: Multiple files under `data/firms/`

The third-party source removal (S6-09) deleted `- url:` lines but left behind blank lines and orphaned `label:` values. Six of these were severe enough to break YAML parsing and the build (already fixed in `106df04`). However, **many more files still have cosmetic blank-line artifacts** inside their `sources` arrays:

- `data/firms/cfd/funding-pips/challenges/5k.md` — 2 blank lines where source was
- `data/firms/cfd/funding-pips/challenges/10k.md` — same
- `data/firms/cfd/funding-pips/challenges/25k.md` — same
- `data/firms/cfd/funding-pips/challenges/50k.md` — same
- `data/firms/cfd/funding-pips/challenges/100k.md` — same
- `data/firms/futures/apex-funding/challenges/300k.md` — 2 trailing blank lines after last source
- `data/firms/futures/apex-funding/index.md` — 2 trailing blank lines after last source
- `data/firms/futures/lucid-trading/changelog.md` — 4 blank lines where 2 sources were
- `data/firms/futures/lucid-trading/index.md` — 2 trailing blank lines after last source
- `data/firms/futures/lucid-trading/rules.md` — 4 blank lines where 2 sources were

These don't break the YAML parser today, but they're fragile — some parsers/validators treat empty YAML array slots as `null` entries. They're also just sloppy.

**Acceptance**:
- [ ] Remove all blank-line artifacts from `sources` arrays across every `data/firms/**/*.md` file
- [ ] Add a CI check or prebuild script assertion: every `sources` entry must have a `url` and `label` field (catch this class of bug at build time)

---

### R6-02 · `createPR()` in runner.ts has a shell injection vulnerability

**Severity**: Critical (security)
**File**: `scripts/monitor/runner.ts:111-124`

The `createPR` function interpolates `result.firmSlug`, `result.lastVerified`, and `result.diff` directly into shell strings passed to `execSync`:

```ts
execSync(`git commit -m "${title}"`, { stdio: 'inherit' })
// ...
const prUrl = execSync(
  `gh pr create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "bot-update"`,
  { encoding: 'utf-8' },
).trim()
```

If a firm slug or diff string contains shell metacharacters (`$`, backticks, `\`, `"`), the command breaks or executes arbitrary code. The `body.replace(/"/g, '\\"')` escape is insufficient — it doesn't handle `$()`, backticks, or newlines.

**Acceptance**:
- [ ] Refactor all `execSync` calls to use `execFileSync` with argument arrays (no shell interpretation), OR write the commit message and PR body to temp files and pass via `--file`
- [ ] Unit test with a firm slug containing `$(whoami)` to verify no injection

---

### R6-03 · RLS policy on `bot_usage_log` blocks the admin page

**Severity**: Critical (functional)
**File**: `supabase/migrations/20260330045009_bot_usage_log.sql:19-23`

```sql
create policy "service role insert only"
  on public.bot_usage_log
  for all
  using (false)
  with check (false);
```

This policy denies ALL operations (SELECT, INSERT, UPDATE, DELETE) for every role. `using(false)` blocks reads; `with check(false)` blocks writes. The service role bypasses RLS, so bot inserts work, but:

1. The policy name says "insert only" but it applies to `for all`
2. Any future non-service-role access is blocked

The admin page uses `createSupabaseServiceRole()` so it works today, but the policy is misleading and overly broad.

**Acceptance**:
- [ ] Split into two policies: one `for insert` with `with check(false)` (service role bypass handles inserts), and one `for select` that allows authenticated users to read (`using (auth.role() = 'authenticated')`)
- [ ] Alternatively, if only service role should ever touch this table, document that clearly in a comment

---

## High-Severity Findings

### R6-04 · Four identical `fetchPage()` functions across scrapers

**Severity**: High (maintainability)
**Files**: `scripts/monitor/apex-funding.ts`, `funded-next.ts`, `funding-pips.ts`, `lucid-trading.ts`

Every scraper file contains an identical `fetchPage()` function (abort controller, timeout, user-agent). Same signature, same logic, copy-pasted 4 times. When a 5th firm is added, it'll be 5 copies.

**Acceptance**:
- [ ] Extract `fetchPage(url: string, timeoutMs?: number): Promise<string>` to `scripts/monitor/utils.ts`
- [ ] Scrapers import from `./utils` instead of defining their own
- [ ] Keep the `USER_AGENT` constant in the shared module

---

### R6-05 · Scrapers never actually compare against local data

**Severity**: High (functional gap)
**Files**: All 4 scrapers

Each scraper calls `readLocalData()` and `scrapeRemote()` in parallel, but **the local data is never used in the comparison logic**. For example in `apex-funding.ts`:

```ts
const [local, remote] = await Promise.all([readLocalData(), scrapeRemote()])
// `local` is never referenced again
```

The diff detection is purely based on whether certain keywords exist on the live page (e.g., "does the word 'EOD' appear?"). This means:
- If a firm changes pricing from $200 to $500, the bot won't detect it (both pages still mention a dollar amount)
- The bot is essentially a health check for page structure, not a content change detector
- The `readLocalData()` call is dead code

**Acceptance**:
- [ ] Either remove `readLocalData()` (honest about what the bot actually does) and rename the feature to "health monitor"
- [ ] OR implement actual comparison: extract the same fields from local markdown that you check on the remote page, and diff them
- [ ] If keeping the current approach, add a comment explaining the detection strategy and its known limitations

---

### R6-06 · `matter.stringify()` may reformat frontmatter unpredictably

**Severity**: High (data integrity)
**File**: `scripts/monitor/runner.ts:77-83`

```ts
const parsed = matter(raw)
parsed.data.last_verified = `${date}T00:00:00Z`
parsed.data.verified_by = 'bot'
const updated = matter.stringify(parsed.content, parsed.data)
await writeFile(file, updated, 'utf-8')
```

`gray-matter`'s `stringify()` re-serializes the entire frontmatter block. This can:
- Reorder keys alphabetically
- Change quoting style (single → double, or add/remove quotes)
- Change date formatting (the `T00:00:00Z` suffix becomes a JS Date, then re-serialized differently)
- Strip comments

Each bot run would produce a noisy diff touching every field in every file, even when nothing meaningful changed. This creates churn that obscures real content changes.

**Acceptance**:
- [ ] Replace `matter.stringify()` with a targeted regex replacement that only modifies the `last_verified` and `verified_by` lines, preserving the rest of the file byte-for-byte
- [ ] Test with a round-trip: read → write → diff should show zero changes if only those two fields are updated

---

### R6-07 · Admin page has no role-based access control

**Severity**: High (security)
**File**: `src/app/admin/page.tsx:22-31`

Any authenticated user can access `/admin`. The auth check is:

```ts
if (!user) redirect('/auth/sign-in')
```

There's no role check. Any user who signs up gets access to the bot usage log (including error messages that may contain internal URLs or infrastructure details).

**Acceptance**:
- [ ] Add an admin allowlist (env var `ADMIN_EMAILS` or a Supabase `user_roles` table)
- [ ] Check the user's email/role before rendering the page; redirect non-admins to `/` with a 403 or a "not authorized" message

---

### R6-08 · `tsconfig.scripts.json` has wrong module settings for ESM code

**Severity**: High (correctness)
**File**: `tsconfig.scripts.json`

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "jsx": "react"
  }
}
```

The scripts use ESM imports (`import * as cheerio from 'cheerio'`), top-level `await` (in `health-check.ts`), and dynamic `import()`. Setting `module: "commonjs"` is contradictory. It works only because `tsx` ignores the module setting and transpiles everything to ESM anyway, but:
- `noEmit: false` and `outDir: "dist/scripts"` suggest the config was meant for `tsc` compilation, which would fail
- `jsx: "react"` is unnecessary — these are `.ts` files with no JSX

**Acceptance**:
- [ ] Change to `"module": "nodenext"`, `"moduleResolution": "nodenext"`
- [ ] Remove `"jsx": "react"` (no JSX in scripts)
- [ ] Either remove `noEmit: false` / `outDir` (if only using `tsx`) or verify `tsc --project tsconfig.scripts.json` actually works

---

## Medium-Severity Findings

### R6-09 · `cheerio` is a devDependency but used at runtime by the bot

**Severity**: Medium (dependency correctness)
**File**: `package.json`

`cheerio` is listed under `devDependencies`, but it's imported by `scripts/monitor/*.ts` which run in CI via `npx tsx`. In this project this works because `npm ci` installs devDeps in CI. But it's semantically wrong — `cheerio` is a runtime dependency of the monitor scripts. If someone runs `npm ci --omit=dev` in CI (common for production builds), the bot breaks.

**Acceptance**:
- [ ] Move `cheerio` to `dependencies`, OR
- [ ] Create a separate `package.json` in `scripts/monitor/` with its own deps, OR
- [ ] At minimum add a comment in `package.json` explaining why it's in devDeps

---

### R6-10 · Legal page uses its own markdown pipeline instead of the shared one

**Severity**: Medium (maintainability)
**File**: `src/app/legal/[slug]/page.tsx:32-39`

The legal page builds its own `unified` pipeline:

```ts
const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
  .use(rehypeStringify)
  .process(content)
```

The main content pipeline in `getPageContent.ts` has a different plugin chain (includes wikilink resolution, possibly different sanitization rules). This means:
- Bug fixes to the main pipeline won't apply to legal pages
- Styling differences between legal and firm content
- Two places to maintain

**Acceptance**:
- [ ] Extract the markdown processing into a shared utility (e.g., `processMarkdown(content, options)`) used by both the legal page and `getPageContent.ts`
- [ ] If the legal pipeline intentionally differs (e.g., no wikilinks), document why

---

### R6-11 · `bot.yml` uses `GH_TOKEN` secret but the runner uses `GITHUB_TOKEN`

**Severity**: Medium (CI misconfiguration risk)
**File**: `.github/workflows/bot.yml:41, 48`

The workflow passes `GH_TOKEN: ${{ secrets.GH_TOKEN }}` as an env var. But GitHub Actions already provides `GITHUB_TOKEN` with the permissions declared in the workflow (`contents: write`, `pull-requests: write`). Using a custom `GH_TOKEN` PAT means:
- Extra secret to manage and rotate
- PAT may have broader permissions than needed
- If the PAT expires, the bot silently fails

The `gh` CLI automatically uses `GITHUB_TOKEN` if available.

**Acceptance**:
- [ ] Replace `GH_TOKEN: ${{ secrets.GH_TOKEN }}` with `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (the built-in token)
- [ ] Verify `gh pr create` works with the built-in token's permissions
- [ ] Remove the custom GH_TOKEN from repo secrets documentation

---

### R6-12 · `ScrapedFirmData` type in `types.ts` is unused

**Severity**: Medium (dead code)
**File**: `scripts/monitor/types.ts:9-12`

```ts
export interface ScrapedFirmData {
  fields: Record<string, string>
}
```

No file imports or uses `ScrapedFirmData`. Each scraper defines its own ad-hoc `Record<string, string>` return types.

**Acceptance**:
- [ ] Remove `ScrapedFirmData` from `types.ts`
- [ ] OR: adopt it — have each scraper's `scrapeRemote()` return `ScrapedFirmData` for type consistency

---

### R6-13 · `updateLastVerified` dynamic-imports `readdir` but never uses it

**Severity**: Medium (dead code)
**File**: `scripts/monitor/runner.ts:72`

```ts
const { readdir } = await import('fs/promises')
```

`readdir` is imported but never used — `fast-glob` handles the file listing. This is likely a leftover from an earlier implementation.

**Acceptance**:
- [ ] Remove the `readdir` import

---

### R6-14 · Search excerpt logic doesn't handle blank lines between title and content

**Severity**: Medium (search quality)
**File**: `scripts/build-search-index.ts:48-59`

The H1-strip logic checks if the first line equals the title:

```ts
const firstLineIsTitle = lines[0]?.trim() === String(data.title).trim()
const bodyText = (firstLineIsTitle ? lines.slice(1).join('\n') : plainText).trim()
```

After stripping markdown, the first line is usually the title, but:
- If there's a blank line between the title and the first paragraph, `lines[1]` is empty and the "40-char minimum" filter in the excerpt loop may skip it but waste an iteration
- Tables and list items are collapsed by `strip-markdown` into short lines (<40 chars), so tabular pages (challenge specs) often get no meaningful excerpt — they fall through to the 160-char truncation fallback

**Acceptance**:
- [ ] After stripping the title line, also strip leading blank lines before searching for the excerpt paragraph
- [ ] Consider lowering the 40-char threshold to 20, or special-casing pages where the body starts with a table

---

## Low-Severity Findings

### R6-15 · `og.png` is 3.1 KB — likely a placeholder

**Severity**: Low (launch quality)
**File**: `public/og.png`

The OG image is 1200x630 at only 3.1 KB. This is almost certainly a solid-color rectangle or minimal placeholder. Social shares will look blank/generic.

**Acceptance**:
- [ ] Design a proper OG image with the OpenPropFirm logo, tagline, and brand colors
- [ ] Keep the same dimensions (1200x630) and filename

---

### R6-16 · Legal pages set `robots: { index: false }` — intentional?

**Severity**: Low (SEO)
**File**: `src/app/legal/[slug]/page.tsx:53`

```ts
robots: { index: false },
```

This means Terms of Service and Disclaimer won't appear in Google. This is unusual — most sites want legal pages indexed (they build trust and are sometimes required for merchant/payment compliance). If intentional, add a comment explaining why.

**Acceptance**:
- [ ] Remove `robots: { index: false }` so legal pages are indexable, OR
- [ ] Add a code comment explaining the rationale for noindex

---

### R6-17 · Settings button in NavPanel is permanently disabled

**Severity**: Low (UX debt)
**File**: `src/components/nav/NavPanel.tsx:86-93`

```tsx
<button
  className="... opacity-40 cursor-not-allowed"
  onClick={() => {}}
  aria-disabled="true"
>
  <Settings size={16} />
</button>
```

A permanently disabled settings icon with an empty click handler adds visual noise with no function. Either ship the feature or remove the button.

**Acceptance**:
- [ ] Remove the disabled settings button entirely until a settings feature is built
- [ ] OR wire it to something useful (e.g., link to the theme toggle or user preferences)

---

### R6-18 · `data/_templates/` referenced in CONTRIBUTING.md doesn't exist

**Severity**: Low (documentation)
**File**: `CONTRIBUTING.md:38`

> Copy the templates from `data/_templates/` as a starting point.

There is no `data/_templates/` directory in the repo. This will confuse contributors.

**Acceptance**:
- [ ] Create `data/_templates/` with skeleton `index.md`, `rules.md`, `promos.md`, `changelog.md`, and `challenges/example.md`
- [ ] OR remove the reference from CONTRIBUTING.md

---

### R6-19 · Monitor docs reference `pnpm` but `package-lock.json` is npm

**Severity**: Low (documentation)
**File**: `docs/bot.md`, `CONTRIBUTING.md`, `.github/workflows/bot.yml`

All documentation and instructions reference `pnpm` (`pnpm install`, `pnpm run monitor`), but the repo has `package-lock.json` (npm) and the CI workflow runs `npm ci`. Contributors following the docs will need pnpm installed, but the lockfile is npm.

**Acceptance**:
- [ ] Standardize on one package manager: change docs to use `npm` (matching the lockfile), OR migrate to pnpm with a `pnpm-lock.yaml`
- [ ] Update `docs/bot.md`, `CONTRIBUTING.md`, and any other references

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 3 | R6-01, R6-02, R6-03 |
| High | 5 | R6-04, R6-05, R6-06, R6-07, R6-08 |
| Medium | 6 | R6-09, R6-10, R6-11, R6-12, R6-13, R6-14 |
| Low | 5 | R6-15, R6-16, R6-17, R6-18, R6-19 |
| **Total** | **19** | |

### Recommended resolution order

1. **R6-01** — Clean up remaining YAML blank-line artifacts (prevents future breakage)
2. **R6-02** — Fix shell injection in runner.ts (security)
3. **R6-03** — Fix RLS policy (correctness)
4. **R6-07** — Add admin role check (security)
5. **R6-04** — Extract shared fetchPage (before adding more scrapers)
6. **R6-06** — Fix matter.stringify churn (before first bot run)
7. **R6-05** — Decide scraper comparison strategy
8. **R6-08** — Fix tsconfig.scripts.json
9. **R6-11** — Switch to built-in GITHUB_TOKEN
10. Everything else
