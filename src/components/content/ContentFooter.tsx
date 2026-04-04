import Link from 'next/link'

export default function ContentFooter() {
  return (
    <footer className="mx-auto max-w-3xl border-t border-[var(--border)] px-6 py-4 text-[11px] text-[var(--muted-foreground)]">
      <div className="flex items-center gap-3">
        <Link
          href="/legal/terms-of-service"
          className="hover:text-[var(--foreground)]"
        >
          Terms
        </Link>
        <Link
          href="/legal/disclaimer"
          className="hover:text-[var(--foreground)]"
        >
          Disclaimer
        </Link>
      </div>
    </footer>
  )
}
