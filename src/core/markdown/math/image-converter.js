/**
 * @file src/core/markdown/math/image-converter.js
 * @description 数学公式转图片（用于微信复制）
 */

import html2canvas from 'html2canvas'
import { DOMUtils } from '../../../shared/utils/dom.js'

/**
 * 将数学公式元素转换为 PNG 图片
 * @param {HTMLElement} element - 数学公式元素
 * @param {number} scale - 缩放倍数，默认 2
 * @returns {Promise<string>} Base64 图片 URL
 */
export async function mathElementToImage(element, scale = 2) {
  // 克隆元素到离屏容器
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;background:transparent;padding:4px;'

  const clone = element.cloneNode(true)
  clone.style.display = 'inline-block'
  container.appendChild(clone)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale,
      logging: false,
      useCORS: true
    })

    return canvas.toDataURL('image/png')
  } finally {
    DOMUtils.safeRemove(container)
  }
}

/**
 * 批量将容器内的数学公式转为图片
 * @param {HTMLElement} container - 包含公式的容器
 * @param {number} scale - 缩放倍数
 */
export async function rasterizeMathFormulas(container, scale = 2) {
  const mathElements = Array.from(container.querySelectorAll('.math-inline, .math-block'))

  for (const el of mathElements) {
    try {
      const dataUrl = await mathElementToImage(el, scale)
      const isBlock = el.classList.contains('math-block')

      const img = document.createElement('img')
      img.src = dataUrl
      img.alt = el.getAttribute('data-latex') || 'formula'
      img.style.verticalAlign = 'middle'
      img.style.maxWidth = '100%'
      img.style.height = 'auto'

      if (isBlock) {
        // 块级公式用居中的 p 包裹
        const wrapper = document.createElement('p')
        wrapper.style.textAlign = 'center'
        wrapper.style.margin = '0.6em 0'
        wrapper.appendChild(img)
        el.replaceWith(wrapper)
      } else {
        el.replaceWith(img)
      }
    } catch (e) {
      console.warn('数学公式转图片失败：', e)
      // 失败时保留原始 HTML
    }
  }
}
