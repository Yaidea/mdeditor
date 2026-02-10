/**
 * @file tests/composables/useOutline.test.js
 * @description useOutline composable 测试
 */

import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

describe('useOutline', () => {
  it('应提取标题并包含定位元数据', async () => {
    const { useOutline } = await import('@/composables/useOutline.js')
    const markdownContent = ref([
      '# 第一章',
      '正文',
      '```',
      '# 代码块内标题',
      '```',
      '## 子标题 **Bold**',
      '## 子标题 **Bold**',
      '### [链接](https://example.com) 标题'
    ].join('\n'))

    const { headings } = useOutline(markdownContent)

    expect(headings.value).toHaveLength(4)
    expect(headings.value[0]).toMatchObject({
      level: 1,
      text: '第一章',
      lineNumber: 1,
      occurrence: 0,
      id: '第一章'
    })
    expect(headings.value[1]).toMatchObject({
      level: 2,
      text: '子标题 Bold',
      lineNumber: 6,
      occurrence: 0,
      id: '子标题-bold'
    })
    expect(headings.value[2]).toMatchObject({
      level: 2,
      text: '子标题 Bold',
      lineNumber: 7,
      occurrence: 1,
      id: '子标题-bold-2'
    })
    expect(headings.value[3]).toMatchObject({
      level: 3,
      text: '链接 标题',
      lineNumber: 8,
      occurrence: 0,
      id: '链接-标题'
    })
  })

  it('应为空 slug 生成 section 前缀并保持唯一', async () => {
    const { useOutline } = await import('@/composables/useOutline.js')
    const markdownContent = ref([
      '# !!!',
      '# !!!'
    ].join('\n'))

    const { headings } = useOutline(markdownContent)

    expect(headings.value).toHaveLength(2)
    expect(headings.value[0].id).toBe('section')
    expect(headings.value[1].id).toBe('section-2')
  })

  it('应响应 markdown 变更更新大纲', async () => {
    const { useOutline } = await import('@/composables/useOutline.js')
    const markdownContent = ref('# 初始标题')
    const { headings } = useOutline(markdownContent)

    expect(headings.value).toHaveLength(1)
    expect(headings.value[0].text).toBe('初始标题')

    markdownContent.value = '# 更新标题\n## 次级标题'

    expect(headings.value).toHaveLength(2)
    expect(headings.value[0].text).toBe('更新标题')
    expect(headings.value[1].text).toBe('次级标题')
  })
})
