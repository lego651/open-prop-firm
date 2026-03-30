'use client'

import { useState, useEffect } from 'react'
import TabBar from '@/components/content/TabBar'
import { BreadcrumbBar } from '@/components/content/BreadcrumbBar'
import MarkdownRenderer from '@/components/content/MarkdownRenderer'
import { Skeleton } from '@/components/ui/skeleton'
import { useTabManager } from '@/hooks/useTabManager'
import type { TreeNode, PageContent, ContentApiResponse } from '@/types/content'

type ContentPanelRightProps = {
  treeData: TreeNode[]
}

export default function ContentPanelRight({ treeData }: ContentPanelRightProps) {
  const [compareSlug, setCompareSlug] = useState('firms/cfd/funded-next')
  const { openTabs, activeSlug, closeTab } = useTabManager(
    treeData,
    '/' + compareSlug,
    'compareTab',
    (slug) => setCompareSlug(slug),
  )

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
