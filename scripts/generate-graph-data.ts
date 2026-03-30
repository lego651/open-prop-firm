import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import fg from 'fast-glob'
import matter from 'gray-matter'
import type { GraphNode, GraphEdge, GraphData } from '../src/types/content'
import { WIKILINK_RE } from '../src/lib/content/wikilinks'

const DATA_DIR = path.join(process.cwd(), 'data', 'firms')
const OUTPUT = path.join(process.cwd(), 'public', 'graph-data.json')

function slugFromFilePath(filePath: string): string {
  const rel = path.relative(path.join(process.cwd(), 'data'), filePath)
  const withoutExt = rel.replace(/\.md$/, '')
  return withoutExt.replace(/\/index$/, '')
}

function categoryFromSlug(slug: string): string {
  const parts = slug.split('/')
  const cat = parts[1] ?? ''
  return cat === 'cfd' ? 'CFD' : cat === 'futures' ? 'Futures' : cat
}

async function main() {
  const files = await fg('**/*.md', { cwd: DATA_DIR, absolute: true })

  // Single pass: read each file once, build nodes and store content for edge extraction
  const parsed = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(file, 'utf-8')
      const { data, content } = matter(raw)
      const slug = slugFromFilePath(file)
      const parts = slug.split('/')
      const firmSegment = parts[2] ?? slug
      return {
        slug,
        node: {
          id: slug,
          label: data.title ? String(data.title) : firmSegment,
          type: String(data.type ?? ''),
          firm: String(data.firm ?? firmSegment),
          category: categoryFromSlug(slug),
        } satisfies GraphNode,
        content,
      }
    }),
  )

  const nodes = parsed.map((p) => p.node)
  const nodeSet = new Set(nodes.map((n) => n.id))

  // Extract wikilinks → edges, deduplicating by (source, target) pair
  const edgeSet = new Set<string>()
  const edges: GraphEdge[] = []
  for (const { slug: sourceSlug, content } of parsed) {
    const re = new RegExp(WIKILINK_RE.source, 'g')
    let match: RegExpExecArray | null
    while ((match = re.exec(content)) !== null) {
      const targetSlug = match[1].trim()
      const key = `${sourceSlug}:${targetSlug}`
      if (nodeSet.has(targetSlug) && targetSlug !== sourceSlug && !edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push({ source: sourceSlug, target: targetSlug })
      }
    }
  }

  const graphData: GraphData = { nodes, edges }
  await mkdir(path.dirname(OUTPUT), { recursive: true })
  await writeFile(OUTPUT, JSON.stringify(graphData, null, 2))
  console.log(`Built graph data: ${nodes.length} nodes, ${edges.length} edges written to public/graph-data.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
