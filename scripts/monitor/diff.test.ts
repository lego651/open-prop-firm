import { describe, it, expect } from 'vitest'
import { diffSnapshots } from './diff'
import type { CurrentSnapshot, ScrapedSnapshot } from './types'

const SRC = 'https://example.com/rules'

function makeCurrent(overrides?: Partial<CurrentSnapshot['snapshot']>): CurrentSnapshot {
  return {
    snapshot: {
      news_trading_allowed: true,
      overnight_holding_allowed: true,
      weekend_holding_allowed: true,
      max_drawdown: {
        type: 'static',
        value_usd: 5000,
        source_url: SRC,
      },
      consistency_rule: {
        enabled: false,
        source_url: SRC,
      },
      payout_split_pct: 80,
      best_for: 'Flagship',
      ...overrides,
    },
    cheapest_challenge_price_usd: 199.99,
    cheapest_challenge_source_url: SRC,
  }
}

describe('diffSnapshots', () => {
  it('returns [] when scraped matches current', () => {
    const scraped: ScrapedSnapshot = {
      news_trading_allowed: true,
      overnight_holding_allowed: true,
      weekend_holding_allowed: true,
      max_drawdown: { type: 'static', value_usd: 5000 },
      consistency_rule: { enabled: false },
      payout_split_pct: 80,
      cheapest_challenge_price_usd: 199.99,
    }
    expect(diffSnapshots(makeCurrent(), scraped, SRC)).toEqual([])
  })

  it('skips fields the scraper returned null', () => {
    const scraped: ScrapedSnapshot = {
      news_trading_allowed: null,
      max_drawdown: null,
    }
    expect(diffSnapshots(makeCurrent(), scraped, SRC)).toEqual([])
  })

  it('skips fields the scraper omitted entirely', () => {
    const scraped: ScrapedSnapshot = {}
    expect(diffSnapshots(makeCurrent(), scraped, SRC)).toEqual([])
  })

  it('flags a single boolean change', () => {
    const scraped: ScrapedSnapshot = { news_trading_allowed: false }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toEqual({
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: SRC,
    })
  })

  it('flags nested max_drawdown.value_usd change', () => {
    const scraped: ScrapedSnapshot = {
      max_drawdown: { type: 'static', value_usd: 6000 },
    }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({
      field: 'snapshot.max_drawdown.value_usd',
      from: 5000,
      to: 6000,
    })
  })

  it('flags nested max_drawdown.type change', () => {
    const scraped: ScrapedSnapshot = {
      max_drawdown: { type: 'trailing_eod', value_usd: 5000 },
    }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({
      field: 'snapshot.max_drawdown.type',
      from: 'static',
      to: 'trailing_eod',
    })
  })

  it('flags consistency_rule.enabled change', () => {
    const scraped: ScrapedSnapshot = {
      consistency_rule: { enabled: true, max_daily_pct: 30 },
    }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs.map((d) => d.field)).toEqual(
      expect.arrayContaining([
        'snapshot.consistency_rule.enabled',
        'snapshot.consistency_rule.max_daily_pct',
      ]),
    )
  })

  it('flags cheapest_challenge_price_usd change', () => {
    const scraped: ScrapedSnapshot = { cheapest_challenge_price_usd: 189.99 }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toMatchObject({
      field: 'cheapest_challenge_price_usd',
      from: 199.99,
      to: 189.99,
    })
  })

  it('uses per-field source_url from current when available', () => {
    const perFieldSrc = 'https://example.com/max-drawdown-rule'
    const current = makeCurrent()
    current.snapshot.max_drawdown.source_url = perFieldSrc
    const scraped: ScrapedSnapshot = {
      max_drawdown: { type: 'static', value_usd: 6000 },
    }
    const diffs = diffSnapshots(current, scraped, SRC)
    expect(diffs[0].source_url).toBe(perFieldSrc)
  })

  it('falls back to fallback source_url when field-level is missing', () => {
    const scraped: ScrapedSnapshot = { news_trading_allowed: false }
    const diffs = diffSnapshots(makeCurrent(), scraped, SRC)
    expect(diffs[0].source_url).toBe(SRC)
  })
})
