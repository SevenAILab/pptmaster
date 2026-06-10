#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export async function inspectDeck(htmlPath, { width = 1280, height = 720 } = {}) {
  let chromium
  try {
    ({ chromium } = await import('playwright'))
  } catch {
    throw new Error('playwright 未安装。运行: npm install -D playwright && npx playwright install chromium')
  }
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(`file://${path.resolve(htmlPath)}`)
    const overflows = await page.evaluate(() => {
      const issues = []
      document.querySelectorAll('section.slide').forEach((slide, index) => {
        const rect = slide.getBoundingClientRect()
        slide.querySelectorAll('*').forEach(element => {
          const box = element.getBoundingClientRect()
          if (box.width === 0 || box.height === 0) return
          if (box.right > rect.right + 2 || box.bottom > rect.bottom + 2 || box.left < rect.left - 2 || box.top < rect.top - 2) {
            issues.push({
              page: index + 1,
              tag: element.tagName,
              text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
            })
          }
        })
      })
      return issues
    })
    return { ok: overflows.length === 0, overflows }
  } finally {
    await browser.close()
  }
}

async function cliMain() {
  const [htmlPath] = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
  if (!htmlPath) {
    console.error('Usage: node scripts/page-inspect.mjs <deck.html> [--json]')
    process.exit(2)
  }
  const result = await inspectDeck(htmlPath)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(result.ok
      ? '✅ 无溢出'
      : `❌ ${result.overflows.length} 处溢出：\n${result.overflows.map(item => `- p${item.page} <${item.tag}> ${item.text}`).join('\n')}`)
  }
  if (!result.ok) process.exit(1)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
