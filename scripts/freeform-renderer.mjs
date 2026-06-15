import fs from 'node:fs'
import path from 'node:path'
import { assembleFreeformDeck } from './assemble-freeform-deck.mjs'
import { designPage, isWellFormedSection } from './design-page.mjs'

export async function renderFreeformDeck(deck, {
  runDir,
  root,
  style = 'swiss',
  callModel,
  maxAttempts = 2,
  onProgress,
  skillGuidance,
} = {}) {
  if (!runDir) throw new Error('renderFreeformDeck requires runDir')
  if (!Array.isArray(deck?.slides)) throw new Error('renderFreeformDeck requires deck.slides[]')
  if (typeof callModel !== 'function') throw new Error('renderFreeformDeck requires callModel')

  fs.mkdirSync(runDir, { recursive: true })
  const designedPath = path.join(runDir, 'deck.designed.json')
  let checkpoint = []
  try {
    checkpoint = JSON.parse(fs.readFileSync(designedPath, 'utf8')).slides || []
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const cached = new Map(checkpoint
    .filter(slide => slide?.page_no && isWellFormedSection(slide.section_html))
    .map(slide => [String(slide.page_no), slide]))
  const designed = { ...deck, slides: [] }
  for (const [index, slide] of (deck.slides || []).entries()) {
    const label = `page ${slide.page_no || index + 1}/${deck.slides.length}`
    const cachedSlide = cached.get(String(slide.page_no))
    if (cachedSlide) {
      if (typeof onProgress === 'function') onProgress({ type: 'reuse', label, slide })
      designed.slides.push(cachedSlide)
    } else {
      if (typeof onProgress === 'function') onProgress({ type: 'start', label, slide })
      designed.slides.push(await designPage(slide, { callModel, maxAttempts, skillGuidance }))
      if (typeof onProgress === 'function') onProgress({ type: 'done', label, slide })
    }
    fs.writeFileSync(designedPath, JSON.stringify(designed, null, 2))
  }
  const malformed = designed.slides
    .filter(slide => !isWellFormedSection(slide.section_html))
    .map(slide => slide.page_no)
  if (malformed.length) throw new Error(`malformed section_html on pages: ${malformed.join(', ')}`)
  const html = await assembleFreeformDeck(designed, { style, root })
  const htmlPath = path.join(runDir, 'deck.freeform.html')
  fs.writeFileSync(htmlPath, html)
  fs.writeFileSync(designedPath, JSON.stringify(designed, null, 2))
  return { designed, designedPath, htmlPath }
}
