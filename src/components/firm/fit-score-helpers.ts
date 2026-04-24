import type { FitScore } from '../../../scripts/monitor/schema'

export interface FitScoreRow {
  key: keyof FitScore
  label: string
  rating: number
  display: string
}

const LABELS: Record<keyof FitScore, string> = {
  ny_scalping: 'NY scalping',
  swing_trading: 'Swing trading',
  news_trading: 'News trading',
  beginner_friendly: 'Beginner friendly',
  scalable: 'Scalable',
}

const ORDER: Array<keyof FitScore> = [
  'ny_scalping',
  'swing_trading',
  'news_trading',
  'beginner_friendly',
  'scalable',
]

export function renderStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  if (clamped === 0) return '❌ not suitable'
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

export function buildFitScoreRows(fitScore: FitScore): FitScoreRow[] {
  return ORDER.map((key) => {
    const rating = fitScore[key]
    return {
      key,
      label: LABELS[key],
      rating,
      display: renderStars(rating),
    }
  })
}
