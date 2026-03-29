# OpenPropFirm — CEO Roadmap & OKR Document

**Document Owner**: CEO
**Last Updated**: 2026-03-28
**Review Cadence**: End of each quarter

---

## Vision & Mission

**Vision**: Become the single source of truth for prop firm traders globally — the Wikipedia of prop trading rules, challenges, and intelligence.

**Mission**: Give every retail prop trader free, verified, unbiased information so they never make a costly mistake because they had stale or incomplete data.

---

## Market Opportunity

**Target User**: Retail traders who purchase prop firm evaluation challenges (typically $50–$2,000 per attempt). The prop trading industry grew rapidly post-2020. Conservative estimates put active prop firm challenge buyers at 500,000–1,000,000 globally, with repeat purchase behavior (failed challenges = repurchase). That is a large, engaged, financially motivated audience.

**Why Now**: The prop firm space is chaotic. Firms change rules, drawdown policies, and pricing with minimal notice. Traders lose money on stale information. There is no neutral, community-maintained, versioned source of truth. The founder has personally validated the pain — that is the only real validation this project has right now, and that matters.

**Revenue Signal**: Affiliate programs exist at most major prop firms (FTMO, Apex, Funded Next, etc.) with commissions typically ranging from 10–30% of challenge purchase price. On a $100 challenge at 15% commission, you need roughly 700 affiliate conversions/month to hit $10K MRR. That is achievable with meaningful SEO traffic and a trusted brand.

---

## Hard Questions — Gaps the Founder Must Reckon With

These are the strategic risks I am flagging before we build anything.

**1. Why won't the firms just build this themselves?**
Apex, FTMO, and Funded Next all have marketing budgets. If this site gains traction, a large firm could build a comparison tool or sponsor a competitor. The moat here is community trust and neutrality — that only holds if the project remains visibly independent. If the founder takes large affiliate deals or gives preferential treatment to paying firms, the neutrality brand collapses overnight.

**2. The content is the product, but content rots.**
Four firms at launch is thin. The auto-monitoring bot is a smart idea but it is unproven. If the bot misses a rule change and a trader loses money trusting stale data, the brand takes real damage. The `last_verified` timestamp helps but only if the bot actually runs reliably. This is a technical and operational risk that must be treated as a launch-blocking dependency.

**3. Affiliate revenue has a conflict-of-interest ceiling.**
If the site is affiliate-revenue-funded, sophisticated traders will eventually ask: "Are you showing firms that pay you, or all firms?" This question kills trust. The site must list all notable firms — including ones with no affiliate program — or it will be perceived as a glorified affiliate site. This is a brand decision that must be made explicitly, not drifted into.

**4. The "clone to Obsidian" feature is a differentiator, not a product.**
It is a clever hook for the power-user community but it does not drive mass adoption. SEO, community referrals, and Reddit/Discord presence will drive traffic. Do not over-invest in Obsidian compatibility at the expense of speed to launch.

**5. v2 monetization is undefined.**
"CEO to define what's worth paywalling" is punted here. That is fine for now, but it means v1 must generate enough signal (traffic, user behavior data, affiliate conversion rates) to inform v2 decisions. We need to instrument v1 for learning, not just for launch.

**6. There is no competitive moat stated.**
The current moat candidates are: (a) being first and SEO-indexed, (b) community trust and neutrality brand, (c) Obsidian-native format as a niche signal. None of these are durable alone. The real moat is community-maintained data that compounds over time — the GitHub contribution graph becomes the moat. We need to prioritize contributor growth as a KPI, not just traffic.

---

## Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Monitoring bot fails silently; data goes stale | High | Medium | Require bot to post a daily "health" comment to a GitHub issue; alert if silent > 24 hours |
| Prop firm changes ToS and sends takedown | Medium | Low | All content is publicly available fact with cited sources; legal exposure is low but retain ToS page and disclaimer |
| Competitor (or prop firm) forks the repo and runs a paid competitor | High | Medium | License strategy (see below) closes this gap |
| Affiliate conflict-of-interest perception | High | Medium | Explicit site policy: list all notable firms regardless of affiliate status; disclose affiliate relationships in footer |
| Low community contribution velocity | Medium | High | Contributing must be easy; invest in CONTRIBUTING.md, bot-generated PRs as scaffolding, and Discord presence early |
| Four firms at launch is too thin for SEO | Medium | High | Plan to expand to 10+ firms within 60 days of launch; SEO content scales with firm count |
| v2 paid features fail to convert | Medium | Medium | Gate features that provide clear time savings, not features users already get for free elsewhere |

---

## License Decision + Rationale

**Decision: Dual License — AGPL-3.0 for `/src` (application code), CC-BY-NC-SA-4.0 for `/data` (content)**

**Rationale:**

The goal is to protect against two specific threats: (1) someone forking the codebase and running a paid competitor using our code and content, and (2) someone scraping the `/data` folder and monetizing it without contributing back.

AGPL-3.0 for `/src` means:
- Anyone can run the code for free, including self-hosting
- If they modify and distribute (including running as a hosted service), they must open-source their modifications
- This is the Ghost/Plausible/Cal.com model — it works in practice as a competitive deterrent because commercial operators do not want to open-source their product extensions

CC-BY-NC-SA-4.0 for `/data` means:
- Community contributors can freely add content
- Anyone can use and share the content with attribution
- No commercial use without explicit permission from the project
- Share-alike ensures derivatives also remain open

**What this does NOT prevent**: Someone self-hosting for personal use. That is acceptable and aligned with the founder's own origin story. We are not trying to prevent personal use — we are preventing commercial exploitation of community labor.

**What the founder must do**: Add a `LICENSE` file to both `/src` root and `/data` root. Add a `COMMERCIAL LICENSE` contact email for any organization that wants to commercially deploy a fork. This creates a future revenue stream (commercial license sales) that is common in open-source SaaS.

---

## v1 Goals — What Must Be True at Launch

v1 is not a growth phase. v1 is a credibility-building phase. Launch means traders can arrive, trust the information, and use it without friction.

**Non-negotiable at launch:**
1. All four firms (Funded Next, Funding Pips, Apex Funding, Lucid Funding) have complete, verified content — index, challenges (all tiers), rules, promos, and changelog
2. Every page has a `last_verified` timestamp and at least one source URL
3. Monitoring bot is live and running daily; at minimum it pings a health check on each run
4. Search is functional (full-text, keyword highlight, Cmd+K UX)
5. Affiliate promo codes are displayed with expiry dates on the promos pages
6. Legal: Terms of Service page and site-wide disclaimer are live before launch
7. GitHub contribution workflow is documented (CONTRIBUTING.md) so day-one community PRs are possible
8. Site is responsive — mobile is not the primary use case but must not be broken
9. Dark/light/blue themes work and persist in localStorage
10. Graph view renders correctly for the initial set of files

**What v1 explicitly does NOT include:**
- Auth / login
- Stripe / payments
- Chatbot / LLM assistant
- Stacked panels (can ship as experimental if trivial, not a launch blocker)
- More than four firms (quality over quantity at launch)

**v1 Success Condition**: 500 unique visitors in the first 30 days post-launch with a bounce rate below 60%, and at least one confirmed affiliate conversion.

---

## v2 Goals — What We Build Next if v1 Succeeds

v2 activates only when v1 hits its kill/maintain threshold (see below). v2 is the monetization phase.

**v2 Priority Order (ranked by revenue potential vs build cost):**

1. **Firm expansion to 15+ firms** — The single highest-leverage thing we can do for SEO and affiliate revenue. Every new firm is new content, new keywords, new affiliate program. This is not a product feature, it is a content operation.

