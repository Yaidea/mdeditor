/**
 * @file tests/core/markdown/list-and-table.test.js
 * @description 列表与表格处理器基础测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { defaultColorTheme } from '../../../src/config/theme-presets.js'
import { ListProcessor, TableProcessor, LIST_TYPES } from '../../../src/core/markdown/parser.js'

describe('列表处理器', () => {
  let lp

  beforeEach(() => {
    lp = new ListProcessor()
  })

  it('应正确识别与格式化无序列表', () => {
    const line = '* 项目A'
    const { isListItem, result } = lp.processListLine(line, defaultColorTheme)
    expect(isListItem).toBe(true)
    expect(result).toContain('<p')
    expect(result).toContain('项目A')
  })

  it('应正确识别与格式化任务列表（勾选/未勾选）', () => {
    const checked = '- [x] 完成任务'
    const unchecked = '- [ ] 待办任务'
    const r1 = lp.processListLine(checked, defaultColorTheme)
    const r2 = lp.processListLine(unchecked, defaultColorTheme)
    expect(r1.isListItem).toBe(true)
    expect(r1.result).toContain('完成任务')
    expect(r2.result).toContain('待办任务')
  })

  it('应正确识别有序列表', () => {
    const line = '1. 第一项'
    const result = lp.processListLine(line, defaultColorTheme)
    expect(result.isListItem).toBe(true)
    expect(result.listItem.type).toBe(LIST_TYPES.ORDERED)
    expect(result.result).toContain('第一项')
  })

  it('应支持不同的无序列表符号', () => {
    const markers = ['- 项目', '* 项目', '+ 项目']
    markers.forEach(line => {
      const lp2 = new ListProcessor()
      const result = lp2.processListLine(line, defaultColorTheme)
      expect(result.isListItem).toBe(true)
      expect(result.listItem.type).toBe(LIST_TYPES.UNORDERED)
    })
  })

  it('应正确解析嵌套列表层级', () => {
    const lines = ['- 一级', '  - 二级', '    - 三级']
    lines.forEach((line, depth) => {
      const lp2 = new ListProcessor()
      const result = lp2.processListLine(line, defaultColorTheme)
      expect(result.listItem.depth).toBe(depth)
    })
  })

  it('parseListItem 应返回 null 对于非列表行', () => {
    expect(lp.parseListItem('普通文本')).toBeNull()
    expect(lp.parseListItem('# 标题')).toBeNull()
    expect(lp.parseListItem('')).toBeNull()
  })

  it('parseListItem 应正确判断列表行', () => {
    expect(lp.parseListItem('- 项目')).not.toBeNull()
    expect(lp.parseListItem('普通文本')).toBeNull()
  })

  it('currentDepth 和 lastListType 应返回正确状态', () => {
    lp.processListLine('- 项目', defaultColorTheme)
    expect(lp.currentDepth).toBe(0)
    expect(lp.lastListType).toBe(LIST_TYPES.UNORDERED)
  })

  it('reset 应重置处理器状态', () => {
    lp.processListLine('- 项目', defaultColorTheme)
    lp.reset()
    expect(lp.currentDepth).toBe(0)
    expect(lp.lastListType).toBe(LIST_TYPES.NONE)
  })

  it('formatListItem 应返回空字符串对于未知类型', () => {
    const result = lp.formatListItem({ type: 'unknown' }, defaultColorTheme)
    expect(result).toBe('')
  })

  it('numberToLowerAlpha 应正确转换数字为字母', () => {
    expect(lp.numberToLowerAlpha(1)).toBe('a')
    expect(lp.numberToLowerAlpha(2)).toBe('b')
    expect(lp.numberToLowerAlpha(26)).toBe('z')
    expect(lp.numberToLowerAlpha(27)).toBe('aa')
    expect(lp.numberToLowerAlpha(0)).toBe('a') // 边界情况
  })

  it('numberToLowerRoman 应正确转换数字为罗马数字', () => {
    expect(lp.numberToLowerRoman(1)).toBe('i')
    expect(lp.numberToLowerRoman(4)).toBe('iv')
    expect(lp.numberToLowerRoman(5)).toBe('v')
    expect(lp.numberToLowerRoman(9)).toBe('ix')
    expect(lp.numberToLowerRoman(10)).toBe('x')
    expect(lp.numberToLowerRoman(50)).toBe('l')
    expect(lp.numberToLowerRoman(100)).toBe('c')
    expect(lp.numberToLowerRoman(0)).toBe('') // 边界情况
  })

  it('getOrderedListMarker 应根据深度返回不同格式', () => {
    expect(lp.getOrderedListMarker(1, 0)).toBe('1.') // 第一层：数字
    expect(lp.getOrderedListMarker(1, 1)).toBe('a.') // 第二层：字母
    expect(lp.getOrderedListMarker(1, 2)).toBe('i.') // 第三层：罗马数字
    expect(lp.getOrderedListMarker(1, 3)).toBe('(1)') // 第四层：括号数字
    expect(lp.getOrderedListMarker(1, 4)).toBe('1.') // 循环回第一层
  })

  it('adjustColorBrightness 应正确调整颜色亮度', () => {
    const original = '#ffffff'
    const darkened = lp.adjustColorBrightness(original, 0.5)
    // Math.round(255 * 0.5) = 128 = 0x80
    expect(darkened).toBe('#808080')

    // 非 hex 格式应返回原色
    const rgb = 'rgb(255, 255, 255)'
    expect(lp.adjustColorBrightness(rgb, 0.5)).toBe(rgb)
  })

  it('getListColors 应基于主题色生成颜色序列', () => {
    const colors = lp.getListColors(defaultColorTheme)
    expect(colors.length).toBe(4)
    expect(colors[0]).toBe(defaultColorTheme.primary)
  })

  it('getListColors 应使用主题自定义的 listColors', () => {
    const customTheme = { listColors: ['#ff0000', '#00ff00', '#0000ff'] }
    const colors = lp.getListColors(customTheme)
    expect(colors).toEqual(customTheme.listColors)
  })

  it('getListColors 应为无主色的主题提供回退', () => {
    const colors = lp.getListColors({})
    expect(colors.length).toBe(4)
    expect(colors[0]).toBe('#2563eb')
  })

  it('getFontSettings 应返回正确的字体设置', () => {
    const settings = lp.getFontSettings({ fontSize: 14 })
    expect(settings.fontSize).toBe(14)
    expect(settings.lineHeight).toBe('1.7')

    const settings2 = lp.getFontSettings({ fontSize: 20 })
    expect(settings2.lineHeight).toBe('1.5')

    const settings3 = lp.getFontSettings(null)
    expect(settings3.fontSize).toBe(16)
  })

  it('getSymbolFontSize 应计算符号字体大小', () => {
    const size = lp.getSymbolFontSize(0, '●', 16)
    expect(size).toBeGreaterThanOrEqual(12)
  })

  it('getSymbolScale 应返回正确的缩放比例', () => {
    expect(lp.getSymbolScale('●')).toBe(1.0)
    expect(lp.getSymbolScale('○')).toBe(0.5)
    expect(lp.getSymbolScale('▪')).toBe(1.2)
    expect(lp.getSymbolScale('未知')).toBe(1.0)
  })

  it('应正确处理带字体设置的列表格式化', () => {
    const fontSettings = { fontSize: 18, lineHeight: 1.6 }
    const result = lp.processListLine('- 项目', defaultColorTheme, fontSettings)
    expect(result.result).toContain('18px')
  })
})

describe('表格处理器', () => {
  it('应识别简单表格并生成表格 HTML', () => {
    const tp = new TableProcessor()
    const lines = [
      '| 列1 | 列2 |',
      '| --- | --- |',
      '| a   | b   |'
    ]

    // 模拟逐行处理
    let html = ''
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      const r = tp.processTableRow(line, line.trim(), lines, i, defaultColorTheme)
      if (!r.shouldContinue && r.result) {
        html += r.result
      }
      if (r.reprocessLine) continue
      i++
    }

    // 末尾完成
    if (tp.isProcessingTable()) {
      html += tp.completeTable(defaultColorTheme)
    }

    expect(html).toContain('<table')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
  })
})


