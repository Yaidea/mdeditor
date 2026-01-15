# src/core 重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 src/core 从 49 个文件/4 层目录简化为 13 个文件/2 层目录，提高代码可读性

**Architecture:** 合并策略类为单文件函数，合并 formatters 为 2 个文件，主题预设迁移到 config 层

**Tech Stack:** JavaScript ES6+, Vitest

---

## Task 1: 创建 config/theme-presets.js

**目标：** 将主题预设从 `core/theme/presets/` 迁移到 `config/` 层

**Files:**

- Create: `src/config/theme-presets.js`
- Reference: `src/core/theme/presets/color-themes.js`
- Reference: `src/core/theme/presets/code-styles.js`
- Reference: `src/core/theme/presets/theme-systems.js`
- Reference: `src/core/theme/presets/font-settings.js`

**Step 1: 创建合并后的预设文件**

将 4 个预设文件内容合并到 `src/config/theme-presets.js`，保持所有导出：

- `colorThemes` 对象
- `codeStyles` 对象
- `themeSystems` 对象
- `fontSettings` 对象
- `getColorTheme(id)` 函数
- `getCodeStyle(id)` 函数
- `getThemeSystem(id)` 函数
- `defaultColorTheme` 导出

**Step 2: 运行测试验证**

```bash
npm run test:run -- tests/core/theme/
```

Expected: 测试通过（预设数据未变）

**Step 3: 提交**

```bash
git add src/config/theme-presets.js
git commit -m "refactor(config): migrate theme presets to config layer"
```

---

## Task 2: 重构 theme 模块

**目标：** 简化 `core/theme/` 结构，合并 variables.js 到 manager.js

**Files:**

- Modify: `src/core/theme/manager.js`
- Rename: `src/core/theme/theme-loader.js` → `src/core/theme/loader.js`
- Modify: `src/core/theme/index.js`
- Delete: `src/core/theme/variables.js`
- Delete: `src/core/theme/presets/` (整个目录)

**Step 1: 合并 variables.js 到 manager.js**

将 `hexToRgb()` 和 `computeThemeVariables()` 函数移到 manager.js 内部

**Step 2: 更新 manager.js 的 import**

移除对 `./variables.js` 的导入，改用内部函数

**Step 3: 更新 manager.js 对预设的引用**

```javascript
// 旧
import { defaultColorTheme } from './presets/color-themes.js';
// 新
import { defaultColorTheme } from '../../config/theme-presets.js';
```

**Step 4: 重命名 theme-loader.js**

```bash
git mv src/core/theme/theme-loader.js src/core/theme/loader.js
```

**Step 5: 更新 index.js 导出**

```javascript
export { cssManager } from './manager.js';
export { ThemeStorage, STORAGE_KEYS, STORAGE_DEFAULTS } from './storage.js';
export { loadThemeEarly } from './loader.js';
```

**Step 6: 删除旧文件**

```bash
rm src/core/theme/variables.js
rm -rf src/core/theme/presets/
```

**Step 7: 运行测试**

```bash
npm run test:run -- tests/core/theme/
```

**Step 8: 提交**

```bash
git add -A
git commit -m "refactor(theme): simplify theme module structure"
```

---

## Task 3: 创建 markdown/inline-formatter.js

**目标：** 合并 6 个 formatter 文件为 1 个

**Files:**

- Create: `src/core/markdown/inline-formatter.js`
- Reference: `src/core/markdown/formatters/escape.js`
- Reference: `src/core/markdown/formatters/style.js`
- Reference: `src/core/markdown/formatters/link.js`
- Reference: `src/core/markdown/formatters/special.js`
- Reference: `src/core/markdown/formatters/text.js`

**Step 1: 创建 inline-formatter.js**

合并以下内容：
- 转义处理: `escapeHtml`, `preprocessEscapes`, `postprocessEscapes`
- 样式处理: `processBoldAndItalic`, `processStrikethrough`
- 链接处理: `processLinks`, `processImages`, `cleanUrl`, `sanitizeAttribute`
- 特殊格式: `processHighlight`, `processSubscript`, `processSuperscript`, `processKeyboard`
- 内联代码: `processInlineCode`, `restoreCodePlaceholders`
- 管道入口: `processAllInlineFormats`, `formatInline`
- 文本清理: `cleanReferenceLinks`, `cleanText`

保持所有原有导出，确保向后兼容

**Step 2: 运行测试**

```bash
npm run test:run -- tests/core/markdown/formatters.test.js
```

**Step 3: 提交**

```bash
git add src/core/markdown/inline-formatter.js
git commit -m "refactor(markdown): create inline-formatter.js merging 6 files"
```

---

## Task 4: 创建 markdown/code-formatter.js

