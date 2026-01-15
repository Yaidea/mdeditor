/**
 * @file tests/core/theme/storage.test.js
 * @description ThemeStorage 类单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ThemeStorage, STORAGE_KEYS, STORAGE_DEFAULTS } from '../../../src/core/theme/storage.js'

describe('ThemeStorage', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('save', () => {
    it('应成功保存值到 localStorage', () => {
      const result = ThemeStorage.save('testKey', 'testValue')
      expect(result).toBe(true)
      expect(localStorage.getItem('testKey')).toBe('testValue')
    })

    it('localStorage 抛出异常时应返回 false', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceeded')
      })

      const result = ThemeStorage.save('testKey', 'testValue')
      expect(result).toBe(false)

      spy.mockRestore()
    })
  })

  describe('load', () => {
    it('应正确加载已存储的值', () => {
      localStorage.setItem('testKey', 'testValue')
      const result = ThemeStorage.load('testKey')
      expect(result).toBe('testValue')
    })

    it('值不存在时应返回默认值', () => {
      const result = ThemeStorage.load('nonExistent', 'defaultValue')
      expect(result).toBe('defaultValue')
    })

    it('值为空字符串时应返回默认值', () => {
      localStorage.setItem('emptyKey', '')
      const result = ThemeStorage.load('emptyKey', 'default')
      expect(result).toBe('default')
    })

    it('localStorage 抛出异常时应返回默认值', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied')
      })

      const result = ThemeStorage.load('testKey', 'fallback')
      expect(result).toBe('fallback')

      spy.mockRestore()
    })
  })

  describe('remove', () => {
    it('应成功移除键', () => {
      localStorage.setItem('testKey', 'testValue')
      const result = ThemeStorage.remove('testKey')
      expect(result).toBe(true)
      expect(localStorage.getItem('testKey')).toBeNull()
    })

    it('localStorage 抛出异常时应返回 false', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = ThemeStorage.remove('testKey')
      expect(result).toBe(false)

      spy.mockRestore()
    })
  })

  describe('saveAll', () => {
    it('应批量保存所有设置', () => {
      const settings = {
        colorTheme: 'dark',
        codeStyle: 'monokai',
        themeSystem: 'system'
      }

      const result = ThemeStorage.saveAll(settings)
      expect(result).toBe(true)
      expect(localStorage.getItem(STORAGE_KEYS.COLOR_THEME)).toBe('dark')
      expect(localStorage.getItem(STORAGE_KEYS.CODE_STYLE)).toBe('monokai')
      expect(localStorage.getItem(STORAGE_KEYS.THEME_SYSTEM)).toBe('system')
    })

    it('只保存提供的设置', () => {
      const settings = {
        colorTheme: 'light'
      }

      const result = ThemeStorage.saveAll(settings)
      expect(result).toBe(true)
      expect(localStorage.getItem(STORAGE_KEYS.COLOR_THEME)).toBe('light')
      expect(localStorage.getItem(STORAGE_KEYS.CODE_STYLE)).toBeNull()
    })

    it('部分保存失败时应返回 false', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key) => {
        if (key === STORAGE_KEYS.CODE_STYLE) {
          throw new Error('Failed')
        }
      })

      const settings = {
        colorTheme: 'dark',
        codeStyle: 'monokai'
      }

      const result = ThemeStorage.saveAll(settings)
      expect(result).toBe(false)

      spy.mockRestore()
    })
  })

  describe('loadAll', () => {
    it('应加载所有设置并使用默认值', () => {
      const result = ThemeStorage.loadAll()

      expect(result.colorTheme).toBe(STORAGE_DEFAULTS.COLOR_THEME)
      expect(result.codeStyle).toBe(STORAGE_DEFAULTS.CODE_STYLE)
      expect(result.themeSystem).toBe(STORAGE_DEFAULTS.THEME_SYSTEM)
      expect(result.fontFamily).toBe(STORAGE_DEFAULTS.FONT_FAMILY)
      expect(result.fontSize).toBe(STORAGE_DEFAULTS.FONT_SIZE)
      expect(result.letterSpacing).toBe(STORAGE_DEFAULTS.LETTER_SPACING)
      expect(result.lineHeight).toBe(STORAGE_DEFAULTS.LINE_HEIGHT)
    })

    it('应正确加载已存储的值', () => {
      localStorage.setItem(STORAGE_KEYS.COLOR_THEME, 'custom-theme')
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, '18')
      localStorage.setItem(STORAGE_KEYS.LETTER_SPACING, '0.5')
      localStorage.setItem(STORAGE_KEYS.LINE_HEIGHT, '1.8')

      const result = ThemeStorage.loadAll()

      expect(result.colorTheme).toBe('custom-theme')
      expect(result.fontSize).toBe(18)
      expect(result.letterSpacing).toBe(0.5)
      expect(result.lineHeight).toBe(1.8)
    })
  })

  describe('clearAll', () => {
    it('应清除所有主题相关设置', () => {
      // 先保存一些值
      localStorage.setItem(STORAGE_KEYS.COLOR_THEME, 'dark')
      localStorage.setItem(STORAGE_KEYS.CODE_STYLE, 'monokai')
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, '18')

      const result = ThemeStorage.clearAll()
      expect(result).toBe(true)

      expect(localStorage.getItem(STORAGE_KEYS.COLOR_THEME)).toBeNull()
      expect(localStorage.getItem(STORAGE_KEYS.CODE_STYLE)).toBeNull()
      expect(localStorage.getItem(STORAGE_KEYS.FONT_SIZE)).toBeNull()
    })

    it('部分清除失败时应返回 false', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
        if (key === STORAGE_KEYS.FONT_SIZE) {
          throw new Error('Failed')
        }
      })

      const result = ThemeStorage.clearAll()
      expect(result).toBe(false)

      spy.mockRestore()
    })
  })
})

describe('STORAGE_KEYS', () => {
  it('应导出存储键常量', () => {
    expect(STORAGE_KEYS).toBeDefined()
    expect(STORAGE_KEYS.COLOR_THEME).toBeDefined()
    expect(STORAGE_KEYS.CODE_STYLE).toBeDefined()
  })
})

describe('STORAGE_DEFAULTS', () => {
  it('应导出默认值常量', () => {
    expect(STORAGE_DEFAULTS).toBeDefined()
    expect(STORAGE_DEFAULTS.FONT_SIZE).toBe(16)
    expect(STORAGE_DEFAULTS.FONT_FAMILY).toBe('system-default')
  })
})
