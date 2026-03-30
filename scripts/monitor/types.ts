export interface BotRunResult {
  firmSlug: string
  lastVerified: string   // ISO date (YYYY-MM-DD)
  changesDetected: boolean
  diff: string | null    // human-readable summary of what changed
  error: string | null
}
