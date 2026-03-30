import { readFile } from 'fs/promises'
import fg from 'fast-glob'
import matter from 'gray-matter'
import path from 'path'
import { parseWikilinkTargets } from '../src/lib/content/wikilinks'

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

interface FileValidationResult {
  relativePath: string
  errors: ValidationError[]
  warnings: string[]
  fm: Record<string, unknown> | null
  content: string | null
}

function isValidISODate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

function slugFromFilePath(absPath: string): string {
  const dataRoot = path.join(process.cwd(), 'data')
  const rel = path.relative(dataRoot, absPath)
  return rel.replace(/\.md$/, '').replace(/\/index$/, '')
}

async function validateFile(filePath: string): Promise<FileValidationResult> {
  const errors: ValidationError[] = []
  const warnings: string[] = []
  const relativePath = path.relative(process.cwd(), filePath)

  let parsed: matter.GrayMatterFile<string>
  try {
    const raw = await readFile(filePath, 'utf-8')
    parsed = matter(raw)
  } catch {
    return {
      relativePath,
      errors: [
        {
          file: relativePath,
          field: 'frontmatter',
          message: 'Failed to parse YAML frontmatter',
        },
      ],
      warnings: [],
      fm: null,
      content: null,
    }
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

  if (!VALID_CATEGORIES.includes(fm.category as (typeof VALID_CATEGORIES)[number])) {
    errors.push({
      file: relativePath,
      field: 'category',
      message: `Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    })
  }

  if (!VALID_TYPES.includes(fm.type as (typeof VALID_TYPES)[number])) {
    errors.push({
      file: relativePath,
      field: 'type',
      message: `Must be one of: ${VALID_TYPES.join(', ')}`,
    })
  }

  if (!VALID_STATUSES.includes(fm.status as (typeof VALID_STATUSES)[number])) {
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

  if (!VALID_VERIFIED_BY.includes(fm.verified_by as (typeof VALID_VERIFIED_BY)[number])) {
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

  // Source validation
  if (Array.isArray(fm.sources)) {
    for (const source of fm.sources) {
      if (!source || typeof source !== 'object') continue

      // Validate url
      if (!source.url || typeof source.url !== 'string') {
        errors.push({
          file: relativePath,
          field: 'sources.url',
          message: 'source.url must be a non-empty string',
        })
      } else {
        if (!source.url.startsWith('https://')) {
          errors.push({
            file: relativePath,
            field: 'sources.url',
            message: `source.url must start with https://: "${source.url}"`,
          })
        } else {
          // Warn on bare root domain (no meaningful path)
          try {
            const u = new URL(source.url as string)
            if (u.pathname === '/' || u.pathname === '') {
              warnings.push(
                `Warning: ${relativePath} — source URL is a bare root domain with no path: "${source.url}"`,
              )
            }
          } catch {
            errors.push({
              file: relativePath,
              field: 'sources.url',
              message: `source.url is not a valid URL: "${source.url}"`,
            })
          }
        }
      }

      // Validate label
      if (!source.label || typeof source.label !== 'string') {
        errors.push({
          file: relativePath,
          field: 'sources.label',
          message: 'source.label must be a non-empty string',
        })
      } else if (/to be expanded|placeholder|tbd/i.test(source.label as string)) {
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
  const minLength = MIN_BODY_LENGTH[fm.type as string]
  if (minLength !== undefined && body.trim().length < minLength) {
    errors.push({
      file: relativePath,
      field: 'body',
      message: `Body too short: ${body.trim().length} chars (minimum ${minLength} for type '${fm.type}')`,
    })
  }

  // Recency check — uses already-parsed fm, no second file read
  if (typeof fm.last_verified === 'string') {
    const verified = new Date(fm.last_verified)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - verified.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (diffDays > 30) {
      warnings.push(
        `Warning: ${relativePath} — last_verified is ${diffDays} days old (${fm.last_verified})`,
      )
    }
  }

  return { relativePath, errors, warnings, fm, content: parsed.content }
}

async function main() {
  const files = await fg('data/firms/**/*.md', { cwd: process.cwd() })

  if (files.length === 0) {
    console.log(
      'Warning: No files found under data/firms/**/*.md — skipping validation',
    )
    process.exit(0)
  }

  // Phase 1: Validate all files in parallel (single read per file)
  const results = await Promise.all(
    files.map((file) => validateFile(path.join(process.cwd(), file))),
  )

  // Phase 2: Build slug set for wikilink resolution validation
  const slugSet = new Set(
    files.map((f) => slugFromFilePath(path.join(process.cwd(), f))),
  )

  const allErrors: ValidationError[] = []
  const allWarnings: string[] = []

  for (const result of results) {
    allErrors.push(...result.errors)
    allWarnings.push(...result.warnings)

    // Phase 3: Wikilink resolution check — error on broken links
    if (result.content !== null) {
      const targets = parseWikilinkTargets(result.content)
      for (const target of targets) {
        if (!slugSet.has(target)) {
          allErrors.push({
            file: result.relativePath,
            field: 'wikilink',
            message: `Broken wikilink: [[${target}]] — no matching content slug`,
          })
        }
      }
    }
  }

  for (const w of allWarnings) {
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
