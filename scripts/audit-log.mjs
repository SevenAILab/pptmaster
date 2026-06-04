import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const PRICING = {
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-5-20251022': { input: 3.00, output: 15.00 },
  'claude-opus-4-5-20250929': { input: 15.00, output: 75.00 },
  'gpt-4o-2024-11-20': { input: 2.50, output: 10.00 },
}

const UNKNOWN_MODEL_FALLBACK = {
  input: PRICING['claude-sonnet-4-5-20250929'].input * 0.5,
  output: PRICING['claude-sonnet-4-5-20250929'].output * 0.5,
}

function repoPath(...segments) {
  return path.join(REPO_ROOT, ...segments)
}

async function appendJsonl(slug, filename, entry) {
  const dir = repoPath('outputs', slug, '_audit')
  await fs.mkdir(dir, { recursive: true })
  await fs.appendFile(path.join(dir, filename), `${JSON.stringify(entry)}\n`)
}

async function readJsonl(slug, filename) {
  const logPath = repoPath('outputs', slug, '_audit', filename)
  try {
    const content = await fs.readFile(logPath, 'utf8')
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

export async function appendLLMAuditLog(slug, entry) {
  await appendJsonl(slug, 'llm-calls.jsonl', entry)
}

export async function appendWebSearchAuditLog(slug, entry) {
  await appendJsonl(slug, 'web-searches.jsonl', entry)
}

export async function readLLMAuditLog(slug) {
  return readJsonl(slug, 'llm-calls.jsonl')
}

export async function readWebSearchAuditLog(slug) {
  return readJsonl(slug, 'web-searches.jsonl')
}

export function hasKnownPricing(model) {
  return Boolean(PRICING[model])
}

function envPricing() {
  const input = Number(process.env.ANTHROPIC_MODEL_PRICING_INPUT || 0)
  const output = Number(process.env.ANTHROPIC_MODEL_PRICING_OUTPUT || 0)
  if (input > 0 && output > 0) return { input, output }
  return null
}

function usageValue(usage, primary, fallback) {
  return Number(usage?.[primary] ?? usage?.[fallback] ?? 0)
}

export function estimateCost(usage, model) {
  const pricing = PRICING[model] || envPricing() || UNKNOWN_MODEL_FALLBACK
  if (!PRICING[model] && !envPricing()) {
    console.warn(`Unknown model pricing for ${model}; using half Sonnet fallback estimate.`)
  }

  const inputTokens = usageValue(usage, 'input_tokens', 'prompt_tokens')
  const outputTokens = usageValue(usage, 'output_tokens', 'completion_tokens')
  return Number(((inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000).toFixed(6))
}

export function summarizeLLMUsage(entries) {
  const totalLatency = entries.reduce((sum, entry) => sum + Number(entry.latency_ms || 0), 0)
  const totalCost = entries.reduce((sum, entry) => sum + Number(entry.estimated_cost_usd || 0), 0)

  return {
    total_calls: entries.length,
    total_input_tokens: entries.reduce((sum, entry) => sum + Number(entry.input_tokens || 0), 0),
    total_output_tokens: entries.reduce((sum, entry) => sum + Number(entry.output_tokens || 0), 0),
    total_cost_usd: Number(totalCost.toFixed(6)),
    by_purpose: entries.reduce((acc, entry) => ({
      ...acc,
      [entry.purpose]: (acc[entry.purpose] || 0) + 1,
    }), {}),
    avg_latency_ms: Math.round(totalLatency / Math.max(1, entries.length)),
  }
}
