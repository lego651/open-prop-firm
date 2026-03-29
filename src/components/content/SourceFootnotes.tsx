type SourceFootnotesProps = {
  sources: Array<{ url: string; label: string }>
}

export default function SourceFootnotes({ sources }: SourceFootnotesProps) {
  if (!sources || sources.length === 0) return null

  return (
    <footer className="mt-8">
      <hr className="my-6 border-[var(--border)]" />
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Sources
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {sources.map((source, i) => (
          <li key={i}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ol>
    </footer>
  )
}
