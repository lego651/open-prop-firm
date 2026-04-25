import Link from 'next/link'

const FOOTER_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/disclosure', label: 'Disclosure' },
  { href: 'https://github.com/lego651/open-prop-firm', label: 'GitHub', external: true },
] as const

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 text-xs text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Some links are affiliate links —{' '}
          <Link href="/disclosure" className="underline hover:text-[var(--foreground)]">
            see Disclosure
          </Link>
          .
        </p>
        <ul className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              {'external' in link && link.external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--foreground)]"
                >
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className="hover:text-[var(--foreground)]">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
