'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { TreeNode, TabEntry, PaneEntry } from '@/types/content'
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

  // Panel 3
  panel3Mode: 'graph' | 'compare'
  setPanel3Mode: (mode: 'graph' | 'compare') => void
  panel3Visible: boolean
  setPanel3Visible: (visible: boolean) => void
  compareSlug: string | null
  openInPanel3: (slug: string) => void

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

export function AppShellProvider({ treeData, children }: AppShellProviderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const viewportWidth = useViewport()
  const { user, loading: authLoading } = useSupabaseUser()
  const { openTabs, activeSlug, closeTab } = useTabManager(treeData, pathname)

  // Pane state — data model only, no UI changes
  const defaultPane: PaneEntry = useMemo(() => ({
    id: 'pane-default',
    slug: activeSlug || null,
    title: 'Home',
    isCollapsed: false,
  }), []) // intentionally empty deps — only used as initial value

  const [panes, setPanes] = useLocalStorage<PaneEntry[]>('panes', [defaultPane])
  const [activePaneId, setActivePaneId] = useLocalStorage<string>('activePaneId', 'pane-default')

  const openPane = useCallback((slug: string | null) => {
    const id = `pane-${Date.now()}`
    const title = slug ? slug.split('/').pop() ?? 'Untitled' : 'Empty'
    const newPane: PaneEntry = { id, slug, title, isCollapsed: false }
    setPanes((prev) => [...prev, newPane])
    setActivePaneId(id)
  }, [setPanes, setActivePaneId])

  const closePane = useCallback((id: string) => {
    setPanes((prev) => {
      // Never close the last pane
      if (prev.length <= 1) return prev
      return prev.filter((p) => p.id !== id)
    })
    // If closing the active pane, activate an adjacent one
    setActivePaneId((prevId) => {
      if (prevId !== id) return prevId
      return panes.length > 1
        ? (panes.find((p) => p.id !== id)?.id ?? panes[0].id)
        : prevId
    })
  }, [setPanes, setActivePaneId, panes])

  const setActivePane = useCallback((id: string) => {
    setActivePaneId(id)
  }, [setActivePaneId])

  const [panel3Mode, setPanel3Mode] = useLocalStorage<'graph' | 'compare'>('panel3Mode', 'graph')
  const [panel3Visible, setPanel3Visible] = useState(false)
  const [panel1OverlayOpen, setPanel1OverlayOpen] = useState(false)
  const [compareSlug, setCompareSlug] = useState<string | null>(null)

  const navigateTo = useCallback((slug: string) => {
    router.push('/' + slug)
  }, [router])

  const openInPanel3 = useCallback((slug: string) => {
    setCompareSlug(slug)
    setPanel3Mode('compare')
    setPanel3Visible(true)
  }, [setPanel3Mode])

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
    panel1OverlayOpen,
    setPanel1OverlayOpen,
    panel3Mode,
    setPanel3Mode,
    panel3Visible,
    setPanel3Visible,
    compareSlug,
    openInPanel3,
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
