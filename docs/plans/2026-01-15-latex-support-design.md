# LaTeX 数学公式支持设计文档

**日期**: 2026-01-15
**状态**: 已确认

## 需求概述

为 Markdown 编辑器添加 LaTeX 数学公式支持：

- **语法**: `$...$`（行内）和 `$$...$$`（块级）
- **渲染库**: KaTeX
- **工具栏**: 一个按钮带下拉菜单（行内/块级）
- **编辑器支持**: 源码编辑器、预览面板、Milkdown（WYSIWYG）
- **微信复制**: 公式转换为 PNG 图片

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      LaTeX 支持架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  src/core/markdown/                                         │
│  ├── math/                      ← 新增目录                   │
│  │   ├── index.js               ← 导出入口                   │
│  │   ├── detector.js            ← 检测 $...$ / $$...$$      │
│  │   ├── renderer.js            ← KaTeX 渲染封装             │
│  │   └── image-converter.js     ← SVG → PNG 转换            │
│  │                                                          │
│  └── parser.js                  ← 集成 math detector        │
│                                                             │
│  src/config/toolbar.js          ← 添加公式按钮               │
│                                                             │
│  src/plugins/                                               │
│  └── milkdown-math.js           ← Milkdown 数学插件         │
│                                                             │
│  src/components/                                            │
│  ├── PreviewPane.vue            ← 加载 KaTeX CSS            │
│  └── WysiwygPane.vue            ← 集成 milkdown-math        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**新增依赖**: `katex`（~200KB gzipped ~28KB）

## 详细设计

### 1. 检测与渲染逻辑

#### detector.js — LaTeX 语法检测

```javascript
// 正则表达式
const BLOCK_MATH = /\$\$([^$]+)\$\$/g      // $$...$$
const INLINE_MATH = /\$([^$\n]+)\$/g        // $...$（不跨行）

// 检测函数
export function detectMath(text) {
  return {
    hasBlockMath: BLOCK_MATH.test(text),
    hasInlineMath: INLINE_MATH.test(text)
  }
}

// 提取并替换为占位符（防止被其他格式化器处理）
export function extractMath(text) {
  const placeholders = []
  // 先处理块级（避免 $$ 被误识别为两个 $）
  // 返回 { text: 处理后文本, placeholders: [...] }
}
```

#### renderer.js — KaTeX 渲染封装

```javascript
import katex from 'katex'

export function renderMath(latex, displayMode = false) {
  try {
    return katex.renderToString(latex, {
      displayMode,          // true=块级, false=行内
      throwOnError: false,  // 错误时显示原文而非抛异常
      output: 'html'        // 输出 HTML（含内联样式）
    })
  } catch (e) {
    return `<span class="math-error">${escapeHtml(latex)}</span>`
  }
}
```

**处理顺序**: 在 `parser.js` 中，数学公式检测应在代码块处理**之后**、其他行内格式**之前**执行，避免代码块内的 `$` 被误处理。

### 2. 工具栏按钮

#### toolbar.js 新增配置

```javascript
{
  id: 'math',
  title: t('toolbar.math'),
  icon: 'M4.5 13h5l1-2h2l1 2h5...',  // Σ 或 fx 图标
  type: 'dropdown',
  items: [
    {
      id: 'math-inline',
      title: t('toolbar.mathInline'),    // "行内公式"
      icon: '...',
      action: () => editorOperations.insertInlineMath()
    },
    {
      id: 'math-block',
      title: t('toolbar.mathBlock'),     // "块级公式"
      icon: '...',
      action: () => editorOperations.insertBlockMath()
    }
  ]
}
```

#### useEditorOperations.js 新增方法

```javascript
// 行内公式：插入 $|$ 光标在中间
insertInlineMath() {
  insertTemplate('$', '$')
}

// 块级公式：插入 $$\n|\n$$ 光标在中间
insertBlockMath() {
  insertTemplate('$$\n', '\n$$')
}
```

#### i18n 新增键值

```json
// zh-CN.json
{
  "toolbar.math": "公式",
  "toolbar.mathInline": "行内公式 $...$",
  "toolbar.mathBlock": "块级公式 $$...$$"
}
```

