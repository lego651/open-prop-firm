'use client'

import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type CompareAuthGateProps = {
  onDismiss: () => void
}

export default function CompareAuthGate({ onDismiss }: CompareAuthGateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded hover:bg-[var(--muted)]"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        Compare two pages side by side
      </h3>
      <p className="text-xs text-[var(--muted-foreground)]">
        Sign in with Google to unlock the comparison panel
      </p>
      <button
        onClick={() =>
          supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
          })
        }
        className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.68 3.68 0 0 1-1.6 2.42v2h2.58c1.51-1.39 2.4-3.44 2.4-5.88z" fill="#4285F4"/>
          <path d="M8 16c2.16 0 3.97-.71 5.3-1.94l-2.58-2a5.01 5.01 0 0 1-2.72.74c-2.09 0-3.86-1.41-4.5-3.31H.85v2.07A8 8 0 0 0 8 16z" fill="#34A853"/>
          <path d="M3.5 9.49A4.78 4.78 0 0 1 3.25 8c0-.52.09-1.02.25-1.49V4.44H.85A8 8 0 0 0 0 8c0 1.29.31 2.5.85 3.56l2.65-2.07z" fill="#FBBC05"/>
          <path d="M8 3.18c1.18 0 2.23.4 3.06 1.2l2.3-2.3A7.95 7.95 0 0 0 8 0 8 8 0 0 0 .85 4.44L3.5 6.51C4.14 4.61 5.91 3.18 8 3.18z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  )
}
