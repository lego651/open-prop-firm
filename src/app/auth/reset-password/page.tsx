'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabase } from '@/lib/supabase/client'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'sent' }
  | { status: 'error'; message: string }

function getErrorMessage(error: { message?: string }): string {
  const msg = error.message ?? ''
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
    return 'Network error. Please check your connection and try again.'
  }
  if (msg.includes('User not found') || msg.includes('user_not_found')) {
    return 'No account found with that email.'
  }
  return msg || 'Could not send reset email. Please try again.'
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ status: 'loading' })

    try {
      const redirectTo =
        window.location.origin + '/auth/callback?next=' + encodeURIComponent('/auth/update-password')
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo })
      if (error) {
        setState({ status: 'error', message: getErrorMessage(error) })
      } else {
        setState({ status: 'sent' })
      }
    } catch (err) {
      setState({
        status: 'error',
        message: getErrorMessage(err instanceof Error ? err : {}),
      })
    }
  }

  if (state.status === 'sent') {
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
          Check your email
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          We sent a password reset link to <strong>{email}</strong>. Click it to set a new password.
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
          marginBottom: '0.5rem',
          color: 'var(--foreground)',
        }}
      >
        Reset your password
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label
            htmlFor="email"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {state.status === 'error' && (
          <p role="alert" style={{ fontSize: '0.875rem', color: 'var(--destructive)', margin: 0 }}>
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={state.status === 'loading'} className="w-full mt-1" size="lg">
          {state.status === 'loading' ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p
        style={{
          marginTop: '1.25rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--muted-foreground)',
        }}
      >
        <Link
          href="/auth/sign-in"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          ← Back to sign in
        </Link>
      </p>
    </div>
  )
}
