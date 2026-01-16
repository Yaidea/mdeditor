// Math NodeView for Milkdown WYSIWYG
// - Intercepts math_inline and math_block nodes
// - Click on rendered formula to edit LaTeX source
// - Supports toggle between preview (KaTeX) and source (editable)

import { Plugin, TextSelection } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'
import katex from 'katex'

/**
 * Base class for math node views
 */
class MathNodeView {
  constructor(node, view, getPos, isBlock = false) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.isBlock = isBlock
    this.editing = false
    this.lastLatex = ''

    // Create DOM structure
    this.dom = document.createElement(isBlock ? 'div' : 'span')
    this.dom.className = isBlock ? 'md-math md-math--block' : 'md-math md-math--inline'
    this.dom.setAttribute('data-type', isBlock ? 'math_block' : 'math_inline')

    // Preview container (rendered KaTeX)
    this.previewContainer = document.createElement(isBlock ? 'div' : 'span')
    this.previewContainer.className = 'md-math__preview'

    // Source editor container
    this.sourceContainer = document.createElement(isBlock ? 'div' : 'span')
    this.sourceContainer.className = 'md-math__source'

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

    // contentDOM is where ProseMirror manages text content
    this.contentDOM = document.createElement(isBlock ? 'code' : 'code')
    this.contentDOM.className = 'md-math__editor'
    this.sourceContainer.appendChild(this.contentDOM)

    this.dom.appendChild(this.previewContainer)
    this.dom.appendChild(this.sourceContainer)

    // Event handlers
    this.dom.addEventListener('click', (e) => {
      if (!this.editing && !this.toolbar?.contains(e.target)) {
        e.preventDefault()
        e.stopPropagation()
        this.setEditing(true)
      }
    })

    this.dom.addEventListener('dblclick', (e) => {
      if (!this.editing) {
        e.preventDefault()
        e.stopPropagation()
        this.setEditing(true)
      }
    })

    this.dom.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.editing) {
        e.preventDefault()
        e.stopPropagation()
        this.setEditing(false)
      }
    })

    // Block toolbar interactions
    if (this.toolbar) {
      this.toolbar.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })
    }

    // Block preview interactions in preview mode
    this.previewContainer.addEventListener('mousedown', (e) => {
      if (!this.editing) {
        e.preventDefault()
        e.stopPropagation()
      }
    })

    // Initial render
    this.setEditing(false)
    this.renderIfNeeded()
  }

  getLatex() {
    if (this.isBlock) {
      return this.node.attrs?.value || this.node.textContent || ''
    }
    return this.node.textContent || ''
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
      if (this.toolbar) {
        const btn = this.toolbar.querySelector('.md-math__btn')
        if (btn) {
          btn.innerHTML = '<span class="md-math__btn-icon">✓</span><span class="md-math__btn-text">完成编辑</span>'
        }
      }
      this._focusInto()
    } else {
      this.dom.removeAttribute('data-editing')
      this.dom.classList.remove('is-editing')
      if (this.toolbar) {
        const btn = this.toolbar.querySelector('.md-math__btn')
        if (btn) {
          btn.innerHTML = '<span class="md-math__btn-icon">✏️</span><span class="md-math__btn-text">编辑公式</span>'
        }
      }
      this.renderIfNeeded()
    }
  }

  _focusInto() {
    const { state, dispatch } = this.view
    const basePos = typeof this.getPos === 'function' ? this.getPos() : null
    if (basePos != null) {
      try {
        const inside = Math.min(state.doc.content.size - 1, basePos + 1)
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, inside)).scrollIntoView())
      } catch (e) {
        // ignore
      }
    }
    this.view.focus()
  }

  toggle() {
    this.setEditing(!this.editing)
  }

  update(node) {
    // Check if the node type matches
    const expectedType = this.isBlock ? 'math_block' : 'math_inline'
    if (node.type.name !== expectedType) return false
    this.node = node
    if (!this.editing) this.renderIfNeeded()
    return true
  }

  ignoreMutation(m) {
    // Ignore attribute changes on our root element
    if (m.type === 'attributes' && m.target === this.dom) return true
    if (m.type === 'selection') return true
    // Ignore toolbar and preview mutations
    if (this.toolbar && this.toolbar.contains(m.target)) return true
    if (this.previewContainer && this.previewContainer.contains(m.target)) return true
    // Allow ProseMirror to handle contentDOM mutations
    if (this.contentDOM && this.contentDOM.contains(m.target)) return false
    return true
  }

  stopEvent(e) {
    const t = e.target
    // Block toolbar interactions
    if (this.toolbar && this.toolbar.contains(t)) return true
    // In preview mode, block interactions
    if (!this.editing && this.previewContainer && this.previewContainer.contains(t)) return true
    return false
  }

  destroy() {
    // Cleanup if needed
  }

  renderIfNeeded() {
    const latex = this.getLatex()
    if (latex === this.lastLatex && this.previewContainer.innerHTML) return
    this.lastLatex = latex

    if (!latex.trim()) {
      this.previewContainer.innerHTML = `<span class="md-math__empty">${this.isBlock ? '点击输入块级公式' : '点击输入公式'}</span>`
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
