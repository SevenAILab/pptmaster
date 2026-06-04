#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const script = fs.readFileSync('scripts/prelaunch-readiness.mjs', 'utf8')
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

for (const text of [
  'validateReleaseDocs',
  'validateBlueprintSystem',
  'validateDemoOutput',
  'validateSmallRigRefs',
  'validatePromptBundlePacket',
  'validateEnvSafety',
  'prelaunch readiness passed',
]) {
  assert.ok(script.includes(text), `prelaunch readiness should include ${text}`)
}

assert.equal(packageJson.scripts['prelaunch:check'], 'node scripts/prelaunch-readiness.mjs')

console.log('✅ prelaunch-readiness test passed')
