import { describe, it, expect } from 'vitest'
import { parseDollarAmount, parsePercentage } from './utils'

describe('parseDollarAmount', () => {
  it('returns null when no match', () => {
    expect(parseDollarAmount('hello world')).toBeNull()
  })
  it('parses $5,000', () => {
    expect(parseDollarAmount('drawdown is $5,000 per account')).toBe(5000)
  })
  it('parses $2000', () => {
    expect(parseDollarAmount('$2000')).toBe(2000)
  })
  it('parses $199.99', () => {
    expect(parseDollarAmount('price $199.99 fee')).toBe(199.99)
  })
  it('returns the first match when multiple dollar amounts exist', () => {
    expect(parseDollarAmount('first $100 then $200')).toBe(100)
  })
  it('parses $25k shorthand', () => {
    expect(parseDollarAmount('size: $25k')).toBe(25000)
  })
})

describe('parsePercentage', () => {
  it('returns null when no match', () => {
    expect(parsePercentage('hello world')).toBeNull()
  })
  it('parses 30%', () => {
    expect(parsePercentage('consistency rule: 30%')).toBe(30)
  })
  it('parses 10 percent', () => {
    expect(parsePercentage('up to 10 percent of balance')).toBe(10)
  })
  it('returns the first match when multiple percentages exist', () => {
    expect(parsePercentage('5% daily, 10% overall')).toBe(5)
  })
})
