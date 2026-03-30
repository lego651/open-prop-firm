export interface BotRunResult {
  firmSlug: string
  lastVerified: string   // ISO date (YYYY-MM-DD)
  changesDetected: boolean
  diff: string | null    // human-readable summary of what changed
  error: string | null
}

export interface ScrapedFirmData {
  /** Key facts extracted from the live website */
  fields: Record<string, string>
}
