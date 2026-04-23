import { describe, it, expect } from 'vitest'
import { validateDecisionBlock } from './validate-content'

describe('validateDecisionBlock', () => {
  it('returns no errors when decision block is absent', () => {
    const fm = { title: 'Funded Next', firm: 'funded-next' }
    const errors = validateDecisionBlock(fm, 'data/firms/cfd/funded-next/index.md')
    expect(errors).toEqual([])
  })

  it('returns no errors for a valid decision block', () => {
    const fm = {
      title: 'Apex',
      firm: 'apex-funding',
      decision: {
        snapshot: {
          news_trading_allowed: false,
          overnight_holding_allowed: false,
          weekend_holding_allowed: false,
          max_drawdown: {
            type: 'trailing_intraday',
            value_usd: 2500,
            source_url: 'https://apextraderfunding.com/rules',
          },
          consistency_rule: {
            enabled: true,
            max_daily_pct: 30,
            source_url: 'https://apextraderfunding.com/payouts',
          },
          payout_split_pct: 80,
          best_for: 'Intraday scalpers',
        },
        kill_you_first: [
          {
            title: 'Trailing DD',
            detail: 'Profits cannot be locked early',
            source_url: 'https://apextraderfunding.com/rules',
          },
        ],
        fit_score: {
          ny_scalping: 4,
          swing_trading: 1,
          news_trading: 0,
          beginner_friendly: 2,
          scalable: 2,
        },
        pre_trade_checklist: [
          { id: 'news_clear', label: 'No major news next 30 min' },
        ],
        changelog: [],
        affiliate: { url: null, utm: 'openprop' },
      },
    }
    const errors = validateDecisionBlock(fm, 'data/firms/futures/apex-funding/index.md')
    expect(errors).toEqual([])
  })

  it('returns errors when decision block is malformed', () => {
    const fm = {
      title: 'Apex',
      decision: { snapshot: {} },
    }
    const errors = validateDecisionBlock(fm, 'data/firms/futures/apex-funding/index.md')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatchObject({
      file: 'data/firms/futures/apex-funding/index.md',
      field: expect.stringContaining('decision'),
    })
  })

  it('errors when a basic-info file has no decision block', () => {
    const fm = {
      title: 'Test Firm — Overview',
      firm: 'Test Firm',
      category: 'cfd',
      type: 'basic-info',
      status: 'active',
      last_verified: '2026-04-23T00:00:00Z',
      verified_by: 'manual',
      sources: [{ url: 'https://example.com/page', label: 'Test' }],
      website: 'https://example.com',
      founded: 2020,
    }
    const errors = validateDecisionBlock(
      fm,
      'data/firms/cfd/test-firm/index.md',
    )
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('decision')
    expect(errors[0].message).toMatch(/required/i)
  })
})
