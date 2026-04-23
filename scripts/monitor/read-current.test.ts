import { describe, it, expect } from 'vitest'
import { readCurrentSnapshot } from './read-current'

describe('readCurrentSnapshot', () => {
  it('loads the decision snapshot for funded-next', async () => {
    const current = await readCurrentSnapshot('funded-next')
    expect(current.snapshot.max_drawdown.type).toBe('static')
    expect(current.snapshot.max_drawdown.value_usd).toBe(5000)
    expect(current.snapshot.payout_split_pct).toBe(80)
  })

  it('returns the cheapest challenge price across challenge files', async () => {
    const current = await readCurrentSnapshot('funded-next')
    expect(current.cheapest_challenge_price_usd).toBe(199.99)
    expect(current.cheapest_challenge_source_url).toMatch(/^https:\/\/.*fundednext/)
  })

  it('loads apex-funding from the futures category', async () => {
    const current = await readCurrentSnapshot('apex-funding')
    expect(current.snapshot.max_drawdown.type).toBe('trailing_eod')
    expect(current.snapshot.max_drawdown.value_usd).toBe(2000)
  })

  it('throws a helpful error for an unknown slug', async () => {
    await expect(readCurrentSnapshot('nonexistent-firm')).rejects.toThrow(
      /nonexistent-firm/,
    )
  })
})
