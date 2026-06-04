import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import 'dotenv/config'

export const DEFAULT_CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function dryRunResponse(systemPrompt, userPrompt, model) {
  return {
    text: JSON.stringify({
      dry_run: true,
      model,
      system_preview: systemPrompt.slice(0, 80),
      user_preview: userPrompt.slice(0, 80),
    }, null, 2),
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
    model,
    provider: 'dry-run',
    content: [{ type: 'text', text: JSON.stringify({ dry_run: true, model }) }],
  }
}

function normalizeArgs(systemPromptOrArgs, userPrompt, opts = {}) {
  if (typeof systemPromptOrArgs === 'object' && systemPromptOrArgs !== null) {
    const args = systemPromptOrArgs
    const text = (args.messages || [])
      .map(message => Array.isArray(message.content)
        ? message.content.map(block => block.text || '').join('\n')
        : message.content || '')
      .join('\n\n')
    return {
      systemPrompt: args.system || '',
      userPrompt: text,
      opts: {
        ...args,
        maxTokens: args.max_tokens || args.maxTokens,
      },
    }
  }

  return { systemPrompt: systemPromptOrArgs, userPrompt, opts }
}

function getWireApi(opts = {}) {
  return opts.wireApi || process.env.ANTHROPIC_WIRE_API || 'anthropic'
}

function getBaseURL(opts = {}) {
  return opts.baseURL || process.env.ANTHROPIC_BASE_URL
}

function normalizeOpenAIBaseURL(baseURL) {
  if (!baseURL) return undefined
  return baseURL.replace(/\/+$/, '').endsWith('/v1')
    ? baseURL.replace(/\/+$/, '')
    : `${baseURL.replace(/\/+$/, '')}/v1`
}

function normalizeResponsesUsage(usage = {}) {
  return {
    input_tokens: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output_tokens: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cache_creation_input_tokens: Number(usage.input_tokens_details?.cache_creation_tokens ?? 0),
    cache_read_input_tokens: Number(usage.input_tokens_details?.cached_tokens ?? 0),
  }
}

async function callOpenAIResponses(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || DEFAULT_CLAUDE_MODEL
  const client = new OpenAI({
    apiKey: requireEnv('ANTHROPIC_API_KEY'),
    baseURL: normalizeOpenAIBaseURL(getBaseURL(opts)),
  })
  const response = await client.responses.create({
    model,
    instructions: systemPrompt,
    input: userPrompt,
    max_output_tokens: opts.maxTokens || 16000,
    temperature: opts.temperature,
  })

  return {
    text: response.output_text || '',
    usage: normalizeResponsesUsage(response.usage),
    model: response.model || model,
    provider: 'openai-compatible',
    content: response.output || [],
    id: response.id,
    stop_reason: response.status,
  }
}

function normalizeChatUsage(usage = {}) {
  return {
    input_tokens: Number(usage.prompt_tokens ?? usage.input_tokens ?? 0),
    output_tokens: Number(usage.completion_tokens ?? usage.output_tokens ?? 0),
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: Number(usage.prompt_tokens_details?.cached_tokens ?? 0),
  }
}

async function callOpenAIChatCompletions(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || DEFAULT_CLAUDE_MODEL
  const baseURL = normalizeOpenAIBaseURL(getBaseURL(opts))
  const response = await fetch(`${baseURL || 'https://api.openai.com/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('ANTHROPIC_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens || 16000,
      temperature: opts.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`OpenAI-compatible chat completion failed: ${response.status} ${text.slice(0, 300)}`)
  }
  const data = JSON.parse(text)

  return {
    text: data.choices[0]?.message?.content || '',
    usage: normalizeChatUsage(data.usage),
    model: data.model || model,
    provider: 'openai-compatible',
    content: data.choices,
    id: data.id,
    stop_reason: data.choices[0]?.finish_reason || null,
  }
}

async function callAnthropicMessages(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || DEFAULT_CLAUDE_MODEL
  const client = new Anthropic({
    apiKey: requireEnv('ANTHROPIC_API_KEY'),
    baseURL: getBaseURL(opts),
  })
  const response = await client.messages.create({
    model,
    max_tokens: opts.maxTokens || 16000,
    system: systemPrompt,
    temperature: opts.temperature,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find(block => block.type === 'text')
  return {
    text: textBlock?.text || '',
    usage: response.usage,
    model: response.model || model,
    provider: 'anthropic',
    content: response.content,
    id: response.id,
    stop_reason: response.stop_reason,
  }
}

export async function callClaude(systemPromptOrArgs, userPrompt, opts = {}) {
  const normalized = normalizeArgs(systemPromptOrArgs, userPrompt, opts)
  const model = normalized.opts.model || DEFAULT_CLAUDE_MODEL
  if (normalized.opts.dryRun) return dryRunResponse(normalized.systemPrompt, normalized.userPrompt, model)

  const wireApi = getWireApi(normalized.opts)
  if (wireApi === 'responses') {
    return callOpenAIResponses(normalized.systemPrompt, normalized.userPrompt, normalized.opts)
  }
  if (wireApi === 'chat_completions' || wireApi === 'chat-completions') {
    return callOpenAIChatCompletions(normalized.systemPrompt, normalized.userPrompt, normalized.opts)
  }

  return callAnthropicMessages(normalized.systemPrompt, normalized.userPrompt, normalized.opts)
}
