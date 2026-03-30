import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getContentTree } from '@/lib/content/getContentTree'
import AppShell from '@/components/layout/AppShell'
import { SearchProvider } from '@/contexts/SearchContext'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com',
  ),
  title: {
    default: 'OpenPropFirm',
    template: '%s — OpenPropFirm',
  },
  description:
    'Free, community-maintained information hub for prop firm traders. Compare challenges, rules, and promo codes across top prop trading firms.',
  openGraph: {
    title: 'OpenPropFirm',
    description:
      'Free, community-maintained information hub for prop firm traders. Compare challenges, rules, and promo codes across top prop trading firms.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com',
    siteName: 'OpenPropFirm',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'OpenPropFirm' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenPropFirm',
    description:
      'Free, community-maintained information hub for prop firm traders.',
    images: ['/og.png'],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { treeData } = await getContentTree()

  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}}());`,
          }}
        />
      </head>
      <body>
        <TooltipProvider>
          <SearchProvider>
            <AppShell treeData={treeData}>{children}</AppShell>
          </SearchProvider>
        </TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
