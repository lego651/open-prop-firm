'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'

/**
 * Returns the currently authenticated Supabase user, or null if not logged in.
 * Listens for auth state changes and updates reactively.
 */
export function useSupabaseUser(): User | null {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return user
}
