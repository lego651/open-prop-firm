# OpenPropFirm

An open-source, community-maintained information hub for prop firm traders. Built as a public version of a personal Obsidian vault — so every trader can access organized, sourced, and regularly verified prop firm data for free.

## What It Does

- **Obsidian-style 3-panel layout** — file tree, content viewer, graph view
- **4 prop firms at launch** — Funded Next, Funding Pips, Apex Funding, Lucid Funding
- **Auto-monitoring bot** — daily GitHub Actions scraper opens PRs when firm data changes
- **Community-maintained** — anyone can submit content updates via GitHub PR

## Tech Stack

- [Next.js 16](https://nextjs.org) — App Router, TypeScript strict mode
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS v4
- [Supabase Auth](https://supabase.com) — Google OAuth (free signup only)
- [Vercel Analytics](https://vercel.com/analytics) — privacy-friendly traffic tracking
- [GitHub Actions](https://github.com/features/actions) — monitoring bot + CI

## Licenses

| Path | License |
|------|---------|
| `/src` — application source code | [AGPL-3.0](./LICENSE) |
| `/data` — prop firm content | [CC-BY-NC-SA-4.0](./data/LICENSE) |

**Commercial use of either component requires a separate license.**
Contact: `commercial@openpropfirm.com`

## COMMERCIAL LICENSE

The `/src` code is licensed under AGPL-3.0. The `/data` content is licensed under CC-BY-NC-SA-4.0.

If you wish to use either component in a commercial product or service (including SaaS, white-label, or paid applications), you must obtain a separate commercial license.

**To inquire:** `commercial@openpropfirm.com`

## Getting Started

```bash
# Clone the repo
git clone https://github.com/[owner]/open-prop-firm.git
cd open-prop-firm

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual values

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Contributing

CONTRIBUTING.md — coming in Sprint 6. See `/data/_templates/` for content frontmatter schema.

## Live Site

Coming at launch.

---

[![AGPL-3.0 License](https://img.shields.io/badge/License-AGPL_3.0-blue.svg)](./LICENSE)
[![CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC_BY--NC--SA_4.0-lightgrey.svg)](./data/LICENSE)
