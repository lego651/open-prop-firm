# open-prop — Product Scope: v1 / v2 / v3

*Owner: Mathieu (Head of Product) | PM Review: product-manager | Date: 2026-04-22*
*Source of truth: company-roadmap-okr.md (revised 2026-04-22)*

---

## 1. Scope Framing

This document translates the business goals in `company-roadmap-okr.md` into product scope for three sequential versions. It defines what the product IS at each version boundary — not how to build it, not when, not ticket-by-ticket. Feature breakdown, sprint planning, and implementation tickets are handled separately. Dates and build timelines are intentionally absent; Day-0 of v1 build is gated on physio-os shipping and the V-Health meeting (end of May 2026).

---

## 2. v1 — Data Engine + Decision Header

**Scope statement.** v1 is the credibility foundation. A trader lands on a firm page and gets a verifiable, 5-second decision: binary rule flags, the two or three things most likely to blow their account, and a trading-style fit score — all sourced, timestamped, and visually separated from Jason's opinions. The monitoring engine runs daily, diffs against the last verified state, and opens a PR when rules change. Nothing in v1 is cosmetic scaffolding: if the data layer is not correct, the Decision Header has no right to exist.

**In scope**

- Data schema with `source_url` and `fetched_at` on every field; schema validator enforced on PR merge
- Four launch firms fully populated: Funded Next, Funding Pips, Apex Funding, Lucid Funding — challenge programs, rules, promos, changelog
- Daily monitoring engine: per-firm scraper → diff vs last verified state → PR with before/after + source snapshot → Jason reviews/merges → changelog entry auto-appends
- Monitoring health check posted to GitHub issue on each run; silent failure within 24 hours triggers alert
- Decision Header component on every firm page: Snapshot Bar (binary flags), Kill You First Warnings (2–3 firm-specific account killers), Fit Score (trading-style stars)
- Pre-Trade Checklist component on every firm page (news window, DD buffer, consistency rule status — binary, interactive)
- Data layer and opinion layer visually separated on every firm page; three-layer page architecture (data / opinion / action) enforced
- Changelog populated from launch date, visible on every firm page
- Stability Indicator: UI placeholder only — computed metric deferred to v2
- Last-verified date and verification method surfaced on every page
- Affiliate CTAs on firm and promos pages with explicit affiliate disclosure
- ToS, disclaimer, and affiliate disclosure pages live at launch
- CONTRIBUTING.md published; community PRs accepted but not load-bearing
- Site deployed on `openpropfirm.com` via Vercel

**Out of scope for v1**

- Chrome extension (snap-trade) — v2
- "How to Trade This Firm" playbooks — v2
- Email alerts for rule changes — v2
- Stability Indicator as a computed metric — v2
- More than 4 firms — v2
- Commissioned reviews — dropped from roadmap entirely
- LLM chatbot / AI assistant — dropped from roadmap entirely
- Pro tier, subscriptions, or any gated content — dropped from roadmap entirely
- B2B verified badges — dropped from roadmap entirely
- Mobile app — out of roadmap
- Multi-language support — out of roadmap

**Success criteria (Gate 1 — 60 days post-launch)**

| Metric | Kill threshold | Green light for v2 |
|---|---|---|
| Unique visitors (month 2) | < 200/month | >= 500/month |
| Bounce rate | > 80% | < 65% |
| GitHub stars | < 20 | >= 50 |
| Affiliate program approvals | 0/4 | 2/4+ |

---

## 3. v2 — Depth + Stickiness

**Scope statement.** v2 turns an episodic-visit product into a daily tool. Coverage expands from 4 to 10 firms, each with a full opinion layer including opinionated playbooks. The Chrome extension surfaces rule-change alerts directly in TradingView, closing the loop between the site and the trader's live session. The Stability Indicator becomes a computed feature, not a placeholder. v2 activates only after Gate 1 passes.

**In scope**

- Expand to 10 firms, each with complete data schema, Decision Header, Pre-Trade Checklist, changelog history, and playbook
- Chrome extension (snap-trade) public beta: surfaces rule-change alerts on TradingView when a held firm had a rule change in the past 72 hours
- "How to Trade This Firm" playbook per firm — opinionated, trader-voice, non-replicable by content farms
- Stability Indicator computed from changelog history ("3 changes in 90 days") and live on all covered firms
- Email alerts (free): user selects firms to watch, receives notification on rule changes
- Monitoring engine extended to cover 10 firms end-to-end

