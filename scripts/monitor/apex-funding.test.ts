import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './apex-funding'

const FIXTURE = path.join(__dirname, '__fixtures__', 'apex-funding.html')

describe('apex-funding parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.weekend_holding_allowed).toBe(false)
    expect(snap.max_drawdown?.type).toBe('trailing_eod')
    expect(snap.max_drawdown?.value_usd).toBe(2000)
    expect(snap.payout_split_pct).toBe(100)
    expect(snap.cheapest_challenge_price_usd).toBe(177)
  })

  it('returns null for missing fields', () => {
    const snap = parseScrapedSnapshot('<html><body>Empty</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
    expect(snap.cheapest_challenge_price_usd ?? null).toBeNull()
  })
})
