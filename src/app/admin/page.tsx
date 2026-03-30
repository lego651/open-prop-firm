import { redirect } from 'next/navigation'
import { createSupabaseServer, createSupabaseServiceRole } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin — Bot Usage Log',
  description: 'Internal admin: monitoring bot run history',
}

interface BotUsageRow {
  id: number
  firm_slug: string
  run_at: string
  last_verified: string | null
  changes_detected: boolean
  pr_url: string | null
  tokens_used: number | null
  cost_usd: string | null
  error: string | null
}

export default async function AdminPage() {
  // Auth guard — redirect unauthenticated users
  const supabase = await createSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  // Fetch bot run log via service role (bypasses RLS)
  const admin = createSupabaseServiceRole()
  const { data: rows, error } = await admin
    .from('bot_usage_log')
    .select('*')
    .order('run_at', { ascending: false })
    .limit(100)

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="mb-6 text-xl font-semibold text-[var(--foreground)]">
        Bot Usage Log
      </h1>

      {error && (
        <p className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          Error loading log: {error.message}
        </p>
      )}

      {!error && (!rows || rows.length === 0) && (
        <p className="text-sm text-[var(--muted-foreground)]">No bot runs recorded yet.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]">
              <tr>
                {['Firm', 'Run At', 'Last Verified', 'Changes', 'PR', 'Tokens', 'Cost (USD)', 'Error'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 font-medium text-[var(--muted-foreground)]"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {(rows as BotUsageRow[]).map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/40"
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.firm_slug}</td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    {new Date(row.run_at).toISOString().replace('T', ' ').slice(0, 19)} UTC
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.last_verified ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.changes_detected
                          ? 'text-amber-400'
                          : 'text-[var(--muted-foreground)]'
                      }
                    >
                      {row.changes_detected ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.pr_url ? (
                      <a
                        href={row.pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-[var(--foreground)]"
                      >
                        PR
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{row.tokens_used ?? '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.cost_usd != null ? `$${Number(row.cost_usd).toFixed(4)}` : '—'}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-red-400">
                    {row.error ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
