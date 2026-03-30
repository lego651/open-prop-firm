'use client'

import { useState, useEffect } from 'react'
import TabBar from '@/components/content/TabBar'
import { BreadcrumbBar } from '@/components/content/BreadcrumbBar'
import MarkdownRenderer from '@/components/content/MarkdownRenderer'
import { Skeleton } from '@/components/ui/skeleton'
import { useTabManager } from '@/hooks/useTabManager'
import { useAppShell } from '@/contexts/AppShellContext'
import { DEFAULT_FIRM_SLUG } from '@/lib/constants'
import type { PageContent, ContentApiResponse } from '@/types/content'

type ContentPanelRightProps = {
  externalSlug?: string | null
}

export default function ContentPanelRight({ externalSlug }: ContentPanelRightProps) {
  const { treeData } = useAppShell()
  const [compareSlug, setCompareSlug] = useState(DEFAULT_FIRM_SLUG)
  const { openTabs, activeSlug, closeTab } = useTabManager(
    treeData,
    '/' + compareSlug,
    'compareTab',
    (slug) => setCompareSlug(slug),
  )

  useEffect(() => {
    if (externalSlug) {
      // externalSlug is a one-way override: when the user cmd+clicks a graph node,
      // it sets the slug here. After that, compareSlug advances independently via
      // tab interactions. The invariant: external takes precedence when set, then
      // local navigation takes over.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompareSlug(externalSlug)
    }
  }, [externalSlug])

  const [content, setContent] = useState<PageContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!compareSlug) return
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setContent(null)
    setError(null)
    fetch('/api/content/' + compareSlug, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: ContentApiResponse) => {
        if (data.ok) {
          setContent(data.data)
        } else {
          setError(data.error)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError('Failed to load content. Please check your connection.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [compareSlug])

  return (
    <div className="flex h-full flex-col">
      <TabBar
        openTabs={openTabs}
        activeSlug={activeSlug}
        onTabClick={(slug) => setCompareSlug(slug)}
        onTabClose={closeTab}
        onTogglePanel3={undefined}
      />
      <BreadcrumbBar activeSlug={activeSlug} />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <>
            <Skeleton className="mb-4 h-6 w-3/4" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </>
        ) : error ? (
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
        ) : content ? (
          <MarkdownRenderer htmlContent={content.htmlContent} />
        ) : null}
      </div>
    </div>
  )
}
