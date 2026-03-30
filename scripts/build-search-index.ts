import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import stripMarkdown from 'strip-markdown'
import type { SearchEntry } from '../src/types/content'

const DATA_DIR = path.join(process.cwd(), 'data', 'firms')
const OUTPUT = path.join(process.cwd(), 'public', 'search-index.json')

async function stripMd(content: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(stripMarkdown)
    .use(remarkStringify)
    .process(content)
  return String(file)
}

function slugFromFilePath(filePath: string): string {
  const rel = path.relative(path.join(process.cwd(), 'data'), filePath)
  const withoutExt = rel.replace(/\.md$/, '')
  // index.md files → parent slug
  return withoutExt.replace(/\/index$/, '')
}

function categoryFromSlug(slug: string): string {
  // firms/cfd/... → CFD, firms/futures/... → Futures
  const parts = slug.split('/')
  const cat = parts[1] ?? ''
  return cat === 'cfd' ? 'CFD' : cat === 'futures' ? 'Futures' : cat
}

async function main() {
  const files = await fg('**/*.md', { cwd: DATA_DIR, absolute: true })

  const results = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(file, 'utf-8')
      const { data, content } = matter(raw)
      if (!data.title) return null
      const plainText = await stripMd(content)
      // Strip leading H1 — it duplicates the title field already indexed separately
      const lines = plainText.trim().split('\n')
      const firstLineIsTitle =
        lines[0]?.trim() === String(data.title).trim()
      const bodyText = (firstLineIsTitle ? lines.slice(1).join('\n') : plainText).trim()
      // Find first substantive paragraph: non-empty, not a heading remnant, min 40 chars
      const bodyLines = bodyText.split('\n')
      let excerpt = ''
      for (const line of bodyLines) {
        const t = line.trim()
        if (t.length >= 40) {
          excerpt = t.length > 160 ? t.slice(0, 157) + '…' : t
          break
        }
      }
      if (!excerpt) {
        // fallback: first 160 chars of body
        excerpt = bodyText.slice(0, 157) + (bodyText.length > 157 ? '…' : '')
      }
      const slug = slugFromFilePath(file)
      return {
        slug,
        title: String(data.title),
        firm: String(data.firm ?? ''),
        type: String(data.type ?? ''),
        category: categoryFromSlug(slug),
        excerpt,
        body: bodyText,
      } satisfies SearchEntry
    }),
  )
  const entries = results.filter((e): e is SearchEntry => e !== null)

  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(entries, null, 2))
  console.log(`Built search index: ${entries.length} entries written to public/search-index.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
