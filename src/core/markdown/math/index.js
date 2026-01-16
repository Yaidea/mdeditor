/**
 * @file src/core/markdown/math/index.js
 * @description 数学公式模块统一导出
 */

import { detectMath, extractMath, restoreMath } from './detector.js'
import { renderMath, renderMathPlaceholders } from './renderer.js'
import { mathElementToImage, rasterizeMathFormulas } from './image-converter.js'

// 重新导出
export { detectMath, extractMath, restoreMath }
export { renderMath, renderMathPlaceholders }
export { mathElementToImage, rasterizeMathFormulas }

/**
 * 处理文本中的数学公式（提取 + 渲染 + 还原）
 * @param {string} text - 输入文本
 * @returns {string} 处理后的文本
 */
export function processMath(text) {
  if (!text) return text

  const { text: extractedText, placeholders } = extractMath(text)
  if (!placeholders.length) return text

  const renderedPlaceholders = renderMathPlaceholders(placeholders)
  return restoreMath(extractedText, renderedPlaceholders)
}
