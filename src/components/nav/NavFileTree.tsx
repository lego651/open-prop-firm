'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ChevronRight,
  History,
  Info,
  Tag,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreeNode } from '@/types/content'

type NavFileTreeProps = {
  treeData: TreeNode[]
  activeSlug: string
}

function findAncestorIds(
  nodes: TreeNode[],
  targetId: string,
  path: string[] = [],
): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path
    if (node.children) {
      const found = findAncestorIds(node.children, targetId, [...path, node.id])
      if (found) return found
    }
  }
  return null
}

function FileTypeIcon({
  fileType,
  size,
}: {
  fileType: string | undefined
  size: number
}) {
  if (fileType === 'basic-info')
    return (
      <Info size={size} className="shrink-0 text-[var(--muted-foreground)]" />
    )
  if (fileType === 'challenge')
    return <Trophy size={size} className="shrink-0 text-[var(--accent)]" />
  if (fileType === 'rules')
    return (
      <BookOpen size={size} className="shrink-0 text-[var(--foreground)]" />
    )
  if (fileType === 'promo')
    return (
      <Tag size={size} className="shrink-0 text-[var(--file-type-promo)]" />
    )
  if (fileType === 'changelog')
    return (
      <History
        size={size}
        className="shrink-0 text-[var(--muted-foreground)]"
      />
    )
  return null
}

function TreeNodeList({
  nodes,
  expanded,
  activeSlug,
  onToggleFolder,
  onFileClick,
  depth,
}: {
  nodes: TreeNode[]
  expanded: Record<string, boolean>
  activeSlug: string
  onToggleFolder: (id: string) => void
  onFileClick: (id: string) => void
  depth: number
}) {
  return (
    <>
      {nodes.map((node) => {
        if (node.nodeRole === 'category') {
          return (
            <div key={node.id}>
              <div className="mt-4 mb-2 px-3 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase">
                {node.label}
              </div>
              {node.children && (
                <TreeNodeList
                  nodes={node.children}
                  expanded={expanded}
                  activeSlug={activeSlug}
                  onToggleFolder={onToggleFolder}
                  onFileClick={onFileClick}
                  depth={depth + 1}
                />
              )}
            </div>
          )
        }

        if (node.nodeRole === 'firm') {
          return (
            <div
              key={node.id}
              role="treeitem"
              aria-expanded={expanded[node.id] ?? false}
              aria-selected={false}
            >
              <div
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center gap-1.5 rounded-sm px-3 hover:bg-[var(--muted)]/60"
                style={{ height: 28 }}
                onClick={() => onToggleFolder(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggleFolder(node.id)
                  }
                }}
              >
                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform duration-200"
                  style={{
                    transform: expanded[node.id] ? 'rotate(90deg)' : '',
                  }}
                />
                <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
                  {node.label}
                </span>
              </div>
              {expanded[node.id] && node.children && (
                <div role="group">
                  <TreeNodeList
                    nodes={node.children}
                    expanded={expanded}
                    activeSlug={activeSlug}
                    onToggleFolder={onToggleFolder}
                    onFileClick={onFileClick}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          )
        }

        if (node.nodeRole === 'challenges-folder') {
          return (
            <div
              key={node.id}
              role="treeitem"
              aria-expanded={expanded[node.id] ?? false}
              aria-selected={false}
            >
              <div
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center gap-1.5 rounded-sm px-3 pl-6 hover:bg-[var(--muted)]/60"
                style={{ height: 28 }}
                onClick={() => onToggleFolder(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onToggleFolder(node.id)
                  }
                }}
              >
                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform duration-200"
                  style={{
                    transform: expanded[node.id] ? 'rotate(90deg)' : '',
                  }}
                />
                <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
                  {node.label}
                </span>
              </div>
              {expanded[node.id] && node.children && (
                <div role="group">
                  <TreeNodeList
                    nodes={node.children}
                    expanded={expanded}
                    activeSlug={activeSlug}
                    onToggleFolder={onToggleFolder}
                    onFileClick={onFileClick}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          )
        }

        if (node.nodeRole === 'file') {
          const isActive = node.id === activeSlug
          const isChallengeChild = depth >= 3
          const indentClass = isChallengeChild ? 'pl-10' : 'pl-6'
          return (
            <div
              key={node.id}
              role="treeitem"
              tabIndex={0}
              aria-selected={isActive}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-sm',
                indentClass,
                isActive
                  ? 'bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-fg)]'
                  : 'hover:bg-[var(--muted)]/60',
              )}
              style={{ height: 26 }}
              onClick={() => onFileClick(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onFileClick(node.id)
                }
              }}
            >
              <FileTypeIcon fileType={node.fileType} size={14} />
              <span className="truncate text-[13px] text-[var(--foreground)]">
                {node.label}
              </span>
            </div>
          )
        }

        return null
      })}
    </>
  )
}

export default function NavFileTree({
  treeData,
  activeSlug,
}: NavFileTreeProps) {
  const router = useRouter()

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // SSR-safe: always start with empty state, load from localStorage on mount
    return {}
  })

  // Load expanded state from localStorage on mount (hydration — SSR-safe localStorage sync)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('navTreeState')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setExpanded(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    const ancestors = findAncestorIds(treeData, activeSlug)
    if (!ancestors || ancestors.length === 0) return
    // Expanding ancestors to reveal active file — setState in response to route change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded((prev) => {
      const next = { ...prev }
      let changed = false
      for (const id of ancestors) {
        if (!next[id]) {
          next[id] = true
          changed = true
        }
      }
      if (!changed) return prev
      try {
        localStorage.setItem('navTreeState', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [activeSlug, treeData])

  function handleToggleFolder(id: string) {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('navTreeState', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  function handleFileClick(id: string) {
    router.push('/' + id)
  }

  return (
    <div role="tree" className="px-1 py-1">
      <TreeNodeList
        nodes={treeData}
        expanded={expanded}
        activeSlug={activeSlug}
        onToggleFolder={handleToggleFolder}
        onFileClick={handleFileClick}
        depth={0}
      />
    </div>
  )
}
