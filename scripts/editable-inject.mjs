const TOOLBAR = `
<div id="pptmaster-edit-toolbar" style="position:fixed;top:12px;right:12px;z-index:9999;display:flex;gap:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <button id="pm-edit-toggle" style="padding:6px 14px;border:1px solid #111;background:#fff;color:#111;cursor:pointer;">编辑文字</button>
  <button id="pm-export" style="padding:6px 14px;border:1px solid #111;background:#111;color:#fff;cursor:pointer;">导出 HTML</button>
</div>
<script>
(function () {
  var editing = false
  var toggle = document.getElementById('pm-edit-toggle')
  var exportButton = document.getElementById('pm-export')
  function slides() { return document.querySelectorAll('.slide') }
  toggle.addEventListener('click', function () {
    editing = !editing
    slides().forEach(function (slide) {
      slide.setAttribute('contenteditable', editing ? 'true' : 'false')
    })
    toggle.textContent = editing ? '完成编辑' : '编辑文字'
  })
  exportButton.addEventListener('click', function () {
    slides().forEach(function (slide) { slide.removeAttribute('contenteditable') })
    var toolbar = document.getElementById('pptmaster-edit-toolbar')
    toolbar.remove()
    var blob = new Blob(['<!DOCTYPE html>\\n' + document.documentElement.outerHTML], { type: 'text/html' })
    var link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'deck-edited.html'
    link.click()
    document.body.appendChild(toolbar)
  })
})()
</script>
`

export function injectEditToolbar(html) {
  const value = String(html || '')
  const index = value.lastIndexOf('</body>')
  if (index === -1) throw new Error('No </body> in HTML, cannot inject edit toolbar')
  return value.slice(0, index) + TOOLBAR + value.slice(index)
}
