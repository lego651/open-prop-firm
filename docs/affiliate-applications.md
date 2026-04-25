# Affiliate Applications — v1 Launch Tracker

> Source-of-truth log for every prop-firm affiliate program OpenPropFirm has applied to.
> Each firm's `decision.affiliate.url` + `decision.affiliate.utm` in `data/firms/**/index.md`
> stays `null` until the corresponding row below shows status `live`.

---

## Status legend

- `not-applied` — application never submitted
- `applied` — application submitted, awaiting reply
- `under-review` — firm acknowledged, in their internal vetting queue
- `approved` — accepted, awaiting URL/UTM provisioning
- `live` — URL + UTM populated in firm frontmatter, AffiliateCTA renders on the firm page
- `rejected` — declined; reason recorded in notes
- `paused` — withdrew or program currently closed

---

## Tracker

| Firm | Slug | Program URL | Applied | Last contact | Status | URL once live | UTM once live | Notes |
|---|---|---|---|---|---|---|---|---|
| Funded Next | `funded-next` | https://fundednext.com/affiliates (verify) | TBD | — | `not-applied` | — | — | Highest-traffic CFD firm; apply first |
| Funding Pips | `funding-pips` | https://fundingpips.com/affiliate-program | TBD | — | `not-applied` | — | — | Confirmed live program (listed in firm sitemap.xml) |
| Apex Trader Funding | `apex-funding` | https://apextraderfunding.com/affiliate (verify) | TBD | — | `not-applied` | — | — | Futures-only; smaller funnel but high payout |
| Lucid Trading | `lucid-trading` | (not yet confirmed) | TBD | — | `not-applied` | — | — | Confirm program existence first |

> Update the `Applied` and `Last contact` columns to ISO dates (YYYY-MM-DD) as state changes.
> Update `URL once live` and `UTM once live` only after the firm provisions the link — that is the same value that goes into `data/firms/<category>/<slug>/index.md` under `decision.affiliate`.

---

## When a program approves

1. Update this tracker row → status `approved`, fill `URL once live` + `UTM once live`.
2. Edit the firm's `data/firms/<category>/<slug>/index.md` frontmatter:
   ```yaml
   decision:
     affiliate:
       url: '<URL once live>'
       utm: '<UTM once live>'
   ```
3. Run `pnpm tsc --noEmit && pnpm test -- firms` to confirm the schema accepts the change.
4. Spot-check the firm's page at `localhost:3000/firms/<slug>` — `AffiliateCTA` should render with the affiliate button. (Before this change, the component renders `null` because of v1-f8's null-guard.)
5. Update this tracker row → status `live`. Commit.

## When a program rejects

- Update the row → status `rejected`. Add reason in notes column.
- Frontmatter stays at `affiliate.url: null` — the page just doesn't render the CTA. No code change.

## Audit cadence

Re-check the tracker weekly during launch month, then monthly after. Programs go dark or change terms without notice; a stale `live` URL that 404s is worse than no URL at all.

## Related docs

- Affiliate disclosure copy: `data/static/disclosure.md`
- Component that renders the CTA: `src/components/firm/AffiliateCTA.tsx`
- Firm frontmatter schema: `scripts/monitor/schema.ts` (search for `affiliate`)