2. **LLM Chatbot ("Ask OpenPropFirm")** — Cross-firm query engine. "Which futures firm has the lowest drawdown and cheapest 50k challenge right now?" This is the killer feature. It is also the most expensive to run. Gate it behind a free account (email capture) in v2.0, then move it to a paid tier in v2.1 once we understand usage patterns.

3. **Paid Tier — "Pro Access"** — Target price: $9/month or $79/year. Include: chatbot unlimited queries, comparison tables (side-by-side firm comparison tool), promo code alerts (email when a new code drops for a tracked firm), and API access to the `/data` feed for traders who want to build their own tools. Do NOT paywall content that is free in v1. Paywalling existing free features is a trust-killer.

4. **Email alerts (free tier)** — User enters email, selects firms to watch, gets notified when rules or promos change. This is a free feature that builds the email list for upsell. Build before the chatbot.

5. **Firm profile "verified badge" (B2B revenue)** — Firms can pay a flat fee ($500–$2,000/year) to have a "Verified by Firm" badge on their page, meaning the firm itself has confirmed the data accuracy. This is NOT sponsored content — it is a verification service. Strict editorial policy must govern this to prevent it from becoming a pay-to-look-good scheme. This is a v2.1 or v2.2 feature once the brand is established.

**Features that will NOT go behind a paywall (ever):**
- All firm content (rules, challenges, promos, changelogs)
- Search
- Graph view
- Obsidian-compatible data download

Paywalling these would betray the open-source mission and destroy community trust. The paid tier must add value on top of the free tier, not restrict access to it.

---

## Revenue Strategy

### v1 — Affiliate Revenue (Target: $0–$2,000/month by month 3)

- Display affiliate promo codes prominently on each firm's promos page
- Add a subtle "support the project" message next to affiliate codes — transparency builds trust
- Track affiliate clicks with UTM parameters even if the affiliate program does not provide a dashboard
- Apply to affiliate programs for all four launch firms before site goes live
- Revenue expectation is low — v1 is about proving the traffic model, not the revenue model

### v2 — Paid Tier + Affiliate Scale (Target: $5,000 MRR by month 9 post-v2 launch)

- Affiliate revenue scales linearly with firm count and traffic — 15+ firms should 3–5x v1 affiliate revenue
- Paid Pro tier at $9/month — requires chatbot and email alerts to be live
- Target LTV:CAC of at least 3:1 — Pro tier is a low-touch self-serve product, CAC should be minimal (SEO-driven)
- No paid sales team in v2 — all conversion is inbound, product-led

### Revenue Model Risks
- Affiliate programs can be terminated by firms with no notice — do not build the business on one or two affiliate relationships
- Prop firm industry is volatile — firms shut down (seen with My Forex Funds, etc.) which can instantly kill affiliate income from a key partner
- Diversification across 15+ firms reduces but does not eliminate this risk

---

## OKRs Table

Review cycle: quarterly. Update "Current" column at start of each review. Status: On Track / At Risk / Behind / Done.

### Q2 2026 (April – June) — Launch & Early Traction

| Objective | Key Result | Target | Current | Status |
|-----------|------------|--------|---------|--------|
| **O1: Ship a credible v1 that traders trust** | All 4 firms have complete content (index, challenges, rules, promos, changelog) | 4/4 firms | 0/4 | Not Started |
| | Monitoring bot running daily with health check log | 100% uptime, 30-day run | 0 days | Not Started |
| | ToS + disclaimer pages live before launch | Yes | No | Not Started |
| | CONTRIBUTING.md published with PR workflow | Yes | No | Not Started |
| **O2: Generate first traffic signal** | Unique visitors in first 30 days post-launch | 500 | 0 | Not Started |
| | Bounce rate in first 30 days | < 60% | — | Not Started |
| | GitHub repo stars by end of Q2 | 100 | 0 | Not Started |
| | Mentions in prop trading subreddits or Discords | 3 organic mentions | 0 | Not Started |
| **O3: Establish affiliate baseline** | Active affiliate programs applied to | 4/4 firms | 0 | Not Started |
| | Affiliate link clicks tracked (UTM) | 200 clicks | 0 | Not Started |
| | Confirmed affiliate conversions | 1 | 0 | Not Started |

