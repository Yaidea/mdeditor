/**
 * @file tests/core/markdown/math-integration.test.js
 * @description Math integration tests with inline formatter
 */

import { describe, it, expect } from 'vitest'
import { processAllInlineFormats, formatInline } from '@/core/markdown/inline-formatter.js'

const mockTheme = {
  primary: '#007bff',
  textPrimary: '#333',
  textSecondary: '#666',
  textMuted: '#999',
  highlight: '#fff3cd',
  inlineCodeBg: '#f8f9fa',
  inlineCodeText: '#e83e8c',
  inlineCodeBorder: '#dee2e6',
  borderLight: '#f0f0f0',
  borderMedium: '#ddd',
  shadowColor: 'rgba(0,0,0,0.1)'
}

describe('Math integration with inline formatter', () => {
  it('renders inline math formula', () => {
    const result = formatInline('formula $E=mc^2$ end', mockTheme)
    expect(result).toContain('math-inline')
    expect(result).toContain('katex')
  })

  it('renders block math formula', () => {
    const result = formatInline('$$\\sum_{i=1}^n i$$', mockTheme)
    expect(result).toContain('math-block')
  })

  it('does not process $ inside code blocks', () => {
    const result = formatInline('`$price = 100`', mockTheme)
    expect(result).not.toContain('math-inline')
    expect(result).toContain('$price')
  })

  it('handles mixed formatting with math', () => {
    const result = formatInline('**bold** $x^2$ _italic_', mockTheme)
    expect(result).toContain('<strong')
    expect(result).toContain('math-inline')
    expect(result).toContain('<em')
  })

  it('renders multiple inline formulas', () => {
    const result = formatInline('$a^2$ plus $b^2$ equals $c^2$', mockTheme)
    const matches = result.match(/math-inline/g)
    expect(matches).toHaveLength(3)
  })

  it('handles complex LaTeX formulas', () => {
    const result = formatInline('$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$', mockTheme)
    expect(result).toContain('math-block')
    expect(result).toContain('katex')
  })

  it('preserves text without math', () => {
    const result = formatInline('just plain text', mockTheme)
    expect(result).toBe('just plain text')
    expect(result).not.toContain('math')
  })

  it('handles inline code with dollar signs correctly', () => {
    const result = formatInline('price is `$100` or `$200`', mockTheme)
    expect(result).not.toContain('math-inline')
    expect(result).toContain('$100')
    expect(result).toContain('$200')
  })

  it('processes math before other inline formatters', () => {
    // This ensures math is extracted before other patterns could interfere
    const result = formatInline('$x_1$ and $x_2$', mockTheme)
    expect(result).toContain('math-inline')
    // Should NOT have subscript processing interfere
    expect(result).not.toContain('<sub')
  })

  it('handles escaped dollar signs', () => {
    const result = formatInline('price is \\$100', mockTheme)
    expect(result).not.toContain('math-inline')
    expect(result).toContain('$100')
  })

  it('handles math with links', () => {
    const result = formatInline('$E=mc^2$ [link](https://example.com)', mockTheme)
    expect(result).toContain('math-inline')
    expect(result).toContain('<a href')
  })

  it('handles math with images', () => {
    const result = formatInline('$x^2$ ![alt](https://example.com/image.png)', mockTheme)
    expect(result).toContain('math-inline')
    expect(result).toContain('<img')
  })

  it('renders inline math with Chinese text', () => {
    const result = formatInline('formula $E=mc^2$ end', mockTheme)
    expect(result).toContain('math-inline')
    expect(result).toContain('formula')
    expect(result).toContain('end')
  })

  it('handles processAllInlineFormats with math', () => {
    const result = processAllInlineFormats('test $a+b$ test', mockTheme)
    expect(result).toContain('math-inline')
  })
})
