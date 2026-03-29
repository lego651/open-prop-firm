import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import stripMarkdown from 'strip-markdown'

type SearchEntry = {
  slug: string
  title: string
  firm: string
  type: string
  category: string
  excerpt: string
}

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

  const entries: SearchEntry[] = []

  for (const file of files) {
    const raw = await readFile(file, 'utf-8')
    const { data, content } = matter(raw)

    if (!data.title) continue

    const plainText = await stripMd(content)
    const excerpt = plainText.trim().slice(0, 500)
    const slug = slugFromFilePath(file)

    entries.push({
      slug,
      title: String(data.title),
      firm: String(data.firm ?? ''),
      type: String(data.type ?? ''),
      category: categoryFromSlug(slug),
      excerpt,
    })
  }

  await writeFile(OUTPUT, JSON.stringify(entries, null, 2))
  console.log(`Built search index: ${entries.length} entries written to public/search-index.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
