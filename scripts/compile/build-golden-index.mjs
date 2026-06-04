import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const GOLDEN_DIR = path.join(REPO_ROOT, 'assets/_compiled/concepts-golden')
const INDEX_PATH = path.join(GOLDEN_DIR, 'INDEX.md')

function readScalar(frontmatter, key) {
  return frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || ''
}

function readList(frontmatter, key) {
  const section = frontmatter.match(new RegExp(`^${key}:\\n([\\s\\S]*?)(?=^[a-zA-Z_]+:|$)`, 'm'))?.[1] || ''
  return section
    .split('\n')
    .map(line => line.trim().match(/^-\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
}

async function buildGoldenIndex() {
  const files = (await fs.readdir(GOLDEN_DIR))
    .filter(file => file.endsWith('.md') && file !== 'INDEX.md')
    .sort()

  let markdown = '# 黄金概念库 · 索引\n\n'
  markdown += `共 ${files.length} 个概念\n\n`
  markdown += '| name | category | applicable_sub_agents | 文件链接 |\n'
  markdown += '|---|---|---|---|\n'

  for (const file of files) {
    const content = await fs.readFile(path.join(GOLDEN_DIR, file), 'utf8')
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/)?.[1] || ''
    const name = readScalar(frontmatter, 'name') || file.replace(/\.md$/, '')
    const category = readScalar(frontmatter, 'category')
    const agents = readList(frontmatter, 'applicable_sub_agents').join(', ')

    markdown += `| ${name} | ${category} | ${agents} | [${file}](./${file}) |\n`
  }

  await fs.writeFile(INDEX_PATH, markdown)
  return { count: files.length, indexPath: INDEX_PATH }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = await buildGoldenIndex()
  console.log(`✅ INDEX written with ${result.count} entries`)
}

export { buildGoldenIndex }
