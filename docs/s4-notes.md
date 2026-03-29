# Sprint 4 Notes — Carry-forwards from S3

## Graph theme reactivity

**Issue:** `GraphView` resolves CSS variables (`--accent`, `--muted-foreground`, `--border`, `--sidebar-bg`) via `getComputedStyle` at mount time. Switching themes at runtime does not update graph node/link colors until the panel is toggled closed and reopened.

**File:** `src/components/graph/GraphView.tsx`

**Fix:** Listen for theme changes and re-resolve colors. Options:
- Watch the `data-theme` attribute on `<html>` via `MutationObserver`, then force a re-render
- Or pass resolved colors as props from a parent that already re-renders on theme change (e.g. read CSS variables in `GraphViewLoader` inside a `useEffect` on a theme context/store)

**Priority:** Low — cosmetic only, no data loss. One panel toggle restores correct colors.
