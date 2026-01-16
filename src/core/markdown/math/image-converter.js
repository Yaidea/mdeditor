/**
 * @file src/core/markdown/math/image-converter.js
 * @description 数学公式微信公众号兼容处理（参考 mdnice 实现）
 *
 * 不再将公式转为图片，而是清理 SVG 属性以兼容微信。
 */

/**
 * 处理容器内的数学公式 SVG，使其兼容微信公众号
 * 参考 mdnice 的 solveWeChatMath 实现
 *
 * @param {HTMLElement} container - 包含公式的容器
 */
export function solveMathForWeChat(container) {
  if (!container) return

  // 1. 移除所有 mjx-container 元素，只保留内部 SVG
  // 微信不支持自定义元素，必须移除
  const mjxContainers = container.querySelectorAll('mjx-container')
  for (const mjx of mjxContainers) {
    const svg = mjx.querySelector('svg')
    if (svg) {
      // 用 SVG 替换整个 mjx-container
      mjx.replaceWith(svg)
    } else {
      mjx.remove()
    }
  }

  // 2. 处理所有公式 SVG
  const mathElements = container.querySelectorAll('.math-inline, .math-block, .block-equation')
  for (const wrapper of mathElements) {
    const svg = wrapper.querySelector('svg')
    if (svg) {
      processSvgElement(svg)
    }
  }

  // 3. 处理可能遗漏的独立 SVG（在公式容器外的）
  const allSvgs = container.querySelectorAll('svg')
  for (const svg of allSvgs) {
    // 检查是否是公式 SVG（通过 data-mml-node 属性判断）
    if (svg.querySelector('[data-mml-node]')) {
      processSvgElement(svg)
    }
  }
}

/**
 * 处理单个 SVG 元素使其兼容微信
 * @param {SVGElement} svg
 */
function processSvgElement(svg) {
  // 1. 将 width/height 属性转为 style（参考 mdnice 的 solveWeChatMath）
  const width = svg.getAttribute('width')
  const height = svg.getAttribute('height')

  if (width) {
    svg.removeAttribute('width')
    svg.style.width = width
  }
  if (height) {
    svg.removeAttribute('height')
    svg.style.height = height
  }

  // 2. 确保有必要的样式
  if (!svg.style.verticalAlign) {
    svg.style.verticalAlign = 'middle'
  }
  if (!svg.style.maxWidth) {
    svg.style.maxWidth = '300%'
  }

}
