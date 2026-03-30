---
title: 'Apex Trader Funding — Trading Rules'
firm: Apex Trader Funding
category: futures
type: rules
status: active
last_verified: '2026-03-29T00:00:00Z'
verified_by: manual
sources:
  - url: 'https://support.apextraderfunding.com/hc/en-us/articles/31519769997083-Legacy-Evaluation-Rules'
    label: 'Apex Trader Funding — Legacy Evaluation Rules (Help Center)'
  - url: 'https://support.apextraderfunding.com/hc/en-us/articles/4408610260507-How-Does-the-Trailing-Static-Drawdown-Threshold-Work-Master-Course'
    label: 'Apex Trader Funding — How Trailing Drawdown Works'
  - url: 'https://propfirmapp.com/prop-firms/apex-trader-funding'
    label: 'Apex Trader Funding — Account and Rule Summary 2026'
---

# Apex Trader Funding — Trading Rules

Apex Trader Funding evaluates traders on CME-listed futures contracts using a trailing drawdown model. The firm offers two evaluation types — EOD (End-of-Day) and Intraday — which differ in when the trailing drawdown threshold updates. Rules described here apply to the current 4.0 account structure (March 2026 onward).

## Drawdown Rules

- **Trailing drawdown (all accounts):** The drawdown threshold is not fixed — it trails upward as the account's equity grows. The account is terminated if equity falls to or below the current threshold at any point.
- **EOD accounts:** The trailing threshold adjusts once per day, at the end of the trading session, based on the session's closing equity. Intraday equity highs do not move the threshold in real-time. This provides more flexibility within a session.
- **Intraday accounts:** The trailing threshold updates in real-time. Every new equity high — even intraday — immediately raises the floor. More restrictive, but lower entry price.
- **Daily loss limit (EOD accounts only):** A separate daily loss limit applies on EOD accounts. If the account's intraday loss reaches the daily limit, trading is halted for the session.
- **Drawdown resets:** The trailing threshold can only move up, never down. Once equity achieves a new high, the floor is permanently raised.

## Allowed Contracts

Apex Trader Funding allows trading on CME Group-listed futures contracts. Common instruments include:

| Contract | Description | Exchange |
| --- | --- | --- |
| ES | E-mini S&P 500 | CME |
| NQ | E-mini Nasdaq-100 | CME |
| YM | E-mini Dow Jones | CBOT |
| RTY | E-mini Russell 2000 | CME |
| CL | Crude Oil | NYMEX |
| GC | Gold | COMEX |
| 6E | Euro FX | CME |
| ZB | 30-Year Treasury Bond | CBOT |

Contract limits per account size apply — see individual account pages for limits.

## Trading Restrictions

| Rule | Policy |
| --- | --- |
| EAs / Bots | Permitted; fully automated trading is allowed |
| News trading | Permitted; no restrictions during news events |
| Weekend holding | Not permitted; all positions must be closed before the weekend market close |
| Hedging | Not permitted — opposing positions on the same instrument are prohibited |
| Copy trading | Permitted for personal use; running the same strategy across large numbers of accounts may be reviewed |

## Consistency Rules

No formal consistency rule (e.g., no single-day profit cap) is stated for the evaluation phase. The firm does review Performance Accounts for prohibited strategies but does not publish a specific consistency percentage requirement.

## Scaling Plan

After passing evaluation and activating a Performance Account, traders may hold up to 20 funded accounts simultaneously for a combined maximum of $6,000,000 in total funded capital. Each account operates independently.

Performance Account payouts are capped at a per-withdrawal maximum (verify current cap on official website). 100% of profits within the cap go to the trader.

## Additional Rules

- Minimum 5 qualifying trading days before the first payout from a Performance Account.
- Activation fee required after passing evaluation ($99 EOD / $79 Intraday).
- Account terminated — not suspended — upon violating the trailing drawdown threshold.
- Micro-contract equivalents (e.g., MES, MNQ) count toward contract limits at a ratio of 10:1 vs. standard minis.

See [[firms/futures/apex-funding|Overview]] for general firm information.
