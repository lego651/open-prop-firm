import { SearchProvider } from '@/contexts/SearchContext'
import { getContentTree } from '@/lib/content/getContentTree'
import AppShell from '@/components/layout/AppShell'

export default async function WikiLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { treeData } = await getContentTree()

  return (
    <SearchProvider>
      <AppShell treeData={treeData}>{children}</AppShell>
    </SearchProvider>
  )
}
