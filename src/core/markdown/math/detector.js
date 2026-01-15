/**
 * @file src/core/markdown/math/detector.js
 * @description LaTeX 数学公式检测与提取
 */

// 块级公式：$$...$$ (可跨行)
const BLOCK_MATH_REGEX = /\$\$([\s\S]+?)\$\$/g
// 行内公式：$...$ (不跨行，不匹配 $$)
const INLINE_MATH_REGEX = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g

/**
 * 检测文本中是否包含数学公式
 * @param {string} text - 输入文本
 * @returns {{ hasInlineMath: boolean, hasBlockMath: boolean }}
 */
export function detectMath(text) {
  if (!text) return { hasInlineMath: false, hasBlockMath: false }

  // 先移除代码块和行内代码，避免误检测
  const withoutCode = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')

  return {
    hasBlockMath: BLOCK_MATH_REGEX.test(withoutCode),
    hasInlineMath: INLINE_MATH_REGEX.test(withoutCode.replace(/\$\$[\s\S]+?\$\$/g, ''))
  }
}

/**
 * 提取数学公式并替换为占位符
 * @param {string} text - 输入文本
 * @returns {{ text: string, placeholders: Array<{ id: string, latex: string, displayMode: boolean }> }}
 */
export function extractMath(text) {
  if (!text) return { text: '', placeholders: [] }

  const placeholders = []
  let result = text
  let blockIndex = 0
  let inlineIndex = 0

  // 先处理块级公式（避免 $$ 被误识别为两个 $）
  result = result.replace(BLOCK_MATH_REGEX, (match, latex) => {
    const id = `MATH_BLOCK_${blockIndex++}`
    placeholders.push({ id, latex: latex.trim(), displayMode: true })
    return id
  })

  // 再处理行内公式
  result = result.replace(INLINE_MATH_REGEX, (match, latex) => {
    const id = `MATH_INLINE_${inlineIndex++}`
    placeholders.push({ id, latex: latex.trim(), displayMode: false })
    return id
  })

  return { text: result, placeholders }
}

/**
 * 将占位符替换回渲染后的 HTML
 * @param {string} text - 含占位符的文本
 * @param {Array<{ id: string, html: string }>} placeholders - 占位符数组（需已渲染 html）
 * @returns {string}
 */
export function restoreMath(text, placeholders) {
  if (!text || !placeholders?.length) return text

  let result = text
  for (const p of placeholders) {
    result = result.replace(p.id, p.html || '')
  }
  return result
}
