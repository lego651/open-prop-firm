import { describe, it, expect } from 'vitest'
import {
  ChangelogEntrySchema,
  ChecklistItemSchema,
  FitScoreSchema,
  KillYouFirstEntrySchema,
  DecisionSnapshotSchema,
} from './schema'

describe('ChangelogEntrySchema', () => {
  it('accepts a valid entry', () => {
    const input = {
      date: '2026-04-22',
      field: 'snapshot.consistency_rule.enabled',
      from: false,
      to: true,
      source_url: 'https://apextraderfunding.com/rules',
    }
    expect(() => ChangelogEntrySchema.parse(input)).not.toThrow()
  })

  it('rejects a missing source_url', () => {
    const input = {
      date: '2026-04-22',
      field: 'snapshot.consistency_rule.enabled',
      from: false,
      to: true,
    }
    expect(() => ChangelogEntrySchema.parse(input)).toThrow()
  })

  it('rejects a non-URL source_url', () => {
    const input = {
      date: '2026-04-22',
      field: 'x',
      from: false,
      to: true,
      source_url: 'not-a-url',
    }
    expect(() => ChangelogEntrySchema.parse(input)).toThrow()
  })

  it('rejects a non-ISO-shape date string', () => {
    const input = {
      date: '22 April 2026',
      field: 'x',
      from: false,
      to: true,
      source_url: 'https://example.com',
    }
    expect(() => ChangelogEntrySchema.parse(input)).toThrow()
  })
})

describe('ChecklistItemSchema', () => {
  it('accepts a valid item', () => {
    const input = {
      id: 'news_clear',
      label: 'No major news in next 30 minutes',
    }
    expect(() => ChecklistItemSchema.parse(input)).not.toThrow()
  })

  it('rejects id with spaces', () => {
    const input = { id: 'news clear', label: 'x' }
    expect(() => ChecklistItemSchema.parse(input)).toThrow()
  })

  it('rejects empty label', () => {
    const input = { id: 'news_clear', label: '' }
    expect(() => ChecklistItemSchema.parse(input)).toThrow()
  })
})

describe('FitScoreSchema', () => {
  it('accepts a valid score set', () => {
    const input = {
      ny_scalping: 4,
      swing_trading: 1,
      news_trading: 0,
      beginner_friendly: 2,
      scalable: 2,
    }
    expect(() => FitScoreSchema.parse(input)).not.toThrow()
  })

  it('rejects a star value > 5', () => {
    const input = {
      ny_scalping: 6,
      swing_trading: 1,
      news_trading: 0,
      beginner_friendly: 2,
      scalable: 2,
    }
    expect(() => FitScoreSchema.parse(input)).toThrow()
  })

  it('rejects a negative star value', () => {
    const input = {
      ny_scalping: -1,
      swing_trading: 1,
      news_trading: 0,
      beginner_friendly: 2,
      scalable: 2,
    }
    expect(() => FitScoreSchema.parse(input)).toThrow()
  })

  it('rejects missing keys', () => {
    const input = { ny_scalping: 4 }
    expect(() => FitScoreSchema.parse(input)).toThrow()
  })
})

describe('KillYouFirstEntrySchema', () => {
  it('accepts a valid entry', () => {
    const input = {
      title: 'Trailing DD follows equity',
      detail: 'Profits cannot be locked early',
      source_url: 'https://apextraderfunding.com/rules',
    }
    expect(() => KillYouFirstEntrySchema.parse(input)).not.toThrow()
  })

  it('rejects an empty title', () => {
    const input = {
      title: '',
      detail: 'x',
      source_url: 'https://example.com',
    }
    expect(() => KillYouFirstEntrySchema.parse(input)).toThrow()
  })

  it('rejects missing detail', () => {
    const input = {
      title: 'x',
      source_url: 'https://example.com',
    }
    expect(() => KillYouFirstEntrySchema.parse(input)).toThrow()
  })
})

describe('DecisionSnapshotSchema', () => {
  const validSnapshot = {
    news_trading_allowed: false,
    overnight_holding_allowed: false,
    weekend_holding_allowed: false,
    max_drawdown: {
      type: 'trailing_intraday',
      value_usd: 2500,
      source_url: 'https://apextraderfunding.com/rules#dd',
    },
    consistency_rule: {
      enabled: true,
      max_daily_pct: 30,
      source_url: 'https://apextraderfunding.com/payouts',
    },
    payout_split_pct: 80,
    best_for: 'Intraday scalpers',
  }

  it('accepts a complete valid snapshot', () => {
    expect(() => DecisionSnapshotSchema.parse(validSnapshot)).not.toThrow()
  })

  it('accepts max_drawdown with type=trailing_eod', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, type: 'trailing_eod' },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).not.toThrow()
  })

  it('accepts max_drawdown with type=static', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, type: 'static' },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).not.toThrow()
  })

  it('rejects max_drawdown with unknown type', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, type: 'percentage' },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects payout_split_pct > 100', () => {
    const input = { ...validSnapshot, payout_split_pct: 110 }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects payout_split_pct < 0', () => {
    const input = { ...validSnapshot, payout_split_pct: -5 }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects max_drawdown with missing source_url', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { type: 'trailing_intraday', value_usd: 2500 },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects negative max_drawdown.value_usd', () => {
    const input = {
      ...validSnapshot,
      max_drawdown: { ...validSnapshot.max_drawdown, value_usd: -100 },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('rejects consistency_rule enabled=true without max_daily_pct', () => {
    const input = {
      ...validSnapshot,
      consistency_rule: {
        enabled: true,
        source_url: 'https://example.com',
      },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).toThrow()
  })

  it('accepts consistency_rule enabled=false without max_daily_pct', () => {
    const input = {
      ...validSnapshot,
      consistency_rule: {
        enabled: false,
        source_url: 'https://example.com',
      },
    }
    expect(() => DecisionSnapshotSchema.parse(input)).not.toThrow()
  })
})
