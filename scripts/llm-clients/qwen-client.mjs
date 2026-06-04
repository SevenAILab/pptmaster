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
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    model,
  }
}

export async function callQwen(systemPrompt, userPrompt, opts = {}) {
  const model = opts.model || 'qwen-max'
  if (opts.dryRun) return dryRunResponse(systemPrompt, userPrompt, model)

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('DASHSCOPE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens || 16000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Qwen HTTP ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: data.usage,
    model,
  }
}
