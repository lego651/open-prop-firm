"use client";

import { useState } from "react";

type ResizeHandleProps = {
  onResize: (newWidth: number) => void;
};

export default function ResizeHandle({ onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    // Panel 3 width = distance from pointer to right edge of viewport
    const newWidth = window.innerWidth - e.clientX;
    const clamped = Math.min(600, Math.max(280, newWidth));
    onResize(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    // AppShell's useEffect watching panel3Width persists the value to localStorage
  };

  return (
    <div
      className={[
        "w-1 shrink-0 cursor-col-resize transition-colors duration-200",
        isDragging
          ? "bg-[var(--accent)]/80"
          : "bg-transparent hover:bg-[var(--accent)]/40",
      ].join(" ")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
