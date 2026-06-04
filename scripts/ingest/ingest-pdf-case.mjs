// scripts/ingest/ingest-pdf-case.mjs
// Generic: parse a single PDF case file into per-page markdowns.
// Usage: node scripts/ingest/ingest-pdf-case.mjs <src.pdf> <out_dir> [case_slug]

import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

async function ingestCase(srcPdf, outDir, caseSlug) {
  console.log(`[ingest-pdf-case] ${srcPdf} -> ${outDir}`)
  await fs.mkdir(outDir, { recursive: true })

  const info = execSync(`pdfinfo "${srcPdf}"`, { encoding: 'utf8' })
  const pageMatch = /Pages:\s+(\d+)/.exec(info)
  if (!pageMatch) throw new Error(`Could not read PDF page count: ${srcPdf}`)
  const totalPages = parseInt(pageMatch[1], 10)
  console.log(`  Total pages: ${totalPages}`)

  for (let p = 1; p <= totalPages; p++) {
    const text = execSync(`pdftotext -layout -f ${p} -l ${p} "${srcPdf}" -`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }).trim()
    const pad = String(p).padStart(3, '0')
    const frontmatter = `---\npage: ${p}\ntotal_pages: ${totalPages}\ncase_slug: ${caseSlug}\nsource: ${path.basename(srcPdf)}\nchar_count: ${text.length}\n---\n\n# Page ${p}\n\n`
    await fs.writeFile(path.join(outDir, `page-${pad}.md`), frontmatter + text)
  }

  const summary = `# ${caseSlug} · 案例索引\n\n- 来源: ${path.basename(srcPdf)}\n- 总页数: ${totalPages}\n- 拆解时间: ${new Date().toISOString()}\n\n## 页索引\n\n${Array.from({ length: totalPages }, (_, i) => `- [Page ${i + 1}](page-${String(i + 1).padStart(3, '0')}.md)`).join('\n')}\n\n## Seven 手工摘要\n\n### 客户背景\nSmallRig (斯莫格) 是中国摄影摄像配件品牌，2014 年深圳创立，主打跨境 DTC + 全球摄影师社群运营。MI 升级背景: 从“配件供应商”升级为“摄影创作工具平台”。\n\n### 本案例的核心方法论 (Seven 用过的)\n1. 从品类供应商升级到创作工具生态，以战略定位统领 MI 升级。\n2. 用创作者共创、全球社群和工具基础设施作为 RTB，支撑品牌主张。\n3. 通过品牌定位、商业模式画布、品牌人格与视觉调性，把战略翻译为可落地的品牌资产。\n\n### 关键页面定位 (供 Sub-Agent ④ 参考)\n- p.001-p.010: 项目背景、品牌升级语境与核心叙事入口\n- p.011-p.050: 市场、用户、竞品与自身资产分析\n- p.051-p.090: 品牌定位、MI 升级方向与策略表达\n- p.091-p.125: 视觉/应用/落地延展与管理建议\n`
  await fs.writeFile(path.join(outDir, 'SUMMARY.md'), summary)
  console.log('[ingest-pdf-case] Done.')
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [srcPdf, outDir, caseSlug = path.basename(srcPdf, '.pdf')] = process.argv.slice(2)
  if (!srcPdf || !outDir) {
    console.error('Usage: node scripts/ingest/ingest-pdf-case.mjs <src.pdf> <out_dir> [case_slug]')
    process.exit(1)
  }
  ingestCase(srcPdf, outDir, caseSlug).catch(e => { console.error(e); process.exit(1) })
}

export { ingestCase }
