#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { validateBlueprint } from './validate-blueprint.mjs';

const POSITIONING_BLUEPRINT = 'assets/_compiled/blueprints/brand-positioning-deck-v1.json';
const BUILDING_BLUEPRINT = 'assets/_compiled/blueprints/brand-building-deck-v1.json';

async function testValidBlueprintsPass() {
  for (const blueprintPath of [POSITIONING_BLUEPRINT, BUILDING_BLUEPRINT]) {
    const result = await validateBlueprint(blueprintPath);
    assert.deepEqual(result.errors, [], `${blueprintPath} should have no validation errors`);
  }
}

async function testMissingThinkingFieldFails() {
  const source = JSON.parse(await fs.readFile(POSITIONING_BLUEPRINT, 'utf8'));
  delete source.parts[0].chunks[0].chunk_insight_question;

  const tempPath = path.join(tmpdir(), `invalid-blueprint-${Date.now()}.json`);
  await fs.writeFile(tempPath, `${JSON.stringify(source, null, 2)}\n`);

  const result = await validateBlueprint(tempPath);
  assert.ok(
    result.errors.some((error) => error.includes('chunk_insight_question')),
    'validator should require v1.1 thinking fields'
  );

  await fs.rm(tempPath, { force: true });
}

async function testConceptWhitelistFails() {
  const source = JSON.parse(await fs.readFile(BUILDING_BLUEPRINT, 'utf8'));
  source.parts[0].chunks[0].pages[0].concept_for_this_page = 'Not-In-Whitelist';

  const tempPath = path.join(tmpdir(), `invalid-blueprint-concept-${Date.now()}.json`);
  await fs.writeFile(tempPath, `${JSON.stringify(source, null, 2)}\n`);

  const result = await validateBlueprint(tempPath);
  assert.ok(
    result.errors.some((error) => error.includes('concept_for_this_page not in chunk.allowed_concepts')),
    'validator should enforce page concept whitelist'
  );

  await fs.rm(tempPath, { force: true });
}

await testValidBlueprintsPass();
await testMissingThinkingFieldFails();
await testConceptWhitelistFails();

console.log('PASS validate-blueprint tests');
