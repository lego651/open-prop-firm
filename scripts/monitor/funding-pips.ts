/**
 * Monitor scraper for Funding Pips (fundingpips.com)
 *
 * Keyword-based page structure monitor: detects removed products and pricing
 * signal changes on the live website. Not a field-level diff — it cannot
 * detect granular content edits, only structural changes.
 */

import * as cheerio from 'cheerio'
import type { BotRunResult } from './types'
import { fetchPage } from './utils'

const FIRM_SLUG = 'funding-pips'
const SCRAPE_URL = 'https://fundingpips.com/challenge'

async function scrapeRemote(): Promise<Record<string, string>> {
  const html = await fetchPage(SCRAPE_URL)
  const $ = cheerio.load(html)

  const pageTitle = $('title').text().trim()
  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000)

  // Check for the four known models
  const hasZeroModel = /zero/i.test(bodyText)
  const has1Step = /1.?step/i.test(bodyText)
  const has2Step = /2.?step/i.test(bodyText)
  const hasChallengePricing = /\$\d{2,3}/.test(bodyText)

  return {
    pageTitle,
    hasZeroModel: String(hasZeroModel),
    has1Step: String(has1Step),
    has2Step: String(has2Step),
    hasChallengePricing: String(hasChallengePricing),
    bodySnippet: bodyText.slice(0, 500),
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)

  try {
    const remote = await scrapeRemote()

    const diffs: string[] = []

    if (remote.hasZeroModel === 'false') {
      diffs.push('Zero model no longer detected on fundingpips.com/challenge.')
    }
    if (remote.has1Step === 'false') {
      diffs.push('1-Step model no longer detected on fundingpips.com/challenge.')
    }
    if (remote.has2Step === 'false') {
      diffs.push('2-Step model no longer detected on fundingpips.com/challenge.')
    }
    if (remote.hasChallengePricing === 'false') {
      diffs.push('Challenge pricing patterns no longer detected — pricing may have changed significantly.')
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
