/**
 * Monitor scraper for Apex Trader Funding (apextraderfunding.com)
 *
 * Keyword-based page structure monitor: detects removed products and pricing
 * signal changes on the live website. Not a field-level diff — it cannot
 * detect granular content edits, only structural changes.
 */

import * as cheerio from 'cheerio'
import type { BotRunResult } from './types'
import { fetchPage } from './utils'

const FIRM_SLUG = 'apex-funding'
const SCRAPE_URL = 'https://apextraderfunding.com/evaluation'

async function scrapeRemote(): Promise<Record<string, string>> {
  const html = await fetchPage(SCRAPE_URL)
  const $ = cheerio.load(html)

  const pageTitle = $('title').text().trim()
  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000)

  // Check for 4.0 model characteristics
  const hasEOD = /\beod\b/i.test(bodyText)
  const hasIntraday = /intraday/i.test(bodyText)
  const has25k = /\$25[,.]?000|\$25k/i.test(bodyText)
  const has150k = /\$150[,.]?000|\$150k/i.test(bodyText)
  // 4.0 model moved to one-time fee
  const hasOneTimeFee = /one.?time/i.test(bodyText)

  return {
    pageTitle,
    hasEOD: String(hasEOD),
    hasIntraday: String(hasIntraday),
    has25k: String(has25k),
    has150k: String(has150k),
    hasOneTimeFee: String(hasOneTimeFee),
    bodySnippet: bodyText.slice(0, 500),
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)

  try {
    const remote = await scrapeRemote()

    const diffs: string[] = []

    if (remote.hasEOD === 'false') {
      diffs.push('EOD account type no longer detected on apextraderfunding.com/evaluation.')
    }
    if (remote.hasIntraday === 'false') {
      diffs.push('Intraday account type no longer detected on apextraderfunding.com/evaluation.')
    }
    if (remote.has25k === 'false') {
      diffs.push('$25k account size no longer detected — smallest available account may have changed.')
    }
    if (remote.has150k === 'false') {
      diffs.push('$150k account size no longer detected — largest available account may have changed.')
    }
    if (remote.hasOneTimeFee === 'false') {
      diffs.push('One-time fee model no longer detected — pricing structure may have reverted to subscription.')
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
