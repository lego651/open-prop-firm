import { load } from 'cheerio'

export interface RuleSection {
  slug: string
  title: string
  html: string
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function splitRulesIntoSections(rulesHtml: string): RuleSection[] {
  if (!rulesHtml) return []

  const $ = load(`<div id="__root">${rulesHtml}</div>`)
  const root = $('#__root')
  const sections: RuleSection[] = []

  const h2s = root.children('h2').toArray()
  if (h2s.length === 0) return []

  for (const h2 of h2s) {
    const $h2 = $(h2)
    const title = $h2.text().trim()
    const $siblings = $h2.nextUntil('h2')
    const html = $siblings.toArray().map((n) => $.html(n)).join('')
    sections.push({ slug: slugify(title), title, html })
  }

  return sections
}
