'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TreeNode, TabEntry } from '@/types/content'
import { useLocalStorage } from './useLocalStorage'

function findLabelInTree(nodes: TreeNode[], slug: string): string | null {
  for (const node of nodes) {
    if (node.id === slug) return node.label
    if (node.children) {
      const found = findLabelInTree(node.children, slug)
      if (found) return found
    }
  }
  return null
}

/**
 * storageKey — localStorage key for this tab list.
 * Default: 'openTabs' (main panel).
 * Compare panel uses 'compareTab' to maintain an independent tab.
 *
 * onNavigate — optional callback for navigation after closing the active tab.
 * Main panel omits this and uses router.push. Compare panel passes setCompareSlug
 * so closing a tab does NOT change the URL or main panel content.
 */
export function useTabManager(
  treeData: TreeNode[],
  pathname: string,
  storageKey = 'openTabs',
  onNavigate?: (slug: string) => void,
) {
  const router = useRouter()
  const [openTabs, setOpenTabs] = useLocalStorage<TabEntry[]>(storageKey, [])
  const activeSlug = pathname.replace(/^\//, '')

  // Open a tab for the current route when it changes. Uses functional updater
  // so openTabs is never read directly — no stale closure risk.
  useEffect(() => {
    const slug = pathname.replace(/^\//, '')
    if (!slug.startsWith('firms/')) return
    setOpenTabs((prev) => {
      const exists = prev.some((t) => t.slug === slug)
      if (exists) return prev
      const label =
        findLabelInTree(treeData, slug) ?? slug.split('/').pop() ?? slug
      return [...prev, { slug, title: label }]
    })
  }, [pathname, treeData, setOpenTabs])

  const closeTab = useCallback(
    (slug: string) => {
      const idx = openTabs.findIndex((t) => t.slug === slug)
      const newTabs = openTabs.filter((t) => t.slug !== slug)
      setOpenTabs(newTabs)
      if (activeSlug === slug) {
        const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
        const nextSlug = next ? next.slug : 'firms/cfd/funded-next'
        if (onNavigate) {
          onNavigate(nextSlug)
        } else {
          router.push('/' + nextSlug)
        }
      }
    },
    [openTabs, activeSlug, router, setOpenTabs, onNavigate],
  )

  return { openTabs, activeSlug, closeTab }
}
