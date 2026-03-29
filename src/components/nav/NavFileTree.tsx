'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ChevronRight, History, Info, Tag, Trophy } from 'lucide-react'
import type { TreeNode } from '@/types/content'

type NavFileTreeProps = {
  treeData: TreeNode[]
  activeSlug: string
}

function findAncestorIds(nodes: TreeNode[], targetId: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return path
    if (node.children) {
      const found = findAncestorIds(node.children, targetId, [...path, node.id])
      if (found) return found
    }
  }
  return null
}

function FileTypeIcon({ fileType, size }: { fileType: string | undefined; size: number }) {
  if (fileType === 'basic-info') return <Info size={size} className="text-[var(--muted-foreground)] shrink-0" />
  if (fileType === 'challenge') return <Trophy size={size} className="text-[var(--accent)] shrink-0" />
  if (fileType === 'rules') return <BookOpen size={size} className="text-[var(--foreground)] shrink-0" />
  if (fileType === 'promo') return <Tag size={size} className="text-[var(--file-type-promo)] shrink-0" />
  if (fileType === 'changelog') return <History size={size} className="text-[var(--muted-foreground)] shrink-0" />
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
              <div className="text-[10px] uppercase font-semibold text-[var(--muted-foreground)] mt-4 mb-2 px-3">
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
            <div key={node.id}>
              <div
                className="flex items-center gap-1.5 px-3 cursor-pointer hover:bg-[var(--muted)]/60 rounded-sm"
                style={{ height: 28 }}
                onClick={() => onToggleFolder(node.id)}
              >
                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: expanded[node.id] ? 'rotate(90deg)' : '' }}
                />
                <span className="text-[13px] font-medium text-[var(--foreground)] truncate">{node.label}</span>
              </div>
              {expanded[node.id] && node.children && (
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

        if (node.nodeRole === 'challenges-folder') {
          return (
            <div key={node.id}>
              <div
                className="flex items-center gap-1.5 pl-6 px-3 cursor-pointer hover:bg-[var(--muted)]/60 rounded-sm"
                style={{ height: 28 }}
                onClick={() => onToggleFolder(node.id)}
              >
                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: expanded[node.id] ? 'rotate(90deg)' : '' }}
                />
                <span className="text-[13px] font-medium text-[var(--foreground)] truncate">{node.label}</span>
              </div>
              {expanded[node.id] && node.children && (
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

        if (node.nodeRole === 'file') {
          const isActive = node.id === activeSlug
          const isChallengeChild = depth >= 3
          const indentClass = isChallengeChild ? 'pl-10' : 'pl-6'
          return (
            <div
              key={node.id}
              className={[
                'flex items-center gap-1.5 cursor-pointer rounded-sm',
                indentClass,
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] font-medium'
                  : 'hover:bg-[var(--muted)]/60',
              ].join(' ')}
              style={{ height: 26 }}
              onClick={() => onFileClick(node.id)}
            >
              <FileTypeIcon fileType={node.fileType} size={14} />
              <span className="text-[13px] text-[var(--foreground)] truncate">{node.label}</span>
            </div>
          )
        }

        return null
      })}
    </>
  )
}

export default function NavFileTree({ treeData, activeSlug }: NavFileTreeProps) {
  const router = useRouter()

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('navTreeState') ?? '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    const ancestors = findAncestorIds(treeData, activeSlug)
    if (!ancestors || ancestors.length === 0) return
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
      } catch {
        // ignore
      }
      return next
    })
  // Run only when activeSlug changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug])

  function handleToggleFolder(id: string) {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('navTreeState', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  function handleFileClick(id: string) {
    router.push('/' + id)
  }

  return (
    <div className="py-1 px-1">
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
