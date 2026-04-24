import { describe, it, expect } from 'vitest'
import { splitRulesIntoSections } from './rule-breakdown-helpers'

const FIXTURE = `
<p>Intro paragraph that should be dropped.</p>
<h2>Drawdown Rules</h2>
<p>Daily drawdown is balance-based.</p>
<ul><li>One</li><li>Two</li></ul>
<h2>Trading Restrictions</h2>
<h3>EAs</h3>
<p>Permitted for execution only.</p>
<h2>Consistency Rules</h2>
<p>No formal rule.</p>
`.trim()

describe('splitRulesIntoSections', () => {
  it('returns empty array when there are no H2s', () => {
    expect(splitRulesIntoSections('<p>No headings here.</p>')).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(splitRulesIntoSections('')).toEqual([])
  })

  it('emits one section per top-level H2', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    expect(sections.map((s) => s.title)).toEqual([
      'Drawdown Rules',
      'Trading Restrictions',
      'Consistency Rules',
    ])
  })

  it('derives URL-safe slugs from titles', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    expect(sections.map((s) => s.slug)).toEqual([
      'drawdown-rules',
      'trading-restrictions',
      'consistency-rules',
    ])
  })

  it('preserves all sibling content until the next H2 in the html field', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    expect(sections[0].html).toContain('Daily drawdown is balance-based.')
    expect(sections[0].html).toContain('<ul>')
    expect(sections[0].html).not.toContain('Trading Restrictions')

    expect(sections[1].html).toContain('<h3>EAs</h3>')
    expect(sections[1].html).toContain('Permitted for execution only.')
    expect(sections[1].html).not.toContain('Consistency Rules')
  })

  it('drops content before the first H2', () => {
    const sections = splitRulesIntoSections(FIXTURE)
    const joined = sections.map((s) => s.html).join('')
    expect(joined).not.toContain('Intro paragraph that should be dropped')
  })
})
