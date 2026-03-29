import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import fg from 'fast-glob'
import matter from 'gray-matter'

type GraphNode = {
  id: string
  label: string
  type: string
  firm: string
  category: string
}

type GraphEdge = {
  source: string
  target: string
}

type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const DATA_DIR = path.join(process.cwd(), 'data', 'firms')
const OUTPUT = path.join(process.cwd(), 'public', 'graph-data.json')

// Regex: [[target|label]] or [[target]]
const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

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

  const nodes: GraphNode[] = []
  const nodeSet = new Set<string>()

  // First pass: build all nodes
  for (const file of files) {
    const raw = await readFile(file, 'utf-8')
    const { data } = matter(raw)
    const slug = slugFromFilePath(file)
    const parts = slug.split('/')
    const firmSegment = parts[2] ?? slug

    nodes.push({
      id: slug,
      label: data.title ? String(data.title) : firmSegment,
      type: String(data.type ?? ''),
      firm: String(data.firm ?? firmSegment),
      category: categoryFromSlug(slug),
    })
    nodeSet.add(slug)
  }

  // Second pass: extract wikilinks → edges
  const edges: GraphEdge[] = []

  for (const file of files) {
    const raw = await readFile(file, 'utf-8')
    const { content } = matter(raw)
    const sourceSlug = slugFromFilePath(file)

    let match: RegExpExecArray | null
    WIKILINK_RE.lastIndex = 0
    while ((match = WIKILINK_RE.exec(content)) !== null) {
      const rawTarget = match[1].trim()
      // Resolve: if starts with firms/, use as-is; otherwise try relative
      const targetSlug = rawTarget.startsWith('firms/') ? rawTarget : rawTarget

      if (nodeSet.has(targetSlug) && targetSlug !== sourceSlug) {
        edges.push({ source: sourceSlug, target: targetSlug })
      }
    }
  }

  const graphData: GraphData = { nodes, edges }
  await writeFile(OUTPUT, JSON.stringify(graphData, null, 2))
  console.log(`Built graph data: ${nodes.length} nodes, ${edges.length} edges written to public/graph-data.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