---

### Q3 2026 (July – September) — Growth & Content Expansion

| Objective | Key Result | Target | Current | Status |
|-----------|------------|--------|---------|--------|
| **O4: Expand firm coverage to grow SEO surface** | Total firms in `/data` | 10 | — | Not Started |
| | Organic search impressions (Google Search Console) | 10,000/month | — | Not Started |
| | Organic search clicks/month | 1,000 | — | Not Started |
| **O5: Build community contribution flywheel** | External (non-founder) GitHub contributors | 5 | — | Not Started |
| | Community-submitted PRs merged | 10 | — | Not Started |
| | GitHub repo stars | 300 | — | Not Started |
| **O6: Grow affiliate revenue** | Monthly affiliate revenue | $500/month | $0 | Not Started |
| | Affiliate link click-to-conversion rate | > 2% | — | Not Started |
| | Number of active affiliate programs | 8 | — | Not Started |

---

### Q4 2026 (October – December) — v2 Build Decision

| Objective | Key Result | Target | Current | Status |
|-----------|------------|--------|---------|--------|
| **O7: Validate paid tier demand before building** | Email waitlist signups for Pro features | 200 | — | Not Started |
| | Survey response indicating willingness to pay $9/month | > 30% of respondents | — | Not Started |
| | Monthly unique visitors | 5,000 | — | Not Started |
| **O8: Build v2 core features** | Chatbot MVP live (free tier, rate-limited) | Yes | — | Not Started |
| | Email alert feature live | Yes | — | Not Started |
| | Pro tier stripe integration live | Yes | — | Not Started |
| **O9: Hit revenue inflection** | Monthly affiliate revenue | $2,000 | — | Not Started |
| | Pro tier MRR (first month of paid tier) | $500 | — | Not Started |

---

### Annual 2027 — Scale

| Objective | Key Result | Target | Current | Status |
|-----------|------------|--------|---------|--------|
| **O10: Become the default prop trading resource** | Total firms covered | 25+ | — | Not Started |
| | Monthly organic unique visitors | 25,000 | — | Not Started |
| | Domain Rating (Ahrefs) | 40+ | — | Not Started |
| **O11: Reach sustainable revenue** | Total MRR (affiliate + Pro tier) | $5,000 | — | Not Started |
| | Pro tier MRR | $2,000 | — | Not Started |
| | Pro tier paying subscribers | 200+ | — | Not Started |
| | Monthly churn rate (Pro tier) | < 5% | — | Not Started |
| **O12: Community is self-sustaining** | % of content updates from community PRs (not founder) | > 40% | — | Not Started |
| | Active Discord or community members | 500 | — | Not Started |

---

## Kill / Maintain Conditions

These are non-negotiable decision gates. If the conditions are not met, we take the specified action — no negotiating with the data.

### Gate 1 — Post-Launch Review (60 days after public launch)

| Metric | Kill Threshold | Maintain Threshold | Action if Kill |
|--------|---------------|-------------------|----------------|
| Unique visitors (month 2) | < 200/month | >= 500/month | Shut down active development; move to static archive |
| Bounce rate | > 80% | < 65% | Indicates content is not matching intent; pause and do user research before continuing |
| GitHub stars | < 20 | >= 50 | Low community interest signal; do not invest in v2 |
| Affiliate program approvals | 0/4 | 2/4+ | If zero firms approve us, the revenue model is broken; re-evaluate |

**If Kill Gate 1 is triggered**: Freeze the repo, write a post-mortem, and do not invest in v2 build. The `/data` folder remains public as a community resource. The domain and site can go into maintenance mode (static export, no new development).

---

### Gate 2 — Pre-v2 Decision Point (end of Q3 2026, approximately 5–6 months post-launch)

