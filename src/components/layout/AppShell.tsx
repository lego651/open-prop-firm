"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { TreeNode, TabEntry } from "@/types/content";
import ResizeHandle from "@/components/layout/ResizeHandle";
import ContentPanel from "@/components/content/ContentPanel";
import NavPanel from "@/components/nav/NavPanel";
import GraphPanel from "@/components/graph/GraphPanel";

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

  // Viewport width — for responsive layout
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );
  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const [panel1OverlayOpen, setPanel1OverlayOpen] = useState(false);

  useEffect(() => {
    const w = window.innerWidth;
    if (w < 1100) setPanel3Visible(false);
    if (w < 1024) setPanel1Collapsed(true);
    // < 768 handled by CSS class + panel1OverlayOpen state
  }, []);

  // Derived: Panel 3 becomes an overlay when visible but viewport < 1280px
  const panel3IsOverlay = panel3Visible && viewportWidth < 1280;

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
      {/* Panel 1 — hidden at < 768px, overlay when hamburger opens */}
      {viewportWidth >= 768 ? (
        <div
          style={{ width: panel1Collapsed ? 48 : 260, transition: "width 200ms ease" }}
          className="shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--border)] overflow-hidden"
        >
          <NavPanel
            treeData={treeData}
            activeSlug={activeSlug}
            collapsed={panel1Collapsed}
            onToggleCollapse={() => setPanel1Collapsed(v => !v)}
          />
        </div>
      ) : null}

      {/* Panel 1 overlay — mobile (< 768px) */}
      {panel1OverlayOpen && viewportWidth < 768 && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setPanel1OverlayOpen(false)}
          />
          <div
            className="fixed left-0 top-0 h-full w-[260px] z-50 bg-[var(--sidebar-bg)] border-r border-[var(--border)] overflow-hidden"
          >
            <NavPanel
              treeData={treeData}
              activeSlug={activeSlug}
              collapsed={panel1Collapsed}
              onToggleCollapse={() => setPanel1Collapsed(v => !v)}
            />
          </div>
        </>
      )}

      {/* Panel 2 */}
      <div className="flex-1 min-w-[400px] overflow-hidden flex flex-col">
        {/* TODO S2-12: pass onHamburger to ContentPanel when viewportWidth < 768 — requires ContentPanel prop update */}
        <ContentPanel
          openTabs={openTabs}
          activeSlug={activeSlug}
          onTabClick={(slug) => router.push("/" + slug)}
          onTabClose={handleTabClose}
          onNewTab={() => {}} // TODO: wire to SearchModal in Sprint 3
          onTogglePanel3={() => setPanel3Visible((v) => !v)}
        >
          {children}
        </ContentPanel>
      </div>

      {/* ResizeHandle — only visible when Panel 3 is a flex sibling (not overlay) */}
      {panel3Visible && !panel3IsOverlay && (
        <ResizeHandle onResize={setPanel3Width} />
      )}

      {/* Panel 3 backdrop — only in overlay mode */}
      {panel3Visible && panel3IsOverlay && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setPanel3Visible(false)}
        />
      )}

      {/* Panel 3 */}
      {panel3Visible && (
        <div
          style={{ width: panel3Width }}
          className={
            panel3IsOverlay
              ? "fixed right-0 top-0 h-full z-50 border-l border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden flex flex-col"
              : "shrink-0 border-l border-[var(--border)] bg-[var(--sidebar-bg)] overflow-hidden flex flex-col"
          }
        >
          <GraphPanel
            mode={panel3Mode}
            user={user}
            onModeToggle={() => setPanel3Mode(m => m === "graph" ? "compare" : "graph")}
            onDismissGate={() => setPanel3Mode("graph")}
          />
        </div>
      )}
    </div>
  );
}

// Expose handlers for child panels to consume via props drilling
// (no external state library per tech-plan Section 3.7)
export type { AppShellProps };
export { findLabelInTree };