**Out of scope for v2**

- More than 10 firms — v3
- Deeper community contribution infrastructure — v3
- LLM chatbot, paid tier, B2B badges — dropped from roadmap entirely (no version)
- Multi-language, mobile app — out of roadmap

**Success criteria (Gate 2 — end of Q3 2026, ~5–6 months post-launch)**

| Metric | Kill threshold | Green light for v3 |
|---|---|---|
| Monthly unique visitors | < 1,000 | >= 3,000 |
| Monthly affiliate revenue | < $100 | >= $300 |
| GitHub stars | < 75 | >= 200 |
| Chrome ext beta users | < 20 | >= 100 |

---

## 4. v3 — Authority + Category Default

**Scope statement.** v3 is about scale and position, not new feature types. Coverage reaches 15+ firms. The changelog and Stability Indicator history compound into a genuinely hard-to-replicate data moat. The site earns unsolicited mentions in prop trading communities — the signal that it has become the default reference, not just another affiliate site. v3 activates only after Gate 2 passes.

**In scope**

- Expand to 15+ firms, all end-to-end (data schema, Decision Header, Checklist, changelog, playbook, Stability Indicator)
- Monthly organic sessions target: 20,000+, driven by high-intent queries
- Deeper changelog features: visual rule-history diff, cross-firm rule-change timeline
- Community contribution infrastructure: streamlined PR flow for external contributors; target 5+ external contributors with merged PRs
- SEO authority features: structured data markup, canonical source tagging, firm-comparison pages optimized for high-intent queries
- GitHub stars target: 500+

**Out of scope for v3**

- No paid tier, subscriptions, or gated content — ever
- No LLM chatbot — ever
- No B2B verified badges — ever
- No mobile app — out of roadmap
- No multi-language — out of roadmap
- No features beyond v3 are defined in this document

**Success criteria (end of Q4 2026)**

| Metric | Target |
|---|---|
| Firms covered end-to-end | 15+ |
| Monthly organic sessions | 20,000 |
| External contributors (merged PRs) | 5 |
| GitHub stars | 500 |
| Monthly affiliate revenue | $1,500 |

---

## 5. Product-Manager Addendum

*This section populated after product-manager review. See below.*

**PM sign-off:** Confirmed — v1/v2/v3 scope aligns with the 12-month product scope defined 2026-04-22.

**PM additions accepted:**

1. The three-layer page architecture (data / opinion / action) should be called out as an explicit in-scope constraint for v1, not just a design principle. It is the architectural rule that governs what goes on every firm page — engineers building v1 need to know this is non-negotiable from day one. *Accepted. Incorporated into v1 in-scope list.*

2. The monitoring engine gap in `bot.md` is worth flagging explicitly in v1 scope: the current bot does keyword presence checks, not field-level diffs. v1 correctness requires the bot to be upgraded to structured schema diffing (field-by-field, not just "expected text found"). This is a v1 build dependency, not a v2 stretch goal. *Accepted. Reflected in the data engine scope statement: "diffs against the last verified state" refers to structured field-level diffing, not keyword presence. Tech-lead must scope the bot upgrade as a launch-blocking item.*

3. The Stability Indicator placeholder in v1 should be explicitly named "UI placeholder only" to prevent engineers from spending time on the computation logic before the changelog has enough history. *Accepted. Already explicit in v1 in-scope list.*

**PM concerns not raised:** No unresolved disagreements.

---

## 6. Explicitly Deferred Beyond v3

The following have been discussed and are explicitly out of the v1/v2/v3 plan. No version beyond v3 is defined in this document.

- **Multi-language support** — English only until traffic thesis is proven; localization adds content maintenance overhead before the single-language moat is established
- **Mobile app (iOS/Android)** — web + Chrome extension covers the use case; a native app adds build and maintenance overhead with no incremental revenue in the affiliate model
- **Strategy marketplace** — out of scope; would require community scale and trust architecture not established in year one
- **LLM chat / AI assistant** — dropped from roadmap entirely per CEO 2 + CEO 3 feedback; unbounded cost, trust risk, and not core to the decision-tool thesis
- **Paid tier / Pro subscription** — dropped from roadmap entirely; affiliate-only model is the strategic constraint, not a limitation to revisit
- **Coaching tools / trader CRM** — belongs to TraderOS, not open-prop; do not conflate the two products

---

*This document is scope definition only. Implementation planning, ticket breakdown, and sprint sequencing happen in a separate pass using the superpowers planning skills.*
