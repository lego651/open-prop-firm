'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  BookOpen,
  ChevronRight,
  History,
  Info,
  Tag,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppShell } from '@/contexts/AppShellContext'
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

function FileTypeIcon({ fileType, size }: { fileType: string | undefined; size: number }) {
  if (fileType === 'basic-info')
    return <Info size={size} className="shrink-0 text-[var(--muted-foreground)]" />
  if (fileType === 'challenge')
    return <Trophy size={size} className="shrink-0 text-[var(--accent)]" />
  if (fileType === 'rules')
    return <BookOpen size={size} className="shrink-0 text-[var(--foreground)]" />
  if (fileType === 'promo')
    return <Tag size={size} className="shrink-0 text-[var(--file-type-promo)]" />
  if (fileType === 'changelog')
    return <History size={size} className="shrink-0 text-[var(--muted-foreground)]" />
  return null
}

/**
 * Build a flat ordered list of visible navigable node IDs (depth-first).
 * Category nodes are section headers — not focusable, skipped.
 */
function buildVisibleList(nodes: TreeNode[], expanded: Record<string, boolean>): string[] {
  const list: string[] = []
  for (const node of nodes) {
    if (node.nodeRole === 'category') {
      if (node.children) list.push(...buildVisibleList(node.children, expanded))
    } else {
      list.push(node.id)
      if (node.children && expanded[node.id]) {
        list.push(...buildVisibleList(node.children, expanded))
      }
    }
  }
  return list
}

function findParentId(nodes: TreeNode[], targetId: string, parentId: string | null = null): string | null {
  for (const node of nodes) {
    if (node.id === targetId) return parentId
    if (node.children) {
      const found = findParentId(node.children, targetId, node.id)
      if (found !== null) return found
    }
  }
  return null
}

function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

function TreeNodeList({
  nodes,
  expanded,
  activeSlug,
  focusedId,
  nodeRefs,
  onToggleFolder,
  onFileClick,
  onKeyDown,
  depth,
}: {
  nodes: TreeNode[]
  expanded: Record<string, boolean>
  activeSlug: string
  focusedId: string | null
  nodeRefs: React.MutableRefObject<Map<string, HTMLElement>>
  onToggleFolder: (id: string) => void
  onFileClick: (id: string) => void
  onKeyDown: (e: React.KeyboardEvent, nodeId: string) => void
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
                  focusedId={focusedId}
                  nodeRefs={nodeRefs}
                  onToggleFolder={onToggleFolder}
                  onFileClick={onFileClick}
                  onKeyDown={onKeyDown}
                  depth={depth + 1}
                />
              )}
            </div>
          )
        }

        if (node.nodeRole === 'firm' || node.nodeRole === 'challenges-folder') {
          const isExpanded = expanded[node.id] ?? false
          const isFocused = focusedId === node.id
          const indentClass = node.nodeRole === 'challenges-folder' ? 'pl-6' : ''
          return (
            // Outer div wraps the row + children group — semantic container
            <div key={node.id} role="treeitem" aria-expanded={isExpanded} aria-selected={false}>
              {/* The focusable row */}
              <div
                tabIndex={isFocused ? 0 : -1}
                aria-label={`${node.label} folder, ${isExpanded ? 'expanded' : 'collapsed'}`}
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.id, el)
                  else nodeRefs.current.delete(node.id)
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-sm px-3 hover:bg-[var(--muted)]/60',
                  indentClass,
                )}
                style={{ height: 28 }}
                onClick={() => onToggleFolder(node.id)}
                onKeyDown={(e) => onKeyDown(e, node.id)}
              >
                <ChevronRight
                  size={14}
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : '' }}
                />
                <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
                  {node.label}
                </span>
              </div>
              {isExpanded && node.children && (
                <div role="group">
                  <TreeNodeList
                    nodes={node.children}
                    expanded={expanded}
                    activeSlug={activeSlug}
                    focusedId={focusedId}
                    nodeRefs={nodeRefs}
                    onToggleFolder={onToggleFolder}
                    onFileClick={onFileClick}
                    onKeyDown={onKeyDown}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          )
        }

        if (node.nodeRole === 'file') {
          const isActive = node.id === activeSlug
          const isFocused = focusedId === node.id
          const isChallengeChild = depth >= 3
          const indentClass = isChallengeChild ? 'pl-10' : 'pl-6'
          return (
            <div
              key={node.id}
              role="treeitem"
              tabIndex={isFocused ? 0 : -1}
              aria-selected={isActive}
              aria-label={node.label}
              ref={(el) => {
                if (el) nodeRefs.current.set(node.id, el)
                else nodeRefs.current.delete(node.id)
              }}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 rounded-sm',
                indentClass,
                isActive
                  ? 'bg-[var(--nav-active-bg)] font-medium text-[var(--nav-active-fg)]'
                  : 'hover:bg-[var(--muted)]/60',
              )}
              style={{ height: 26 }}
              onClick={() => onFileClick(node.id)}
              onKeyDown={(e) => onKeyDown(e, node.id)}
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

