// Math NodeView for Milkdown WYSIWYG
// - Intercepts math_inline and math_block nodes
// - Click on rendered formula to edit LaTeX source
// - Uses input/textarea for editing since math nodes are atomic (atom: true)

import { Plugin } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'
import katex from 'katex'

/**
 * Math NodeView class for editable math formulas
 * Since Milkdown math nodes are atomic, we use custom input elements for editing
 */
class MathNodeView {
  constructor(node, view, getPos, isBlock = false) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.isBlock = isBlock
    this.editing = false

    // Create DOM structure
    this.dom = document.createElement(isBlock ? 'div' : 'span')
    this.dom.className = isBlock ? 'md-math md-math--block' : 'md-math md-math--inline'
    this.dom.setAttribute('data-type', isBlock ? 'math_block' : 'math_inline')

    // Preview container (rendered KaTeX)
    this.previewContainer = document.createElement(isBlock ? 'div' : 'span')
    this.previewContainer.className = 'md-math__preview'

    // Source editor container with input element
    this.sourceContainer = document.createElement(isBlock ? 'div' : 'span')
    this.sourceContainer.className = 'md-math__source'

    // Create input element (textarea for block, input for inline)
    if (isBlock) {
      this.inputEl = document.createElement('textarea')
      this.inputEl.rows = 3
    } else {
      this.inputEl = document.createElement('input')
      this.inputEl.type = 'text'
    }
    this.inputEl.className = 'md-math__editor'
    this.inputEl.placeholder = isBlock ? '输入 LaTeX 公式...' : 'LaTeX'
    this.sourceContainer.appendChild(this.inputEl)

    // For block math, add a toolbar
    if (isBlock) {
      this.toolbar = document.createElement('div')
      this.toolbar.className = 'md-math__toolbar'

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'md-math__btn'
      btn.innerHTML = '<span class="md-math__btn-icon">✏️</span><span class="md-math__btn-text">编辑公式</span>'
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.toggle()
      })
      this.toolbar.appendChild(btn)
      this.dom.appendChild(this.toolbar)
    }

    this.dom.appendChild(this.previewContainer)
    this.dom.appendChild(this.sourceContainer)

    // Input event handlers
    this.inputEl.addEventListener('input', () => {
      this._saveContent()
    })

    this.inputEl.addEventListener('blur', () => {
      // Small delay to allow button clicks to register
      setTimeout(() => {
        if (this.editing && !this.dom.contains(document.activeElement)) {
          this.setEditing(false)
        }
      }, 150)
    })

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        this.setEditing(false)
      }
      // For inline math, Enter saves and exits
      if (!this.isBlock && e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        this.setEditing(false)
      }
      // For block math, Ctrl/Cmd+Enter saves and exits
      if (this.isBlock && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        e.stopPropagation()
        this.setEditing(false)
      }
    })

    // Click to edit
    this.previewContainer.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.setEditing(true)
    })

    // Block toolbar interactions
    if (this.toolbar) {
      this.toolbar.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })
    }

    // Initial render
    this.renderPreview()
  }

  /**
   * Get LaTeX content from node
   */
  getLatex() {
    if (this.isBlock) {
      // Block math stores value in attrs.value
      return this.node.attrs?.value || ''
    }
    // Inline math stores value in text content
    return this.node.textContent || ''
  }

  /**
   * Save content from input to ProseMirror document
   */
  _saveContent() {
    const newLatex = this.inputEl.value
    const pos = typeof this.getPos === 'function' ? this.getPos() : null
    if (pos == null) return

    const { state, dispatch } = this.view
    const node = this.node
    let tr = state.tr

    if (this.isBlock) {
      // For block math, update the attrs.value
      tr = tr.setNodeMarkup(pos, null, { ...node.attrs, value: newLatex })
    } else {
      // For inline math, replace the node content
      const nodeType = state.schema.nodes.math_inline
      if (nodeType) {
        const newNode = nodeType.create(node.attrs, newLatex ? state.schema.text(newLatex) : null)
        tr = tr.replaceWith(pos, pos + node.nodeSize, newNode)
      }
    }

    dispatch(tr)
  }

  selectNode() {
    this.dom.classList.add('is-selected')
  }

  deselectNode() {
    this.dom.classList.remove('is-selected')
  }

  setEditing(v) {
    this.editing = v
    if (v) {
      this.dom.setAttribute('data-editing', 'true')
      this.dom.classList.add('is-editing')
      // Load current content into input
      this.inputEl.value = this.getLatex()
      if (this.toolbar) {
        const btn = this.toolbar.querySelector('.md-math__btn')
        if (btn) {
          btn.innerHTML = '<span class="md-math__btn-icon">✓</span><span class="md-math__btn-text">完成编辑</span>'
        }
      }
      // Focus input
      setTimeout(() => {
        this.inputEl.focus()
        this.inputEl.select()
      }, 10)
    } else {
      this.dom.removeAttribute('data-editing')
      this.dom.classList.remove('is-editing')
      if (this.toolbar) {
        const btn = this.toolbar.querySelector('.md-math__btn')
        if (btn) {
          btn.innerHTML = '<span class="md-math__btn-icon">✏️</span><span class="md-math__btn-text">编辑公式</span>'
        }
      }
      this.renderPreview()
    }
  }

  toggle() {
    this.setEditing(!this.editing)
  }

  update(node) {
    // Check if the node type matches
    const expectedType = this.isBlock ? 'math_block' : 'math_inline'
    if (node.type.name !== expectedType) return false
    this.node = node
    if (!this.editing) {
      this.renderPreview()
    }
    return true
  }

  ignoreMutation(m) {
    // Ignore all mutations - we manage our own DOM
    return true
  }

  stopEvent(e) {
    // In editing mode, let input handle all events
    if (this.editing) {
      return this.sourceContainer.contains(e.target)
    }
    // Block toolbar interactions
    if (this.toolbar && this.toolbar.contains(e.target)) return true
    // Block preview clicks
    if (this.previewContainer.contains(e.target)) return true
    return false
  }

  destroy() {
    // Cleanup
  }

  renderPreview() {
    const latex = this.getLatex()

    if (!latex.trim()) {
      this.previewContainer.innerHTML = `<span class="md-math__empty">${this.isBlock ? '点击输入块级公式' : '$'}</span>`
      return
    }

    try {
      const html = katex.renderToString(latex, {
        displayMode: this.isBlock,
        throwOnError: false,
        output: 'html'
      })
      this.previewContainer.innerHTML = html
    } catch (err) {
      this.previewContainer.innerHTML = `<span class="md-math__error">${this._escapeHtml(String(err))}</span>`
    }
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

/**
 * Create the Math NodeView Plugin for Milkdown
 */
export const mathNodeViewPlugin = $prose(() => {
  return new Plugin({
    props: {
      nodeViews: {
        math_inline: (node, view, getPos) => {
          return new MathNodeView(node, view, getPos, false)
        },
        math_block: (node, view, getPos) => {
          return new MathNodeView(node, view, getPos, true)
        },
      },
    },
  })
})
