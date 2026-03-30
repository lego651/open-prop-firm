'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { TreeNode, TabEntry } from '@/types/content'
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
