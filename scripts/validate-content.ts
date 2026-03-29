import fg from 'fast-glob'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'

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

  return errors
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

  for (const file of files) {
    const errors = validateFile(path.join(process.cwd(), file))
    allErrors.push(...errors)
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
