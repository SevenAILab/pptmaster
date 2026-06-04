import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const GOLDEN_DIR = path.join(REPO_ROOT, 'assets/_compiled/concepts-golden')

const REQUIRED_FRONTMATTER_KEYS = [
  'name:',
  'aliases:',
  'category:',
  'primary_source:',
  'secondary_sources:',
  'applicable_sub_agents:',
  'application_role:',
]

const REQUIRED_H2 = [
  '定义',
  '适用场景',
  '使用步骤',
  '输入输出示例',
  '常见误用',
  '关联概念',
  '多源对照参考 (Skill 内部, 用户不可见)',
]

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/compile/test-golden-structure.mjs <slug.md>...')
  process.exit(1)
}

for (const fileName of files) {
  const filePath = path.join(GOLDEN_DIR, fileName)
  const content = await fs.readFile(filePath, 'utf8')
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/)

  assert.ok(frontmatter, `${fileName}: missing YAML frontmatter`)

  for (const key of REQUIRED_FRONTMATTER_KEYS) {
    assert.ok(frontmatter[1].includes(key), `${fileName}: missing frontmatter key ${key}`)
  }

  const h1Count = (content.match(/^#\s+.+$/gm) || [])
    .filter(line => !line.startsWith('##')).length
  assert.equal(h1Count, 1, `${fileName}: expected exactly one H1`)

  const h2 = [...content.matchAll(/^##\s+(.+)$/gm)].map(match => match[1].trim())
  assert.deepEqual(h2, REQUIRED_H2, `${fileName}: H2 section order mismatch`)

  const examples = content.match(/^###\s+示例\s+\d+\s+·/gm) || []
  assert.ok(examples.length >= 2, `${fileName}: expected at least 2 examples`)

  const misuseSection = content.split('## 常见误用')[1]?.split('## 关联概念')[0] || ''
  const misuseItems = misuseSection.match(/^\d+\.\s+\*\*/gm) || []
  assert.ok(misuseItems.length >= 5, `${fileName}: expected at least 5 misuse items`)

  const relatedSection = content.split('## 关联概念')[1]?.split('## 多源对照参考')[0] || ''
  const relatedItems = relatedSection.match(/^-\s+\*\*/gm) || []
  assert.ok(relatedItems.length >= 5, `${fileName}: expected at least 5 related concepts`)
  assert.ok(
    relatedSection.includes('concepts-golden/'),
    `${fileName}: related concepts should include concepts-golden links`,
  )

  const references = content.split('## 多源对照参考 (Skill 内部, 用户不可见)')[1] || ''
  assert.ok(references.includes('| 维度 | 取自 | 说明 |'), `${fileName}: missing reference table`)
}

console.log(`✅ golden structure test passed (${files.length} files)`)
