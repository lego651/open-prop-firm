import { describe, it, expect } from 'vitest'
import path from 'path'
import { loadStaticPage, STATIC_PAGE_SLUGS } from './static'

const REAL_DATA = path.join(process.cwd(), 'data', 'static')

describe('loadStaticPage', () => {
  it('loads each of the 3 static slugs', async () => {
    for (const slug of STATIC_PAGE_SLUGS) {
      const page = await loadStaticPage(slug, { rootDir: REAL_DATA })
      expect(page.slug).toBe(slug)
      expect(page.title.length).toBeGreaterThan(0)
      expect(page.htmlContent.length).toBeGreaterThan(0)
      // sanity: rendered HTML should contain an <h1> (each fixture has one)
      expect(page.htmlContent).toMatch(/<h1>/i)
    }
  })

  it('exposes title from frontmatter, not slug', async () => {
    const page = await loadStaticPage('about', { rootDir: REAL_DATA })
    expect(page.title).toBe('About OpenPropFirm')
  })

  it('throws a clear error if the file is missing', async () => {
    await expect(
      loadStaticPage('about', { rootDir: path.join(process.cwd(), 'no-such-dir') }),
    ).rejects.toThrow(/static page/i)
  })

  it('STATIC_PAGE_SLUGS is the spec-required triple', () => {
    expect(STATIC_PAGE_SLUGS).toEqual(['about', 'disclosure', 'terms'])
  })
})
