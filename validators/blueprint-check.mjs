export function blueprintCheck(output, blueprintChunk) {
  if (!blueprintChunk) {
    return { passed: true, errors: [], warnings: [], notes: ['skipped (no blueprintChunk)'] }
  }

  const errors = []
  const warnings = []
  const notes = []
  const slides = Array.isArray(output?.slides) ? output.slides : []
  const pages = Array.isArray(blueprintChunk.pages) ? blueprintChunk.pages : []
  const allowedConcepts = new Set(blueprintChunk.allowed_concepts || [])

  if (slides.length !== pages.length) {
    errors.push(`slides.length=${slides.length} != chunk.pages.length=${pages.length}`)
  } else {
    notes.push(`slides.length=${slides.length} matches chunk.pages.length`)
  }

  if (!output?.chunk_takeaway || typeof output.chunk_takeaway !== 'string') {
    errors.push('missing chunk_takeaway')
  }

  if (!Array.isArray(output?.chunk_insights) || output.chunk_insights.length < 1) {
    errors.push('missing chunk_insights')
  }

  if (!Array.isArray(output?.thinking_log) || output.thinking_log.length < 3) {
    errors.push('thinking_log must contain at least 3 steps')
  }

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    const spec = pages[index]
    if (!spec) continue

    if (slide.page_no !== spec.page_no) {
      errors.push(`slides[${index}].page_no=${slide.page_no} != spec.page_no=${spec.page_no}`)
    }

    if (slide.layout !== spec.recommended_layout) {
      errors.push(`slides[${index}].layout=${slide.layout} != spec.recommended_layout=${spec.recommended_layout}`)
    }

    const models = Array.isArray(slide.models_used) ? slide.models_used : []
    if (models.length === 0) {
      errors.push(`slides[${index}].models_used is empty`)
    }

    for (const model of models) {
      if (!allowedConcepts.has(model)) {
        errors.push(`slides[${index}].models_used contains "${model}" not in allowed_concepts`)
      }
    }
  }

  const allText = JSON.stringify({
    slides,
    chunk_takeaway: output?.chunk_takeaway,
    chunk_insights: output?.chunk_insights,
  })

  for (const keyword of blueprintChunk.self_check?.must_appear_keywords || []) {
    if (keyword && !allText.includes(keyword)) {
      errors.push(`Missing must_appear_keyword: "${keyword}"`)
    }
  }

  const metadataChunkId = output?.metadata?.blueprint_chunk_id || output?.blueprint_chunk_id
  if (metadataChunkId !== blueprintChunk.chunk_id) {
    errors.push(`blueprint_chunk_id mismatch: expected "${blueprintChunk.chunk_id}", got "${metadataChunkId || ''}"`)
  }

  if (output?.metadata?.layout_override_reason) {
    warnings.push('layout_override_reason present; manual review recommended')
  }

  return { passed: errors.length === 0, errors, warnings, notes }
}
