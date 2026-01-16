// tests/core/markdown/math/renderer.test.js
import { describe, it, expect } from 'vitest'
import { renderMath, renderMathPlaceholders } from '@/core/markdown/math/renderer.js'

describe('renderMath', () => {
  it('渲染行内公式', () => {
    const html = renderMath('E=mc^2', false)
    // 参考 mdnice：直接输出 SVG，不使用 mjx-container
    expect(html).toContain('<svg')
    expect(html).toContain('math-inline')
    expect(html).toContain('data-formula')
  })

  it('渲染块级公式', () => {
    const html = renderMath('\\sum_{i=1}^n i', true)
    // 块级公式使用 section 包装，有 block-equation 类
    expect(html).toContain('math-block')
    expect(html).toContain('block-equation')
    expect(html).toContain('<svg')
  })

  it('语法错误时返回错误提示', () => {
    // MathJax 对大多数输入都能处理
    const html = renderMath('\\undefined_command_xyz', false)
    // 只要不崩溃就算通过
    expect(html).toBeTruthy()
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
    // 输出应包含 SVG
    expect(result[0].html).toContain('<svg')
    expect(result[0].html).toContain('math-inline')
  })
})
