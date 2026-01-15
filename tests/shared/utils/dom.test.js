/**
 * @file tests/shared/utils/dom.test.js
 * @description DOMUtils 工具类测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  OFFSCREEN_STYLES,
  DOMUtils
} from '@/shared/utils/dom.js'

describe('OFFSCREEN_STYLES', () => {
  it('应包含 absolute 样式预设', () => {
    expect(OFFSCREEN_STYLES.absolute).toBeDefined()
    expect(OFFSCREEN_STYLES.absolute.position).toBe('absolute')
    expect(OFFSCREEN_STYLES.absolute.visibility).toBe('hidden')
  })

  it('应包含 fixed 样式预设', () => {
    expect(OFFSCREEN_STYLES.fixed).toBeDefined()
    expect(OFFSCREEN_STYLES.fixed.position).toBe('fixed')
  })

  it('应包含 clipboard 样式预设', () => {
    expect(OFFSCREEN_STYLES.clipboard).toBeDefined()
    expect(OFFSCREEN_STYLES.clipboard.position).toBe('fixed')
    expect(OFFSCREEN_STYLES.clipboard.contain).toBe('strict')
  })

  it('应包含 render 样式预设', () => {
    expect(OFFSCREEN_STYLES.render).toBeDefined()
    expect(OFFSCREEN_STYLES.render.width).toBe('1024px')
  })
})

describe('DOMUtils', () => {
  describe('applyStyles', () => {
    it('应将样式对象应用到元素', () => {
      const el = document.createElement('div')
      DOMUtils.applyStyles(el, { color: 'red', fontSize: '16px' })
      expect(el.style.color).toBe('red')
      expect(el.style.fontSize).toBe('16px')
    })

    it('element 或 styles 为空时应安全返回', () => {
      expect(() => DOMUtils.applyStyles(null, {})).not.toThrow()
      expect(() => DOMUtils.applyStyles(document.createElement('div'), null)).not.toThrow()
    })
  })

  describe('applyOffscreenStyles', () => {
    it('应应用预设的离屏样式', () => {
      const el = document.createElement('div')
      DOMUtils.applyOffscreenStyles(el, 'absolute')
      expect(el.style.position).toBe('absolute')
      expect(el.style.visibility).toBe('hidden')
    })

    it('无效类型应回退到 absolute', () => {
      const el = document.createElement('div')
      DOMUtils.applyOffscreenStyles(el, 'invalid-type')
      expect(el.style.position).toBe('absolute')
    })
  })

  describe('createOffscreenContainer', () => {
    it('应创建带离屏样式的容器', () => {
      const container = DOMUtils.createOffscreenContainer('<p>test</p>', 'fixed')
      expect(container.tagName).toBe('DIV')
      expect(container.innerHTML).toBe('<p>test</p>')
      expect(container.style.position).toBe('fixed')
    })

    it('无 HTML 时应创建空容器', () => {
      const container = DOMUtils.createOffscreenContainer()
      expect(container.innerHTML).toBe('')
    })
  })

  describe('createSelection/clearSelection', () => {
    it('应创建选区并能清除', () => {
      const el = document.createElement('div')
      el.textContent = 'test content'
      document.body.appendChild(el)

      const { range, selection } = DOMUtils.createSelection(el)
      expect(range).toBeDefined()
      expect(selection).toBeDefined()

      DOMUtils.clearSelection()
      expect(window.getSelection().rangeCount).toBe(0)

      document.body.removeChild(el)
    })
  })

  describe('saveScrollPosition/restoreScrollPosition', () => {
    it('应保存和恢复滚动位置', () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

      const pos = DOMUtils.saveScrollPosition()
      expect(pos).toHaveProperty('x')
      expect(pos).toHaveProperty('y')

      DOMUtils.restoreScrollPosition({ x: 100, y: 200 })
      expect(scrollToSpy).toHaveBeenCalledWith(100, 200)

      scrollToSpy.mockRestore()
    })
  })

  describe('safeRemove', () => {
    it('应安全移除元素', () => {
      const parent = document.createElement('div')
      const child = document.createElement('span')
      parent.appendChild(child)

      expect(DOMUtils.safeRemove(child)).toBe(true)
      expect(parent.contains(child)).toBe(false)
    })

    it('元素无父节点时应返回 false', () => {
      const el = document.createElement('div')
      expect(DOMUtils.safeRemove(el)).toBe(false)
    })

    it('null 元素应返回 false', () => {
      expect(DOMUtils.safeRemove(null)).toBe(false)
    })
  })

  describe('withTemporaryElement', () => {
    it('应执行操作后清理元素', async () => {
      const el = document.createElement('div')
      el.id = 'temp-test'

      const result = await DOMUtils.withTemporaryElement(el, (elem) => {
        expect(document.body.contains(elem)).toBe(true)
        return 'done'
      })

      expect(result).toBe('done')
      expect(document.body.contains(el)).toBe(false)
    })

    it('操作抛出异常时也应清理元素', async () => {
      const el = document.createElement('div')

      await expect(DOMUtils.withTemporaryElement(el, () => {
        throw new Error('test error')
      })).rejects.toThrow('test error')

      expect(document.body.contains(el)).toBe(false)
    })
  })

  describe('类方法调用', () => {
    it('类方法应正常工作', () => {
      const el = document.createElement('div')
      DOMUtils.applyOffscreenStyles(el, 'fixed')
      expect(el.style.position).toBe('fixed')

      const container = DOMUtils.createOffscreenContainer('<span>x</span>')
      expect(container.innerHTML).toBe('<span>x</span>')
    })
  })
})
