import Link from 'next/link'
import { DEFAULT_FIRM_SLUG } from '@/lib/constants'

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Page not found</h2>
      <p className="text-sm text-[var(--muted-foreground)]">
        This page doesn&apos;t exist or the content has been moved.
      </p>
      <Link
        href={'/' + DEFAULT_FIRM_SLUG}
        className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
      >
        Go to homepage
      </Link>
    </div>
  )
}
