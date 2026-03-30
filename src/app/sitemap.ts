import type { MetadataRoute } from 'next'
import { getStaticParams } from '@/lib/content/getContentTree'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const params = await getStaticParams()
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com'

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...params.map(({ slug }) => ({
      url: `${siteUrl}/firms/${slug.join('/')}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