**目标：** 重命名并清理代码高亮模块

**Files:**

- Create: `src/core/markdown/code-formatter.js` (基于 formatters/code.js)

**Step 1: 复制并重命名**

将 `formatters/code.js` 内容复制到 `code-formatter.js`，保持所有导出：
- `normalizeLanguage`
- `isSupportedLanguage`
- `highlightCode`

**Step 2: 运行测试**

```bash
npm run test:run -- tests/core/markdown/highlight-code.test.js
```

**Step 3: 提交**

```bash
git add src/core/markdown/code-formatter.js
git commit -m "refactor(markdown): create code-formatter.js"
```

---

## Task 5: 创建 markdown/social-adapters.js

**目标：** 合并后处理器为单文件

**Files:**

- Create: `src/core/markdown/social-adapters.js`
- Reference: `src/core/markdown/post-processors/social-styler.js`
- Reference: `src/core/markdown/post-processors/adapters/breeze.js`

**Step 1: 创建 social-adapters.js**

合并内容：
- `SocialStyler` 类
- `wrapWithFontStyles` 函数
- `breezeCopyAdapter` 对象
- 预留 `zhihuAdapter`, `juejinAdapter` 接口

导出：
- `SocialStyler`
- `wrapWithFontStyles`
- `applySocialAdapter` (新增统一入口)
- `getThemeCopyAdapter`

**Step 2: 运行测试**

```bash
npm run test:run -- tests/core/markdown/breeze-styler.test.js
```

**Step 3: 提交**

```bash
git add src/core/markdown/social-adapters.js
git commit -m "refactor(markdown): create social-adapters.js merging post-processors"
```

---

## Task 6: 创建 markdown/parser.js

**目标：** 合并解析器、协调器、策略为单文件

**Files:**

- Create: `src/core/markdown/parser.js`
- Reference: `src/core/markdown/parser/core/MarkdownParser.js`
- Reference: `src/core/markdown/parser/formatter-coordinator.js`
- Reference: `src/core/markdown/parser/context.js`
- Reference: `src/core/markdown/parser/strategies/*.js`
- Reference: `src/core/markdown/processors/line.js`
- Reference: `src/core/markdown/processors/list.js`
- Reference: `src/core/markdown/processors/table.js`

**Step 1: 创建 parser.js 主结构**

```javascript
// src/core/markdown/parser.js

import { getThemesSafe } from '../../shared/utils/theme.js';
import { cleanReferenceLinks, processAllInlineFormats } from './inline-formatter.js';
import { highlightCode } from './code-formatter.js';
import { SocialStyler } from './social-adapters.js';
import { REGEX_PATTERNS, MARKDOWN_SYNTAX } from '../../config/constants/index.js';

// === 上下文管理 ===
function createContext(options = {}) {
  return {
    // 状态
    inCodeBlock: false,
    codeBlockContent: '',
    codeBlockLanguage: '',
    inBlockquote: false,
    blockquoteContent: [],
    inTable: false,
    tableRows: [],
    inList: false,
    listItems: [],
    listType: null,

    // 配置
    colorTheme: options.colorTheme || null,
    codeStyle: options.codeStyle || null,
    themeSystem: options.themeSystem || null,
    fontSettings: options.fontSettings || null,
    isPreview: options.isPreview || false,
  };
}

// === 行处理主函数 ===
function processLine(line, trimmedLine, context, lines, index) {
  // 代码块内容
  if (context.inCodeBlock) {
    return handleCodeBlockContent(line, trimmedLine, context);
  }

  // 代码块开始/结束
  if (trimmedLine.startsWith('```')) {
    return handleCodeBlockFence(line, trimmedLine, context);
  }

  // 空行
  if (!trimmedLine) {
    return handleEmptyLine(context);
  }

  // 表格
  if (isTableRow(trimmedLine, context)) {
    return handleTable(line, trimmedLine, context);
  }

  // 列表
  if (isListItem(trimmedLine)) {
    return handleList(line, trimmedLine, context);
  }

  // 引用块
  if (trimmedLine.startsWith('>')) {
    return handleBlockquote(line, trimmedLine, context);
  }

  // 标题
  if (REGEX_PATTERNS.HEADING.test(trimmedLine)) {
    return handleHeading(line, trimmedLine, context);
  }

  // 分割线
  if (REGEX_PATTERNS.HORIZONTAL_RULE.test(trimmedLine)) {
    return handleHorizontalRule(context);
  }

  // 段落
  return handleParagraph(line, trimmedLine, context);
}