### 3. Milkdown 集成

#### milkdown-math.js — 自定义插件

```javascript
import { $node, $inputRule } from '@milkdown/utils'
import { renderMath } from '@/core/markdown/math/renderer'

// 行内数学节点
export const inlineMathNode = $node('inline_math', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  attrs: { value: { default: '' } },
  parseDOM: [{ tag: 'span.math-inline' }],
  toDOM: (node) => ['span', {
    class: 'math-inline',
    innerHTML: renderMath(node.attrs.value, false)
  }]
}))

// 块级数学节点
export const blockMathNode = $node('block_math', () => ({
  group: 'block',
  atom: true,
  attrs: { value: { default: '' } },
  parseDOM: [{ tag: 'div.math-block' }],
  toDOM: (node) => ['div', {
    class: 'math-block',
    innerHTML: renderMath(node.attrs.value, true)
  }]
}))

// 输入规则：$...$ 和 $$...$$
export const mathInputRules = [
  $inputRule(/\$\$([^$]+)\$\$$/, blockMathNode),
  $inputRule(/\$([^$]+)\$$/, inlineMathNode)
]
```

#### WysiwygPane.vue 集成

```javascript
import { inlineMathNode, blockMathNode, mathInputRules } from '@/plugins/milkdown-math'

Editor.make()
  .use(commonmark)
  .use(gfm)
  .use(inlineMathNode)      // 新增
  .use(blockMathNode)       // 新增
  .use(mathInputRules)      // 新增
  // ...其他插件
```

**交互**: 用户输入 `$E=mc^2$` 后按空格或回车，自动渲染为公式。双击可编辑源码。

### 4. 微信复制与样式

#### image-converter.js — SVG 转 PNG

```javascript
// 复用现有 Mermaid 转换逻辑
export async function mathToImage(mathHtml) {
  // 1. 创建离屏容器渲染 KaTeX HTML
  const container = document.createElement('div')
  container.innerHTML = mathHtml
  container.style.cssText = 'position:absolute;left:-9999px;'
  document.body.appendChild(container)

  // 2. 使用 html2canvas 或 dom-to-image 转换
  const canvas = await html2canvas(container, {
    backgroundColor: null,  // 透明背景
    scale: 2               // 2x 清晰度
  })

  // 3. 转为 Base64 PNG
  const dataUrl = canvas.toDataURL('image/png')
  document.body.removeChild(container)
  return dataUrl
}
```

#### copy-formats.js 修改

```javascript
export async function copySocialFormat(html, options) {
  // 现有 Mermaid 处理...

  // 新增：处理数学公式
  const mathElements = container.querySelectorAll('.math-inline, .math-block')
  for (const el of mathElements) {
    const imgDataUrl = await mathToImage(el.outerHTML)
    const img = document.createElement('img')
    img.src = imgDataUrl
    img.alt = el.getAttribute('data-latex') || 'formula'
    el.replaceWith(img)
  }

  // 继续现有复制逻辑...
}
```

#### 样式 (styles/math.css)

```css
/* KaTeX 基础样式由 katex/dist/katex.min.css 提供 */

/* 主题适配 */
.math-inline { color: var(--theme-text-primary); }
.math-block {
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
}
.math-error {
  color: var(--theme-error);
  background: var(--theme-error-bg);
}
```

## 实现步骤概览

1. 安装 `katex` 依赖
2. 创建 `src/core/markdown/math/` 模块
3. 集成到 `parser.js` 解析管道
4. 添加工具栏按钮和 i18n
5. 创建 Milkdown 插件并集成
6. 实现微信复制图片转换
7. 添加样式文件
8. 编写测试用例

## 测试要点

- 行内公式 `$E=mc^2$` 正确渲染
- 块级公式 `$$\sum_{i=1}^n i$$` 正确渲染
- 代码块内的 `$` 不被误处理
- 复杂公式（矩阵、分数、希腊字母）正确显示
- 语法错误时显示原文而非崩溃
- 微信复制后图片正常显示
- 三个编辑器视图渲染一致
