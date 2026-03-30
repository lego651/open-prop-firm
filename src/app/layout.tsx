import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getContentTree } from '@/lib/content/getContentTree'
import AppShell from '@/components/layout/AppShell'
import { SearchProvider } from '@/contexts/SearchContext'
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
  title: 'OpenPropFirm',
  description: 'Open source prop trading firm platform',
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
        {/* Analytics: Google Analytics — to be added in Sprint 6 before launch */}
      </body>
    </html>
  )
}
