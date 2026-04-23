/**
 * Monitor scraper for Lucid Trading (lucidtrading.com)
 *
 * Keyword-based page structure monitor: detects removed products and pricing
 * signal changes on the live website. Not a field-level diff — it cannot
 * detect granular content edits, only structural changes.
 */

import * as cheerio from 'cheerio'
import type { BotRunResult } from './types'
import { fetchPage } from './utils'

const FIRM_SLUG = 'lucid-trading'
const SCRAPE_URL = 'https://lucidtrading.com/how-it-works'

async function scrapeRemote(): Promise<Record<string, string>> {
  const html = await fetchPage(SCRAPE_URL)
  const $ = cheerio.load(html)

  const pageTitle = $('title').text().trim()
  const bodyText = $('body').text().replace(/\s+/g, ' ').slice(0, 3000)

  const hasLucidFlex = /lucidflex/i.test(bodyText)
  const hasLucidPro = /lucidpro/i.test(bodyText)
  const hasLucidDirect = /luciddirect/i.test(bodyText)
  const has90Percent = /90%/.test(bodyText)
  const hasEOD = /\beod\b/i.test(bodyText)

  return {
    pageTitle,
    hasLucidFlex: String(hasLucidFlex),
    hasLucidPro: String(hasLucidPro),
    hasLucidDirect: String(hasLucidDirect),
    has90Percent: String(has90Percent),
    hasEOD: String(hasEOD),
    bodySnippet: bodyText.slice(0, 500),
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)

  try {
    const remote = await scrapeRemote()

    const diffs: string[] = []

    if (remote.hasLucidFlex === 'false') {
      diffs.push('LucidFlex product no longer detected on lucidtrading.com/how-it-works.')
    }
    if (remote.hasLucidPro === 'false') {
      diffs.push('LucidPro product no longer detected on lucidtrading.com/how-it-works.')
    }
    if (remote.hasLucidDirect === 'false') {
      diffs.push('LucidDirect product no longer detected on lucidtrading.com/how-it-works.')
    }
    if (remote.has90Percent === 'false') {
      diffs.push('90% profit split no longer mentioned — payout structure may have changed.')
    }
    if (remote.hasEOD === 'false') {
      diffs.push('EOD trailing drawdown no longer detected — drawdown methodology may have changed.')
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
