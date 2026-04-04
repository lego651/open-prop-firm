'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { TreeNode, TabEntry, PaneEntry, SourceEntry } from '@/types/content'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useViewport } from '@/hooks/useViewport'
import { useSupabaseUser } from '@/hooks/useSupabaseUser'
import { useTabManager } from '@/hooks/useTabManager'

type AppShellContextValue = {
  // Navigation
  activeSlug: string
  navigateTo: (slug: string) => void

  // Tabs (main panel)
  openTabs: TabEntry[]
  closeTab: (slug: string) => void

  // Panel 1 mobile overlay
  panel1OverlayOpen: boolean
  setPanel1OverlayOpen: (open: boolean) => void

  // Panes (Obsidian-style split panes)
  panes: PaneEntry[]
  activePaneId: string
  openPane: (slug: string | null) => void
  closePane: (id: string) => void
  setActivePane: (id: string) => void
  bringPaneForward: (id: string) => void
  navigatePane: (paneId: string, slug: string) => void
  goBackPane: (paneId: string) => void
  goForwardPane: (paneId: string) => void

  // Panel 3
  panel3Mode: 'graph' | 'compare' | 'sources'
  setPanel3Mode: (mode: 'graph' | 'compare' | 'sources') => void
  panel3Visible: boolean
  setPanel3Visible: (visible: boolean) => void
  compareSlug: string | null
  openInPanel3: (slug: string) => void
  sourcesEntries: SourceEntry[]
  openSourcesPanel: (sources: SourceEntry[]) => void
  focusedSourceIndex: number | null
  focusSource: (index: number) => void

  // Auth
  user: User | null
  authLoading: boolean

  // Layout
  viewportWidth: number
  treeData: TreeNode[]
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext)
  if (!ctx) throw new Error('useAppShell must be used within AppShellProvider')
  return ctx
}

type AppShellProviderProps = {
  treeData: TreeNode[]
  children: React.ReactNode
}

const MAX_PANE_HISTORY = 100

