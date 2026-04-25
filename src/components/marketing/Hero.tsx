import Link from 'next/link'

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
        The pre-trade decision page for prop firm traders.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--muted-foreground)] sm:text-lg">
        Sourced rules, monitored daily. Labeled opinion from someone who trades all four.
        One page, five seconds.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/firms"
          className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Browse firms
        </Link>
        <Link
          href="/disclosure"
          className="text-sm text-[var(--muted-foreground)] underline-offset-4 hover:underline hover:text-[var(--foreground)]"
        >
          Read the disclosure →
        </Link>
      </div>
    </section>
  )
}
