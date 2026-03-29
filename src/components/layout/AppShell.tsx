"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { TreeNode, TabEntry } from "@/types/content";

type AppShellProps = {
  treeData: TreeNode[];
  validSlugs: string[];
  children: React.ReactNode;
};

function findLabelInTree(nodes: TreeNode[], slug: string): string | null {
  for (const node of nodes) {
    if (node.id === slug) return node.label;
    if (node.children) {
      const found = findLabelInTree(node.children, slug);
      if (found) return found;
    }
  }
  return null;
}

export default function AppShell({
  treeData,
  validSlugs: _validSlugs,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [panel1Collapsed, setPanel1Collapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem("panel1Collapsed") ?? "false");
    } catch {
      return false;
    }
  });

  const [panel3Width, setPanel3Width] = useState<number>(() => {
    try {
      return JSON.parse(localStorage.getItem("panel3Width") ?? "360");
    } catch {
      return 360;
    }
  });

  const [panel3Mode, setPanel3Mode] = useState<"graph" | "compare">(() => {
    try {
      return JSON.parse(localStorage.getItem("panel3Mode") ?? '"graph"');
    } catch {
      return "graph";
    }
  });

  const [openTabs, setOpenTabs] = useState<TabEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("openTabs") ?? "[]");
    } catch {
      return [];
    }
  });

  // Panel 3 visibility: start false (SSR-safe), correct on mount
  const [panel3Visible, setPanel3Visible] = useState(false);
  useEffect(() => {
    setPanel3Visible(window.innerWidth >= 1100);
  }, []);

  // Supabase session
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Tab reconciliation
  const activeSlug = pathname.replace(/^\//, "");
  useEffect(() => {
    const slug = pathname.replace(/^\//, "");
    if (!slug.startsWith("firms/")) return;
    const exists = openTabs.some((t) => t.slug === slug);
    if (!exists) {
      const label = findLabelInTree(treeData, slug) ?? slug.split("/").pop() ?? slug;
      setOpenTabs((prev) => [...prev, { slug, title: label }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Tab close handler — navigation logic lives here, not in TabBar
  const handleTabClose = (slug: string) => {
    const idx = openTabs.findIndex((t) => t.slug === slug);
    const newTabs = openTabs.filter((t) => t.slug !== slug);
    setOpenTabs(newTabs);
    if (activeSlug === slug) {
      const next = newTabs[idx] ?? newTabs[idx - 1] ?? null;
      if (next) router.push("/" + next.slug);
      else router.push("/firms/cfd/funded-next");
    }
  };

  // localStorage persistence
  useEffect(() => {
    localStorage.setItem("panel1Collapsed", JSON.stringify(panel1Collapsed));
  }, [panel1Collapsed]);

  useEffect(() => {
    localStorage.setItem("panel3Width", JSON.stringify(panel3Width));
  }, [panel3Width]);

  useEffect(() => {
    localStorage.setItem("panel3Mode", JSON.stringify(panel3Mode));
  }, [panel3Mode]);

  useEffect(() => {
    localStorage.setItem("openTabs", JSON.stringify(openTabs));
  }, [openTabs]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Panel 1 */}
      <div
        style={{ width: panel1Collapsed ? 48 : 260, transition: "width 200ms ease" }}
        className="shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--border)] overflow-hidden"
      >
        {/* NavPanel goes here — placeholder until S2-6 */}
        <div className="p-2 text-xs text-[var(--muted-foreground)]">Nav panel</div>
      </div>

      {/* Panel 2 */}
      <div className="flex-1 min-w-[400px] overflow-hidden flex flex-col">
        {/* ContentPanel goes here — placeholder until S2-10 */}
        {children}
      </div>

      {/* ResizeHandle — placeholder 4px div until S2-5 */}
      <div className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[var(--accent)]/40 transition-colors" />

      {/* Panel 3 */}
      {panel3Visible && (
        <div
          style={{ width: panel3Width }}
          className="shrink-0 border-l border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden flex flex-col"
        >
          {/* GraphPanel goes here — placeholder until S2-11 */}
          <div className="p-4 text-xs text-[var(--muted-foreground)]">Panel 3</div>
        </div>
      )}
    </div>
  );
}

// Expose handlers for child panels to consume via props drilling
// (no external state library per tech-plan Section 3.7)
export type { AppShellProps };
export { findLabelInTree };
