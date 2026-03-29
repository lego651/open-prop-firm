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

export function useTabManager(treeData: TreeNode[], pathname: string) {
  const router = useRouter()
  const [openTabs, setOpenTabs] = useLocalStorage<TabEntry[]>('openTabs', [])
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
        router.push(next ? '/' + next.slug : '/firms/cfd/funded-next')
      }
    },
    [openTabs, activeSlug, router, setOpenTabs],
  )

  return { openTabs, activeSlug, closeTab }
}
