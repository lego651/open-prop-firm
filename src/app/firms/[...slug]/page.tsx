import { getStaticParams } from "@/lib/content/getContentTree";
// getContentTree is server-only safe in generateStaticParams — this runs at build time, not in client context

export const dynamic = "force-static";
// ^ Safety net: prevents dynamic fallback even if generateStaticParams misses a slug

export async function generateStaticParams() {
  return getStaticParams();
}

export default async function FirmPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  return (
    <div className="p-8 text-sm text-[var(--muted-foreground)]">
      Content for <code>{slugPath}</code> — rendering coming in Sprint 3
    </div>
  );
}
