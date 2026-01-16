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
