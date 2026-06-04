#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SUB_AGENT_IDS = [
  'industry_analysis',
  'consumer_insight',
  'competitor_analysis',
  'brand_positioning',
  'brand_building',
  'annual_planning'
];

const SXX_LAYOUTS = [
  'S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11',
  'S12', 'S13', 'S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22'
];

const SCHEME_TYPES = ['brand_positioning_case', 'brand_building_case'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveRepoPath(refPath) {
  return path.isAbsolute(refPath) ? refPath : path.join(REPO_ROOT, refPath);
}

async function readJson(jsonPath, errors) {
  try {
    return JSON.parse(await fs.readFile(jsonPath, 'utf8'));
  } catch (error) {
    errors.push(`Cannot parse JSON: ${error.message}`);
    return null;
  }
}

async function getCaseMaxSlide(caseLibraryPath, warnings) {
  const caseDir = path.dirname(resolveRepoPath(caseLibraryPath));

  try {
    const entries = await fs.readdir(caseDir);
    const slideNos = entries
      .map((entry) => {
        const match = entry.match(/^(?:slide|page)-(\d+)\.md$/);
        return match ? Number(match[1]) : null;
      })
      .filter((value) => Number.isInteger(value));

    return slideNos.length > 0 ? Math.max(...slideNos) : 0;
  } catch (error) {
    warnings.push(`Cannot scan case library: ${error.message}`);
    return 0;
  }
}

function validateTopLevel(blueprint, errors) {
  for (const field of ['blueprint_id', 'scheme_type', 'scheme_label_zh', 'target_pages', 'version', 'source_reference', 'parts']) {
    if (blueprint[field] === undefined || blueprint[field] === null || blueprint[field] === '') {
      errors.push(`Missing top-level field: ${field}`);
    }
  }

  if (blueprint.scheme_type && !SCHEME_TYPES.includes(blueprint.scheme_type)) {
    errors.push(`Invalid scheme_type: ${blueprint.scheme_type}`);
  }

  if (!Number.isInteger(blueprint.target_pages) || blueprint.target_pages <= 0) {
    errors.push(`Invalid target_pages: ${blueprint.target_pages}`);
  }

  if (!Array.isArray(blueprint.parts)) {
    errors.push('parts must be an array');
  }
}

function validateChunkThinkingFields(chunk, errors) {
  const prefix = `Chunk ${chunk.chunk_id || '?'}`;

  if (!isNonEmptyString(chunk.chunk_insight_question)) {
    errors.push(`${prefix} missing chunk_insight_question`);
  }

  if (!Number.isInteger(chunk.expected_insights_count) || chunk.expected_insights_count < 1) {
    errors.push(`${prefix} has invalid expected_insights_count`);
  }

  if (!Array.isArray(chunk.feeds_into)) {
    errors.push(`${prefix} missing feeds_into array`);
  }

  if (typeof chunk.must_yield_takeaway !== 'boolean') {
    errors.push(`${prefix} missing must_yield_takeaway boolean`);
  }

  if (!isNonEmptyString(chunk.thinking_seed)) {
    errors.push(`${prefix} missing thinking_seed`);
  }

  for (const field of ['page_count_target', 'page_count_min', 'page_count_max']) {
    if (!Number.isInteger(chunk[field]) || chunk[field] < 1) {
      errors.push(`${prefix} has invalid ${field}`);
    }
  }

  if (
    Number.isInteger(chunk.page_count_min) &&
    Number.isInteger(chunk.page_count_target) &&
    Number.isInteger(chunk.page_count_max) &&
    !(chunk.page_count_min <= chunk.page_count_target && chunk.page_count_target <= chunk.page_count_max)
  ) {
    errors.push(`${prefix} page_count_min/target/max must be ordered`);
  }

  if (!Array.isArray(chunk.self_check?.insight_quality_questions) || chunk.self_check.insight_quality_questions.length === 0) {
    errors.push(`${prefix} missing self_check.insight_quality_questions`);
  }
}

function validatePage(page, chunk, allPageNos, errors) {
  const prefix = `Page ${page.page_no || '?'} in chunk ${chunk.chunk_id}`;

  for (const field of ['page_no', 'page_intent', 'page_subtitle', 'recommended_layout', 'required_fields', 'case_reference_slide']) {
    if (page[field] === undefined || page[field] === null || page[field] === '') {
      errors.push(`${prefix} missing ${field}`);
    }
  }

  if (!Number.isInteger(page.page_no)) {
    errors.push(`${prefix} page_no must be integer`);
  } else if (allPageNos.has(page.page_no)) {
    errors.push(`Duplicate page_no: ${page.page_no}`);
  } else {
    allPageNos.add(page.page_no);
  }

  if (page.recommended_layout && !SXX_LAYOUTS.includes(page.recommended_layout)) {
    errors.push(`${prefix} has invalid recommended_layout: ${page.recommended_layout}`);
  }

  if (!Array.isArray(page.required_fields) || page.required_fields.length === 0) {
    errors.push(`${prefix} required_fields must be a non-empty array`);
  }

  if (page.concept_for_this_page && !ensureArray(chunk.allowed_concepts).includes(page.concept_for_this_page)) {
    errors.push(`${prefix} concept_for_this_page not in chunk.allowed_concepts: ${page.concept_for_this_page}`);
  }

  if (typeof page.is_optional !== 'boolean') {
    errors.push(`${prefix} missing is_optional boolean`);
  }

  if (!Number.isInteger(page.drop_priority) || page.drop_priority < 0 || page.drop_priority > 10) {
    errors.push(`${prefix} has invalid drop_priority: ${page.drop_priority}`);
  }
}

function validatePartsAndChunks(blueprint, errors, warnings) {
  const allChunks = [];
  const allPageNos = new Set();
  const chunkIds = new Set();

  if (blueprint.parts?.length !== 4) {
    warnings.push(`Expected 4 parts, got ${blueprint.parts?.length}`);
  }

  for (const part of ensureArray(blueprint.parts)) {
    for (const field of ['part_no', 'part_title', 'part_label_en', 'narrative_intent', 'cover_layout', 'chunks']) {
      if (part[field] === undefined || part[field] === null || part[field] === '') {
        errors.push(`Part ${part.part_no || '?'} missing ${field}`);
      }
    }

    if (part.cover_layout && !SXX_LAYOUTS.includes(part.cover_layout)) {
      errors.push(`Part ${part.part_no || '?'} has invalid cover_layout: ${part.cover_layout}`);
    }

    for (const chunk of ensureArray(part.chunks)) {
      allChunks.push(chunk);

      for (const field of ['chunk_id', 'chunk_title', 'driving_sub_agent', 'page_range', 'chunk_intent', 'required_inputs', 'allowed_concepts', 'upstream_chunks', 'self_check', 'pages']) {
        if (chunk[field] === undefined || chunk[field] === null || chunk[field] === '') {
          errors.push(`Chunk ${chunk.chunk_id || '?'} missing ${field}`);
        }
      }

      if (chunk.chunk_id) {
        if (chunkIds.has(chunk.chunk_id)) {
          errors.push(`Duplicate chunk_id: ${chunk.chunk_id}`);
        }
        chunkIds.add(chunk.chunk_id);
      }

      if (chunk.driving_sub_agent && !SUB_AGENT_IDS.includes(chunk.driving_sub_agent)) {
        errors.push(`Chunk ${chunk.chunk_id} has invalid driving_sub_agent: ${chunk.driving_sub_agent}`);
      }

      if (!Array.isArray(chunk.allowed_concepts) || chunk.allowed_concepts.length === 0) {
        errors.push(`Chunk ${chunk.chunk_id} allowed_concepts must be non-empty`);
      }

      if (!Array.isArray(chunk.page_range) || chunk.page_range.length !== 2) {
        errors.push(`Chunk ${chunk.chunk_id} page_range must be [start, end]`);
      } else if (!Array.isArray(chunk.pages)) {
        errors.push(`Chunk ${chunk.chunk_id} pages must be an array`);
      } else {
        const expected = chunk.page_range[1] - chunk.page_range[0] + 1;
        if (chunk.pages.length !== expected) {
          errors.push(`Chunk ${chunk.chunk_id}: page_range expects ${expected} pages but pages.length=${chunk.pages.length}`);
        }
        if (chunk.page_count_target !== chunk.pages.length) {
          errors.push(`Chunk ${chunk.chunk_id}: page_count_target=${chunk.page_count_target} but pages.length=${chunk.pages.length}`);
        }
      }

      validateChunkThinkingFields(chunk, errors);

      for (const page of ensureArray(chunk.pages)) {
        validatePage(page, chunk, allPageNos, errors);
      }
    }
  }

  const seen = new Set();
  for (const chunk of allChunks) {
    for (const upstreamId of ensureArray(chunk.upstream_chunks)) {
      if (!seen.has(upstreamId)) {
        errors.push(`Chunk ${chunk.chunk_id} references upstream ${upstreamId} that does not exist yet`);
      }
    }

    for (const downstreamId of ensureArray(chunk.feeds_into)) {
      if (!chunkIds.has(downstreamId)) {
        errors.push(`Chunk ${chunk.chunk_id} feeds_into unknown chunk: ${downstreamId}`);
      }
    }

    seen.add(chunk.chunk_id);
  }

  const totalPages = allPageNos.size;
  if (totalPages !== blueprint.target_pages) {
    errors.push(`target_pages=${blueprint.target_pages} but actual page count=${totalPages}`);
  }

  for (let pageNo = 1; pageNo <= blueprint.target_pages; pageNo += 1) {
    if (!allPageNos.has(pageNo)) {
      errors.push(`Missing page_no: ${pageNo}`);
    }
  }

  return { allChunks };
}

async function validateCaseReferences(blueprint, errors, warnings) {
  const caseLibrary = blueprint.source_reference?.case_library;

  if (!caseLibrary) {
    errors.push('source_reference.case_library is required');
    return;
  }

  const caseLibraryPath = resolveRepoPath(caseLibrary);
  try {
    await fs.access(caseLibraryPath);
  } catch {
    errors.push(`source_reference.case_library not found: ${caseLibrary}`);
    return;
  }

  const maxSlide = await getCaseMaxSlide(caseLibrary, warnings);
  if (maxSlide === 0) {
    warnings.push(`No slide/page markdown files found near ${caseLibrary}`);
    return;
  }

  for (const chunk of blueprint.parts.flatMap((part) => ensureArray(part.chunks))) {
    for (const page of ensureArray(chunk.pages)) {
      if (!Number.isInteger(page.case_reference_slide)) {
        errors.push(`Page ${page.page_no} case_reference_slide must be integer`);
      } else if (page.case_reference_slide < 1 || page.case_reference_slide > maxSlide) {
        errors.push(`Page ${page.page_no}.case_reference_slide=${page.case_reference_slide} outside case slide range 1-${maxSlide}`);
      }
    }
  }
}

async function validateBlueprint(blueprintPath) {
  const errors = [];
  const warnings = [];
  const absoluteBlueprintPath = resolveRepoPath(blueprintPath);
  const blueprint = await readJson(absoluteBlueprintPath, errors);

  if (!blueprint) {
    return { errors, warnings };
  }

  validateTopLevel(blueprint, errors);

  if (Array.isArray(blueprint.parts)) {
    validatePartsAndChunks(blueprint, errors, warnings);
  }

  await validateCaseReferences(blueprint, errors, warnings);

  return { errors, warnings };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/validate-blueprint.mjs <blueprint-path> [<another-path> ...]');
    process.exit(1);
  }

  let allPassed = true;

  for (const blueprintPath of args) {
    console.log(`\n=== Validating ${blueprintPath} ===`);
    const { errors, warnings } = await validateBlueprint(blueprintPath);

    if (errors.length === 0) {
      console.log('PASS');
    } else {
      allPassed = false;
      console.log(`${errors.length} ERROR(S):`);
      for (const error of errors) {
        console.log(`  - ${error}`);
      }
    }

    if (warnings.length > 0) {
      console.log(`${warnings.length} WARNING(S):`);
      for (const warning of warnings) {
        console.log(`  - ${warning}`);
      }
    }
  }

  process.exit(allPassed ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { validateBlueprint };