// === 主解析函数 ===
export function parseMarkdown(text, options = {}) {
  if (!text || typeof text !== 'string') return '';

  const { colorTheme, codeStyle, themeSystem } = getThemesSafe({
    colorTheme: options.theme,
    codeStyle: options.codeTheme,
    themeSystem: options.themeSystem
  });

  const context = createContext({
    colorTheme,
    codeStyle,
    themeSystem,
    fontSettings: options.fontSettings,
    isPreview: options.isPreview
  });

  const cleanedText = cleanReferenceLinks(text);
  const lines = cleanedText.split('\n');
  let result = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const output = processLine(line, trimmedLine, context, lines, i);
    if (output) result += output;
  }

  // 结束未关闭的块
  result += finalizeBlocks(context);

  // 后处理
  result = SocialStyler.process(result, {
    fontSettings: context.fontSettings,
    themeSystem: context.themeSystem,
    colorTheme: context.colorTheme,
    isPreview: context.isPreview
  });

  return result;
}

// 向后兼容：导出 MarkdownParser 类
export class MarkdownParser {
  parse(text, options = {}) {
    return parseMarkdown(text, options);
  }
}

export default MarkdownParser;
```

**Step 2: 实现各 handle 函数**

从现有策略和处理器中提取逻辑，合并为函数

**Step 3: 运行测试**

```bash
npm run test:run -- tests/core/markdown/markdown-parser.test.js
```

**Step 4: 提交**

```bash
git add src/core/markdown/parser.js
git commit -m "refactor(markdown): create unified parser.js"
```

---

## Task 7: 更新 core/index.js 和清理旧文件

**目标：** 更新导出，删除旧文件

**Files:**

- Modify: `src/core/index.js`
- Modify: `src/core/markdown/index.js`
- Delete: `src/core/markdown/formatters/` (整个目录)
- Delete: `src/core/markdown/parser/` (整个目录)
- Delete: `src/core/markdown/processors/` (整个目录)
- Delete: `src/core/markdown/post-processors/` (整个目录)

**Step 1: 更新 markdown/index.js**

```javascript
// src/core/markdown/index.js
export { parseMarkdown, MarkdownParser } from './parser.js';
export * from './inline-formatter.js';
export * from './code-formatter.js';
export * from './social-adapters.js';
```

**Step 2: 更新 core/index.js**

```javascript
// src/core/index.js
export * from './editor/operations.js';
export * from './editor/clipboard.js';
export * from './editor/copy-formats.js';
export * from './markdown/index.js';
export * from './theme/index.js';
```

**Step 3: 删除旧目录**

```bash
rm -rf src/core/markdown/formatters/
rm -rf src/core/markdown/parser/
rm -rf src/core/markdown/processors/
rm -rf src/core/markdown/post-processors/
```

**Step 4: 运行全量测试**

```bash
npm run test:run
```

**Step 5: 提交**

```bash
git add -A
git commit -m "refactor(core): remove old directories and update exports"
```

---

## Task 8: 更新所有外部引用

**目标：** 修复所有依赖旧路径的导入

**Files:**

- Modify: `src/core/editor/copy-formats.js`
- Modify: `src/components/PreviewPane.vue`
- Modify: `src/composables/*` (相关文件)
- Modify: `tests/**/*.test.js` (相关测试)

**Step 1: 搜索并替换旧导入路径**

```bash
# 搜索需要更新的文件
grep -r "core/markdown/parser" src/
grep -r "core/markdown/formatters" src/
grep -r "core/theme/presets" src/
```

**Step 2: 更新每个文件的导入**

旧路径 → 新路径映射：
- `core/markdown/parser/core/MarkdownParser` → `core/markdown/parser`
- `core/markdown/formatters/text` → `core/markdown/inline-formatter`
- `core/markdown/formatters/code` → `core/markdown/code-formatter`
- `core/theme/presets/color-themes` → `config/theme-presets`
- `core/theme/presets/code-styles` → `config/theme-presets`

**Step 3: 运行测试**

```bash
npm run test:run
```

**Step 4: 提交**

```bash
git add -A
git commit -m "refactor: update all import paths to new structure"
```

---

## Task 9: 运行完整测试并修复

**目标：** 确保所有 151 个测试通过

**Step 1: 运行完整测试**

```bash
npm run test:run
```

**Step 2: 逐个修复失败的测试**

**Step 3: 运行构建验证**

```bash
npm run build
```

**Step 4: 最终提交**

```bash
git add -A
git commit -m "test: fix all tests after refactor"
```

---

## 完成检查清单

- [ ] 文件数量: 49 → 13
- [ ] 目录深度: 4 层 → 2 层
- [ ] 测试通过: 151/151
- [ ] 构建成功
- [ ] 无循环依赖

## 回滚计划

如果重构失败，可以回滚到基线：

```bash
git checkout main -- src/core/
git checkout main -- src/config/
```
