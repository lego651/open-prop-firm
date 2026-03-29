"use client";

import type { TabEntry } from "@/types/content";
import TabBar from "@/components/content/TabBar";
import { BreadcrumbBar } from "@/components/content/BreadcrumbBar";

type ContentPanelProps = {
  openTabs: TabEntry[];
  activeSlug: string;
  onTabClick: (slug: string) => void;
  onTabClose: (slug: string) => void;
  onNewTab: () => void;
  onTogglePanel3: () => void;
  children: React.ReactNode;
};

export default function ContentPanel({
  openTabs,
  activeSlug,
  onTabClick,
  onTabClose,
  onNewTab,
  onTogglePanel3,
  children,
}: ContentPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <TabBar
        openTabs={openTabs}
        activeSlug={activeSlug}
        onTabClick={onTabClick}
        onTabClose={onTabClose}
        onNewTab={onNewTab}
        onTogglePanel3={onTogglePanel3}
      />
      <BreadcrumbBar activeSlug={activeSlug} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
