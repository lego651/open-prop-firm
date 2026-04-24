interface MissingDecisionPlaceholderProps {
  firmName: string
}

/**
 * Defensive placeholder for a firm whose basic-info doesn't yet have a
 * decision block. All 4 v1 launch firms have decision blocks (enforced
 * by scripts/validate-content.ts), so this renders only for future
 * firms added before their opinion layer is authored.
 */
export function MissingDecisionPlaceholder({ firmName }: MissingDecisionPlaceholderProps) {
  return (
    <section
      aria-label="Decision layer pending"
      className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]"
    >
      Full decision layer coming for <span className="text-[var(--foreground)]">{firmName}</span>{' '}
      — see rules below.
    </section>
  )
}
