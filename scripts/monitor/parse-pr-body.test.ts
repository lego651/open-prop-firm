import { describe, it, expect } from 'vitest'
import { parsePRBody } from './parse-pr-body'

const DRIFT_BODY = `Automated content update detected by the monitoring bot on 2026-04-23.

- **Firm:** \`apex-funding\`
- **Scraped URL:** https://example.com/eval
- **Last verified (new):** 2026-04-23

## Changes detected

| Field | From | To | Source |
|---|---|---|---|
| \`snapshot.news_trading_allowed\` | \`true\` | \`false\` | [link](https://example.com/rules) |
| \`snapshot.payout_split_pct\` | \`90\` | \`95\` | [link](https://example.com/payout) |

---
_Opened by the OpenPropFirm monitoring bot..._`

const NO_DRIFT_BODY = `Automated content update detected by the monitoring bot on 2026-04-23.

- **Firm:** \`apex-funding\`
- **Scraped URL:** https://example.com/eval
- **Last verified (new):** 2026-04-23

## No field-level drift detected

The bot could not confirm any watched-field change. \`last_verified\` has been bumped in place.`

const STRING_CELL_BODY = `Automated content update detected by the monitoring bot on 2026-04-23.

- **Firm:** \`funded-next\`
- **Scraped URL:** https://example.com/eval
- **Last verified (new):** 2026-04-23

## Changes detected

| Field | From | To | Source |
|---|---|---|---|
| \`snapshot.max_drawdown.type\` | \`"trailing_eod"\` | \`"trailing_intraday"\` | [link](https://example.com/rules) |

---
_Opened by the OpenPropFirm monitoring bot..._`

describe('parsePRBody', () => {
  it('extracts firm slug, lastVerified, and two entries from a drift body', () => {
    const parsed = parsePRBody(DRIFT_BODY)
    expect(parsed.firmSlug).toBe('apex-funding')
    expect(parsed.lastVerified).toBe('2026-04-23')
    expect(parsed.entries).toHaveLength(2)
    expect(parsed.entries[0]).toEqual({
      field: 'snapshot.news_trading_allowed',
      from: true,
      to: false,
      source_url: 'https://example.com/rules',
    })
    expect(parsed.entries[1]).toEqual({
      field: 'snapshot.payout_split_pct',
      from: 90,
      to: 95,
      source_url: 'https://example.com/payout',
    })
  })

  it('returns empty entries for a no-drift body', () => {
    const parsed = parsePRBody(NO_DRIFT_BODY)
    expect(parsed.firmSlug).toBe('apex-funding')
    expect(parsed.lastVerified).toBe('2026-04-23')
    expect(parsed.entries).toEqual([])
  })

  it('parses string-valued cells (max_drawdown.type)', () => {
    const parsed = parsePRBody(STRING_CELL_BODY)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].from).toBe('trailing_eod')
    expect(parsed.entries[0].to).toBe('trailing_intraday')
    expect(parsed.entries[0].field).toBe('snapshot.max_drawdown.type')
  })

  it('throws when firm slug line is missing', () => {
    const body = `Automated content update detected by the monitoring bot on 2026-04-23.

- **Scraped URL:** https://example.com/eval
- **Last verified (new):** 2026-04-23

## No field-level drift detected
`
    expect(() => parsePRBody(body)).toThrow(/firm slug/i)
  })

  it('throws when last_verified line is missing', () => {
    const body = `Automated content update detected by the monitoring bot on 2026-04-23.

- **Firm:** \`apex-funding\`
- **Scraped URL:** https://example.com/eval

## No field-level drift detected
`
    expect(() => parsePRBody(body)).toThrow(/last verified/i)
  })
})
