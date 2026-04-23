import { z } from 'zod'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const ChangelogEntrySchema = z.object({
  date: z.string().regex(ISO_DATE_RE, 'date must be YYYY-MM-DD'),
  field: z.string().min(1),
  from: z.unknown(),
  to: z.unknown(),
  source_url: z.string().url(),
})
export type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>

export const ChecklistItemSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/, 'id must be snake_case'),
  label: z.string().min(1),
})
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>

const Stars = z.number().int().min(0).max(5)

export const FitScoreSchema = z.object({
  ny_scalping: Stars,
  swing_trading: Stars,
  news_trading: Stars,
  beginner_friendly: Stars,
  scalable: Stars,
})
export type FitScore = z.infer<typeof FitScoreSchema>

export const KillYouFirstEntrySchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  source_url: z.string().url(),
})
export type KillYouFirstEntry = z.infer<typeof KillYouFirstEntrySchema>