export default function NavFileTree({ treeData, activeSlug }: NavFileTreeProps) {
  const { activePaneId, navigatePane } = useAppShell()
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map())

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({}))
  const [focusedId, setFocusedId] = useState<string | null>(null)

  // Load expanded state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('navTreeState')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setExpanded(JSON.parse(stored))
    } catch {}
  }, [])

  // Auto-expand ancestors of the active file
  useEffect(() => {
    const ancestors = findAncestorIds(treeData, activeSlug)
    if (!ancestors || ancestors.length === 0) return
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

  const handleToggleFolder = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('navTreeState', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const handleFileClick = useCallback(
    (id: string) => {
      navigatePane(activePaneId, id)
    },
    [navigatePane, activePaneId],
  )

  // Memoized visible list — recomputed only when treeData or expanded changes, not on every keypress
  const visibleList = useMemo(
    () => buildVisibleList(treeData, expanded),
    [treeData, expanded],
  )
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, nodeId: string) => {
      const currentIdx = visibleList.indexOf(nodeId)
      const node = findNode(treeData, nodeId)
      const isFolder = node?.nodeRole === 'firm' || node?.nodeRole === 'challenges-folder'
      const isExpanded = expanded[nodeId] ?? false

      const moveFocus = (id: string) => {
        setFocusedId(id)
        requestAnimationFrame(() => {
          nodeRefs.current.get(id)?.focus()
        })
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = visibleList[currentIdx + 1]
          if (next) moveFocus(next)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prev = visibleList[currentIdx - 1]
          if (prev) moveFocus(prev)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (isFolder) {
            if (!isExpanded) {
              handleToggleFolder(nodeId)
            } else {
              const firstChild = visibleList[currentIdx + 1]
              if (firstChild) moveFocus(firstChild)
            }
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (isFolder && isExpanded) {
            handleToggleFolder(nodeId)
          } else {
            const parentId = findParentId(treeData, nodeId)
            if (parentId) moveFocus(parentId)
          }
          break
        }
        case 'Home': {
          e.preventDefault()
          const first = visibleList[0]
          if (first) moveFocus(first)
          break
        }
        case 'End': {
          e.preventDefault()
          const last = visibleList[visibleList.length - 1]
          if (last) moveFocus(last)
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (isFolder) {
            handleToggleFolder(nodeId)
          } else {
            handleFileClick(nodeId)
          }
          break
        }
      }
    },
    [visibleList, treeData, expanded, handleToggleFolder, handleFileClick],
  )

  return (
    <div
      role="tree"
      aria-label="File tree"
      className="px-1 py-1"
    >
      <TreeNodeList
        nodes={treeData}
        expanded={expanded}
        activeSlug={activeSlug}
        focusedId={focusedId}
        nodeRefs={nodeRefs}
        onToggleFolder={handleToggleFolder}
        onFileClick={handleFileClick}
        onKeyDown={handleKeyDown}
        depth={0}
      />
    </div>
  )
}
