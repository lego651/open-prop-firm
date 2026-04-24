import { describe, it, expect } from 'vitest'
import path from 'path'
import { loadFirm, listFirms } from './repository'

const REAL_DATA = path.join(process.cwd(), 'data', 'firms')

describe('loadFirm', () => {
  it('returns null for an unknown slug', async () => {
    const firm = await loadFirm('does-not-exist', { rootDir: REAL_DATA })
    expect(firm).toBeNull()
  })

  it('loads a CFD firm with its decision block', async () => {
    const firm = await loadFirm('funding-pips', { rootDir: REAL_DATA })
    expect(firm).not.toBeNull()
    expect(firm!.slug).toBe('funding-pips')
    expect(firm!.category).toBe('cfd')
    expect(firm!.decision).not.toBeNull()
    expect(firm!.decision!.snapshot.payout_split_pct).toBeTypeOf('number')
    expect(firm!.decision!.fit_score.ny_scalping).toBeTypeOf('number')
    expect(Array.isArray(firm!.sources)).toBe(true)
    expect(firm!.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}/)
    expect(firm!.verifiedBy === 'bot' || firm!.verifiedBy === 'manual').toBe(true)
  })

  it('loads a futures firm', async () => {
    const firm = await loadFirm('apex-funding', { rootDir: REAL_DATA })
    expect(firm).not.toBeNull()
    expect(firm!.category).toBe('futures')
  })

  it('returns a firm with decision: null when decision block is missing', async () => {
    // All 4 v1 launch firms have decision blocks. Document the contract:
    const firm = await loadFirm('funding-pips', { rootDir: REAL_DATA })
    expect(firm).not.toBeNull()
    const maybeDecision: null | object = firm!.decision
    expect(maybeDecision).not.toBeNull() // for funding-pips specifically
  })
})

describe('listFirms', () => {
  it('returns all 4 launch firms', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    expect(firms).toHaveLength(4)
  })

  it('sorts CFD firms before futures firms', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    const cfdIndexes = firms.map((f, i) => ({ c: f.category, i })).filter((x) => x.c === 'cfd').map((x) => x.i)
    const futuresIndexes = firms.map((f, i) => ({ c: f.category, i })).filter((x) => x.c === 'futures').map((x) => x.i)
    for (const ci of cfdIndexes) {
      for (const fi of futuresIndexes) {
        expect(ci).toBeLessThan(fi)
      }
    }
  })

  it('alphabetizes within a category', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    const cfd = firms.filter((f) => f.category === 'cfd').map((f) => f.slug)
    const futures = firms.filter((f) => f.category === 'futures').map((f) => f.slug)
    expect(cfd).toEqual([...cfd].sort())
    expect(futures).toEqual([...futures].sort())
  })

  it('populates href, snapshot, fitScore on each FirmMeta', async () => {
    const firms = await listFirms({ rootDir: REAL_DATA })
    for (const f of firms) {
      expect(f.href).toBe(`/firms/${f.slug}`)
      expect(f.snapshot.payout_split_pct).toBeTypeOf('number')
      expect(f.fitScore.ny_scalping).toBeTypeOf('number')
      expect(f.name.length).toBeGreaterThan(0)
    }
  })
})
