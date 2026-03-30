import { getPageContent } from '@/lib/content/getPageContent'
import { NextResponse } from 'next/server'

// Client-side content cache keyed by slug (shared across requests in the same process)
// Avoids repeated filesystem reads for the same slug during a session.
const SLUG_RE = /^[a-z0-9\-\/]+$/

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  const slugPath = slug.join('/')

  // Path traversal + validity guard — must run before path.join in getPageContent
  if (
    slugPath.includes('..') ||
    !slugPath.startsWith('firms/') ||
    !SLUG_RE.test(slugPath)
  ) {
    return NextResponse.json(
      { ok: false, error: 'Invalid slug' } satisfies { ok: false; error: string },
      { status: 400 },
    )
  }

  try {
    const data = await getPageContent(slugPath)
    return NextResponse.json(
      { ok: true, data } satisfies { ok: true; data: typeof data },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        },
      },
    )
  } catch (err) {
    console.error('Content API error:', err)
    return NextResponse.json(
      { ok: false, error: 'Content not found' } satisfies { ok: false; error: string },
      { status: 404 },
    )
  }
}
