import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './funded-next'

const FIXTURE = path.join(__dirname, '__fixtures__', 'funded-next.html')

describe('funded-next parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.weekend_holding_allowed).toBe(true)
    expect(snap.max_drawdown?.type).toBe('static')
    expect(snap.max_drawdown?.value_usd).toBe(5000)
    expect(snap.payout_split_pct).toBe(80)
    expect(snap.cheapest_challenge_price_usd).toBe(199.99)
  })

  it('returns null for fields it cannot find', () => {
    const snap = parseScrapedSnapshot('<html><body>Nothing relevant</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
    expect(snap.payout_split_pct ?? null).toBeNull()
    expect(snap.cheapest_challenge_price_usd ?? null).toBeNull()
  })
})
