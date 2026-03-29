'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type BreadcrumbBarProps = {
  activeSlug: string
}

const CATEGORY_SEGMENTS = new Set(['cfd', 'futures'])

function formatSegment(segment: string): string {
  if (segment === 'cfd') return 'CFD'
  if (segment === 'futures') return 'Futures'
  if (segment === 'challenges') return 'Challenges'
  return segment
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function BreadcrumbBar({ activeSlug }: BreadcrumbBarProps) {
  const router = useRouter()
  const backStack = useRef<string[]>([])
  const forwardStack = useRef<string[]>([])
  const prevSlug = useRef<string>('')
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  useEffect(() => {
    if (prevSlug.current && prevSlug.current !== activeSlug) {
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

  // Strip leading "firms/" prefix, then split into segments
  const withoutPrefix = activeSlug.startsWith('firms/')
    ? activeSlug.slice('firms/'.length)
    : activeSlug
  const rawSegments = withoutPrefix.split('/')
  const labels = rawSegments.map(formatSegment)

  // Build cumulative paths relative to firms/ for link segments
  // e.g. segments [cfd, funded-next, challenges, 50k]
  // cumulative: firms/cfd, firms/cfd/funded-next, firms/cfd/funded-next/challenges

  return (
    <div className="flex items-center h-9 px-6 border-b border-[var(--border)] gap-1">
      {/* Back button */}
      <button
        onClick={handleBack}
        disabled={!canGoBack}
        aria-label="Go back"
        className={`flex items-center justify-center rounded p-0.5 ${
          !canGoBack
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:text-[var(--foreground)] cursor-pointer'
        }`}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Forward button */}
      <button
        onClick={handleForward}
        disabled={!canGoForward}
        aria-label="Go forward"
        className={`flex items-center justify-center rounded p-0.5 ${
          !canGoForward
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:text-[var(--foreground)] cursor-pointer'
        }`}
      >
        <ChevronRight size={16} />
      </button>

      <span className="mx-2 text-[var(--muted-foreground)]">/</span>

      {labels.map((label, index) => {
        const isLast = index === labels.length - 1
        const rawSegment = rawSegments[index]
        const isCategory = CATEGORY_SEGMENTS.has(rawSegment)

        // Build the cumulative firms/ path up to and including this segment
        const cumulativePath = 'firms/' + rawSegments.slice(0, index + 1).join('/')

        return (
          <span key={cumulativePath} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                size={12}
                className="text-[var(--muted-foreground)]"
              />
            )}

            {isLast ? (
              <span className="text-[13px] text-[var(--foreground)]">
                {label}
              </span>
            ) : isCategory ? (
              <span className="text-[13px] text-[var(--muted-foreground)]">
                {label}
              </span>
            ) : (
              <button
                onClick={() => router.push('/' + cumulativePath)}
                className="text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
              >
                {label}
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
