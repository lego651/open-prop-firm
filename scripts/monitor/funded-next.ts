/**
 * Monitor scraper for Funded Next (fundednext.com)
 *
 * Keyword-based page structure monitor: detects removed products and pricing
 * signal changes on the live website. Not a field-level diff — it cannot
 * detect granular content edits, only structural changes.
 */

import * as cheerio from 'cheerio'
import type { BotRunResult } from './types'
import { fetchPage } from './utils'

const FIRM_SLUG = 'funded-next'
const SCRAPE_URL = 'https://fundednext.com/stellar-model'

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
    const remote = await scrapeRemote()

    const diffs: string[] = []

    if (!remote.hasStellarModel || remote.hasStellarModel === 'false') {
      diffs.push('Stellar model reference no longer detected on fundednext.com — possible product rename or removal.')
    }
    if (!remote.hasChallengePricing || remote.hasChallengePricing === 'false') {
      diffs.push('Challenge pricing patterns no longer detected — pricing page may have changed significantly.')
    }

    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diffs: [],
      diff: diffs.length > 0 ? diffs.join('\n') : null,
      error: null,
    }
  } catch (err) {
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: false,
      diffs: [],
      diff: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
