// scripts/ingest/ingest-book.mjs
// Parse《AI实战，从0到1打造你的品牌》.pdf into 14 chapter markdowns.
// Usage: node scripts/ingest/ingest-book.mjs

import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const SRC_PDF = '/Users/seven/Documents/文档/PPT方案大师/《AI实战，从0到1打造你的品牌》.pdf'
const OUT_DIR = path.join(REPO_ROOT, 'assets/_raw/books/0to1-brand')

const CHAPTER_ANCHORS = [
  { num: 1, anchor: /第\s*1\s*章[:：]?\s*启程认知/, slug: 'ch01-cognition', title: '启程认知：品牌的力量与 AI 的机遇' },
  { num: 2, anchor: /第\s*2\s*章/, slug: 'ch02-market', title: '市场分析' },
  { num: 3, anchor: /第\s*3\s*章/, slug: 'ch03-competitor', title: '竞品分析' },
  { num: 4, anchor: /第\s*4\s*章/, slug: 'ch04-user', title: '用户分析' },
  { num: 5, anchor: /第\s*5\s*章/, slug: 'ch05-self-swot', title: '自身分析与 SWOT' },
  { num: 6, anchor: /第\s*6\s*章/, slug: 'ch06-vmv-positioning', title: '品牌灵魂 VMV 与定位' },
  { num: 7, anchor: /第\s*7\s*章/, slug: 'ch07-bmc', title: '商业模式画布' },
  { num: 8, anchor: /第\s*8\s*章/, slug: 'ch08-vpc', title: '价值主张画布' },
  { num: 9, anchor: /第\s*9\s*章/, slug: 'ch09-naming-slogan', title: '名称 / 口号 / 人格 / 故事' },
  { num: 10, anchor: /第\s*10\s*章/, slug: 'ch10-visual-identity', title: 'Logo / 色彩 / 字体 / 品牌识别手册' },
  { num: 11, anchor: /第\s*11\s*章/, slug: 'ch11-product', title: '产品' },
  { num: 12, anchor: /第\s*12\s*章/, slug: 'ch12-channel', title: '渠道' },
  { num: 13, anchor: /第\s*13\s*章/, slug: 'ch13-imc', title: '整合营销传播' },
  { num: 14, anchor: /第\s*14\s*章/, slug: 'ch14-execution', title: '落地与持续优化' },
]

export function splitByChapterAnchors(fullText) {
  const positions = []
  for (const ch of CHAPTER_ANCHORS) {
    const m = ch.anchor.exec(fullText)
    if (m) positions.push({ ...ch, pos: m.index })
  }
  positions.sort((a, b) => a.pos - b.pos)

  const chapters = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].pos
    const end = i + 1 < positions.length ? positions[i + 1].pos : fullText.length
    chapters.push({
      num: positions[i].num,
      slug: positions[i].slug,
      title: positions[i].title,
      content: fullText.slice(start, end).trim()
    })
  }
  return chapters
}

async function main() {
  console.log(`[ingest-book] Extracting text from ${SRC_PDF}`)
  const raw = execSync(`pdftotext -layout "${SRC_PDF}" -`, {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  })

  const chapters = splitByChapterAnchors(raw)
  console.log(`[ingest-book] Split into ${chapters.length} chapters`)
  if (chapters.length !== 14) {
    console.error(`❌ Expected 14 chapters, got ${chapters.length}. Check anchors.`)
    process.exit(1)
  }

  await fs.mkdir(OUT_DIR, { recursive: true })

  for (const ch of chapters) {
    const frontmatter = `---\nchapter: ${ch.num}\nslug: ${ch.slug}\ntitle: ${ch.title}\nsource: 《AI实战，从0到1打造你的品牌》.pdf\nchar_count: ${ch.content.length}\n---\n\n# 第 ${ch.num} 章 · ${ch.title}\n\n`
    await fs.writeFile(path.join(OUT_DIR, `${ch.slug}.md`), frontmatter + ch.content)
    console.log(`  ✓ ${ch.slug}.md (${ch.content.length} chars)`)
  }

  const index = chapters
    .map(c => `- [${c.num.toString().padStart(2, '0')} · ${c.title}](${c.slug}.md) (${c.content.length} chars)`)
    .join('\n')
  await fs.writeFile(path.join(OUT_DIR, 'INDEX.md'), `# 《AI 实战，从 0 到 1 打造你的品牌》章节索引\n\n${index}\n`)
  console.log('  ✓ INDEX.md')

  console.log(`[ingest-book] Done. Output: ${OUT_DIR}`)
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1) })
}
