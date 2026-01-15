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
