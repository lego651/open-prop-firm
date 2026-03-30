'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabase } from '@/lib/supabase/client'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string }

function getErrorMessage(error: { message?: string }): string {
  const msg = error.message ?? ''
  if (msg.includes('Password should be at least') || msg.includes('weak_password')) {
    return 'Password is too weak. Use at least 8 characters.'
  }
  if (msg.includes('Auth session missing') || msg.includes('session_not_found')) {
    return 'Reset link has expired or is invalid. Please request a new one.'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
    return 'Network error. Please check your connection and try again.'
  }
  return msg || 'Could not update password. Please try again.'
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const [state, setState] = useState<State>({ status: 'idle' })

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setPasswordMismatch(true)
      return
    }
    setState({ status: 'loading' })

    try {
      const { error } = await getSupabase().auth.updateUser({ password })
      if (error) {
        setState({ status: 'error', message: getErrorMessage(error) })
      } else {
        setState({ status: 'success' })
        setTimeout(() => router.push('/'), 2000)
      }
    } catch (err) {
      setState({
        status: 'error',
        message: getErrorMessage(err instanceof Error ? err : {}),
      })
    }
  }

  if (state.status === 'success') {
    return (
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '2rem',
          backgroundColor: 'var(--sidebar-bg)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Password updated
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Your password has been changed. Redirecting you…
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '2rem',
        backgroundColor: 'var(--sidebar-bg)',
      }}
    >
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          color: 'var(--foreground)',
        }}
      >
        Set new password
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label
            htmlFor="password"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}
          >
            New password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordMismatch(false) }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label
            htmlFor="confirm-password"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}
          >
            Confirm new password
          </label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Repeat your new password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMismatch(false) }}
          />
          {passwordMismatch && (
            <p role="alert" style={{ fontSize: '0.875rem', color: 'var(--destructive)', margin: 0 }}>
              Passwords do not match.
            </p>
          )}
        </div>

        {state.status === 'error' && (
          <p role="alert" style={{ fontSize: '0.875rem', color: 'var(--destructive)', margin: 0 }}>
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={state.status === 'loading'} className="w-full mt-1" size="lg">
          {state.status === 'loading' ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
