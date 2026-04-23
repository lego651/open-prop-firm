import { describe, it, expect } from 'vitest'
import { ChangelogEntrySchema, ChecklistItemSchema } from './schema'

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
