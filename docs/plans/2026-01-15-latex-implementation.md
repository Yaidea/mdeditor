# LaTeX 数学公式支持实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Markdown 编辑器添加 LaTeX 数学公式支持（`$...$` 行内 / `$$...$$` 块级）

**Architecture:** 在 `core/markdown/math/` 创建独立模块处理 LaTeX 检测和渲染，集成到现有解析管道。工具栏添加下拉按钮，Milkdown 通过自定义插件支持，微信复制时将公式转为 PNG 图片。

**Tech Stack:** KaTeX（渲染）、html2canvas（图片转换）、Milkdown（WYSIWYG）

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装 KaTeX 和 html2canvas**

```bash
cd /Users/helong/Desktop/front-end\ projects/mdeditor/.worktrees/feature-latex
npm install katex html2canvas
```

**Step 2: 验证安装**

```bash
npm list katex html2canvas
```

Expected: 显示 katex 和 html2canvas 版本

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add katex and html2canvas dependencies"
```

---

## Task 2: 创建 math 核心模块 - detector

**Files:**
- Create: `src/core/markdown/math/detector.js`
- Create: `tests/core/markdown/math/detector.test.js`

**Step 1: 写测试**

```javascript
// tests/core/markdown/math/detector.test.js
import { describe, it, expect } from 'vitest'
import { detectMath, extractMath, restoreMath } from '@/core/markdown/math/detector.js'

describe('detectMath', () => {
  it('检测行内公式 $...$', () => {
    const result = detectMath('这是 $E=mc^2$ 公式')
    expect(result.hasInlineMath).toBe(true)
    expect(result.hasBlockMath).toBe(false)
  })

  it('检测块级公式 $$...$$', () => {
    const result = detectMath('公式：\n$$\\sum_{i=1}^n i$$')
    expect(result.hasBlockMath).toBe(true)
  })

  it('不检测代码块内的 $', () => {
    const result = detectMath('`$price`')
    expect(result.hasInlineMath).toBe(false)
  })

  it('不跨行匹配行内公式', () => {
    const result = detectMath('$a\nb$')
    expect(result.hasInlineMath).toBe(false)
  })
})

describe('extractMath', () => {
  it('提取行内公式并替换为占位符', () => {
    const { text, placeholders } = extractMath('$E=mc^2$ 是质能方程')
    expect(text).toContain('MATH_INLINE_0')
    expect(placeholders).toHaveLength(1)
    expect(placeholders[0].latex).toBe('E=mc^2')
    expect(placeholders[0].displayMode).toBe(false)
  })

  it('提取块级公式', () => {
    const { text, placeholders } = extractMath('$$\\int_0^1 x dx$$')
    expect(text).toContain('MATH_BLOCK_0')
    expect(placeholders[0].displayMode).toBe(true)
  })

  it('先提取块级再提取行内，避免 $$ 被误识别', () => {
    const { placeholders } = extractMath('$$a$$ and $b$')
    expect(placeholders).toHaveLength(2)
    expect(placeholders[0].displayMode).toBe(true)
    expect(placeholders[1].displayMode).toBe(false)
  })
})

