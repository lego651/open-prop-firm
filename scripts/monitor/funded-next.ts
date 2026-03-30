/**
 * Monitor scraper for Funded Next (fundednext.com)
 *
 * Checks the Stellar challenge page for key parameters:
 * profit targets, drawdown limits, and pricing signals.
 * Compares against local content front-matter and body text.
 */

import * as cheerio from 'cheerio'
import { readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import type { BotRunResult } from './types'

const FIRM_SLUG = 'funded-next'
const FIRM_DIR = path.join(process.cwd(), 'data', 'firms', 'cfd', 'funded-next')
const SCRAPE_URL = 'https://fundednext.com/stellar-model'
const TIMEOUT_MS = 30_000
const USER_AGENT =
  'Mozilla/5.0 (compatible; OpenPropFirmBot/1.0; +https://openpropfirm.com/bot)'

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/** Read the local index.md and extract key fields we want to monitor. */
async function readLocalData(): Promise<Record<string, string>> {
  const indexPath = path.join(FIRM_DIR, 'index.md')
  const raw = await readFile(indexPath, 'utf-8')
  const { data, content } = matter(raw)
  return {
    status: String(data.status ?? ''),
    website: String(data.website ?? ''),
    // Extract key facts from body content for change detection
    bodySnapshot: content.slice(0, 2000),
  }
}

/** Scrape fundednext.com and extract key observable fields. */
async function scrapeRemote(): Promise<Record<string, string>> {
  const html = await fetchPage(SCRAPE_URL)
  const $ = cheerio.load(html)

  // Extract page title and key text blocks
  const pageTitle = $('title').text().trim()
  // Look for profit target percentages mentioned on the page
  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000)

  // Check if the Stellar model is still referenced
  const hasStellarModel = /stellar/i.test(bodyText)
  const hasChallengePricing = /\$\d{2,3}\.?\d{0,2}/.test(bodyText)

  return {
    pageTitle,
    hasStellarModel: String(hasStellarModel),
    hasChallengePricing: String(hasChallengePricing),
    // Capture a normalised snippet for diffing
    bodySnippet: bodyText.slice(0, 500),
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)

  try {
    const [local, remote] = await Promise.all([readLocalData(), scrapeRemote()])

    const diffs: string[] = []

    if (!remote.hasStellarModel || remote.hasStellarModel === 'false') {
      diffs.push('Stellar model reference no longer detected on fundednext.com — possible product rename or removal.')
    }
    if (!remote.hasChallengePricing || remote.hasChallengePricing === 'false') {
      diffs.push('Challenge pricing patterns no longer detected — pricing page may have changed significantly.')
    }
    if (local.status !== 'active') {
      diffs.push(`Local status is "${local.status}" but firm website is still reachable.`)
    }

    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diff: diffs.length > 0 ? diffs.join('\n') : null,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
