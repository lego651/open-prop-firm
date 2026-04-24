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
  const slugCounts = new Map<string, number>()

  const h2s = root.children('h2').toArray()
  if (h2s.length === 0) return []

  for (const h2 of h2s) {
    const $h2 = $(h2)
    const title = $h2.text().trim()
    if (title === '') continue // skip empty headings — authoring bug
    const baseSlug = slugify(title)
    const seen = slugCounts.get(baseSlug) ?? 0
    const slug = seen === 0 ? baseSlug : `${baseSlug}-${seen + 1}`
    slugCounts.set(baseSlug, seen + 1)
    const $siblings = $h2.nextUntil('h2')
    const html = $siblings.toArray().map((n) => $.html(n)).join('')
    sections.push({ slug, title, html })
  }

  return sections
}
