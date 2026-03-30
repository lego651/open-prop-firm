'use client'

import Link from 'next/link'
import { X } from 'lucide-react'

type CompareAuthGateProps = {
  onDismiss: () => void
}

export default function CompareAuthGate({ onDismiss }: CompareAuthGateProps) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3 right-3 rounded p-1 hover:bg-[var(--muted)]"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        Compare two pages side by side
      </h3>
      <p className="text-xs text-[var(--muted-foreground)]">
        Create a free account to unlock the comparison panel — no payment required.
      </p>
      <Link
        href="/auth/sign-up"
        className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-[var(--accent-foreground)] hover:opacity-90"
      >
        Sign up free
      </Link>
      <p className="text-xs text-[var(--muted-foreground)]">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="underline hover:opacity-80">
          Sign in
        </Link>
      </p>
    </div>
  )
}
