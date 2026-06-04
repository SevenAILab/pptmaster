import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve('assets/_raw/visuals-legacy')
const expected = [
  '01-品牌建设案-框架导图.png',
  '02-品牌定位案-框架导图.png',
  '03-产品策略案-框架导图.png'
]

for (const file of expected) {
  const target = path.join(dir, file)
  assert.equal(fs.existsSync(target), true, `${file} should exist`)
  const signature = fs.readFileSync(target).subarray(0, 8).toString('hex')
  assert.equal(signature, '89504e470d0a1a0a', `${file} should be a PNG`)
}

const readme = fs.readFileSync(path.join(dir, 'README.md'), 'utf8')
assert.equal(readme.includes('不参与编译阶段'), true)
assert.equal(readme.includes('master-map'), true)

console.log('✅ visuals-legacy test passed')
