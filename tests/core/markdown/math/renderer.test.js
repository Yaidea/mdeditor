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
    // KaTeX with throwOnError: false returns katex-error class
    expect(html).toContain('katex-error')
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
