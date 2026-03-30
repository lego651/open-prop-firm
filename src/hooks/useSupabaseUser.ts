'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'

/**
 * Returns the currently authenticated Supabase user and loading state.
 * loading is true until the initial session check resolves.
 * Listens for auth state changes and updates reactively.
 */
export function useSupabaseUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    // onAuthStateChange fires immediately with INITIAL_SESSION — no need for getSession()
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
