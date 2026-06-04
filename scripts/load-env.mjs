import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED = ['TAVILY_API_KEY', 'SERPER_API_KEY']

export function checkEnv() {
  const missing = REQUIRED.filter(key => !process.env[key] || process.env[key].includes('replace-with'))
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`)
    console.error('Please copy .env.example to .env and fill in real keys.')
    console.error('See docs/setup-search-keys.md')
    process.exit(1)
  }

  return {
    tavily: process.env.TAVILY_API_KEY,
    serper: process.env.SERPER_API_KEY,
    exa: process.env.EXA_API_KEY || '',
  }
}

function maskSecret(value) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const env = checkEnv()
  console.log('✅ env loaded')
  console.log(`  TAVILY_API_KEY: ${maskSecret(env.tavily)}`)
  console.log(`  SERPER_API_KEY: ${maskSecret(env.serper)}`)
}
