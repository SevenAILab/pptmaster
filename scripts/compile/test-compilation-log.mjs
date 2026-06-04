import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const LOG_PATH = path.join(REPO_ROOT, 'assets/_compiled/COMPILATION_LOG.md')
const INDEX_PATH = path.join(REPO_ROOT, 'assets/_compiled/concepts-golden/INDEX.md')

const log = await fs.readFile(LOG_PATH, 'utf8')
const index = await fs.readFile(INDEX_PATH, 'utf8')

for (const section of [
  '# 资产编译审计日志 · v1 (Phase 1 Week 1.5)',
  '## 编译范围',
  '## 统计',
  '## Sub-Agent 矩阵覆盖',
  '## Cross Methodologies',
  '## Claude review checkpoint',
  '## Seven 校对清单',
  '## 下一步',
]) {
  assert.ok(log.includes(section), `COMPILATION_LOG missing section: ${section}`)
}

for (const required of [
  '| 总 raw 文件扫描 | 582 |',
  '| 候选概念数 | 45 |',
  '| 黄金版本数 | 60 |',
  '| 矩阵唯一概念覆盖 | 60/60 (100%) |',
  '- [x] SWOT',
  '- [x] STP',
  '- [x] JTBD',
  '- [x] Business-Model-Canvas',
  '- [x] Brand-House',
]) {
  assert.ok(log.includes(required), `COMPILATION_LOG missing required text: ${required}`)
}

for (const crossKey of [
  'essence_seeker',
  'swot',
  'communication_theory_34',
  'mece',
  'pyramid_principle',
  'action_title',
]) {
  assert.ok(log.includes(`\`${crossKey}\``), `COMPILATION_LOG missing cross methodology ${crossKey}`)
  assert.ok(index.includes(`\`${crossKey}\``), `INDEX missing cross methodology ${crossKey}`)
}

assert.ok(index.includes('## 应用矩阵摘要'), 'INDEX missing application matrix summary')
assert.ok(index.includes('## Cross Methodologies'), 'INDEX missing cross methodology summary')

console.log('✅ compilation log test passed')
