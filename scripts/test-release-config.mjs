import assert from 'node:assert/strict'
import fs from 'node:fs'

function read(path) {
  assert.ok(fs.existsSync(path), `${path} should exist`)
  return fs.readFileSync(path, 'utf8')
}

const workflow = read('.github/workflows/release.yml')
for (const text of [
  'name: Release',
  'tags:',
  "'v*.*.*'",
  'softprops/action-gh-release@v2',
  'body_path: docs/CHANGELOG.md',
  'generate_release_notes: true',
]) {
  assert.ok(workflow.includes(text), `release.yml should include ${text}`)
}

const bug = read('.github/ISSUE_TEMPLATE/bug-report.md')
for (const text of ['name: Bug Report', '复现步骤', '环境']) {
  assert.ok(bug.includes(text), `bug template should include ${text}`)
}

const feature = read('.github/ISSUE_TEMPLATE/feature-request.md')
for (const text of ['name: Feature Request', '痛点', '期望功能']) {
  assert.ok(feature.includes(text), `feature template should include ${text}`)
}

console.log('✅ release config test passed')
