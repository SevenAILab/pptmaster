#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STYLE_TEMPLATES, replaceSlides } from './render-deck.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function assembleFreeformDeck(deck, { style = 'swiss', root = REPO_ROOT } = {}) {
  const templateFile = STYLE_TEMPLATES[style]
  if (!templateFile) throw new Error(`Unknown style: ${style}`)
  if (!Array.isArray(deck?.slides)) throw new Error('assembleFreeformDeck requires deck.slides[]')

  const sections = deck.slides.map(slide => {
    if (!slide?.section_html) throw new Error(`page ${slide?.page_no || '?'}: missing section_html`)
    return slide.section_html
  })
  const template = await fs.readFile(path.join(root, templateFile), 'utf8')
  const clientName = deck.client_profile?.name || deck.metadata?.client_name || '品牌定位案'
  return replaceSlides(template, sections.join('\n\n'))
    .replace(/\[必填\][^<]*/g, `${clientName} · 品牌定位案`)
}

async function cliMain() {
  const args = process.argv.slice(2)
  const positional = args.filter(arg => !arg.startsWith('--'))
  const [inputJson, outputHtml] = positional
  const style = args.find(arg => arg.startsWith('--style='))?.split('=')[1] || 'swiss'

  if (!inputJson || !outputHtml) {
    console.error('Usage: node scripts/assemble-freeform-deck.mjs <designed-deck.json> <output.html> [--style=swiss]')
    process.exit(2)
  }

  const deck = JSON.parse(await fs.readFile(path.resolve(inputJson), 'utf8'))
  const html = await assembleFreeformDeck(deck, { style })
  await fs.mkdir(path.dirname(path.resolve(outputHtml)), { recursive: true })
  await fs.writeFile(path.resolve(outputHtml), html)
  console.log(`[freeform] ${deck.slides?.length || 0} slides -> ${outputHtml}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
