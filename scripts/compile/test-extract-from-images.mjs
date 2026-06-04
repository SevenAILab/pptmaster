import assert from 'node:assert/strict'
import {
  buildImageConceptPositions,
  inferLayerFromImageName,
  mergeImageConceptPositions
} from './extract-from-images.mjs'

const dict = {
  concepts: [
    { name: 'SWOT', aliases: ['SWOT 分析', '态势分析'], category: 'model' },
    { name: 'Brand-House', aliases: ['品牌屋'], category: 'model' },
    { name: 'Business-Model-Canvas', aliases: ['商业模式画布', 'BMC'], category: 'model' },
    { name: 'VMV', aliases: ['愿景使命价值观'], category: 'model' }
  ]
}

const positions = buildImageConceptPositions({
  image: '02-战略层.png',
  ocrText: '战略层\nSWOT 分析\n品牌屋\n商业模式设计\n品牌愿景与使命\n装饰文字',
  dict
})

assert.equal(inferLayerFromImageName('02-战略层.png'), '战略层')
assert.equal(positions.concepts.length, 4)
assert.equal(positions.concepts[0].image, '02-战略层.png')
assert.equal(positions.concepts.find(item => item.concept === 'SWOT').stage, '图片 OCR')
assert.equal(positions.concepts.find(item => item.concept === 'Business-Model-Canvas').matched_alias, '商业模式设计')

const merged = mergeImageConceptPositions({
  candidates: {
    concepts: [
      { concept: 'SWOT', category: 'model', aliases: [], occurrences: [], occurrence_count: 0 }
    ]
  },
  imageExtract: positions
})

assert.equal(merged.merged, 1)
assert.equal(merged.added, 3)
assert.equal(merged.candidates.concepts.find(item => item.concept === 'SWOT').occurrences.length, 1)
assert.equal(merged.candidates.concepts.find(item => item.concept === 'Brand-House').occurrences.length, 1)
assert.equal(merged.candidates.concepts.find(item => item.concept === 'VMV').occurrences.length, 1)

console.log('✅ extract-from-images test passed')
