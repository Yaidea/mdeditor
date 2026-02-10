/**
 * @file src/composables/useOutline.js
 * @description 从 Markdown 内容中提取标题，生成大纲数据
 */

import { computed } from 'vue'

const HEADING_REGEXP = /^(#{1,6})\s+(.+)$/
const CODE_FENCE_REGEXP = /^```/

export const stripInlineMarkdown = (text = '') => text
  .replace(/\*\*(.+?)\*\*/g, '$1')
  .replace(/\*(.+?)\*/g, '$1')
  .replace(/`(.+?)`/g, '$1')
  .replace(/\[(.+?)\]\(.+?\)/g, '$1')
  .replace(/~~(.+?)~~/g, '$1')
  .trim()

export const normalizeHeadingText = (text = '') => stripInlineMarkdown(text).replace(/\s+/g, ' ').trim()

const slugifyHeading = (text = '') => {
  const normalized = normalizeHeadingText(text)
  const slug = normalized
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
  return slug || 'section'
}

/**
 * 从 Markdown 内容提取标题列表
 * @param {import('vue').Ref<string>} markdownContent - Markdown 内容 ref
 * @returns {{ headings: import('vue').ComputedRef<Array<{level: number, text: string, id: string, lineNumber: number, occurrence: number}>> }}
 */
export function useOutline(markdownContent) {
  const headings = computed(() => {
    const content = markdownContent.value
    if (!content) return []

    const lines = content.split('\n')
    const result = []
    let inCodeBlock = false
    const idCounter = new Map()
    const headingCounter = new Map()

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      // 跳过代码块内的内容
      if (CODE_FENCE_REGEXP.test(line.trim())) {
        inCodeBlock = !inCodeBlock
        continue
      }
      if (inCodeBlock) continue

      const match = line.match(HEADING_REGEXP)
      if (match) {
        const level = match[1].length
        const text = normalizeHeadingText(match[2])
        if (!text) continue

        // 同名标题需要稳定序号，保证定位到正确实例
        const headingKey = `${level}:${text}`
        const occurrence = headingCounter.get(headingKey) || 0
        headingCounter.set(headingKey, occurrence + 1)

        // 生成稳定且唯一的锚点 id，避免同名冲突
        const baseId = slugifyHeading(text)
        const idCount = idCounter.get(baseId) || 0
        idCounter.set(baseId, idCount + 1)
        const id = idCount === 0 ? baseId : `${baseId}-${idCount + 1}`

        result.push({
          level,
          text,
          id,
          lineNumber: index + 1,
          occurrence
        })
      }
    }

    return result
  })

  return { headings }
}
