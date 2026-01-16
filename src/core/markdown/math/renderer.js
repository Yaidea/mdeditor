/**
 * @file src/core/markdown/math/renderer.js
 * @description MathJax SVG 渲染封装（参考 mdnice 实现）
 *
 * 使用 MathJax 3 将 LaTeX 公式渲染为 SVG，
 * 以获得微信公众号最佳兼容性。
 */

import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'
import { escapeHtml } from '../../../shared/utils/text.js'

function escapeFormulaAttr(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 创建轻量级适配器
const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

// 创建 TeX 输入处理器
const tex = new TeX({
  packages: AllPackages,
  inlineMath: [['$', '$']],
  displayMath: [['$$', '$$']],
  processEscapes: true,
  processEnvironments: true
})

// 创建 SVG 输出处理器
const svg = new SVG({
  fontCache: 'none', // 禁用字体缓存，确保 SVG 独立完整
  scale: 1,
  minScale: 0.5
})

// 创建 MathJax 文档
const html = mathjax.document('', { InputJax: tex, OutputJax: svg })

/**
 * 从 mjx-container 中提取纯 SVG
 * mdnice 的做法是直接输出 SVG，不包含 mjx-container
 *
 * @param {string} mjxHtml - MathJax 生成的 HTML（包含 mjx-container）
 * @returns {string} 纯 SVG 字符串
 */
function extractSvgFromMjx(mjxHtml) {
  // 提取 <svg>...</svg> 部分
  const svgMatch = mjxHtml.match(/<svg[\s\S]*?<\/svg>/)
  return svgMatch ? svgMatch[0] : mjxHtml
}

/**
 * 处理 SVG 使其兼容微信公众号（参考 mdnice）
 *
 * @param {string} svgHtml - 原始 SVG HTML
 * @param {boolean} displayMode - 是否为块级公式
 * @returns {string} 处理后的 SVG HTML
 */
function processSvgForWeChat(svgHtml, displayMode = false) {
  let result = svgHtml

  // 1. 处理 SVG 的尺寸：将 width/height 属性移到 style 中（参考 mdnice 的 solveWeChatMath）
  result = result.replace(/<svg\b([^>]*)>/, (match, attrs) => {
    const widthMatch = attrs.match(/\s+width="([^"]+)"/)
    const heightMatch = attrs.match(/\s+height="([^"]+)"/)
    let cleaned = attrs.replace(/\s+width="[^"]*"/, '').replace(/\s+height="[^"]*"/, '')

    const styleMatch = cleaned.match(/\s+style="([^"]*)"/)
    let style = styleMatch ? styleMatch[1] : ''
    cleaned = cleaned.replace(/\s*style="[^"]*"/, '')

    if (widthMatch && !/(^|;)\s*width\s*:/.test(style)) {
      style += `width:${widthMatch[1]};`
    }
    if (heightMatch && !/(^|;)\s*height\s*:/.test(style)) {
      style += `height:${heightMatch[1]};`
    }

    if (!/(^|;)\s*vertical-align\s*:/.test(style)) {
      style += 'vertical-align:middle;'
    }

    if (!/(^|;)\s*max-width\s*:/.test(style)) {
      style += 'max-width:300% !important;'
    }

    return `<svg${cleaned} style="${style}">`
  })

  return result
}

/**
 * 渲染单个 LaTeX 公式为 SVG HTML
 * 输出格式参考 mdnice，使用 section 包装而非 mjx-container
 *
 * @param {string} latex - LaTeX 源码
 * @param {boolean} displayMode - true 为块级，false 为行内
 * @returns {string} HTML 字符串
 */
export function renderMath(latex, displayMode = false) {
  if (!latex) return ''

  try {
    // 使用 MathJax 转换
    const node = html.convert(latex, { display: displayMode })
    let mjxHtml = adaptor.outerHTML(node)

    // 提取纯 SVG（移除 mjx-container）
    let svgHtml = extractSvgFromMjx(mjxHtml)

    // 处理 SVG 使其兼容微信
    svgHtml = processSvgForWeChat(svgHtml, displayMode)

    // 使用与 mdnice 相似的包装结构
    if (displayMode) {
      // 块级公式：使用 section 包装，参考 mdnice 的 block-equation
      return `<span class="span-block-equation" style="cursor:pointer" data-tool="mdnice编辑器"><section class="math-block block-equation" data-formula="${escapeFormulaAttr(latex)}" style="text-align:center;overflow-x:auto;overflow-y:auto;display:block;margin:16px 0;">${svgHtml}</section></span>`
    } else {
      // 行内公式：使用 span 包装
      return `<span class="span-inline-equation math-inline" style="cursor:pointer;display:inline-block;vertical-align:middle;" data-formula="${escapeFormulaAttr(latex)}"><span class="inline-equation" data-formula="${escapeFormulaAttr(latex)}">${svgHtml}</span></span>`
    }
  } catch (e) {
    console.warn('MathJax 渲染失败:', e)
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

/**
 * 清除 MathJax 缓存（用于重置状态）
 */
export function clearMathCache() {
  html.clear()
}
