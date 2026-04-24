export type ChecklistState = Record<string, boolean>

export const STORAGE_KEY_PREFIX = 'checklist:'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function storageKey(firmSlug: string): string {
  return `${STORAGE_KEY_PREFIX}${firmSlug}`
}

export function loadChecklistState(
  firmSlug: string,
  storage: StorageLike | null,
): ChecklistState {
  if (!storage) return {}
  const raw = storage.getItem(storageKey(firmSlug))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ChecklistState
    }
    return {}
  } catch {
    return {}
  }
}

export function saveChecklistState(
  firmSlug: string,
  state: ChecklistState,
  storage: StorageLike | null,
): void {
  if (!storage) return
  try {
    storage.setItem(storageKey(firmSlug), JSON.stringify(state))
  } catch {
    // quota exceeded, disabled, etc. — graceful degradation per spec §5.4
  }
}

export function clearChecklistState(firmSlug: string, storage: StorageLike | null): void {
  if (!storage) return
  try {
    storage.removeItem(storageKey(firmSlug))
  } catch {
    // same silent failure contract
  }
}

export function toggleItem(state: ChecklistState, id: string): ChecklistState {
  return { ...state, [id]: !state[id] }
}

export function isAnyChecked(state: ChecklistState): boolean {
  for (const v of Object.values(state)) {
    if (v) return true
  }
  return false
}
