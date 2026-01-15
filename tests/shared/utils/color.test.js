/**
 * @file tests/shared/utils/color.test.js
 * @description ColorUtils 工具类测试
 */

import { describe, it, expect } from 'vitest'
import { ColorUtils } from '@/shared/utils/color.js'

describe('ColorUtils', () => {
  describe('adjustBrightness', () => {
    it('因子为 1 时应返回原色', () => {
      expect(ColorUtils.adjustBrightness('#ff0000', 1)).toBe('#ff0000')
    })

    it('因子小于 1 时应变暗', () => {
      const darker = ColorUtils.adjustBrightness('#ffffff', 0.5)
      expect(darker).toBe('#808080')
    })

    it('因子大于 1 时应变亮（但不超过 255）', () => {
      const brighter = ColorUtils.adjustBrightness('#808080', 2)
      // 0x80 * 2 = 0x100 -> clamped to 0xff
      expect(brighter).toBe('#ffffff')
    })

    it('空值应返回原值', () => {
      expect(ColorUtils.adjustBrightness(null, 1)).toBe(null)
      expect(ColorUtils.adjustBrightness('', 1)).toBe('')
    })

    it('非十六进制颜色应返回原值', () => {
      expect(ColorUtils.adjustBrightness('rgb(255,0,0)', 1)).toBe('rgb(255,0,0)')
    })
  })

  describe('hexToRgb', () => {
    it('应正确转换 6 位十六进制颜色', () => {
      expect(ColorUtils.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(ColorUtils.hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
      expect(ColorUtils.hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
    })

    it('应正确转换 3 位十六进制颜色', () => {
      expect(ColorUtils.hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
      expect(ColorUtils.hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 })
    })

    it('无 # 前缀也应能转换', () => {
      expect(ColorUtils.hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('无效输入应返回 null', () => {
      expect(ColorUtils.hexToRgb(null)).toBe(null)
      expect(ColorUtils.hexToRgb('')).toBe(null)
      expect(ColorUtils.hexToRgb('invalid')).toBe(null)
    })
  })

  describe('rgbToHex', () => {
    it('应正确转换 RGB 到十六进制', () => {
      expect(ColorUtils.rgbToHex(255, 0, 0)).toBe('#ff0000')
      expect(ColorUtils.rgbToHex(0, 255, 0)).toBe('#00ff00')
      expect(ColorUtils.rgbToHex(0, 0, 255)).toBe('#0000ff')
    })

    it('应处理边界值', () => {
      expect(ColorUtils.rgbToHex(0, 0, 0)).toBe('#000000')
      expect(ColorUtils.rgbToHex(255, 255, 255)).toBe('#ffffff')
    })

    it('应钳制超出范围的值', () => {
      expect(ColorUtils.rgbToHex(300, -10, 128)).toBe('#ff0080')
    })
  })

  describe('isDarkColor', () => {
    it('深色应返回 true', () => {
      expect(ColorUtils.isDarkColor('#000000')).toBe(true)
      expect(ColorUtils.isDarkColor('#333333')).toBe(true)
      expect(ColorUtils.isDarkColor('#0000ff')).toBe(true) // 蓝色亮度低
    })

    it('浅色应返回 false', () => {
      expect(ColorUtils.isDarkColor('#ffffff')).toBe(false)
      expect(ColorUtils.isDarkColor('#ffff00')).toBe(false) // 黄色亮度高
    })

    it('无效输入应返回 false', () => {
      expect(ColorUtils.isDarkColor(null)).toBe(false)
      expect(ColorUtils.isDarkColor('invalid')).toBe(false)
    })
  })

  describe('getContrastColor', () => {
    it('深色背景应返回白色', () => {
      expect(ColorUtils.getContrastColor('#000000')).toBe('#ffffff')
      expect(ColorUtils.getContrastColor('#333333')).toBe('#ffffff')
    })

    it('浅色背景应返回黑色', () => {
      expect(ColorUtils.getContrastColor('#ffffff')).toBe('#000000')
      expect(ColorUtils.getContrastColor('#ffff00')).toBe('#000000')
    })
  })

  describe('isValidHex', () => {
    it('有效的 6 位十六进制应返回 true', () => {
      expect(ColorUtils.isValidHex('#ff0000')).toBe(true)
      expect(ColorUtils.isValidHex('#AABBCC')).toBe(true)
    })

    it('有效的 3 位十六进制应返回 true', () => {
      expect(ColorUtils.isValidHex('#f00')).toBe(true)
      expect(ColorUtils.isValidHex('#ABC')).toBe(true)
    })

    it('无效输入应返回 false', () => {
      expect(ColorUtils.isValidHex(null)).toBe(false)
      expect(ColorUtils.isValidHex('')).toBe(false)
      expect(ColorUtils.isValidHex('ff0000')).toBe(false) // 缺少 #
      expect(ColorUtils.isValidHex('#gg0000')).toBe(false) // 无效字符
      expect(ColorUtils.isValidHex('#ff00')).toBe(false) // 长度错误
    })
  })

  describe('normalizeHex', () => {
    it('应标准化为 6 位小写', () => {
      expect(ColorUtils.normalizeHex('#F00')).toBe('#ff0000')
      expect(ColorUtils.normalizeHex('ABC')).toBe('#aabbcc')
      expect(ColorUtils.normalizeHex('#AABBCC')).toBe('#aabbcc')
    })

    it('无效输入应返回空字符串', () => {
      expect(ColorUtils.normalizeHex(null)).toBe('')
      expect(ColorUtils.normalizeHex('invalid')).toBe('')
    })
  })

  describe('mixColors', () => {
    it('ratio=0 应返回 color1', () => {
      expect(ColorUtils.mixColors('#ff0000', '#0000ff', 0)).toBe('#ff0000')
    })

    it('ratio=1 应返回 color2', () => {
      expect(ColorUtils.mixColors('#ff0000', '#0000ff', 1)).toBe('#0000ff')
    })

    it('ratio=0.5 应返回中间色', () => {
      // 红色 + 蓝色 50% = 紫色
      const mixed = ColorUtils.mixColors('#ff0000', '#0000ff', 0.5)
      expect(mixed).toBe('#800080')
    })
  })

  describe('setAlpha', () => {
    it('应返回 rgba 格式', () => {
      expect(ColorUtils.setAlpha('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
    })

    it('alpha 应被钳制到 0-1', () => {
      expect(ColorUtils.setAlpha('#ff0000', 2)).toBe('rgba(255, 0, 0, 1)')
      expect(ColorUtils.setAlpha('#ff0000', -1)).toBe('rgba(255, 0, 0, 0)')
    })

    it('无效颜色应返回原值', () => {
      expect(ColorUtils.setAlpha('invalid', 0.5)).toBe('invalid')
    })
  })

  describe('类方法调用', () => {
    it('类方法应正常工作', () => {
      expect(ColorUtils.adjustBrightness('#808080', 0.5)).toBe('#404040')
      expect(ColorUtils.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      expect(ColorUtils.rgbToHex(255, 0, 0)).toBe('#ff0000')
      expect(ColorUtils.isDarkColor('#000000')).toBe(true)
      expect(ColorUtils.getContrastColor('#000000')).toBe('#ffffff')
      expect(ColorUtils.isValidHex('#ff0000')).toBe(true)
      expect(ColorUtils.normalizeHex('#F00')).toBe('#ff0000')
    })
  })
})
