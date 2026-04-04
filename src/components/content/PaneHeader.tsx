'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useAppShell } from '@/contexts/AppShellContext'

const MAX_HISTORY = 100
const CATEGORY_SEGMENTS = new Set(['cfd', 'futures'])

function formatSegment(segment: string): string {
  if (segment === 'cfd') return 'CFD'
  if (segment === 'futures') return 'Futures'
  if (segment === 'challenges') return 'Challenges'
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type PaneHeaderProps = {
  paneId: string
  activeSlug: string
}

export function PaneHeader({ paneId, activeSlug }: PaneHeaderProps) {
  const router = useRouter()
  const { closePane } = useAppShell()

  const backStack = useRef<string[]>([])
  const forwardStack = useRef<string[]>([])
  const prevSlug = useRef<string>('')
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  useEffect(() => {
    if (prevSlug.current && prevSlug.current !== activeSlug) {
      if (backStack.current.length >= MAX_HISTORY) {
        backStack.current.shift()
      }
      backStack.current.push(prevSlug.current)
      forwardStack.current = []
      setCanGoBack(backStack.current.length > 0)
      setCanGoForward(false)
    }
    prevSlug.current = activeSlug
  }, [activeSlug])

  function handleBack() {
    const slug = backStack.current.pop()
    if (!slug) return
    forwardStack.current.push(activeSlug)
    setCanGoForward(true)
    setCanGoBack(backStack.current.length > 0)
    router.push('/' + slug)
  }

  function handleForward() {
    const slug = forwardStack.current.pop()
    if (!slug) return
    backStack.current.push(activeSlug)
    setCanGoBack(true)
    setCanGoForward(forwardStack.current.length > 0)
    router.push('/' + slug)
  }

  function handleClose() {
    closePane(paneId)
  }

  const withoutPrefix = activeSlug.startsWith('firms/')
    ? activeSlug.slice('firms/'.length)
    : activeSlug
  const rawSegments = withoutPrefix.split('/')
  const labels = rawSegments.map(formatSegment)

  return (
    <div className="flex h-9 items-center gap-1 border-b border-[var(--border)] px-2">
      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close pane"
        className="flex items-center justify-center rounded p-0.5 cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <X size={14} />
      </button>

      <span className="text-[var(--border)] select-none px-0.5">|</span>

      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        disabled={!canGoBack}
        aria-label="Go back"
        className={cn(
          'flex items-center justify-center rounded p-0.5',
          !canGoBack
            ? 'cursor-not-allowed opacity-30'
            : 'cursor-pointer hover:text-[var(--foreground)]',
        )}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Forward button */}
      <button
        type="button"
        onClick={handleForward}
        disabled={!canGoForward}
        aria-label="Go forward"
        className={cn(
          'flex items-center justify-center rounded p-0.5',
          !canGoForward
            ? 'cursor-not-allowed opacity-30'
            : 'cursor-pointer hover:text-[var(--foreground)]',
        )}
      >
        <ChevronRight size={16} />
      </button>

      {/* File icon */}
      <FileText
        size={14}
        className="shrink-0 text-[var(--muted-foreground)]"
        aria-hidden="true"
      />

      {/* Breadcrumb path */}
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap gap-1">
          {labels.map((label, index) => {
            const isLast = index === labels.length - 1
            const rawSegment = rawSegments[index]
            const isCategory = CATEGORY_SEGMENTS.has(rawSegment)
            const cumulativePath =
              'firms/' + rawSegments.slice(0, index + 1).join('/')

            return (
              <BreadcrumbItem key={cumulativePath} className="gap-1">
                {index > 0 && <BreadcrumbSeparator />}
                {isLast || isCategory ? (
                  <BreadcrumbPage
                    className={cn(
                      'text-[13px]',
                      isLast
                        ? 'text-[var(--foreground)]'
                        : 'text-[var(--muted-foreground)]',
                    )}
                  >
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push('/' + cumulativePath)}
                    className="cursor-pointer text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {label}
                  </button>
                )}
              </BreadcrumbItem>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
