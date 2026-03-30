'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User as UserIcon } from 'lucide-react'
import { useAppShell } from '@/contexts/AppShellContext'
import { getSupabase } from '@/lib/supabase/client'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type AuthButtonProps = {
  collapsed?: boolean
}

export function AuthButton({ collapsed = false }: AuthButtonProps) {
  const { user, authLoading } = useAppShell()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError(false)
    const { error } = await getSupabase().auth.signOut()
    if (error) {
      setSignOutError(true)
    }
    setSigningOut(false)
  }

  // Loading skeleton
  if (authLoading) {
    if (collapsed) {
      return (
        <div className="size-6 animate-pulse rounded-full bg-[var(--muted)]" />
      )
    }
    return (
      <div className="h-5 w-14 animate-pulse rounded-full bg-[var(--muted)]" />
    )
  }

  // Logged out
  if (!user) {
    if (collapsed) {
      return (
        <Link
          href="/auth/sign-in"
          aria-label="Sign in"
          className="flex size-6 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <UserIcon size={14} />
        </Link>
      )
    }
    return (
      <Link
        href="/auth/sign-in"
        className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        Sign in
      </Link>
    )
  }

  // Logged in — derive display initial
  const email = user.email ?? ''
  const initial = (user.user_metadata?.full_name as string | undefined)
    ?.charAt(0)
    ?.toUpperCase() ?? email.charAt(0).toUpperCase()

  const avatar = (
    <button
      type="button"
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-[11px] font-medium leading-none"
      aria-label="Account menu"
    >
      {initial}
    </button>
  )

  return (
    <Popover>
      <PopoverTrigger render={avatar} />
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-auto min-w-[160px] p-1"
      >
        {/* Email — non-interactive, muted */}
        <div className="max-w-[160px] truncate px-2 py-1.5 text-[11px] text-[var(--muted-foreground)]">
          {email}
        </div>

        {/* Divider */}
        <div className="my-1 h-px bg-[var(--border)]" />

        {/* Sign out */}
        {signOutError && (
          <p className="px-2 py-1 text-[11px] text-[var(--destructive)]">Sign out failed</p>
        )}
        <button
          type="button"
          disabled={signingOut}
          className="w-full rounded px-2 py-1.5 text-left text-[12px] text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
          onClick={handleSignOut}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </PopoverContent>
    </Popover>
  )
}
