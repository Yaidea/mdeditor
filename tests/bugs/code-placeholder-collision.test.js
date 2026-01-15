/**
 * @file tests/bugs/code-placeholder-collision.test.js
 * @description 回归测试：确保代码占位符使用唯一 ID 避免碰撞
 *
 * 背景：
 * - 旧实现使用全局数组 CODE_PLACEHOLDERS 和简单计数器 __TAG_0__
 * - 当快速连续调用或嵌套处理时，占位符可能碰撞导致渲染错误
 * - 新实现使用唯一 ID（时间戳+随机数）确保每次处理的占位符互不干扰
 */

import { describe, it, expect } from 'vitest'
import { defaultColorTheme } from '../../src/core/theme/presets/color-themes.js'
import {
  processInlineCode,
  restoreCodePlaceholders,
  processAllInlineFormats
} from '../../src/core/markdown/formatters/text.js'
import { highlightCode } from '../../src/core/markdown/formatters/code.js'
import { getCodeStyle } from '../../src/core/theme/presets/code-styles.js'

const theme = defaultColorTheme
const codeStyle = getCodeStyle('mac')

describe('代码占位符唯一 ID 防碰撞', () => {
  describe('processInlineCode/restoreCodePlaceholders 上下文隔离', () => {
    it('单次调用应正确处理内联代码', () => {
      const input = '这是 `code1` 和 `code2` 两个代码'
      const processed = processInlineCode(input, theme, 16)

      // 应该包含唯一 ID 格式的占位符
      expect(processed).toMatch(/〖CODE_[a-z0-9]+_0〗/)
      expect(processed).toMatch(/〖CODE_[a-z0-9]+_1〗/)

      // 恢复后应包含正确的 HTML
      const restored = restoreCodePlaceholders(processed)
      expect(restored).toContain('<code')
      expect(restored).toContain('code1')
      expect(restored).toContain('code2')
    })

    it('连续调用应使用不同的占位符 ID', () => {
      const input1 = '第一个 `aaa`'
      const input2 = '第二个 `bbb`'

      // 第一次调用
      const processed1 = processInlineCode(input1, theme, 16)
      const id1Match = processed1.match(/〖CODE_([a-z0-9]+)_0〗/)
      expect(id1Match).toBeTruthy()
      const id1 = id1Match[1]

      // 第二次调用
      const processed2 = processInlineCode(input2, theme, 16)
      const id2Match = processed2.match(/〖CODE_([a-z0-9]+)_0〗/)
      expect(id2Match).toBeTruthy()
      const id2 = id2Match[1]

      // ID 应该不同
      expect(id1).not.toBe(id2)
    })

    it('processAllInlineFormats 应正确处理多个内联代码', () => {
      const input = '测试 `code1` 中间文字 `code2` 结尾 `code3`'
      const html = processAllInlineFormats(input, theme, true, 16)

      // 不应有未替换的占位符
      expect(html).not.toMatch(/〖CODE_/)

      // 应包含所有代码内容
      expect(html).toContain('code1')
      expect(html).toContain('code2')
      expect(html).toContain('code3')

      // 应包含正确数量的 <code> 标签
      const codeMatches = html.match(/<code[^>]*>/g)
      expect(codeMatches).toHaveLength(3)
    })

    it('空输入应返回空上下文', () => {
      const input = '没有代码的文本'
      const processed = processInlineCode(input, theme, 16)
      expect(processed).toBe(input)

      const restored = restoreCodePlaceholders(processed)
      expect(restored).toBe(input)
    })
  })

  describe('highlightCode HTML 标签占位符', () => {
    it('应使用唯一 ID 保护 HTML 标签', () => {
      const code = 'const x = 1;\nconst y = 2;'
      const html = highlightCode(code, 'javascript', codeStyle)

      // 不应有未替换的占位符
      expect(html).not.toMatch(/\x00TAG_/)

      // 应包含有效的 HTML
      expect(html).toContain('<span')
      expect(html).toContain('const')
    })

    it('连续调用 highlightCode 不应产生冲突', () => {
      const code1 = 'let foo = 1;'
      const code2 = 'let bar = 2;'

      const html1 = highlightCode(code1, 'javascript', codeStyle)
      const html2 = highlightCode(code2, 'javascript', codeStyle)

      // 两次调用都应正常工作
      expect(html1).toContain('let')
      expect(html1).toContain('span')
      expect(html2).toContain('let')
      expect(html2).toContain('span')

      // 不应有交叉污染（变量名应各自独立）
      expect(html1).toContain('foo')
      expect(html1).not.toContain('bar')
      expect(html2).toContain('bar')
      expect(html2).not.toContain('foo')
    })

    it('多行代码块应正确处理所有行', () => {
      const code = `function test() {
  const x = 1;
  return x + 1;
}`
      const html = highlightCode(code, 'javascript', codeStyle)

      // 应包含所有关键字
      expect(html).toContain('function')
      expect(html).toContain('const')
      expect(html).toContain('return')

      // 不应有未替换的占位符
      expect(html).not.toMatch(/\x00TAG_/)
    })
  })

  describe('边界情况', () => {
    it('嵌套格式中的内联代码应正确处理', () => {
      const input = '**粗体中的 `code` 代码**'
      const html = processAllInlineFormats(input, theme, true, 16)

      expect(html).toContain('<strong')
      expect(html).toContain('<code')
      expect(html).toContain('code')
      expect(html).not.toMatch(/〖CODE_/)
    })

    it('特殊字符在代码中应正确转义', () => {
      const input = '代码 `<script>alert(1)</script>`'
      const html = processAllInlineFormats(input, theme, true, 16)

      // 应转义 HTML 特殊字符
      expect(html).toContain('&lt;script&gt;')
      expect(html).not.toContain('<script>')
    })

    it('空代码块应正确处理', () => {
      const input = '空代码 `` 测试'
      const html = processAllInlineFormats(input, theme, true, 16)

      // 空代码块可能被忽略或渲染为空 code 标签
      expect(html).not.toMatch(/〖CODE_/)
    })

    it('大量内联代码不应碰撞', () => {
      // 生成包含 20 个内联代码的文本
      const codes = Array.from({ length: 20 }, (_, i) => `\`code${i}\``)
      const input = codes.join(' ')
      const html = processAllInlineFormats(input, theme, true, 16)

      // 不应有未替换的占位符
      expect(html).not.toMatch(/〖CODE_/)

      // 应包含所有代码
      for (let i = 0; i < 20; i++) {
        expect(html).toContain(`code${i}`)
      }
    })
  })
})
