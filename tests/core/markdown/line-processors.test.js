/**
 * @file tests/core/markdown/line-processors.test.js
 * @description 行处理器单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  CodeBlockProcessor,
  HorizontalRuleProcessor,
  HeadingProcessor,
  BlockquoteProcessor,
  getLineProcessor,
  LINE_PROCESSORS
} from '../../../src/core/markdown/processors/line.js'
import { defaultColorTheme } from '../../../src/config/theme-presets.js'

// 创建一个简单的上下文模拟对象
function createMockContext(options = {}) {
  let inCodeBlock = false
  let codeBlockContent = ''
  let codeBlockLanguage = ''
  let inBlockquote = false
  let blockquoteContent = []

  return {
    currentTheme: options.currentTheme || defaultColorTheme,
    codeTheme: options.codeTheme || null,
    fontSettings: options.fontSettings || { fontSize: 16 },
    options: options.options || { isPreview: false },
    isInCodeBlock: () => inCodeBlock,
    startCodeBlock: (lang) => {
      inCodeBlock = true
      codeBlockLanguage = lang
      codeBlockContent = ''
    },
    endCodeBlock: () => {
      inCodeBlock = false
      const result = { content: codeBlockContent, language: codeBlockLanguage }
      codeBlockContent = ''
      codeBlockLanguage = ''
      return result
    },
    addCodeLine: (line) => {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line
    },
    isInBlockquote: () => inBlockquote,
    startBlockquote: () => {
      inBlockquote = true
      blockquoteContent = []
    },
    addBlockquoteContent: (content) => {
      blockquoteContent.push(content)
    },
    endBlockquote: () => {
      inBlockquote = false
      const result = blockquoteContent
      blockquoteContent = []
      return result
    }
  }
}

describe('CodeBlockProcessor', () => {
  const processor = new CodeBlockProcessor()

  it('应识别代码块开始标记', () => {
    const context = createMockContext()
    expect(processor.canProcess('```javascript', '```javascript', context)).toBe(true)
    expect(processor.canProcess('```', '```', context)).toBe(true)
  })

  it('不应识别非代码块内容', () => {
    const context = createMockContext()
    expect(processor.canProcess('普通文本', '普通文本', context)).toBe(false)
    expect(processor.canProcess('# 标题', '# 标题', context)).toBe(false)
  })

  it('应正确处理代码块开始', () => {
    const context = createMockContext()
    const result = processor.process('```javascript', '```javascript', context)
    expect(result.result).toBe('')
    expect(result.shouldContinue).toBe(true)
    expect(context.isInCodeBlock()).toBe(true)
  })

  it('应正确处理代码块结束', () => {
    const context = createMockContext()
    // 先开始代码块
    context.startCodeBlock('javascript')
    context.addCodeLine('const a = 1')

    const result = processor.process('```', '```', context)
    expect(result.shouldContinue).toBe(true)
    expect(result.result).toContain('<pre')
    expect(context.isInCodeBlock()).toBe(false)
  })
})

describe('HorizontalRuleProcessor', () => {
  const processor = new HorizontalRuleProcessor()

  it('应识别分割线', () => {
    const context = createMockContext()
    expect(processor.canProcess('---', '---', context)).toBe(true)
    expect(processor.canProcess('***', '***', context)).toBe(true)
    expect(processor.canProcess('___', '___', context)).toBe(true)
  })

  it('不应识别非分割线内容', () => {
    const context = createMockContext()
    expect(processor.canProcess('--', '--', context)).toBe(false)
    expect(processor.canProcess('普通文本', '普通文本', context)).toBe(false)
  })

  it('应生成正确的 HR HTML', () => {
    const context = createMockContext()
    const result = processor.process('---', '---', context)
    expect(result.result).toContain('<hr')
    expect(result.result).toContain('style=')
    expect(result.shouldContinue).toBe(true)
  })
})

describe('HeadingProcessor', () => {
  const processor = new HeadingProcessor()

  it('应识别各级标题', () => {
    const context = createMockContext()
    expect(processor.canProcess('# H1', '# H1', context)).toBe(true)
    expect(processor.canProcess('## H2', '## H2', context)).toBe(true)
    expect(processor.canProcess('### H3', '### H3', context)).toBe(true)
    expect(processor.canProcess('#### H4', '#### H4', context)).toBe(true)
    expect(processor.canProcess('##### H5', '##### H5', context)).toBe(true)
    expect(processor.canProcess('###### H6', '###### H6', context)).toBe(true)
  })

  it('不应识别非标题内容', () => {
    const context = createMockContext()
    expect(processor.canProcess('普通文本', '普通文本', context)).toBe(false)
    expect(processor.canProcess('#没有空格', '#没有空格', context)).toBe(false)
  })

  it('应生成 H1 HTML（社交平台模式）', () => {
    const context = createMockContext({ options: { isPreview: false } })
    const result = processor.process('# 一级标题', '# 一级标题', context)
    expect(result.result).toContain('<h1')
    expect(result.result).toContain('一级标题')
    expect(result.shouldContinue).toBe(true)
  })

  it('应生成 H1 HTML（预览模式）', () => {
    const context = createMockContext({ options: { isPreview: true } })
    const result = processor.process('# 一级标题', '# 一级标题', context)
    expect(result.result).toBe('<h1>一级标题</h1>')
  })

  it('应生成 H2 HTML（社交平台模式）', () => {
    const context = createMockContext({ options: { isPreview: false } })
    const result = processor.process('## 二级标题', '## 二级标题', context)
    expect(result.result).toContain('<h2')
    expect(result.result).toContain('二级标题')
  })

  it('应生成 H2 HTML（预览模式）', () => {
    const context = createMockContext({ options: { isPreview: true } })
    const result = processor.process('## 二级标题', '## 二级标题', context)
    expect(result.result).toBe('<h2>二级标题</h2>')
  })

  it('formatOtherHeading 应处理 H3-H6', () => {
    const context = createMockContext()

    // H3
    const resultH3 = processor.process('### 三级标题', '### 三级标题', context)
    expect(resultH3.result).toContain('<h3')
    expect(resultH3.result).toContain('三级标题')

    // H4
    const resultH4 = processor.process('#### 四级标题', '#### 四级标题', context)
    expect(resultH4.result).toContain('<h4')

    // H5
    const resultH5 = processor.process('##### 五级标题', '##### 五级标题', context)
    expect(resultH5.result).toContain('<h5')

    // H6
    const resultH6 = processor.process('###### 六级标题', '###### 六级标题', context)
    expect(resultH6.result).toContain('<h6')
  })

  it('formatH1 应包含下划线样式', () => {
    const formattedText = '测试标题'
    const result = processor.formatH1(formattedText, defaultColorTheme, { options: { isPreview: false }, fontSettings: { fontSize: 16 } })
    expect(result).toContain('<h1')
    // 下划线样式使用 width: 60px
    expect(result).toContain('width: 60px')
  })

  it('formatH2 应包含装饰线条', () => {
    const formattedText = '测试标题'
    const result = processor.formatH2(formattedText, defaultColorTheme, { options: { isPreview: false }, fontSettings: { fontSize: 16 } })
    expect(result).toContain('<h2')
    expect(result).toContain('width: 5px')
  })
})

describe('BlockquoteProcessor', () => {
  const processor = new BlockquoteProcessor()

  it('应识别引用行', () => {
    const context = createMockContext()
    expect(processor.canProcess('> 引用内容', '> 引用内容', context)).toBe(true)
    expect(processor.canProcess('>', '>', context)).toBe(true)
  })

  it('不应识别非引用内容', () => {
    const context = createMockContext()
    expect(processor.canProcess('普通文本', '普通文本', context)).toBe(false)
    expect(processor.canProcess('# 标题', '# 标题', context)).toBe(false)
  })

  it('应正确开始引用块', () => {
    const context = createMockContext()
    const result = processor.process('> 第一行', '> 第一行', context)
    expect(result.result).toBe('')
    expect(result.shouldContinue).toBe(true)
    expect(context.isInBlockquote()).toBe(true)
  })

  it('应正确添加引用内容', () => {
    const context = createMockContext()
    context.startBlockquote()

    const result = processor.process('> 更多内容', '> 更多内容', context)
    expect(result.result).toBe('')
    expect(result.shouldContinue).toBe(true)
  })

  it('应处理空引用行', () => {
    const context = createMockContext()
    context.startBlockquote()

    const result = processor.process('>', '>', context)
    expect(result.shouldContinue).toBe(true)
  })
})

describe('getLineProcessor', () => {
  it('应返回匹配的处理器', () => {
    const context = createMockContext()

    const codeProcessor = getLineProcessor('```javascript', '```javascript', context)
    expect(codeProcessor).toBeInstanceOf(CodeBlockProcessor)

    const hrProcessor = getLineProcessor('---', '---', context)
    expect(hrProcessor).toBeInstanceOf(HorizontalRuleProcessor)

    const headingProcessor = getLineProcessor('# 标题', '# 标题', context)
    expect(headingProcessor).toBeInstanceOf(HeadingProcessor)

    const blockquoteProcessor = getLineProcessor('> 引用', '> 引用', context)
    expect(blockquoteProcessor).toBeInstanceOf(BlockquoteProcessor)
  })

  it('无匹配时应返回 null', () => {
    const context = createMockContext()
    const processor = getLineProcessor('普通文本', '普通文本', context)
    expect(processor).toBeNull()
  })
})

describe('LINE_PROCESSORS', () => {
  it('应包含所有处理器', () => {
    expect(LINE_PROCESSORS.length).toBe(4)
    expect(LINE_PROCESSORS.some(p => p instanceof CodeBlockProcessor)).toBe(true)
    expect(LINE_PROCESSORS.some(p => p instanceof HorizontalRuleProcessor)).toBe(true)
    expect(LINE_PROCESSORS.some(p => p instanceof HeadingProcessor)).toBe(true)
    expect(LINE_PROCESSORS.some(p => p instanceof BlockquoteProcessor)).toBe(true)
  })
})
