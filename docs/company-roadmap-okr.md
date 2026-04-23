# OpenPropFirm — CEO Roadmap & OKR Document

**Document Owner**: CEO
**Original**: 2026-03-28
**Last Updated**: 2026-04-22 (major pivot — see "Product Pivot 2026-04-22" below)
**Review Cadence**: End of each quarter

---

## Vision & Mission

**Vision**: Become the pre-trade decision tool for prop firm traders globally — the single page a trader checks before funding an account or entering a session.

**Mission**: Give every retail prop trader free, verified, real-time intelligence on prop firm rules and rule changes, so they never blow an account on stale or incomplete information.

*Updated 2026-04-22 from the original "Wikipedia of prop trading" framing. Category has moved from reference wiki to decision tool per CEO 2 + CEO 3 feedback.*

---

## Product Pivot — 2026-04-22

Based on feedback from three CEO friends on 2026-04-22 (full synthesis at `/Users/lego/@Lego651/life-os/Projects/open-prop/ceo-feedback-synthesis.md`):

1. **Category:** knowledge base → **decision tool**. Every firm page answers "Should I trade this firm today, and how do I avoid blowing the account?" in ≤5 seconds.
2. **Product principles:** data layer (neutral, sourced) and opinion layer (Jason's voice, labeled) are always visually separated. Pre-Trade Checklist is the killer feature. Daily-monitored changelog + rule-stability indicator is the durable moat.
3. **Distribution:** snap-trade Chrome extension surfaces rule-change alerts on TradingView — the sticky layer that turns episodic visits into a daily tool.
4. **Monetization:** affiliate-only, forever. No Pro tier. No commissioned reviews. No B2B verified badges. Revenue = traffic × trust × affiliate conversion. Trust is the asset; affiliate disclosure is the contract.

Supporting docs written 2026-04-22:
- `/Users/lego/@Lego651/life-os/Projects/open-prop/ceo-feedback-synthesis.md` — CEO 2/3 thesis + UX blueprint
- `/Users/lego/@Lego651/life-os/Projects/open-prop/business-scope-12mo.md` — 12-mo business scope (CEO)
- `/Users/lego/@Lego651/life-os/Projects/open-prop/product-scope-12mo.md` — 12-mo product scope (PM)
- `/Users/lego/@Lego651/life-os/Projects/open-prop/vision-diagrams.md` — 5 long-term vision diagrams

---

## Market Opportunity

**Target User**: Retail traders who purchase prop firm evaluation challenges (typically $50–$2,000 per attempt). Active challenge buyers conservatively estimated at 500,000–1,000,000 globally, with repeat purchase behavior.

**Why Now**: The prop firm space is chaotic. Firms change rules, drawdown policies, and pricing with minimal notice. Traders blow accounts on stale information. There is no neutral, community-maintained, versioned source of truth with daily monitoring.

**Revenue Signal**: Affiliate programs at most major prop firms pay $150–$500 per funded trader referred. Hitting $500–$2,000/month MRR requires meaningful SEO traffic + trust, achievable on a 12–24 month compounding curve.

---

## Hard Questions — Strategic Risks Flagged Before Building

**1. Why won't the firms just build this themselves?**
Apex, FTMO, and Funded Next have marketing budgets. A big firm could build a comparison tool or sponsor a competitor. The moat only holds if the project remains visibly independent. Taking firm-paid placements or preferential treatment collapses the neutrality brand overnight — hence: affiliate-only, never firm-paid.

**2. Content is the product, but content rots.**
Four firms at launch is thin. The monitoring engine is the backbone — if it misses a rule change and a trader blows an account trusting stale data, the brand takes real damage. The `last_verified` timestamp is a promise, not a badge. The bot is treated as a launch-blocking dependency.

**3. Affiliate revenue has a conflict-of-interest ceiling.**
Sophisticated traders will ask: "Are you showing firms that pay you, or all firms?" The answer must be all notable firms, including those with no affiliate program. Resolved 2026-04-22 as explicit policy: all notable firms listed with equal prominence, affiliate relationships disclosed in footer.

**4. "Clone to Obsidian" is a differentiator, not a product.**
Useful for power users. Does not drive mass adoption. SEO, community referrals, Reddit/Discord presence drive traffic. Do not over-invest in Obsidian compatibility at the expense of the Decision Header + monitoring engine shipping.

**5. v2 monetization — resolved.**
Previously punted. Resolved 2026-04-22: there is no paid tier. Affiliate-only in v1, v2, v3. v2 scope is now product depth (Chrome ext alerts, playbooks), not monetization.

**6. The real moat.**
Affiliate sites copy each other. Our real moat is: (a) daily monitored changelog with history, (b) data-vs-opinion separation producing durable trust, (c) Jason's trader identity powering the opinion layer. Any "community will maintain it" claim is a nice-to-have — Jason is the primary maintainer in year one.

---

## Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Monitoring bot fails silently; data goes stale | High | Medium | Bot posts daily health check to GitHub issue; alert if silent > 24 hours. Treated as launch-blocking. |
| Prop firm changes ToS and sends takedown | Medium | Low | All content is publicly available fact with cited sources; ToS page and disclaimer retained |
| Competitor (or prop firm) forks and runs a paid competitor | High | Medium | AGPL-3.0 / CC-BY-NC-SA-4.0 dual license closes this |
| Affiliate conflict-of-interest perception | High | Medium | Explicit policy: list all notable firms regardless of affiliate status; disclose in footer |
| Low community contribution velocity | Medium | High | Jason is primary maintainer. Community PRs welcomed but not load-bearing in v1. |
| Four firms at launch too thin for SEO | Medium | High | v2 goal: expand to 10 firms. v3 goal: 15+. |
| Hyperfocus pulls trading hours | High | High | Structural rule: open-prop build hours are Mon/Fri/Sat/Sun only. Tue/Wed/Thu = trading sessions, off-limits. |

---

## License Decision

**Decision (unchanged from 2026-03-28):** Dual License — AGPL-3.0 for `/src`, CC-BY-NC-SA-4.0 for `/data`. Commercial license on inquiry to `commercial@openpropfirm.com`.

---

## v1 Goals — Data Engine + Decision Header (revised 2026-04-22)

v1 is a credibility-building phase. Launch means a trader arrives, gets a 5-second decision, trusts it, and — if they choose a firm — clicks a disclosed affiliate link.

**The three things that must work for v1 correctness:**

1. **Firm data** — challenge programs, account sizes, pricing, profit targets, step counts — every field with a source URL and `fetched_at` timestamp.
2. **Rules data** — drawdown (type + value), consistency rule, news trading rule, payout rule, holding rule, profit split — every field sourced.
3. **Monitoring engine** — daily scrape → per-firm extractor parses into schema → diff vs last verified state → open PR with before/after + source snapshot → Jason verifies + merges → changelog entry auto-appends → Stability Indicator recomputes.

Without all three, nothing else ships credibly.

**Non-negotiable at launch:**

1. All four firms (Funded Next, Funding Pips, Apex Funding, Lucid Funding) have complete, sourced data — challenge programs, rules, promos, changelog
2. **Decision Header** (Snapshot Bar + "Kill You First" Warnings + Fit Score) renders on every firm page
3. **Pre-Trade Checklist** is functional on every firm page
4. Data schema enforces `source_url` + `fetched_at` on every field (validator on PR merge)
5. Monitoring engine running daily; health check posted to GitHub issue on each run
6. Changelog visible + populated (history starts at launch date if nothing earlier)
7. Last-verified date + verification method surfaced on every page
8. ToS + disclaimer + affiliate disclosure page live
9. Site deployed on `openpropfirm.com` via Vercel
10. CONTRIBUTING.md published so community PRs are possible on day one

**What v1 does NOT include:**
- Chatbot / LLM assistant (dropped from roadmap entirely)
- Pro tier / subscriptions / paywalls (dropped from roadmap entirely)
- Commissioned reviews (dropped from roadmap entirely)
- B2B verified badges (dropped from roadmap entirely)
- Email alerts (v2)
- Chrome extension rule-change alerts (v2)
- "How to Trade This Firm" playbooks (v2)
- More than 4 firms (v2)
- Stability Indicator as computed metric (v2 — UI placeholder only in v1)
- Mobile app / iOS / Android (out of roadmap)
- Multi-language (out of roadmap)

**v1 Success Condition:** 500 unique visitors in first 30 days post-launch with bounce rate < 60%, and at least one confirmed affiliate conversion.

---

## v2 Goals — Depth + Stickiness (rewritten 2026-04-22)

v2 activates only after v1 passes Gate 1. v2 is NOT monetization — monetization already exists (affiliates). v2 turns a one-time visit into a daily habit.

**v2 priority order:**

1. **Expand to 10 firms**, each end-to-end (data + Decision Header + Checklist + changelog + playbook).
2. **Chrome extension rule-change alerts** — snap-trade surfaces "Firm X changed trailing DD yesterday" when a trader opens TradingView. Distribution + stickiness in one feature.
3. **"How to Trade This Firm" playbooks** — opinionated, trader-voice section per firm. Hardest-to-copy layer.
4. **Stability Indicator** — computed from changelog history ("3 changes in 90 days").
5. **Email alerts (free)** — user selects firms to watch, gets notified on rule changes.

**Explicitly removed from v2 vs. original 2026-03-28 roadmap:**
- LLM Chatbot → not core to decision-tool thesis, unbounded cost, trust risk
- Pro tier / $9/mo subscription → does not fit affiliate-only strategy
- B2B verified badges → trust risk per CEO 3

---

## v3 Goals — Authority + Category Default (new 2026-04-22)

v3 activates only after v2 passes Gate 2.

1. **15+ firms** covered end-to-end
2. **20,000+ monthly organic sessions** from high-intent queries
3. **$500–$2,000 MRR** sustained
4. **Distribution density** — unsolicited mentions in prop-trading Reddit/Discord, 1,000+ GitHub stars
5. **Small but real community PR volume** — 5+ external contributors merged

---

## Revenue Strategy

Affiliate-only. No paid tier in v1, v2, or v3.

**v1 — Affiliate baseline (months 0–6 post-launch)**
- Apply to Apex Trader Funding, Funding Pips, Funded Next, FTMO before launch
- Display affiliate CTAs on promos pages, clearly disclosed
- Target: $0–$500/month

**v2/v3 — Affiliate scale (months 6–12 post-launch)**
- Revenue scales linearly with firm count × traffic × trust
- Target: $500–$2,000/month by month 12
- 18–24 month compounding curve to $5k+/month

**What we will NOT do for revenue — ever:**
- No subscriptions, Pro tier, or gated content
- No commissioned reviews
- No firm-paid placements or verified badges
- No paid sales effort
- No raised capital

**Revenue-model risks:**
- Affiliate programs can be terminated by firms with no notice
- Prop firm industry is volatile; firms shut down (My Forex Funds precedent)
- Mitigation: coverage of 10+ firms by v2 minimizes single-firm exposure

---

## OKRs Table

Review cycle: quarterly. Status: On Track / At Risk / Behind / Done.

### Q2 2026 (April – June) — v1 build

| Objective | Key Result | Target | Current | Status |
|---|---|---|---|---|
| **O1: Ship v1 correctly** | All 4 firms have complete sourced data (data + rules schema) | 4/4 | 0/4 | Not Started |
| | Decision Header live on all 4 firms | 4/4 | 0/4 | Not Started |
| | Pre-Trade Checklist functional on all 4 firms | 4/4 | 0/4 | Not Started |
| | Monitoring engine running daily with health check | 30-day run | 0 | Not Started |
| | ToS + affiliate disclosure live | Yes | No | Not Started |
| **O2: Affiliate infrastructure** | Affiliate programs applied to (Apex, FP, Funded Next, FTMO) | 4/4 | 0 | Not Started |
| | Affiliate CTAs deployed on all firm pages | 4/4 | 0 | Not Started |
| **O3: First traffic signal** | Unique visitors in first 30 days post-launch | 500 | 0 | Not Started |
| | Bounce rate | < 60% | — | Not Started |
| | GitHub stars | 100 | 0 | Not Started |
| | Confirmed affiliate conversions | 1 | 0 | Not Started |

### Q3 2026 (July – September) — v2 build (conditional on Gate 1)

| Objective | Key Result | Target | Current | Status |
|---|---|---|---|---|
| **O4: Expand coverage to 10 firms** | Firms with full Decision Header + Checklist + changelog | 10 | — | Not Started |
| **O5: Ship Chrome ext rule-change alerts** | Extension public beta live; alerts firing on TradingView | Yes | — | Not Started |
| **O6: "How to Trade This Firm" playbooks** | Playbook published on all covered firms | 10/10 | — | Not Started |
| **O7: Affiliate revenue growth** | Monthly affiliate revenue | $500/month | $0 | Not Started |
| | Affiliate click-to-conversion rate | > 2% | — | Not Started |

### Q4 2026 (October – December) — v3 build (conditional on Gate 2)

| Objective | Key Result | Target | Current | Status |
|---|---|---|---|---|
| **O8: Authority + coverage** | Firms covered end-to-end | 15+ | — | Not Started |
| | Monthly organic sessions | 20,000 | — | Not Started |
| **O9: Stability Indicator + community** | Stability Indicator live on all firms | Yes | — | Not Started |
| | External contributors with merged PRs | 5 | — | Not Started |
| | GitHub stars | 500 | — | Not Started |
| **O10: Revenue inflection** | Monthly affiliate revenue | $1,500 | — | Not Started |

### Annual 2027 — Scale

| Objective | Key Result | Target | Current | Status |
|---|---|---|---|---|
| **O11: Category default** | Firms covered | 25+ | — | Not Started |
| | Monthly organic sessions | 50,000 | — | Not Started |
| | Ahrefs Domain Rating | 40+ | — | Not Started |
| **O12: Sustainable revenue** | Monthly affiliate revenue | $5,000 | — | Not Started |
| **O13: Community self-sustaining** | % content updates from community PRs | > 30% | — | Not Started |

---

## Kill / Maintain Gates

### Gate 1 — Post-launch (60 days after public launch)

| Metric | Kill Threshold | Maintain / v2 Green Light | Action if Kill |
|---|---|---|---|
| Unique visitors (month 2) | < 200/month | ≥ 500/month | Freeze active development; static archive |
| Bounce rate | > 80% | < 65% | Pause, user research before continuing |
| GitHub stars | < 20 | ≥ 50 | Low community signal; do not invest v2 |
| Affiliate program approvals | 0/4 | 2/4+ | Revenue model broken; re-evaluate |

If Kill Gate 1 triggers: freeze repo, write post-mortem, no v2 investment. Data stays public. Domain goes to maintenance mode.

### Gate 2 — Pre-v3 (end of Q3 2026, ~5–6 months post-launch)

| Metric | Kill Threshold | v3 Green Light |
|---|---|---|
| Monthly unique visitors | < 1,000 | ≥ 3,000 |
| Monthly affiliate revenue | < $100 | ≥ $300 |
| GitHub stars | < 75 | ≥ 200 |
| Chrome ext beta users | < 20 | ≥ 100 |

If Kill Gate 2 triggers: do not build v3. Shift to maintenance mode. Re-evaluate in 6 months if traffic trends improve.

*Gate 3 (Pro Tier Viability) from the original doc is DELETED — no Pro tier exists in this roadmap.*

---

## Open Questions — Founder Input Required

Status as of 2026-04-22.

1. ~~**Affiliate conflict policy**~~ → RESOLVED. All notable firms listed regardless of affiliate status; disclosed in footer.
2. **Founder identity on the site** → OPEN. Named founder with trading background adds trust. Decision needed before launch.
3. **Discord / community channel strategy** → OPEN. Without a community channel, GitHub is the only feedback loop — too slow.
4. **Monitoring bot LLM cost cap** → partially resolved: monthly LLM budget cap set at $5/month for v1. Revisit at v2.
5. **Legal review of ToS** → OPEN. Has a lawyer reviewed the disclaimer language? Needed before launch.
6. ~~**Firm verification badge pricing**~~ → RESOLVED. Feature dropped entirely.
7. **Defunct-firm policy** → OPEN. Archive, delete, or flag? Editorial + SEO decision.
8. ~~**Sprint timeline**~~ → RESOLVED. Day-0 gate = post-physio-os build + post-V-Health meeting (end of May 2026). v1 target: 60 days from Day-0. See business-scope-12mo.md.

---

*Living artifact. OKR "Current" and "Status" columns update at start of each quarter. Kill/maintain thresholds reviewed at Gate 1 and Gate 2. Strategic decisions owned by CEO.*
