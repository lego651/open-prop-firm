/**
 * Pre-flight health check for the monitoring bot.
 *
 * Verifies:
 *  1. Required environment variables are set
 *  2. Supabase service role key can connect and read bot_usage_log
 *  3. GitHub CLI (`gh`) is authenticated
 *
 * Usage:
 *   pnpm run monitor:health
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

let passed = 0
let failed = 0

function ok(msg: string) {
  console.log(`  ✓ ${msg}`)
  passed++
}

function fail(msg: string) {
  console.error(`  ✗ ${msg}`)
  failed++
}

// 1. Environment variables
console.log('\n[1] Checking environment variables...')
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]
for (const key of required) {
  if (process.env[key]) ok(`${key} is set`)
  else fail(`${key} is missing`)
}

// 2. Supabase connectivity
console.log('\n[2] Checking Supabase connectivity...')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (url && key) {
  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.from('bot_usage_log').select('id').limit(1)
    if (error) fail(`Supabase query failed: ${error.message}`)
    else ok('Supabase connected and bot_usage_log is accessible')
  } catch (err) {
    fail(`Supabase connection error: ${err instanceof Error ? err.message : err}`)
  }
} else {
  fail('Supabase credentials missing — skipping connectivity check')
}

// 3. GitHub CLI auth
console.log('\n[3] Checking GitHub CLI auth...')
try {
  execSync('gh auth status', { stdio: 'pipe' })
  ok('gh is authenticated')
} catch {
  fail('gh is not authenticated — run `gh auth login` before running the monitor')
}

// Summary
console.log(`\n${'─'.repeat(40)}`)
if (failed === 0) {
  console.log(`Health check passed (${passed}/${passed + failed} checks OK)`)
  process.exit(0)
} else {
  console.error(`Health check failed (${failed} issue${failed > 1 ? 's' : ''} found)`)
  process.exit(1)
}
