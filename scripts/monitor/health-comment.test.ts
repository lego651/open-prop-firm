import { describe, it, expect } from 'vitest'
import { buildHealthCommentBody, HEALTH_SENTINEL } from './health-comment'

const RUN_AT = '2026-04-27T06:05:00Z'

describe('buildHealthCommentBody', () => {
  it('emits a green summary when all firms succeed', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: true, error: null },
        { slug: 'funding-pips', ok: true, error: null },
        { slug: 'apex-funding', ok: true, error: null },
        { slug: 'lucid-trading', ok: true, error: null },
      ],
    })
    const lines = body.split('\n')
    expect(lines[0]).toBe(HEALTH_SENTINEL)
    expect(lines[1]).toBe('✅ 2026-04-27 06:05 UTC — 4/4 scrapers OK')
    expect(body).toContain('| funded-next | ✅ |  |')
    expect(body).toContain('| lucid-trading | ✅ |  |')
  })

  it('emits a mixed-warning summary when some firms error', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: true, error: null },
        { slug: 'funding-pips', ok: false, error: 'fetch failed: 404' },
        { slug: 'apex-funding', ok: true, error: null },
        { slug: 'lucid-trading', ok: false, error: 'fetch failed: 403' },
      ],
    })
    expect(body.split('\n')[1]).toBe('⚠️ 2026-04-27 06:05 UTC — 2/4 scrapers OK, 2 errors')
    expect(body).toContain('| funding-pips | ❌ | fetch failed: 404 |')
    expect(body).toContain('| lucid-trading | ❌ | fetch failed: 403 |')
  })

  it('emits an all-errors summary when zero firms succeed', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: false, error: 'boom' },
        { slug: 'funding-pips', ok: false, error: 'boom' },
      ],
    })
    expect(body.split('\n')[1]).toBe('❌ 2026-04-27 06:05 UTC — 0/2 scrapers OK, 2 errors')
  })

  it('collapses multi-line error strings to the first line', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'funded-next', ok: false, error: 'line-one\nline-two\nline-three' },
      ],
    })
    expect(body).toContain('| funded-next | ❌ | line-one |')
    expect(body).not.toContain('line-two')
  })

  it('preserves input order of firms in the table', () => {
    const body = buildHealthCommentBody({
      runAt: RUN_AT,
      perFirm: [
        { slug: 'zeta', ok: true, error: null },
        { slug: 'alpha', ok: true, error: null },
      ],
    })
    const zetaIdx = body.indexOf('zeta')
    const alphaIdx = body.indexOf('alpha')
    expect(zetaIdx).toBeLessThan(alphaIdx)
  })

  it('starts with the health sentinel', () => {
    const body = buildHealthCommentBody({ runAt: RUN_AT, perFirm: [] })
    expect(body.startsWith(HEALTH_SENTINEL + '\n')).toBe(true)
  })
})
