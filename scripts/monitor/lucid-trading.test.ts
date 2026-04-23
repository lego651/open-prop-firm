import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './lucid-trading'

const FIXTURE = path.join(__dirname, '__fixtures__', 'lucid-trading.html')

describe('lucid-trading parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.weekend_holding_allowed).toBe(false)
    expect(snap.max_drawdown?.type).toBe('trailing_eod')
    expect(snap.max_drawdown?.value_usd).toBe(2000)
    expect(snap.consistency_rule?.enabled).toBe(true)
    expect(snap.consistency_rule?.max_daily_pct).toBe(50)
    expect(snap.payout_split_pct).toBe(90)
    expect(snap.cheapest_challenge_price_usd).toBe(100)
  })

  it('returns null for missing fields', () => {
    const snap = parseScrapedSnapshot('<html><body>Empty</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
  })
})
