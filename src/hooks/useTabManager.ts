'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { TreeNode, TabEntry } from '@/types/content'
import { useLocalStorage } from './useLocalStorage'
import { DEFAULT_FIRM_SLUG } from '@/lib/constants'

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

  // Ref always holds the latest activeSlug — prevents stale closure in closeTab.
  const activeSlugRef = useRef(activeSlug)
  useEffect(() => {
    activeSlugRef.current = activeSlug
  })

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

  // closeTab uses a functional updater so it never reads openTabs or activeSlug
  // from a stale closure. activeSlugRef.current is always current.
  const closeTab = useCallback(
    (slug: string) => {
      const currentSlug = activeSlugRef.current
      // Compute the navigation target inside the updater (runs synchronously),
      // then navigate outside — keeps the updater pure (no side effects).
      let nextSlug: string | null = null
      setOpenTabs((prev) => {
        const idx = prev.findIndex((t) => t.slug === slug)
        const newTabs = prev.filter((t) => t.slug !== slug)
        if (currentSlug === slug) {
          const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
          nextSlug = next ? next.slug : DEFAULT_FIRM_SLUG
        }
        return newTabs
      })
      if (nextSlug) {
        if (onNavigate) {
          onNavigate(nextSlug)
        } else {
          router.push('/' + nextSlug)
        }
      }
    },
    [setOpenTabs, router, onNavigate],
  )

  return { openTabs, activeSlug, closeTab }
}
