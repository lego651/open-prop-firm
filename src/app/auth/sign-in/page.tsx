'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabase } from '@/lib/supabase/client'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'magic_sent' }
  | { status: 'error'; message: string }

function getPasswordErrorMessage(error: { message?: string }): string {
  const msg = error.message ?? ''
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Incorrect email or password.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (msg.includes('User not found') || msg.includes('user_not_found')) {
    return 'No account found with that email.'
  }
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
    return 'Network error. Please check your connection and try again.'
  }
  return msg || 'Sign in failed. Please try again.'
}

function getMagicLinkErrorMessage(error: { message?: string }): string {
  const msg = error.message ?? ''
  if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
    return 'Network error. Please check your connection and try again.'
  }
  return msg || 'Could not send magic link. Please try again.'
}

function SignInPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')
  const next = searchParams.get('next') ?? '/'

  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>(
    callbackError === 'callback_failed'
      ? { status: 'error', message: 'Sign-in link expired or invalid. Please try again.' }
      : { status: 'idle' }
  )

  function switchMode(newMode: 'password' | 'magic') {
    setMode(newMode)
    setState({ status: 'idle' })
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ status: 'loading' })

    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) {
        setState({ status: 'error', message: getPasswordErrorMessage(error) })
      } else {
        router.push(next)
      }
    } catch (err) {
      setState({
        status: 'error',
        message: getPasswordErrorMessage(err instanceof Error ? err : {}),
      })
    }
  }

  async function handleMagicLinkSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState({ status: 'loading' })

    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(next),
        },
      })
      if (error) {
        setState({ status: 'error', message: getMagicLinkErrorMessage(error) })
      } else {
        setState({ status: 'magic_sent' })
      }
    } catch (err) {
      setState({
        status: 'error',
        message: getMagicLinkErrorMessage(err instanceof Error ? err : {}),
      })
    }
  }

  const isLoading = state.status === 'loading'

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '2rem',
        backgroundColor: 'var(--sidebar-bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
          Sign in
        </h2>
        <button
          type="button"
          onClick={() => switchMode(mode === 'password' ? 'magic' : 'password')}
          style={{
            fontSize: '0.8rem',
            color: 'var(--accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontWeight: 500,
          }}
        >
          {mode === 'password' ? 'Use magic link' : 'Use password instead'}
        </button>
      </div>

      {state.status === 'magic_sent' ? (
        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Check your email
          </p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            We sent a sign-in link to <strong>{email}</strong>.
          </p>
        </div>
      ) : mode === 'password' ? (
        <form
          onSubmit={handlePasswordSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
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
              placeholder="Your password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {state.status === 'error' && (
            <p role="alert" style={{ fontSize: '0.875rem', color: 'var(--destructive)', margin: 0 }}>
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={isLoading} className="w-full mt-1" size="lg">
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleMagicLinkSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label
              htmlFor="email-magic"
              style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}
            >
              Email
            </label>
            <Input
              id="email-magic"
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

          <Button type="submit" disabled={isLoading} className="w-full mt-1" size="lg">
            {isLoading ? 'Sending…' : 'Send magic link'}
          </Button>
        </form>
      )}

      <p
        style={{
          marginTop: '1.25rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--muted-foreground)',
        }}
      >
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/sign-up"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          Sign up →
        </Link>
      </p>
    </div>
  )
}

import { Suspense } from 'react'

export default function SignInPage() {
  return (
    <Suspense>
      <SignInPageInner />
    </Suspense>
  )
}
