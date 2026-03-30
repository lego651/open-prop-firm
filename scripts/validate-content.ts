import fg from 'fast-glob'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'

const PLACEHOLDER_PATTERNS = [
  /placeholder/i,
  /content will be added/i,
  /to be expanded/i,
  /\bTBD\b/,
  /\bTODO\b/,
  /coming soon/i,
]

const MIN_BODY_LENGTH: Record<string, number> = {
  'basic-info': 300,
  challenge: 200,
  rules: 500,
  promo: 150,
  changelog: 200,
}

const VALID_CATEGORIES = ['cfd', 'futures'] as const
const VALID_TYPES = [
  'basic-info',
  'challenge',
  'rules',
  'promo',
  'changelog',
] as const
const VALID_STATUSES = ['active', 'inactive', 'shutdown'] as const
const VALID_VERIFIED_BY = ['bot', 'manual'] as const

interface ValidationError {
  file: string
  field: string
  message: string
}

function isValidISODate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

function validateFile(filePath: string): ValidationError[] {
  const errors: ValidationError[] = []
  const relativePath = path.relative(process.cwd(), filePath)

  let parsed: matter.GrayMatterFile<string>
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    parsed = matter(content)
  } catch {
    return [
      {
        file: relativePath,
        field: 'frontmatter',
        message: 'Failed to parse YAML frontmatter',
      },
    ]
  }

  const fm = parsed.data

  // Required fields for all files
  if (!fm.title || typeof fm.title !== 'string') {
    errors.push({
      file: relativePath,
      field: 'title',
      message: 'Must be a non-empty string',
    })
  }

  if (!fm.firm || typeof fm.firm !== 'string') {
    errors.push({
      file: relativePath,
      field: 'firm',
      message: 'Must be a non-empty string',
    })
  }

  if (!VALID_CATEGORIES.includes(fm.category)) {
    errors.push({
      file: relativePath,
      field: 'category',
      message: `Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    })
  }

  if (!VALID_TYPES.includes(fm.type)) {
    errors.push({
      file: relativePath,
      field: 'type',
      message: `Must be one of: ${VALID_TYPES.join(', ')}`,
    })
  }

  if (!VALID_STATUSES.includes(fm.status)) {
    errors.push({
      file: relativePath,
      field: 'status',
      message: `Must be one of: ${VALID_STATUSES.join(', ')}`,
    })
  }

  if (!isValidISODate(fm.last_verified)) {
    errors.push({
      file: relativePath,
      field: 'last_verified',
      message: 'Must be a valid ISO 8601 date string',
    })
  }

  if (!VALID_VERIFIED_BY.includes(fm.verified_by)) {
    errors.push({
      file: relativePath,
      field: 'verified_by',
      message: `Must be one of: ${VALID_VERIFIED_BY.join(', ')}`,
    })
  }

  if (!Array.isArray(fm.sources) || fm.sources.length === 0) {
    errors.push({
      file: relativePath,
      field: 'sources',
      message:
        'Must be an array with at least one entry (empty array is not allowed)',
    })
  }

  // Type-specific validations
  if (fm.type === 'challenge') {
    if (typeof fm.challenge_size !== 'number' || fm.challenge_size < 0) {
      errors.push({
        file: relativePath,
        field: 'challenge_size',
        message: 'Must be a non-negative number',
      })
    }
    if (typeof fm.price_usd !== 'number' || fm.price_usd < 0) {
      errors.push({
        file: relativePath,
        field: 'price_usd',
        message: 'Must be a non-negative number',
      })
    }
  }

  if (fm.type === 'basic-info') {
    if (!fm.website || typeof fm.website !== 'string') {
      errors.push({
        file: relativePath,
        field: 'website',
        message: 'Must be a non-empty string for basic-info files',
      })
    }
  }

  // Placeholder text detection in markdown body
  const body = parsed.content
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(body)) {
      errors.push({
        file: relativePath,
        field: 'body',
        message: `Markdown body contains placeholder text matching: ${pattern}`,
      })
      break
    }
  }

  // Placeholder text in source labels
  if (Array.isArray(fm.sources)) {
    for (const source of fm.sources) {
      if (
        source &&
        typeof source.label === 'string' &&
        /to be expanded|placeholder|tbd/i.test(source.label)
      ) {
        errors.push({
          file: relativePath,
          field: 'sources.label',
          message: `Source label contains placeholder text: "${source.label}"`,
        })
      }
    }
  }

  // Zero-value field detection for active firms
  if (fm.status === 'active') {
    if (fm.type === 'basic-info' && fm.founded === 0) {
      errors.push({
        file: relativePath,
        field: 'founded',
        message: 'Founded year is placeholder (0)',
      })
    }
    if (fm.type === 'challenge' && fm.price_usd === 0) {
      errors.push({
        file: relativePath,
        field: 'price_usd',
        message: 'Challenge price is placeholder (0)',
      })
    }
  }

  // Minimum content length checks
  const minLength = MIN_BODY_LENGTH[fm.type]
  if (minLength !== undefined && body.trim().length < minLength) {
    errors.push({
      file: relativePath,
      field: 'body',
      message: `Body too short: ${body.trim().length} chars (minimum ${minLength} for type '${fm.type}')`,
    })
  }

  return errors
}

function checkRecency(
  filePath: string,
  lastVerified: string,
): string | null {
  const verified = new Date(lastVerified)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays > 30) {
    const relativePath = path.relative(process.cwd(), filePath)
    return `Warning: ${relativePath} — last_verified is ${diffDays} days old (${lastVerified})`
  }
  return null
}

async function main() {
  const files = await fg('data/firms/**/*.md', { cwd: process.cwd() })

  if (files.length === 0) {
    console.log(
      'Warning: No files found under data/firms/**/*.md — skipping validation',
    )
    process.exit(0)
  }

  const allErrors: ValidationError[] = []
  const warnings: string[] = []

  for (const file of files) {
    const absPath = path.join(process.cwd(), file)
    const errors = validateFile(absPath)
    allErrors.push(...errors)

    // Recency check (warning only)
    try {
      const raw = fs.readFileSync(absPath, 'utf-8')
      const { data } = matter(raw)
      if (typeof data.last_verified === 'string') {
        const warning = checkRecency(absPath, data.last_verified)
        if (warning) warnings.push(warning)
      }
    } catch {
      // already caught in validateFile
    }
  }

  for (const w of warnings) {
    console.warn(w)
  }

  if (allErrors.length > 0) {
    console.error(
      `\nContent validation failed — ${allErrors.length} error(s) found:\n`,
    )
    for (const err of allErrors) {
      console.error(`  ${err.file}`)
      console.error(`    field: ${err.field}`)
      console.error(`    error: ${err.message}\n`)
    }
    process.exit(1)
  }

  console.log(`Validation passed: ${files.length} files checked`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Unexpected error in validate-content:', err)
  process.exit(1)
})
