import { describe, it, expect } from 'vitest'
import {
  buildSnapshotChips,
  formatDrawdownType,
  formatDrawdownValue,
} from './snapshot-helpers'
import type { DecisionSnapshot } from '../../../scripts/monitor/schema'

const BASE: DecisionSnapshot = {
  news_trading_allowed: true,
  overnight_holding_allowed: true,
  weekend_holding_allowed: false,
  max_drawdown: {
    type: 'trailing_eod',
    value_usd: 2000,
    source_url: 'https://example.com/dd',
  },
  consistency_rule: {
    enabled: false,
    source_url: 'https://example.com/cr',
  },
  payout_split_pct: 100,
  best_for: 'Intraday futures scalpers',
}

describe('formatDrawdownType', () => {
  it('renames enum values into reader-friendly labels', () => {
    expect(formatDrawdownType('trailing_intraday')).toBe('trailing intraday')
    expect(formatDrawdownType('trailing_eod')).toBe('trailing EOD')
    expect(formatDrawdownType('static')).toBe('static')
  })
})

describe('formatDrawdownValue', () => {
  it('formats USD with thousands separator and no decimals', () => {
    expect(formatDrawdownValue(1500, 'trailing_intraday')).toBe('$1,500 (trailing intraday)')
    expect(formatDrawdownValue(2000, 'trailing_eod')).toBe('$2,000 (trailing EOD)')
    expect(formatDrawdownValue(50000, 'static')).toBe('$50,000 (static)')
  })
})

describe('buildSnapshotChips', () => {
  it('emits exactly 6 chips in the locked order', () => {
    const chips = buildSnapshotChips(BASE)
    expect(chips.map((c) => c.key)).toEqual([
      'news_trading',
      'overnight_holding',
      'weekend_holding',
      'max_drawdown',
      'consistency_rule',
      'payout_split',
    ])
  })

  it('marks boolean permissions as allowed/forbidden with Yes/No values', () => {
    const chips = buildSnapshotChips(BASE)
    const news = chips.find((c) => c.key === 'news_trading')!
    expect(news.label).toBe('News trading')
    expect(news.value).toBe('Yes')
    expect(news.status).toBe('allowed')

    const weekend = chips.find((c) => c.key === 'weekend_holding')!
    expect(weekend.value).toBe('No')
    expect(weekend.status).toBe('forbidden')
  })

  it('renders max drawdown with currency + type', () => {
    const chips = buildSnapshotChips(BASE)
    const dd = chips.find((c) => c.key === 'max_drawdown')!
    expect(dd.label).toBe('Max drawdown')
    expect(dd.value).toBe('$2,000 (trailing EOD)')
    expect(dd.status).toBe('neutral')
    expect(dd.sourceUrl).toBe('https://example.com/dd')
  })

  it('renders consistency rule as None when disabled, with allowed status', () => {
    const chips = buildSnapshotChips(BASE)
    const cr = chips.find((c) => c.key === 'consistency_rule')!
    expect(cr.label).toBe('Consistency rule')
    expect(cr.value).toBe('None')
    expect(cr.status).toBe('allowed')
    expect(cr.sourceUrl).toBe('https://example.com/cr')
  })

  it('renders consistency rule as "X% daily cap" when enabled, with forbidden status', () => {
    const withCR: DecisionSnapshot = {
      ...BASE,
      consistency_rule: {
        enabled: true,
        max_daily_pct: 30,
        source_url: 'https://example.com/cr2',
      },
    }
    const chips = buildSnapshotChips(withCR)
    const cr = chips.find((c) => c.key === 'consistency_rule')!
    expect(cr.value).toBe('30% daily cap')
    expect(cr.status).toBe('forbidden')
  })

  it('renders payout split as percentage with neutral status', () => {
    const chips = buildSnapshotChips(BASE)
    const p = chips.find((c) => c.key === 'payout_split')!
    expect(p.label).toBe('Payout split')
    expect(p.value).toBe('100%')
    expect(p.status).toBe('neutral')
  })

  it('falls back to max_drawdown.source_url for fields without their own source', () => {
    const chips = buildSnapshotChips(BASE)
    for (const key of ['news_trading', 'overnight_holding', 'weekend_holding', 'payout_split']) {
      expect(chips.find((c) => c.key === key)!.sourceUrl).toBe('https://example.com/dd')
    }
  })
})
