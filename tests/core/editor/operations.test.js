/**
 * @file tests/core/editor/operations.test.js
 * @description 原子操作（粗体/标题/代码块等）行为测试，使用轻量假 EditorView 验证文本与选区
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  insertBold,
  insertHeading,
  insertCode,
  insertCodeBlock,
  insertList,
  insertOrderedList,
  insertLink,
  insertImage,
  insertItalic,
  insertStrikethrough,
  insertQuote,
  insertTable,
  insertHorizontalRule,
  insertText,
} from '../../../src/core/editor/operations.js'

// 轻量级假 EditorView，模拟必要的 state/dispatch/focus 行为
function createFakeEditor(initialText = '', from = 0, to = 0) {
  let text = initialText
  const view = {
    state: {
      doc: {
        length: initialText.length,
        sliceString: (s, e) => text.slice(s, e)
      },
      selection: { main: { from, to } }
    },
    dispatch(tr) {
      const before = text.slice(0, tr.changes.from)
      const after = text.slice(tr.changes.to)
      text = before + tr.changes.insert + after
      // 更新选择与文档长度
      this.state.selection.main = {
        from: tr.selection.anchor,
        to: tr.selection.head
      }
      this.state.doc.length = text.length
    },
    focus() {},
    // 便捷读取器
    getText() { return text },
    getSelection() { return this.state.selection.main }
  }
  return view
}

describe('editor operations: 插入与选区', () => {
  let ev
  beforeEach(() => {
    ev = createFakeEditor('', 0, 0)
  })

  it('insertBold：无选区时应插入 **粗体文本** 并选中占位符', () => {
    insertBold(ev)
    expect(ev.getText()).toContain('**')
    const sel = ev.getSelection()
    const inserted = ev.getText().slice(sel.from, sel.to)
    expect(inserted).toMatch(/粗体文本|BOLD|粗体/) // 中文占位符
  })

  it('insertCode：应以反引号包裹占位符', () => {
    insertCode(ev)
    expect(ev.getText()).toMatch(/`.+`/)
  })

  it('insertHeading：指定级别时使用对应数量的 # 前缀', () => {
    insertHeading(ev, 3)
    expect(ev.getText().startsWith('### ')).toBe(true)
  })

  it('insertCodeBlock：应生成三反引号包裹的代码块模板', () => {
    insertCodeBlock(ev, 'javascript')
    expect(ev.getText()).toContain('```javascript')
    expect(ev.getText()).toContain('```')
  })

  it('insertList/insertOrderedList：应插入列表前缀', () => {
    insertList(ev)
    expect(ev.getText().startsWith('- ')).toBe(true)

    ev = createFakeEditor('', 0, 0)
    insertOrderedList(ev)
    expect(ev.getText().startsWith('1. ')).toBe(true)
  })
})
  it('insertBold：有选区时应包裹已选中文本', () => {
    const evSel = createFakeEditor('hello', 0, 5)
    insertBold(evSel)
    expect(evSel.getText()).toBe('**hello**')
    const sel = evSel.getSelection()
    expect(evSel.getText().slice(sel.from, sel.to)).toBe('hello')
  })

  it('insertLink：应插入 [链接文本](https://) 模板', () => {
    const ev2 = createFakeEditor('', 0, 0)
    insertLink(ev2)
    expect(ev2.getText()).toMatch(/\[[^\]]*\]\(https:\/\/\)/)
  })

  it('insertImage：应插入 ![图片描述](https://) 模板', () => {
    const ev3 = createFakeEditor('', 0, 0)
    insertImage(ev3)
    expect(ev3.getText()).toMatch(/^!\[[^\]]*\]\(https:\/\/\)/)
  })

describe('editor operations: 更多操作', () => {
  it('insertItalic：无选区时应插入斜体占位符', () => {
    const ev = createFakeEditor('', 0, 0)
    insertItalic(ev)
    expect(ev.getText()).toMatch(/\*[^*]+\*/)
    expect(ev.getText()).not.toContain('**')
  })

  it('insertItalic：有选区时应包裹已选中文本', () => {
    const ev = createFakeEditor('hello', 0, 5)
    insertItalic(ev)
    expect(ev.getText()).toBe('*hello*')
  })

  it('insertStrikethrough：无选区时应插入删除线占位符', () => {
    const ev = createFakeEditor('', 0, 0)
    insertStrikethrough(ev)
    expect(ev.getText()).toContain('~~')
  })

  it('insertStrikethrough：有选区时应包裹已选中文本', () => {
    const ev = createFakeEditor('removed', 0, 7)
    insertStrikethrough(ev)
    expect(ev.getText()).toBe('~~removed~~')
  })

  it('insertQuote：应插入引用前缀', () => {
    const ev = createFakeEditor('', 0, 0)
    insertQuote(ev)
    expect(ev.getText().startsWith('> ')).toBe(true)
  })

  it('insertTable：应插入表格 Markdown 模板', () => {
    const ev = createFakeEditor('', 0, 0)
    insertTable(ev)
    const text = ev.getText()
    expect(text).toContain('|')
    expect(text).toContain('---')
  })

  it('insertTable：应支持指定行列数', () => {
    const ev = createFakeEditor('', 0, 0)
    insertTable(ev, 4, 4)
    const text = ev.getText()
    // 表头 + 分隔符 + 3 行数据
    const rowCount = text.split('\n').filter(line => line.includes('|')).length
    expect(rowCount).toBeGreaterThanOrEqual(4)
  })

  it('insertHorizontalRule：应插入分割线', () => {
    const ev = createFakeEditor('', 0, 0)
    insertHorizontalRule(ev)
    expect(ev.getText()).toContain('---')
  })

  it('insertHeading：默认级别为 2', () => {
    const ev = createFakeEditor('', 0, 0)
    insertHeading(ev)
    expect(ev.getText().startsWith('## ')).toBe(true)
  })

  it('insertHeading：级别边界验证（超出范围时 clamp）', () => {
    const ev1 = createFakeEditor('', 0, 0)
    insertHeading(ev1, 0) // 小于最小值
    expect(ev1.getText().startsWith('# ')).toBe(true) // clamp to 1

    const ev2 = createFakeEditor('', 0, 0)
    insertHeading(ev2, 10) // 大于最大值
    expect(ev2.getText().startsWith('###### ')).toBe(true) // clamp to 6
  })

  it('insertCodeBlock：默认语言应为空字符串', () => {
    const ev = createFakeEditor('', 0, 0)
    insertCodeBlock(ev, '')
    expect(ev.getText()).toContain('```\n')
  })

  it('insertText：editorView 为 null 时应安全返回', () => {
    // 不应抛出异常
    expect(() => insertText(null, '**', '**', '粗体')).not.toThrow()
  })
})