| Metric | Kill Threshold | v2 Green Light |
|--------|---------------|---------------|
| Monthly unique visitors | < 1,000 | >= 3,000 |
| Monthly affiliate revenue | < $100 | >= $300 |
| GitHub stars | < 75 | >= 200 |
| External contributors (non-founder PRs merged) | 0 | >= 5 |
| Email waitlist or community opt-ins | < 50 | >= 150 |

**If Kill Gate 2 is triggered**: Do not build v2. Shift to maintenance mode — bot keeps running, community PRs accepted, but no active feature development. Re-evaluate in 6 months if traffic trends improve organically.

**If v2 Green Light**: Allocate resources to chatbot MVP and email alerts. Set a 90-day v2 ship target.

---

### Gate 3 — Pro Tier Viability (90 days after Pro tier launch)

| Metric | Kill Threshold | Continue |
|--------|---------------|----------|
| Pro tier MRR | < $200/month | >= $500/month |
| Pro tier churn rate | > 15%/month | < 8%/month |
| Chatbot queries per active user per month | < 3 | >= 10 |

**If Kill Gate 3 is triggered**: Revert Pro tier features to free; do not double down on a monetization model that users are not buying. Consider alternative models (donations, sponsorships, one-time data export fee).

---

## Open Questions — Founder Input Required

These are decisions that cannot be made from the project brief alone. They require founder judgment and must be resolved before or shortly after launch.

1. **Affiliate conflict policy**: Will you list firms with no affiliate program alongside affiliate firms, with equal prominence? If yes, say so explicitly in the site footer. If no, you are building an affiliate site that is disguised as a neutral resource — and sophisticated traders will notice. Decide and commit.

2. **Founder identity on the site**: Is the founder named/credited? Anonymous? A named founder with a trading background adds significant trust. An anonymous project looks more like a content farm. This affects both community trust and press coverage potential.

3. **Discord or forum strategy**: Where do you want community conversations to happen? A Discord server at launch (even if low-activity) signals that the project is alive and that people can ask questions. Without a community channel, the GitHub repo becomes the only feedback loop. That is too slow.

4. **Monitoring bot LLM cost**: The brief says "LLM or structured parsing" for detecting changes. If it is an LLM call per page per day across 4 firms and growing to 25+, the cost adds up. Who pays for the LLM API calls — the founder personally? Is there a budget cap? Define this before the bot is built or it will become a hidden ongoing cost with no ceiling.

5. **Content accuracy liability**: The brief states "no liability for stale data." That is fine as a legal disclaimer, but has a lawyer reviewed the ToS? Prop trading involves real money. If a trader makes a costly mistake citing OpenPropFirm data, is the disclaimer sufficient? This should be reviewed by a legal professional before launch, not after.

6. **Firm verification badge pricing (v2)**: If you pursue the B2B "verified badge" revenue model in v2, you need a clear policy on what a firm must do to earn the badge (beyond paying). Without strict policy, this becomes a pay-to-win scheme that destroys the neutrality brand. Draft the policy before you offer the product.

7. **What happens when a firm shuts down?**: The prop firm industry has seen several high-profile collapses (My Forex Funds was shut down by regulators). What is the policy for inactive or defunct firms — archived, deleted, or flagged? This is both an editorial and SEO decision (pages about defunct firms can actually rank well for "is [firm] legit" queries).

8. **Sprint timeline and founder bandwidth**: The brief says "no fixed timeline, ship when it's right." That is a cultural value, not a plan. Given the kill gates above, the window to launch and validate v1 before losing momentum is approximately 60–90 days from today. If the founder is part-time on this, that changes the resource plan materially. Be honest about bandwidth and set a launch date range, even a rough one.

---

*This document is a living artifact. Update the OKR "Current" and "Status" columns at the start of each quarter. Revisit kill/maintain thresholds at Gate 1 and Gate 2 reviews. All strategic decisions in this document are owned by the CEO.*
