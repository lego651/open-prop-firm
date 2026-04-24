import { describe, it, expect } from 'vitest'
import { buildFitScoreRows, renderStars } from './fit-score-helpers'
import type { FitScore } from '../../../scripts/monitor/schema'

const SAMPLE: FitScore = {
  ny_scalping: 4,
  swing_trading: 1,
  news_trading: 5,
  beginner_friendly: 0,
  scalable: 3,
}

describe('renderStars', () => {
  it('renders 0 as the "not suitable" marker', () => {
    expect(renderStars(0)).toBe('❌ not suitable')
  })

  it('renders 1..5 as filled/empty star pairs summing to 5', () => {
    expect(renderStars(1)).toBe('★☆☆☆☆')
    expect(renderStars(3)).toBe('★★★☆☆')
    expect(renderStars(5)).toBe('★★★★★')
  })

  it('clamps out-of-range values', () => {
    expect(renderStars(-1)).toBe('❌ not suitable')
    expect(renderStars(10)).toBe('★★★★★')
  })
})

describe('buildFitScoreRows', () => {
  it('emits 5 rows in the locked order', () => {
    const rows = buildFitScoreRows(SAMPLE)
    expect(rows.map((r) => r.key)).toEqual([
      'ny_scalping',
      'swing_trading',
      'news_trading',
      'beginner_friendly',
      'scalable',
    ])
  })

  it('maps each key to its reader-friendly label and star display', () => {
    const rows = buildFitScoreRows(SAMPLE)
    const news = rows.find((r) => r.key === 'news_trading')!
    expect(news.label).toBe('News trading')
    expect(news.rating).toBe(5)
    expect(news.display).toBe('★★★★★')

    const beginner = rows.find((r) => r.key === 'beginner_friendly')!
    expect(beginner.label).toBe('Beginner friendly')
    expect(beginner.display).toBe('❌ not suitable')
  })
})
