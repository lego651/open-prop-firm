'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabase } from '@/lib/supabase/client'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; message: string }

function getErrorMessage(error: { message?: string; status?: number }): string {
  const msg = error.message ?? ''
  if (msg.includes('Password should be at least') || msg.includes('weak_password')) {
    return 'Password is too weak. Use at least 8 characters.'
  }
  if (
    msg.includes('User already registered') ||
    msg.includes('already been registered') ||
    msg.includes('email_exists')
  ) {
    return 'An account with this email already exists. Try signing in.'
  }
  if (msg.includes('Unable to validate email address') || msg.includes('invalid_email')) {
    return 'Please enter a valid email address.'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
    return 'Network error. Please check your connection and try again.'
  }
  return msg || 'Something went wrong. Please try again.'
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ status: 'loading' })

    try {
      const { error } = await getSupabase().auth.signUp({ email, password })
      if (error) {
        setState({ status: 'error', message: getErrorMessage(error) })
      } else {
        setState({ status: 'success' })
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
          Check your email
        </p>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate
          your account.
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
        Create an account
      </h2>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label
            htmlFor="password"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {state.status === 'error' && (
          <p
            role="alert"
            style={{
              fontSize: '0.875rem',
              color: 'var(--destructive)',
              margin: 0,
            }}
          >
            {state.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={state.status === 'loading'}
          className="w-full mt-1"
          size="lg"
        >
          {state.status === 'loading' ? 'Creating account…' : 'Create account'}
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
        Already have an account?{' '}
        <Link
          href="/auth/sign-in"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          Sign in →
        </Link>
      </p>
    </div>
  )
}
