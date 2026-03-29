export type FileType =
  | 'basic-info'
  | 'challenge'
  | 'rules'
  | 'promo'
  | 'changelog'

export type NodeRole = 'category' | 'firm' | 'challenges-folder' | 'file'

export type TreeNode = {
  id: string // full URL slug, e.g. "firms/cfd/funded-next/challenges/50k"
  label: string // display name — from frontmatter.title, or capitalized slug segment
  type: 'folder' | 'file'
  nodeRole: NodeRole // used to distinguish rendering: category header vs firm folder vs challenges sub-folder vs file
  fileType?: FileType // only for file nodes
  children?: TreeNode[]
}

export type ContentTreeResult = {
  treeData: TreeNode[] // top-level: two TreeNode[nodeRole='category'] — CFD and Futures
  validSlugs: string[] // all full slugs, e.g. ["firms/cfd/funded-next/challenges/50k", ...]
  slugToPathMap: Record<string, string> // firm-relative slug → full URL path
  // e.g. "funded-next/rules" → "firms/cfd/funded-next/rules"
  // Used by Sprint 3's wikilink resolver
}

export type TabEntry = {
  slug: string // full URL slug, e.g. "firms/cfd/funded-next/challenges/50k"
  title: string // display label from frontmatter or slug-derived
}

export type SourceEntry = {
  url: string
  label: string
}

export type Frontmatter = {
  title: string
  firm: string
  category: 'cfd' | 'futures'
  type: FileType
  status: 'active' | 'inactive' | 'shutdown'
  last_verified: string // ISO 8601 UTC string
  verified_by: 'bot' | 'manual'
  sources: SourceEntry[]
  tags?: string[]
  // challenge-specific
  challenge_size?: number
  price_usd?: number
  affiliate_available?: boolean
  // basic-info-specific
  website?: string
  founded?: number
  headquarters?: string
}

export type PageContent = {
  frontmatter: Frontmatter
  htmlContent: string
  slug: string
}

// API response from /api/content/[...slug]
export type ContentApiResponse = PageContent | { error: string }

export type SearchEntry = {
  slug: string
  title: string
  firm: string
  type: string
  category: string // "CFD" | "Futures"
  excerpt: string
}
