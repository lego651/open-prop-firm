import { getPageContent } from '@/lib/content/getPageContent'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  const slugPath = slug.join('/')
  try {
    const data = await getPageContent(slugPath)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Content API error:', err)
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }
}