export function AppShellProvider({ treeData, children }: AppShellProviderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const viewportWidth = useViewport()
  const { user, loading: authLoading } = useSupabaseUser()
  const { openTabs, activeSlug, closeTab } = useTabManager(treeData, pathname)

  // Pane state — data model only, no UI changes.
  // The inline object literal is the SSR fallback; useLocalStorage/useState only reads
  // it once (on the first render). localStorage will override it on mount.
  const [panes, setPanes] = useLocalStorage<PaneEntry[]>('panes', [{
    id: 'pane-default',
    slug: activeSlug || null,
    title: 'Home',
    history: activeSlug ? [activeSlug] : [],
    historyIndex: activeSlug ? 0 : -1,
  }])
  const [activePaneId, setActivePaneId] = useLocalStorage<string>('activePaneId', 'pane-default')

  const openPane = useCallback((slug: string | null) => {
    const id = crypto.randomUUID()
    const title = slug ? slug.split('/').pop() ?? 'Untitled' : 'Empty'
    const newPane: PaneEntry = {
      id,
      slug,
      title,
      history: slug ? [slug] : [],
      historyIndex: slug ? 0 : -1,
    }
    setPanes((prev) => [...prev, newPane])
    setActivePaneId(id)
  }, [setPanes, setActivePaneId])

  const closePane = useCallback((id: string) => {
    setPanes((prev) => {
      // Never close the last pane
      if (prev.length <= 1) return prev
      const next = prev.filter((p) => p.id !== id)
      // If closing the active pane, activate an adjacent one
      setActivePaneId((prevId) =>
        prevId === id ? (next[0]?.id ?? prevId) : prevId
      )
      return next
    })
  }, [setPanes, setActivePaneId])

  const setActivePane = useCallback((id: string) => {
    setActivePaneId(id)
  }, [setActivePaneId])

  /**
   * Move a pane to the rightmost expanded position (end of array)
   * and make it active. Used when clicking a collapsed title strip.
   */
  const bringPaneForward = useCallback((id: string) => {
    setPanes((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx === -1 || idx === prev.length - 1) return prev
      const pane = prev[idx]
      const rest = prev.filter((p) => p.id !== id)
      return [...rest, pane]
    })
    setActivePaneId(id)
  }, [setPanes, setActivePaneId])

  /**
   * Navigate a specific pane to a new slug.
   * - Pushes the new slug onto that pane's history stack (truncating any forward entries).
   * - If the pane is the active pane, also syncs the Next.js router URL.
   * - Inactive panes navigate silently (local state only).
   */
  const navigatePane = useCallback((paneId: string, slug: string) => {
    setPanes((prev) =>
      prev.map((pane) => {
        if (pane.id !== paneId) return pane

        // Truncate any forward history beyond the current index.
        const base = pane.history.slice(0, pane.historyIndex + 1)
        // Guard against duplicate consecutive entries.
        if (base[base.length - 1] === slug) return pane

        const newHistory = [...base, slug].slice(-MAX_PANE_HISTORY)
        const newIndex = newHistory.length - 1
        const title = slug.split('/').pop() ?? 'Untitled'
        return { ...pane, slug, title, history: newHistory, historyIndex: newIndex }
      })
    )
    // Sync the Next.js router only when navigating the active pane.
    if (activePaneId === paneId) {
      router.push('/' + slug)
    }
  }, [activePaneId, setPanes, router])

  /**
   * Navigate back in a specific pane's history.
   * All pane reads happen inside the setPanes updater to avoid stale closures.
   * Only the active pane syncs with the Next.js router.
   */
  const goBackPane = useCallback((paneId: string) => {
    let routerTarget: string | null = null
    setPanes((prev) => {
      const pane = prev.find((p) => p.id === paneId)
      if (!pane || pane.historyIndex <= 0) return prev
      const newIndex = pane.historyIndex - 1
      const targetSlug = pane.history[newIndex]
      const title = targetSlug.split('/').pop() ?? 'Untitled'
      if (activePaneId === paneId) routerTarget = targetSlug
      return prev.map((p) =>
        p.id !== paneId ? p : { ...p, slug: targetSlug, title, historyIndex: newIndex }
      )
    })
    if (routerTarget) router.push('/' + routerTarget)
  }, [activePaneId, setPanes, router])

  /**
   * Navigate forward in a specific pane's history.
   * All pane reads happen inside the setPanes updater to avoid stale closures.
   * Only the active pane syncs with the Next.js router.
   */
  const goForwardPane = useCallback((paneId: string) => {
    let routerTarget: string | null = null
    setPanes((prev) => {
      const pane = prev.find((p) => p.id === paneId)
      if (!pane || pane.historyIndex >= pane.history.length - 1) return prev
      const newIndex = pane.historyIndex + 1
      const targetSlug = pane.history[newIndex]
      const title = targetSlug.split('/').pop() ?? 'Untitled'
      if (activePaneId === paneId) routerTarget = targetSlug
      return prev.map((p) =>
        p.id !== paneId ? p : { ...p, slug: targetSlug, title, historyIndex: newIndex }
      )
    })
    if (routerTarget) router.push('/' + routerTarget)
  }, [activePaneId, setPanes, router])

  const [panel3Mode, setPanel3Mode] = useState<'graph' | 'compare' | 'sources'>('graph')
  const [panel3Visible, setPanel3Visible] = useState(false)
  const [panel1OverlayOpen, setPanel1OverlayOpen] = useState(false)
  const [compareSlug, setCompareSlug] = useState<string | null>(null)
  const [sourcesEntries, setSourcesEntries] = useState<SourceEntry[]>([])
  const [focusedSourceIndex, setFocusedSourceIndex] = useState<number | null>(null)

  const navigateTo = useCallback((slug: string) => {
    router.push('/' + slug)
  }, [router])

  const openInPanel3 = useCallback((slug: string) => {
    setCompareSlug(slug)
    setPanel3Mode('compare')
    setPanel3Visible(true)
  }, [setPanel3Mode])

  const openSourcesPanel = useCallback((sources: SourceEntry[]) => {
    setSourcesEntries(sources)
    setFocusedSourceIndex(null)
    setPanel3Mode('sources')
    setPanel3Visible(true)
  }, [setPanel3Mode])

  const focusSource = useCallback((index: number) => {
    setFocusedSourceIndex(index)
  }, [])

  const value: AppShellContextValue = {
    activeSlug,
    navigateTo,
    openTabs,
    closeTab,
    panes,
    activePaneId,
    openPane,
    closePane,
    setActivePane,
    bringPaneForward,
    navigatePane,
    goBackPane,
    goForwardPane,
    panel1OverlayOpen,
    setPanel1OverlayOpen,
    panel3Mode,
    setPanel3Mode,
    panel3Visible,
    setPanel3Visible,
    compareSlug,
    openInPanel3,
    sourcesEntries,
    openSourcesPanel,
    focusedSourceIndex,
    focusSource,
    user,
    authLoading,
    viewportWidth,
    treeData,
  }

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  )
}
