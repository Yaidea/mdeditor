# src/core/ 目录重构设计

## 背景

`src/core/` 目录层级过深（最深 4 层）、文件数量多（49 个）、设计过度工程化（7 个策略类处理简单行级解析）。需要综合优化，提高代码可读性。

## 设计目标

1. **减少层级深度**：从 4 层降到 2 层
2. **减少文件数量**：从 49 个降到 13 个（减少 73%）
3. **简化设计模式**：去掉过度抽象
4. **提高可读性**：不人为制造阅读障碍

## 重构后结构

```
src/core/               # 13 个文件
├── editor/
│   ├── operations.js   # 编辑操作（保持不变）
│   ├── clipboard.js    # 剪贴板（保持不变）
│   └── copy-formats.js # 复制格式（更新 import）
├── markdown/
│   ├── parser.js           # 解析主入口（合并 coordinator + strategies）
│   ├── inline-formatter.js # 内联格式化（合并 6 个 formatter）
│   ├── code-formatter.js   # 代码高亮（依赖 Prism）
│   └── social-adapters.js  # 社交平台适配器
├── theme/
│   ├── manager.js      # CSS 变量管理
│   ├── storage.js      # localStorage 持久化
│   └── loader.js       # FOUC 防护
└── index.js

src/config/
└── theme-presets.js    # 主题预设数据（从 core/theme/presets/ 迁移）
```

## 详细设计

### 1. markdown/parser.js

**职责**：接收 Markdown 文本，输出带样式的 HTML

**核心改变**：
- 去掉 `FormatterCoordinator`、`FormatterContext`、7 个策略类
- 一个 `processLine()` 函数用清晰的 if-else 处理所有行类型
- 状态放在简单的 `context` 对象里

```javascript
export function parseMarkdown(text, options = {}) {
  const context = createContext(options)
  const lines = text.split('\n')
  const outputLines = []

  for (const line of lines) {
    outputLines.push(processLine(line, context))
  }

  let html = outputLines.join('\n')
  html = applyThemeStyles(html, context.theme)
  html = applyFontStyles(html, context.font)

  if (options.socialPlatform) {
    html = applySocialAdapter(html, options.socialPlatform)
  }

  return html
}

function processLine(line, context) {
  if (context.inCodeBlock) return handleCodeBlockContent(line, context)
  if (isCodeBlockFence(line)) return handleCodeBlockStart(line, context)
  if (isEmpty(line)) return handleEmptyLine(context)
  if (isTableRow(line, context)) return handleTable(line, context)
  if (isListItem(line)) return handleList(line, context)
  if (isBlockquote(line)) return handleBlockquote(line, context)
  if (isHeading(line)) return handleHeading(line, context)
  return handleParagraph(line, context)
}
```

### 2. markdown/inline-formatter.js

**职责**：处理行内语法（bold、italic、link、escape 等）

**合并来源**：
- `formatters/escape.js`
- `formatters/style.js`
- `formatters/link.js`
- `formatters/special.js`
- `formatters/text.js`
- `formatters/legacy.js`（blockquote 相关移到 parser.js）

```javascript
export function formatInline(text, options = {}) {
  let result = text

  result = escapeHtml(result)
  result = processCodeSpans(result)
  result = processLinks(result)
  result = processImages(result)
  result = processBold(result)
  result = processItalic(result)
  result = processStrikethrough(result)
  result = processHighlight(result)
  result = processSubscript(result)
  result = processSuperscript(result)
  result = processKeyboard(result)
  result = restoreEscapes(result)

  return result
}
```

### 3. markdown/code-formatter.js

**职责**：代码块语法高亮（依赖 Prism）

```javascript
export function highlightCode(code, language = '') {
  const lang = normalizeLanguage(language)
  if (!lang || !Prism.languages[lang]) {
    return escapeHtml(code)
  }
  return Prism.highlight(code, Prism.languages[lang], lang)
}

export function formatCodeBlock(code, language, options = {}) {
  const highlighted = highlightCode(code, language)
  return `<pre class="code-block" data-lang="${language}"><code>${highlighted}</code></pre>`
}
```

### 4. markdown/social-adapters.js

**职责**：不同社交平台的 HTML 适配

```javascript
export function applySocialAdapter(html, platform = 'wechat') {
  const adapters = {
    wechat: wechatAdapter,
    zhihu: zhihuAdapter,
    juejin: juejinAdapter,
  }
  const adapter = adapters[platform] || adapters.wechat
  return adapter(html)
}

function wechatAdapter(html) {
  let result = html
  result = addInlineStyles(result)
  result = convertColorVariables(result)
  result = fixImageStyles(result)
  return result
}
```

### 5. theme/ 模块

保留 3 个核心文件：
- `manager.js`：CSS 变量管理器（合并 variables.js）
- `storage.js`：localStorage 持久化
- `loader.js`：FOUC 防护（原 theme-loader.js）

### 6. config/theme-presets.js

预设数据迁移到配置层：

```javascript
export const colorThemes = {
  chijin: { name: '赤金', primary: '#b8860b', /* ... */ },
  dianlan: { /* ... */ },
  // ...
}

export const codeStyles = { /* ... */ }
export const typographySystems = { /* ... */ }
export const fontPresets = { /* ... */ }

export function getTheme(name) { /* ... */ }
export function getCodeStyle(name) { /* ... */ }
```

## 文件变更清单

| 操作 | 文件路径 |
|------|----------|
| 新建 | `src/core/markdown/parser.js` |
| 新建 | `src/core/markdown/inline-formatter.js` |
| 新建 | `src/core/markdown/code-formatter.js` |
| 新建 | `src/core/markdown/social-adapters.js` |
| 新建 | `src/config/theme-presets.js` |
| 重命名 | `theme/theme-loader.js` → `theme/loader.js` |
| 合并 | `theme/variables.js` → `theme/manager.js` |
| 更新 | `src/core/index.js` |
| 更新 | `src/core/editor/copy-formats.js`（import 路径） |
| 删除 | `src/core/markdown/parser/`（整个目录） |
| 删除 | `src/core/markdown/formatters/`（整个目录） |
| 删除 | `src/core/markdown/processors/`（整个目录） |
| 删除 | `src/core/markdown/post-processors/`（整个目录） |
| 删除 | `src/core/theme/presets/`（整个目录） |
| 删除 | `src/core/theme/variables.js` |

## 测试策略

1. **保持测试用例不变**：只改 import 路径
2. **合并测试文件**：与源码结构对应
3. **运行完整测试套件**：确保无回归

## 风险评估

- **低风险**：文件合并操作，逻辑不变
- **需注意**：import 路径更新要全面覆盖（组件、composables）