describe('restoreMath', () => {
  it('将占位符替换回渲染后的 HTML', () => {
    const placeholders = [
      { id: 'MATH_INLINE_0', latex: 'x', displayMode: false, html: '<span class="math-inline">x</span>' }
    ]
    const result = restoreMath('公式 MATH_INLINE_0 结束', placeholders)
    expect(result).toContain('math-inline')
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm run test:run -- tests/core/markdown/math/detector.test.js
```

Expected: FAIL（模块不存在）

**Step 3: 实现 detector.js**

```javascript
// src/core/markdown/math/detector.js
/**
 * @file src/core/markdown/math/detector.js
 * @description LaTeX 数学公式检测与提取
 */

// 块级公式：$$...$$ (可跨行)
const BLOCK_MATH_REGEX = /\$\$([\s\S]+?)\$\$/g
// 行内公式：$...$ (不跨行，不匹配 $$)
const INLINE_MATH_REGEX = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g

/**
 * 检测文本中是否包含数学公式
 * @param {string} text - 输入文本
 * @returns {{ hasInlineMath: boolean, hasBlockMath: boolean }}
 */
export function detectMath(text) {
  if (!text) return { hasInlineMath: false, hasBlockMath: false }

  // 先移除代码块和行内代码，避免误检测
  const withoutCode = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')

  return {
    hasBlockMath: BLOCK_MATH_REGEX.test(withoutCode),
    hasInlineMath: INLINE_MATH_REGEX.test(withoutCode.replace(/\$\$[\s\S]+?\$\$/g, ''))
  }
}

/**
 * 提取数学公式并替换为占位符
 * @param {string} text - 输入文本
 * @returns {{ text: string, placeholders: Array<{ id: string, latex: string, displayMode: boolean }> }}
 */
export function extractMath(text) {
  if (!text) return { text: '', placeholders: [] }

  const placeholders = []
  let result = text
  let blockIndex = 0
  let inlineIndex = 0

  // 先处理块级公式（避免 $$ 被误识别为两个 $）
  result = result.replace(BLOCK_MATH_REGEX, (match, latex) => {
    const id = `MATH_BLOCK_${blockIndex++}`
    placeholders.push({ id, latex: latex.trim(), displayMode: true })
    return id
  })

  // 再处理行内公式
  result = result.replace(INLINE_MATH_REGEX, (match, latex) => {
    const id = `MATH_INLINE_${inlineIndex++}`
    placeholders.push({ id, latex: latex.trim(), displayMode: false })
    return id
  })

  return { text: result, placeholders }
}

/**
 * 将占位符替换回渲染后的 HTML
 * @param {string} text - 含占位符的文本
 * @param {Array<{ id: string, html: string }>} placeholders - 占位符数组（需已渲染 html）
 * @returns {string}
 */
export function restoreMath(text, placeholders) {
  if (!text || !placeholders?.length) return text

  let result = text
  for (const p of placeholders) {
    result = result.replace(p.id, p.html || '')
  }
  return result
}
```

**Step 4: 运行测试确认通过**

```bash
npm run test:run -- tests/core/markdown/math/detector.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/markdown/math/detector.js tests/core/markdown/math/detector.test.js
git commit -m "feat(math): add LaTeX formula detector module"
```

---

## Task 3: 创建 math 核心模块 - renderer

**Files:**
- Create: `src/core/markdown/math/renderer.js`
- Create: `tests/core/markdown/math/renderer.test.js`

**Step 1: 写测试**

```javascript
// tests/core/markdown/math/renderer.test.js
import { describe, it, expect } from 'vitest'
import { renderMath, renderMathPlaceholders } from '@/core/markdown/math/renderer.js'

describe('renderMath', () => {
  it('渲染行内公式', () => {
    const html = renderMath('E=mc^2', false)
    expect(html).toContain('katex')
    expect(html).toContain('E')
  })

  it('渲染块级公式', () => {
    const html = renderMath('\\sum_{i=1}^n i', true)
    expect(html).toContain('katex-display')
  })

  it('语法错误时返回错误提示', () => {
    const html = renderMath('\\invalid{', false)
    expect(html).toContain('math-error')
  })

  it('空输入返回空字符串', () => {
    expect(renderMath('', false)).toBe('')
    expect(renderMath(null, false)).toBe('')
  })
})

describe('renderMathPlaceholders', () => {
  it('为占位符数组添加渲染后的 html', () => {
    const placeholders = [
      { id: 'MATH_INLINE_0', latex: 'x^2', displayMode: false }
    ]
    const result = renderMathPlaceholders(placeholders)
    expect(result[0].html).toContain('katex')
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm run test:run -- tests/core/markdown/math/renderer.test.js
```

Expected: FAIL

**Step 3: 实现 renderer.js**

```javascript
// src/core/markdown/math/renderer.js
/**
 * @file src/core/markdown/math/renderer.js
 * @description KaTeX 渲染封装
 */

import katex from 'katex'
import { escapeHtml } from '../../../shared/utils/text.js'

/**
 * 渲染单个 LaTeX 公式为 HTML
 * @param {string} latex - LaTeX 源码
 * @param {boolean} displayMode - true 为块级，false 为行内
 * @returns {string} HTML 字符串
 */
export function renderMath(latex, displayMode = false) {
  if (!latex) return ''

  try {
    const html = katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
      trust: false
    })

    // 添加 data-latex 属性，便于复制时获取原始公式
    const wrapperClass = displayMode ? 'math-block' : 'math-inline'
    return `<span class="${wrapperClass}" data-latex="${escapeHtml(latex)}">${html}</span>`
  } catch (e) {
    // 渲染失败时显示原始公式
    return `<span class="math-error" title="公式语法错误">${escapeHtml(latex)}</span>`
  }
}

/**
 * 批量渲染占位符数组
 * @param {Array<{ id: string, latex: string, displayMode: boolean }>} placeholders
 * @returns {Array<{ id: string, latex: string, displayMode: boolean, html: string }>}
 */
export function renderMathPlaceholders(placeholders) {
  if (!placeholders?.length) return []

  return placeholders.map(p => ({
    ...p,
    html: renderMath(p.latex, p.displayMode)
  }))
}
```

**Step 4: 运行测试确认通过**

```bash
npm run test:run -- tests/core/markdown/math/renderer.test.js
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/markdown/math/renderer.js tests/core/markdown/math/renderer.test.js
git commit -m "feat(math): add KaTeX renderer module"
```

---

## Task 4: 创建 math 模块入口

**Files:**
- Create: `src/core/markdown/math/index.js`

**Step 1: 创建入口文件**

```javascript
// src/core/markdown/math/index.js
/**
 * @file src/core/markdown/math/index.js
 * @description 数学公式模块统一导出
 */

export { detectMath, extractMath, restoreMath } from './detector.js'
export { renderMath, renderMathPlaceholders } from './renderer.js'

/**
 * 处理文本中的数学公式（提取 + 渲染 + 还原）
 * @param {string} text - 输入文本
 * @returns {string} 处理后的文本
 */
export function processMath(text) {
  if (!text) return ''

  const { extractMath } = require('./detector.js')
  const { renderMathPlaceholders } = require('./renderer.js')
  const { restoreMath } = require('./detector.js')

  const { text: extractedText, placeholders } = extractMath(text)
  if (!placeholders.length) return text

  const renderedPlaceholders = renderMathPlaceholders(placeholders)
  return restoreMath(extractedText, renderedPlaceholders)
}
```

**Step 2: Commit**

```bash
git add src/core/markdown/math/index.js
git commit -m "feat(math): add module entry point"
```

---

## Task 5: 集成到 inline-formatter

**Files:**
- Modify: `src/core/markdown/inline-formatter.js`
- Create: `tests/core/markdown/math-integration.test.js`

**Step 1: 写集成测试**

```javascript
// tests/core/markdown/math-integration.test.js
import { describe, it, expect } from 'vitest'
import { formatInline } from '@/core/markdown/inline-formatter.js'

describe('formatInline with math', () => {
  it('渲染行内公式', () => {
    const result = formatInline('公式 $E=mc^2$ 结束')
    expect(result).toContain('math-inline')
    expect(result).toContain('katex')
  })

  it('渲染块级公式', () => {
    const result = formatInline('$$\\sum_{i=1}^n i$$')
    expect(result).toContain('math-block')
  })

  it('代码块内的 $ 不被处理', () => {
    const result = formatInline('`$price = 100`')
    expect(result).not.toContain('math-inline')
    expect(result).toContain('$price')
  })

  it('公式与其他格式混合', () => {
    const result = formatInline('**粗体** $x^2$ _斜体_')
    expect(result).toContain('<strong>')
    expect(result).toContain('math-inline')
    expect(result).toContain('<em>')
  })
})
```

**Step 2: 运行测试确认失败**

```bash
npm run test:run -- tests/core/markdown/math-integration.test.js
```

Expected: FAIL

**Step 3: 修改 inline-formatter.js**

在 `src/core/markdown/inline-formatter.js` 的 `processAllInlineFormats` 或 `formatInline` 函数中，在处理其他格式之前先处理数学公式。

找到 `formatInline` 函数，在处理流程开始处添加：

```javascript
// 在文件顶部添加导入
import { extractMath, restoreMath, renderMathPlaceholders } from './math/index.js'

// 在 formatInline 函数内部，处理其他格式之前：
export function formatInline(text) {
  if (!text) return ''

  // 1. 先提取数学公式，避免被其他格式化器处理
  const { text: textWithoutMath, placeholders: mathPlaceholders } = extractMath(text)

  // 2. 处理转义等其他逻辑...
  let result = textWithoutMath
  // ... 现有处理逻辑 ...

  // 3. 最后还原数学公式
  if (mathPlaceholders.length > 0) {
    const renderedMath = renderMathPlaceholders(mathPlaceholders)
    result = restoreMath(result, renderedMath)
  }

  return result
}
```

**Step 4: 运行测试确认通过**

```bash
npm run test:run -- tests/core/markdown/math-integration.test.js
```

Expected: PASS

**Step 5: 运行全部测试确保没有破坏现有功能**

```bash
npm run test:run
```

Expected: All tests pass

**Step 6: Commit**

```bash
git add src/core/markdown/inline-formatter.js tests/core/markdown/math-integration.test.js
git commit -m "feat(math): integrate LaTeX rendering into inline formatter"
```

---

## Task 6: 添加 i18n 键值

**Files:**
- Modify: `src/locales/zh-CN.json`
- Modify: `src/locales/en.json`

**Step 1: 修改 zh-CN.json**

在 `toolbar` 部分添加：

```json
"math": "公式",
"mathInline": "行内公式 $...$",
"mathBlock": "块级公式 $$...$$"
```

**Step 2: 修改 en.json**

```json
"math": "Formula",
"mathInline": "Inline Formula $...$",
"mathBlock": "Block Formula $$...$$"
```

**Step 3: Commit**

```bash
git add src/locales/zh-CN.json src/locales/en.json
git commit -m "feat(i18n): add math formula toolbar labels"
```

---

## Task 7: 添加编辑器操作方法

**Files:**
- Modify: `src/core/editor/operations.js`

**Step 1: 在 operations.js 添加数学公式操作**

在文件末尾的 `toolbarOperations` 对象中添加：

```javascript
// 在 toolbarOperations 对象中添加
inlineMath: (editorView) => {
  insertInlineFormat(editorView, '$', '$', PLACEHOLDER_TEXT.FORMULA || '公式')
},

blockMath: (editorView) => {
  const { state } = editorView
  const selection = state.selection.main
  const selectedText = state.doc.sliceString(selection.from, selection.to)
  const content = selectedText || (PLACEHOLDER_TEXT.FORMULA || '公式')
  const newText = `$$\n${content}\n$$`

  editorView.dispatch({
    changes: { from: selection.from, to: selection.to, insert: newText },
    selection: { anchor: selection.from + 3, head: selection.from + 3 + content.length }
  })
}
```

**Step 2: 在 constants 中添加占位符（如果需要）**

在 `src/config/constants/index.js` 的 `PLACEHOLDER_TEXT` 添加：

```javascript
FORMULA: '公式'
```

**Step 3: Commit**

```bash
git add src/core/editor/operations.js src/config/constants/index.js
git commit -m "feat(editor): add inline and block math operations"
```

---

## Task 8: 添加工具栏按钮

**Files:**
- Modify: `src/config/toolbar.js`

**Step 1: 在 toolbar.js 添加公式按钮组**

在代码组后面添加新的分割线和公式组：

```javascript
// 在代码组 (codeBlock) 之后添加

// 分割线
{ type: 'divider' },

// 公式组
{
  type: 'group',
  items: [
    {
      id: 'math',
      title: t('toolbar.math'),
      icon: 'M11.5,2C8.47,2 6,4.47 6,7.5C6,10.53 8.47,13 11.5,13H12.5V15H11.5C8.47,15 6,17.47 6,20.5C6,21.32 6.18,22.09 6.5,22.78L8.09,22.08C7.87,21.58 7.75,21.05 7.75,20.5C7.75,18.43 9.43,16.75 11.5,16.75H12.5V22H14.25V16.75H15.31L18.31,22H20.37L17.12,16.5C18.77,15.95 20,14.4 20,12.5C20,10.07 18.07,8.14 15.64,8.14H14.25V2H12.5V8.14H11.5C9.43,8.14 7.75,6.46 7.75,4.39C7.75,4.04 7.79,3.71 7.86,3.39L6.31,2.84C6.11,3.34 6,3.86 6,4.39C6,4.74 6.04,5.07 6.1,5.39',
      type: 'dropdown',
      items: [
        {
          id: 'mathInline',
          title: t('toolbar.mathInline'),
          action: () => editorOperations.inlineMath()
        },
        {
          id: 'mathBlock',
          title: t('toolbar.mathBlock'),
          action: () => editorOperations.blockMath()
        }
      ]
    }
  ]
}
```

注意：icon 路径使用 Sigma (Σ) 符号的 SVG path，可以使用 Material Design Icons 的 sigma 图标。

**Step 2: Commit**

```bash
git add src/config/toolbar.js
git commit -m "feat(toolbar): add math formula dropdown button"
```

---

## Task 9: 添加 KaTeX CSS 样式

**Files:**
- Modify: `src/styles/main.css` 或创建 `src/styles/math.css`
- Modify: `index.html` 或动态导入

**Step 1: 在 main.css 导入 KaTeX 样式**

```css
/* 在 main.css 顶部添加 */
@import 'katex/dist/katex.min.css';

/* 数学公式样式 */
.math-inline {
  display: inline-block;
  vertical-align: middle;
}

.math-block {
  display: block;
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
}

.math-error {
  color: var(--theme-error, #dc3545);
  background: var(--theme-error-bg, #fff5f5);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}
```

**Step 2: Commit**

```bash
git add src/styles/main.css
git commit -m "feat(styles): add KaTeX CSS and math formula styles"
```

---

## Task 10: 微信复制图片转换

**Files:**
- Create: `src/core/markdown/math/image-converter.js`
- Modify: `src/core/editor/copy-formats.js`

**Step 1: 创建 image-converter.js**

```javascript
// src/core/markdown/math/image-converter.js
/**
 * @file src/core/markdown/math/image-converter.js
 * @description 数学公式转图片（用于微信复制）
 */

import html2canvas from 'html2canvas'
import { DOMUtils } from '../../../shared/utils/dom.js'

/**
 * 将数学公式 HTML 转换为 PNG 图片
 * @param {HTMLElement} element - 数学公式元素
 * @returns {Promise<string>} Base64 图片 URL
 */
export async function mathToImage(element) {
  // 创建离屏容器
  const container = DOMUtils.createOffscreenContainer('', 'fixed')
  container.style.background = 'transparent'
  container.style.padding = '8px'

  // 克隆元素到离屏容器
  const clone = element.cloneNode(true)
  clone.style.display = 'inline-block'
  container.appendChild(clone)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      logging: false
    })

    return canvas.toDataURL('image/png')
  } finally {
    DOMUtils.safeRemove(container)
  }
}

/**
 * 批量将容器内的数学公式转为图片
 * @param {HTMLElement} container - 包含公式的容器
 */
export async function convertMathToImages(container) {
  const mathElements = container.querySelectorAll('.math-inline, .math-block')

  for (const el of mathElements) {
    try {
      const dataUrl = await mathToImage(el)
      const img = document.createElement('img')
      img.src = dataUrl
      img.alt = el.getAttribute('data-latex') || 'formula'
      img.style.verticalAlign = 'middle'
      if (el.classList.contains('math-block')) {
        img.style.display = 'block'
        img.style.margin = '1em auto'
      }
      el.replaceWith(img)
    } catch (e) {
      console.warn('数学公式转图片失败：', e)
    }
  }
}
```

**Step 2: 修改 copy-formats.js**

在 `copySocialFormat` 函数中，在 Mermaid 处理之后添加数学公式处理：

```javascript
// 在 renderMermaidInContainer 调用之后添加
import { convertMathToImages } from '../markdown/math/image-converter.js'

// 在 copySocialFormat 函数中，Mermaid 处理后：
await convertMathToImages(container)
```

**Step 3: Commit**

```bash
git add src/core/markdown/math/image-converter.js src/core/editor/copy-formats.js
git commit -m "feat(math): add math to image conversion for WeChat copy"
```

---

## Task 11: Milkdown 数学公式插件

**Files:**
- Create: `src/plugins/milkdown-math.js`
- Modify: `src/components/WysiwygPane.vue`

**Step 1: 创建 milkdown-math.js**

```javascript
// src/plugins/milkdown-math.js
/**
 * @file src/plugins/milkdown-math.js
 * @description Milkdown 数学公式插件
 */

import { $node, $inputRule, $remark } from '@milkdown/utils'
import { renderMath } from '../core/markdown/math/renderer.js'
import remarkMath from 'remark-math'

// 使用 remark-math 解析数学语法
export const mathRemarkPlugin = $remark('math', () => remarkMath)

// 行内数学节点
export const inlineMathNode = $node('inlineMath', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: {
    value: { default: '' }
  },
  parseDOM: [{
    tag: 'span.math-inline',
    getAttrs: (dom) => ({ value: dom.getAttribute('data-latex') || '' })
  }],
  toDOM: (node) => {
    const span = document.createElement('span')
    span.className = 'math-inline'
    span.setAttribute('data-latex', node.attrs.value)
    span.innerHTML = renderMath(node.attrs.value, false)
    return span
  },
  parseMarkdown: {
    match: (node) => node.type === 'inlineMath',
    runner: (state, node, type) => {
      state.addNode(type, { value: node.value })
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === 'inlineMath',
    runner: (state, node) => {
      state.addNode('inlineMath', undefined, node.attrs.value)
    }
  }
}))

// 块级数学节点
export const blockMathNode = $node('mathBlock', () => ({
  group: 'block',
  atom: true,
  attrs: {
    value: { default: '' }
  },
  parseDOM: [{
    tag: 'div.math-block',
    getAttrs: (dom) => ({ value: dom.getAttribute('data-latex') || '' })
  }],
  toDOM: (node) => {
    const div = document.createElement('div')
    div.className = 'math-block'
    div.setAttribute('data-latex', node.attrs.value)
    div.innerHTML = renderMath(node.attrs.value, true)
    return div
  },
  parseMarkdown: {
    match: (node) => node.type === 'math',
    runner: (state, node, type) => {
      state.addNode(type, { value: node.value })
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === 'mathBlock',
    runner: (state, node) => {
      state.addNode('math', undefined, node.attrs.value)
    }
  }
}))
```

**Step 2: 安装 remark-math**

```bash
npm install remark-math
```

**Step 3: 修改 WysiwygPane.vue**

```javascript
// 在 imports 中添加
import { mathRemarkPlugin, inlineMathNode, blockMathNode } from '../plugins/milkdown-math.js'

// 在 Editor.make() 链中添加
.use(mathRemarkPlugin)
.use(inlineMathNode)
.use(blockMathNode)
```

**Step 4: Commit**

```bash
git add src/plugins/milkdown-math.js src/components/WysiwygPane.vue package.json package-lock.json
git commit -m "feat(milkdown): add math formula plugin for WYSIWYG editor"
```

---

## Task 12: 最终测试和清理

**Files:**
- Run all tests

**Step 1: 运行全部测试**

```bash
npm run test:run
```

Expected: All tests pass

**Step 2: 启动开发服务器手动测试**

```bash
npm run dev
```

测试场景：
1. 在编辑器输入 `$E=mc^2$`，预览区显示渲染后的公式
2. 在编辑器输入 `$$\sum_{i=1}^n i$$`，预览区显示块级公式
3. 点击工具栏公式按钮，选择行内/块级
4. 在 WYSIWYG 模式下输入公式
5. 复制到微信公众号，公式显示为图片

**Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat(math): complete LaTeX math formula support"
```

---

## 检查清单

- [ ] Task 1: 安装 KaTeX 和 html2canvas 依赖
- [ ] Task 2: 创建 detector.js 及测试
- [ ] Task 3: 创建 renderer.js 及测试
- [ ] Task 4: 创建 math/index.js 入口
- [ ] Task 5: 集成到 inline-formatter
- [ ] Task 6: 添加 i18n 键值
- [ ] Task 7: 添加编辑器操作方法
- [ ] Task 8: 添加工具栏按钮
- [ ] Task 9: 添加 KaTeX CSS 样式
- [ ] Task 10: 微信复制图片转换
- [ ] Task 11: Milkdown 数学公式插件
- [ ] Task 12: 最终测试和清理
