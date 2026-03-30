/**
 * Monitor runner — orchestrates all firm scrapers.
 *
 * Usage:
 *   pnpm run monitor
 *   pnpm run monitor -- --firm funded-next   (single firm)
 *
 * On changesDetected: updates last_verified front-matter, commits to a temp
 * branch, and opens a GitHub PR via `gh pr create`.
 *
 * Always inserts a row into Supabase bot_usage_log.
 */

import { readFile, writeFile } from 'fs/promises'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import type { BotRunResult } from './types'

// --- Scrapers ------------------------------------------------------------------

import { run as runFundedNext } from './funded-next'
import { run as runFundingPips } from './funding-pips'
import { run as runApexFunding } from './apex-funding'
import { run as runLucidTrading } from './lucid-trading'

const SCRAPERS: Array<{ slug: string; run: () => Promise<BotRunResult> }> = [
  { slug: 'funded-next', run: runFundedNext },
  { slug: 'funding-pips', run: runFundingPips },
  { slug: 'apex-funding', run: runApexFunding },
  { slug: 'lucid-trading', run: runLucidTrading },
]

// --- Helpers ------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function logToSupabase(result: BotRunResult, prUrl: string | null) {
  const supabase = getSupabase()
  if (!supabase) {
    console.warn('  [supabase] SUPABASE_SERVICE_ROLE_KEY not set — skipping log insert')
    return
  }
  const { error } = await supabase.from('bot_usage_log').insert({
    firm_slug: result.firmSlug,
    last_verified: result.lastVerified,
    changes_detected: result.changesDetected,
    pr_url: prUrl,
    tokens_used: null,
    cost_usd: null,
    error: result.error,
  })
  if (error) console.warn(`  [supabase] Insert failed: ${error.message}`)
  else console.log(`  [supabase] Logged run for ${result.firmSlug}`)
}

/** Resolve the firm content directory from a slug. */
function firmDir(slug: string): string {
  const cfdSlugs = ['funded-next', 'funding-pips']
  const category = cfdSlugs.includes(slug) ? 'cfd' : 'futures'
  return path.join(process.cwd(), 'data', 'firms', category, slug)
}

/** Update last_verified front-matter across all .md files in a firm directory. */
async function updateLastVerified(slug: string, date: string) {
  const fg = (await import('fast-glob')).default
  const dir = firmDir(slug)
  const files = await fg('**/*.md', { cwd: dir, absolute: true })

  for (const file of files) {
    let content = await readFile(file, 'utf-8')
    // Replace only the two bot-managed fields, preserving all other bytes
    content = content.replace(/^last_verified:.*$/m, `last_verified: '${date}T00:00:00Z'`)
    content = content.replace(/^verified_by:.*$/m, `verified_by: bot`)
    await writeFile(file, content, 'utf-8')
  }
  console.log(`  Updated last_verified to ${date} across ${files.length} files for ${slug}`)
}

/** Create a branch + PR for a detected change. Returns the PR URL or null. */
function createPR(result: BotRunResult): string | null {
  const branch = `bot/${result.firmSlug}-${result.lastVerified}`
  const title = `[bot] ${result.firmSlug} — content update ${result.lastVerified}`
  const body = [
    `Automated content update detected by the monitoring bot on ${result.lastVerified}.`,
    '',
    '## Changes detected',
    '',
    result.diff ?? 'See diff for details.',
    '',
    '---',
    '_Opened by the OpenPropFirm monitoring bot. Review before merging._',
  ].join('\n')

  // Write body to a temp file to prevent shell metacharacter injection
  const bodyFile = path.join(tmpdir(), `opf-bot-pr-body-${Date.now()}.md`)

  try {
    // Check for a clean working tree first
    const status = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf-8' }).trim()
    if (!status) {
      console.log(`  No file changes to commit for ${result.firmSlug}`)
      return null
    }

    execFileSync('git', ['checkout', '-b', branch], { stdio: 'inherit' })
    execFileSync('git', ['add', 'data/firms'], { stdio: 'inherit' })
    execFileSync('git', ['commit', '-m', title], { stdio: 'inherit' })
    execFileSync('git', ['push', '-u', 'origin', branch], { stdio: 'inherit' })

    // Ensure the bot-update label exists
    try {
      execFileSync('gh', ['label', 'create', 'bot-update', '--color', '0075ca', '--description', 'Opened by the monitoring bot'], { stdio: 'pipe' })
    } catch { /* label already exists */ }

    writeFileSync(bodyFile, body, 'utf-8')

    const prUrl = execFileSync(
      'gh',
      ['pr', 'create', '--title', title, '--body-file', bodyFile, '--label', 'bot-update'],
      { encoding: 'utf-8' },
    ).trim()

    console.log(`  PR created: ${prUrl}`)
    // Switch back to main
    execFileSync('git', ['checkout', 'main'], { stdio: 'inherit' })
    return prUrl
  } catch (err) {
    console.error(`  Failed to create PR: ${err instanceof Error ? err.message : err}`)
    try { execFileSync('git', ['checkout', 'main'], { stdio: 'pipe' }) } catch { /* ignore */ }
    return null
  } finally {
    try { unlinkSync(bodyFile) } catch { /* file may not exist if body write failed */ }
  }
}

// --- Main ---------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const firmFilter = args.includes('--firm') ? args[args.indexOf('--firm') + 1] : null

  const scrapers = firmFilter
    ? SCRAPERS.filter((s) => s.slug === firmFilter)
    : SCRAPERS

  if (scrapers.length === 0) {
    console.error(`No scraper found for firm: ${firmFilter}`)
    process.exit(1)
  }

  console.log(`Running monitor for: ${scrapers.map((s) => s.slug).join(', ')}\n`)

  let hasUnhandledError = false

  for (const { slug, run } of scrapers) {
    console.log(`[${slug}] Starting...`)
    let result: BotRunResult
    try {
      result = await run()
    } catch (err) {
      console.error(`[${slug}] Unhandled error:`, err)
      hasUnhandledError = true
      continue
    }

    if (result.error) {
      console.error(`[${slug}] Scraper error: ${result.error}`)
    } else {
      console.log(`[${slug}] changesDetected=${result.changesDetected}`)
      if (result.diff) console.log(`[${slug}] diff:\n${result.diff}`)
    }

    // Always update last_verified
    await updateLastVerified(slug, result.lastVerified)

    let prUrl: string | null = null
    if (result.changesDetected && !result.error) {
      console.log(`[${slug}] Opening PR...`)
      prUrl = createPR(result)
    }

    await logToSupabase(result, prUrl)
    console.log(`[${slug}] Done.\n`)
  }

  if (hasUnhandledError) {
    console.error('One or more scrapers threw unhandled errors.')
    process.exit(1)
  }

  console.log('Monitor run complete.')
}

main().catch((err) => {
  console.error('Runner failed:', err)
  process.exit(1)
})
