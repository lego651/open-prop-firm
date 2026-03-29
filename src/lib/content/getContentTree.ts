import 'server-only'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { ContentTreeResult, FileType, TreeNode } from '@/types/content'

const FIRMS_DIR = path.join(process.cwd(), 'data', 'firms')
const CATEGORY_ORDER = ['cfd', 'futures'] as const
const FILE_TYPE_ORDER: FileType[] = ['basic-info', 'rules', 'promo', 'changelog']

function kebabToTitle(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function readFrontmatter(filePath: string): Record<string, unknown> {
  try {
    return matter(fs.readFileSync(filePath, 'utf-8')).data
  } catch {
    return {}
  }
}

function collectTreeSlugs(
  node: TreeNode,
  firmSlug: string,
  firmPrefix: string,
  validSlugs: string[],
  slugToPathMap: Record<string, string>,
) {
  if (node.type === 'file') {
    validSlugs.push(node.id)
    if (node.id === firmPrefix) {
      // basic-info (index.md): key is firmSlug only
      slugToPathMap[firmSlug] = node.id
    } else {
      // Other files: key is firmSlug/relPath
      const relPath = node.id.slice(firmPrefix.length + 1)
      slugToPathMap[`${firmSlug}/${relPath}`] = node.id
    }
  }
  if (node.children) {
    for (const child of node.children) {
      collectTreeSlugs(child, firmSlug, firmPrefix, validSlugs, slugToPathMap)
    }
  }
}

function buildFirmNode(category: string, firmSlug: string): TreeNode {
  const firmDir = path.join(FIRMS_DIR, category, firmSlug)
  const firmId = `firms/${category}/${firmSlug}`
  const fileNodes: TreeNode[] = []
  const challengeNodes: TreeNode[] = []

  const entries = fs.readdirSync(firmDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue

    if (entry.isFile() && entry.name.endsWith('.md')) {
      const fm = readFrontmatter(path.join(firmDir, entry.name))
      const isIndex = entry.name === 'index.md'
      const slug = isIndex ? firmId : `${firmId}/${entry.name.replace('.md', '')}`
      const nameWithoutExt = entry.name.replace('.md', '')
      const label =
        typeof fm.title === 'string'
          ? fm.title
          : kebabToTitle(isIndex ? firmSlug : nameWithoutExt)

      fileNodes.push({
        id: slug,
        label,
        type: 'file',
        nodeRole: 'file',
        fileType: fm.type as FileType,
      })
    } else if (entry.isDirectory() && entry.name === 'challenges') {
      const challengesDir = path.join(firmDir, 'challenges')
      const challengeFiles = fs
        .readdirSync(challengesDir)
        .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
        .sort()

      for (const cf of challengeFiles) {
        const fm = readFrontmatter(path.join(challengesDir, cf))
        const slug = `${firmId}/challenges/${cf.replace('.md', '')}`
        const label =
          typeof fm.title === 'string' ? fm.title : kebabToTitle(cf.replace('.md', ''))

        challengeNodes.push({
          id: slug,
          label,
          type: 'file',
          nodeRole: 'file',
          fileType: 'challenge',
        })
      }
    }
  }

  // Sort flat files by defined type order
  fileNodes.sort((a, b) => {
    const ai = a.fileType ? FILE_TYPE_ORDER.indexOf(a.fileType) : 99
    const bi = b.fileType ? FILE_TYPE_ORDER.indexOf(b.fileType) : 99
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const children: TreeNode[] = [...fileNodes]
  if (challengeNodes.length > 0) {
    children.push({
      id: `${firmId}/challenges`,
      label: 'Challenges',
      type: 'folder',
      nodeRole: 'challenges-folder',
      children: challengeNodes,
    })
  }

  return {
    id: firmId,
    label: kebabToTitle(firmSlug),
    type: 'folder',
    nodeRole: 'firm',
    children,
  }
}

export async function getContentTree(): Promise<ContentTreeResult> {
  const treeData: TreeNode[] = []
  const validSlugs: string[] = []
  const slugToPathMap: Record<string, string> = {}

  for (const category of CATEGORY_ORDER) {
    const categoryDir = path.join(FIRMS_DIR, category)
    if (!fs.existsSync(categoryDir)) continue

    const firms = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name)
      .sort()

    const firmNodes: TreeNode[] = []
    for (const firmSlug of firms) {
      const firmNode = buildFirmNode(category, firmSlug)
      firmNodes.push(firmNode)
      collectTreeSlugs(
        firmNode,
        firmSlug,
        `firms/${category}/${firmSlug}`,
        validSlugs,
        slugToPathMap,
      )
    }

    treeData.push({
      id: `firms/${category}`,
      label: category.toUpperCase(),
      type: 'folder',
      nodeRole: 'category',
      children: firmNodes,
    })
  }

  return { treeData, validSlugs, slugToPathMap }
}

export async function getStaticParams(): Promise<Array<{ slug: string[] }>> {
  const { validSlugs } = await getContentTree()
  return validSlugs.map((slug) => ({ slug: slug.split('/') }))
}
