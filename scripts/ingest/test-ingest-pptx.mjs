import assert from 'node:assert/strict'
import {
  buildSlideMarkdown,
  extractImageEmbedIds,
  extractTextFromSlideXml,
  parseRelationships,
  resolveRelationshipTarget,
  sortSlideFiles
} from './ingest-pptx.mjs'

const slideXml = `
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sp><a:t>品牌定位案例</a:t><a:t>核心策略文本</a:t></p:sp>
  <p:pic><a:blip r:embed="rId7"/></p:pic>
</p:sld>`

const relsXml = `
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image12.png"/>
</Relationships>`

assert.deepEqual(extractTextFromSlideXml(slideXml), ['品牌定位案例', '核心策略文本'])
assert.deepEqual(extractImageEmbedIds(slideXml), ['rId7'])

const relationships = parseRelationships(relsXml)
assert.equal(relationships.rId7.target, '../media/image12.png')
assert.equal(resolveRelationshipTarget('ppt/slides', relationships.rId7.target), 'ppt/media/image12.png')

assert.deepEqual(
  sortSlideFiles(['slide10.xml', 'slide2.xml', 'notes.xml', 'slide1.xml']),
  ['slide1.xml', 'slide2.xml', 'slide10.xml']
)

const markdown = buildSlideMarkdown({
  slideNum: 1,
  totalSlides: 86,
  caseSlug: 'brand-positioning-cases',
  sourceName: '品牌定位案例.pptx',
  texts: ['品牌定位案例', '核心策略文本'],
  imageFiles: ['_images/slide-001-image1.png'],
  ocrText: '图片里的策略信息'
})

assert.equal(markdown.includes('title: "品牌定位案例"'), true)
assert.equal(markdown.includes('extraction: pptx-xml+image-ocr'), true)
assert.equal(markdown.includes('![slide image](_images/slide-001-image1.png)'), true)
assert.equal(markdown.includes('图片里的策略信息'), true)

console.log('✅ ingest-pptx test passed')
