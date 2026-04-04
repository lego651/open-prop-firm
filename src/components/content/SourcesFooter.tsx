'use client'

import { useState } from 'react'
import type { SourceEntry } from '@/types/content'

type SourcesFooterProps = {
  sources: SourceEntry[]
  onOpen?: () => void
}

function FaviconDot({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  let hostname = ''
  try {
    hostname = new URL(url).hostname
  } catch {
    // invalid URL — skip favicon
  }

  if (!hostname || failed) {
    return (
      <span className="inline-block size-4 rounded-full bg-[var(--muted)] ring-1 ring-[var(--border)]" />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
      alt=""
      aria-hidden="true"
      width={16}
      height={16}
      className="size-4 rounded-sm object-contain"
      onError={() => setFailed(true)}
    />
  )
}

export default function SourcesFooter({ sources, onOpen }: SourcesFooterProps) {
  if (!sources || sources.length === 0) return null

  const count = sources.length
  const label = count === 1 ? '1 source' : `${count} sources`

  // Show at most 5 favicons to avoid overflow
  const visible = sources.slice(0, 5)

  return (
    <div className="mx-auto mt-10 max-w-3xl px-6">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--interactive-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={`View ${label}`}
      >
        {/* Favicon stack */}
        <div className="flex items-center -space-x-1">
          {visible.map((source, i) => (
            <span
              key={i}
              className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--background)] ring-1 ring-[var(--border)]"
            >
              <FaviconDot url={source.url} />
            </span>
          ))}
          {count > 5 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--muted)] text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-[var(--border)]">
              +{count - 5}
            </span>
          )}
        </div>

        {/* Label */}
        <span className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </span>

        {/* Right arrow hint */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="ml-auto size-3.5 text-[var(--muted-foreground)]"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L9.19 8 6.22 5.03a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
}
