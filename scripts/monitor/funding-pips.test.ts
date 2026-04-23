import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { parseScrapedSnapshot } from './funding-pips'

const FIXTURE = path.join(__dirname, '__fixtures__', 'funding-pips.html')

describe('funding-pips parseScrapedSnapshot', () => {
  it('parses the 6 watched fields from fixture HTML', async () => {
    const html = await readFile(FIXTURE, 'utf-8')
    const snap = parseScrapedSnapshot(html)
    expect(snap.news_trading_allowed).toBe(true)
    expect(snap.max_drawdown?.type).toBe('static')
    expect(snap.max_drawdown?.value_usd).toBe(5000)
    expect([60, 80, 100]).toContain(snap.payout_split_pct)
    expect(snap.cheapest_challenge_price_usd).toBe(36)
  })

  it('returns null for missing fields', () => {
    const snap = parseScrapedSnapshot('<html><body>Empty</body></html>')
    expect(snap.max_drawdown?.value_usd ?? null).toBeNull()
    expect(snap.cheapest_challenge_price_usd ?? null).toBeNull()
  })
})
