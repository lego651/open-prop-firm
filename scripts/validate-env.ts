const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const missing = required.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error('Missing required env vars:', missing.join(', '))
  process.exit(1)
}
console.log('Env validation passed')
