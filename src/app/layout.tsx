import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
    'Pre-trade decision tool for prop firm traders. Compare challenges, rules, and fit across top prop trading firms.',
  openGraph: {
    title: 'OpenPropFirm',
    description:
      'Pre-trade decision tool for prop firm traders. Compare challenges, rules, and fit across top prop trading firms.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openpropfirm.com',
    siteName: 'OpenPropFirm',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'OpenPropFirm' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenPropFirm',
    description:
      'Pre-trade decision tool for prop firm traders.',
    images: ['/og.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}}());`,
          }}
        />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
