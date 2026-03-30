import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Auth — OpenPropFirm',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--foreground)',
              marginBottom: '0.5rem',
            }}
          >
            OpenPropFirm
          </h1>
        </div>
        {children}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              fontSize: '0.875rem',
              color: 'var(--muted-foreground)',
              textDecoration: 'none',
            }}
          >
            ← Back to app
          </Link>
        </div>
      </div>
    </div>
  )
}
