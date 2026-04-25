import type { MetadataRoute } from 'next'
import { getStaticParams } from '@/lib/content/getContentTree'
import { listFirms } from '@/lib/firms/repository'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com'
  const now = new Date()

  const marketing: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${siteUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/disclosure`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/firms`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]

  const firms = await listFirms()
  const firmPages: MetadataRoute.Sitemap = firms.map((f) => ({
    url: `${siteUrl}/firms/${f.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  const wikiParams = await getStaticParams()
  const wikiPages: MetadataRoute.Sitemap = wikiParams.map(({ slug }) => ({
    url: `${siteUrl}/firms/${slug.join('/')}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...marketing, ...firmPages, ...wikiPages]
}
