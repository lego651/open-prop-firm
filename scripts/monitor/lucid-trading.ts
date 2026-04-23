/**
 * Monitor scraper for Lucid Trading (lucidtrading.com).
 *
 * Parses 6 watched fields into a ScrapedSnapshot, then hands off to
 * diffSnapshots + readCurrentSnapshot in the shared run() code path.
 */

import * as cheerio from 'cheerio'
import type { BotRunResult, ScrapedSnapshot } from './types'
import { fetchPage } from './utils'
import { diffSnapshots, renderPRBody } from './diff'
import { readCurrentSnapshot } from './read-current'

const FIRM_SLUG = 'lucid-trading'
const SCRAPE_URL = 'https://lucidtrading.com/how-it-works'

export function parseScrapedSnapshot(html: string): ScrapedSnapshot {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  // Trailing drawdown — $ value + EOD/Intraday type
  const ddMatch = /trailing drawdown[^$]*?\$([0-9,]+)[^(]*\((?:end-of-day|eod|intraday|real-time)\)/i.exec(text)
  let ddType: 'trailing_eod' | 'trailing_intraday' | null = null
  let ddUsd: number | null = null
  if (ddMatch) {
    ddUsd = Number.parseFloat(ddMatch[1].replace(/,/g, ''))
    ddType = /end-of-day|eod/i.test(ddMatch[0]) ? 'trailing_eod' : 'trailing_intraday'
    if (!Number.isFinite(ddUsd)) ddUsd = null
  }

  // Consistency rule — "Consistency Rule: N%"
  const consistencyMatch = /consistency rule[^%]*?(\d+)\s*%/i.exec(text)
  const consistency = consistencyMatch
    ? { enabled: true, max_daily_pct: Number.parseInt(consistencyMatch[1], 10) }
    : null

  // Payout split — first percentage in "Payout Split: N%..."
  const payoutMatch = /payout split[^%]*?(\d+)\s*%/i.exec(text)
  const payoutPct = payoutMatch ? Number.parseInt(payoutMatch[1], 10) : null

  const newsAllowed = /news trading\s+(?:is\s+)?(?:permitted|allowed)/i.test(text)
  const newsProhibited = /news trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  const weekendProhibited = /weekend hold(?:ing)?\s+(?:is\s+)?not\s+(?:permitted|allowed)|swing trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)
  const weekendAllowed = /weekend hold(?:ing)?\s+(?:is\s+)?(?:permitted|allowed)/i.test(text)

  const overnightProhibited = /overnight (?:positions? )?not\s+(?:permitted|allowed)|must close (?:all )?positions? before session end/i.test(text)

  const priceMatches = [
    ...text.matchAll(/\$[0-9,]+(?:k)?\s+account\b[^$]*?\$([0-9]+(?:\.[0-9]+)?)/gi),
  ]
  let cheapestPrice: number | null = null
  for (const m of priceMatches) {
    const price = Number.parseFloat(m[1])
    if (Number.isFinite(price) && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
    }
  }

  return {
    news_trading_allowed: newsAllowed ? true : newsProhibited ? false : null,
    overnight_holding_allowed: overnightProhibited ? false : null,
    weekend_holding_allowed: weekendAllowed ? true : weekendProhibited ? false : null,
    max_drawdown: ddUsd != null && ddType != null ? { type: ddType, value_usd: ddUsd } : null,
    consistency_rule: consistency,
    payout_split_pct: payoutPct,
    cheapest_challenge_price_usd: cheapestPrice,
  }
}

export async function run(): Promise<BotRunResult> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const html = await fetchPage(SCRAPE_URL)
    const scraped = parseScrapedSnapshot(html)
    const current = await readCurrentSnapshot(FIRM_SLUG)
    const diffs = diffSnapshots(current, scraped, SCRAPE_URL)
    const body = renderPRBody(FIRM_SLUG, diffs, {
      lastVerified: today,
      scrapedUrl: SCRAPE_URL,
    })
    return {
      firmSlug: FIRM_SLUG,
      lastVerified: today,
      changesDetected: diffs.length > 0,
      diffs,
      diff: body,
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
