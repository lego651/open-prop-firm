import { describe, it, expect } from 'vitest'
import {
  STORAGE_KEY_PREFIX,
  storageKey,
  loadChecklistState,
  saveChecklistState,
  clearChecklistState,
  toggleItem,
  isAnyChecked,
  type StorageLike,
} from './checklist-storage'

function makeMemoryStorage(): StorageLike & { _dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
    _dump: () => Object.fromEntries(map),
  }
}

describe('storageKey', () => {
  it('prefixes the firm slug', () => {
    expect(storageKey('apex-funding')).toBe('checklist:apex-funding')
    expect(STORAGE_KEY_PREFIX).toBe('checklist:')
  })
})

describe('loadChecklistState', () => {
  it('returns {} when storage is null', () => {
    expect(loadChecklistState('apex-funding', null)).toEqual({})
  })

  it('returns {} when nothing has been stored', () => {
    const s = makeMemoryStorage()
    expect(loadChecklistState('apex-funding', s)).toEqual({})
  })

  it('parses valid stored JSON', () => {
    const s = makeMemoryStorage()
    s.setItem('checklist:apex-funding', JSON.stringify({ a: true, b: false }))
    expect(loadChecklistState('apex-funding', s)).toEqual({ a: true, b: false })
  })

  it('returns {} on corrupt JSON (does not throw)', () => {
    const s = makeMemoryStorage()
    s.setItem('checklist:apex-funding', 'not-json')
    expect(loadChecklistState('apex-funding', s)).toEqual({})
  })
})

describe('saveChecklistState', () => {
  it('no-ops with null storage', () => {
    expect(() => saveChecklistState('x', { a: true }, null)).not.toThrow()
  })

  it('writes JSON under the right key', () => {
    const s = makeMemoryStorage()
    saveChecklistState('apex-funding', { a: true }, s)
    expect(s._dump()['checklist:apex-funding']).toBe(JSON.stringify({ a: true }))
  })

  it('swallows setItem errors (quota exceeded etc.)', () => {
    const throwing: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceeded') },
      removeItem: () => {},
    }
    expect(() => saveChecklistState('x', { a: true }, throwing)).not.toThrow()
  })
})

describe('clearChecklistState', () => {
  it('no-ops with null storage', () => {
    expect(() => clearChecklistState('x', null)).not.toThrow()
  })

  it('removes the key', () => {
    const s = makeMemoryStorage()
    s.setItem('checklist:apex-funding', JSON.stringify({ a: true }))
    clearChecklistState('apex-funding', s)
    expect(s.getItem('checklist:apex-funding')).toBeNull()
  })
})

describe('toggleItem', () => {
  it('returns a new object with the value flipped', () => {
    const state = { a: false, b: true }
    const next = toggleItem(state, 'a')
    expect(next).toEqual({ a: true, b: true })
    expect(next).not.toBe(state)
    expect(state).toEqual({ a: false, b: true }) // original unchanged
  })

  it('treats missing keys as previously false', () => {
    expect(toggleItem({}, 'a')).toEqual({ a: true })
  })
})

describe('isAnyChecked', () => {
  it('returns false for empty state', () => {
    expect(isAnyChecked({})).toBe(false)
  })

  it('returns false when all values are false', () => {
    expect(isAnyChecked({ a: false, b: false })).toBe(false)
  })

  it('returns true when at least one value is true', () => {
    expect(isAnyChecked({ a: false, b: true })).toBe(true)
  })
})
