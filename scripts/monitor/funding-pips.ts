/**
 * Monitor scraper for Funding Pips (fundingpips.com).
 *
 * Parses 6 watched fields into a ScrapedSnapshot, then hands off to
 * diffSnapshots + readCurrentSnapshot in the shared run() code path.
 */

import * as cheerio from 'cheerio'
import type { BotRunResult, ScrapedSnapshot } from './types'
import { fetchPage } from './utils'
import { diffSnapshots, renderPRBody } from './diff'
import { readCurrentSnapshot } from './read-current'

const FIRM_SLUG = 'funding-pips'
const SCRAPE_URL = 'https://fundingpips.com/trading-objectives'

export function parseScrapedSnapshot(html: string): ScrapedSnapshot {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  const ddPctMatch = /max overall drawdown[^%]*?(\d+)%/i.exec(text)
  const accountSizeMatch = /\$([0-9]{1,3}(?:,[0-9]{3})+)\s*account/i.exec(text)
  let ddUsd: number | null = null
  if (ddPctMatch && accountSizeMatch) {
    const pct = Number.parseFloat(ddPctMatch[1])
    const size = Number.parseFloat(accountSizeMatch[1].replace(/,/g, ''))
    if (Number.isFinite(pct) && Number.isFinite(size)) ddUsd = (pct / 100) * size
  }

  // Payout split — first N in "60%/80%/100%" form, else any N% near "split"
  let payoutPct: number | null = null
  const tri = /(\d+)\s*%\s*\/\s*(\d+)\s*%\s*\/\s*(\d+)\s*%/.exec(text)
  if (tri) payoutPct = Number.parseInt(tri[1], 10)
  if (payoutPct === null) {
    const m = /payout split[^%]*?(\d+)\s*%/i.exec(text)
    if (m) payoutPct = Number.parseInt(m[1], 10)
  }

  const newsAllowed = /news trading\s+(?:is\s+)?permitted|news trading\s+allowed/i.test(text)
  const newsProhibited = /news trading\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  const weekendAllowed = /weekend hold(?:ing)?\s+(?:is\s+)?allowed|weekend hold(?:ing)?\s+(?:is\s+)?permitted/i.test(text)
  const weekendProhibited = /weekend hold(?:ing)?\s+(?:is\s+)?not\s+(?:permitted|allowed)/i.test(text)

  // Require literal "account" word after size; reject "$50k EOD"-style matches.
  const priceMatches = [...text.matchAll(/\$[0-9,]+(?:k)?\s+account\b[^$]*?\$([0-9]+(?:\.[0-9]+)?)/gi)]
  let cheapestPrice: number | null = null
  for (const m of priceMatches) {
    const price = Number.parseFloat(m[1])
    if (Number.isFinite(price) && (cheapestPrice === null || price < cheapestPrice)) {
      cheapestPrice = price
    }
  }

  return {
    news_trading_allowed: newsAllowed ? true : newsProhibited ? false : null,
    overnight_holding_allowed: null,
    weekend_holding_allowed: weekendAllowed ? true : weekendProhibited ? false : null,
    max_drawdown: ddUsd != null ? { type: 'static', value_usd: ddUsd } : null,
    consistency_rule: null,
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
