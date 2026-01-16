// Table Toolbar Plugin for Milkdown WYSIWYG
// Provides a floating toolbar when cursor is in a table
// with common table operations: add/delete rows and columns

import { Plugin, PluginKey } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  isInTable,
  setCellAttr
} from '@milkdown/prose/tables'

const TABLE_TOOLBAR_KEY = new PluginKey('tableToolbar')

/**
 * Create the toolbar DOM element
 */
function createToolbar() {
  const toolbar = document.createElement('div')
  toolbar.className = 'md-table-toolbar'
  toolbar.innerHTML = `
    <div class="md-table-toolbar__group">
      <button type="button" class="md-table-toolbar__btn" data-action="addRowBefore" title="在上方插入行">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M22,14A2,2 0 0,0 20,12H4A2,2 0 0,0 2,14V21H4V19H8V21H10V19H14V21H16V19H20V21H22V14M4,14H8V17H4V14M10,14H14V17H10V14M20,14V17H16V14H20M11,10H13V7H16V5H13V2H11V5H8V7H11V10Z"/></svg>
      </button>
      <button type="button" class="md-table-toolbar__btn" data-action="addRowAfter" title="在下方插入行">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M22,10A2,2 0 0,1 20,12H4A2,2 0 0,1 2,10V3H4V5H8V3H10V5H14V3H16V5H20V3H22V10M4,10H8V7H4V10M10,10H14V7H10V10M20,10V7H16V10H20M11,14H13V17H16V19H13V22H11V19H8V17H11V14Z"/></svg>
      </button>
      <button type="button" class="md-table-toolbar__btn md-table-toolbar__btn--danger" data-action="deleteRow" title="删除行">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9.41,13L12,15.59L14.59,13L16,14.41L13.41,17L16,19.59L14.59,21L12,18.41L9.41,21L8,19.59L10.59,17L8,14.41L9.41,13M22,9A2,2 0 0,1 20,11H4A2,2 0 0,1 2,9V6A2,2 0 0,1 4,4H20A2,2 0 0,1 22,6V9M4,9H8V6H4V9M10,9H14V6H10V9M16,9H20V6H16V9Z"/></svg>
      </button>
    </div>
    <div class="md-table-toolbar__divider"></div>
    <div class="md-table-toolbar__group">
      <button type="button" class="md-table-toolbar__btn" data-action="addColBefore" title="在左侧插入列">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M13,2A2,2 0 0,0 11,4V20A2,2 0 0,0 13,22H22V20H20V16H22V14H20V10H22V8H20V4H22V2H13M13,4H17V8H13V4M13,10H17V14H13V10M13,16H17V20H13V16M9,11H6V8H4V11H1V13H4V16H6V13H9V11Z"/></svg>
      </button>
      <button type="button" class="md-table-toolbar__btn" data-action="addColAfter" title="在右侧插入列">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11,2A2,2 0 0,1 13,4V20A2,2 0 0,1 11,22H2V20H4V16H2V14H4V10H2V8H4V4H2V2H11M11,4H7V8H11V4M11,10H7V14H11V10M11,16H7V20H11V16M15,11H18V8H20V11H23V13H20V16H18V13H15V11Z"/></svg>
      </button>
      <button type="button" class="md-table-toolbar__btn md-table-toolbar__btn--danger" data-action="deleteCol" title="删除列">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4,2H11A2,2 0 0,1 13,4V20A2,2 0 0,1 11,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M4,10V14H11V10H4M4,16V20H11V16H4M4,4V8H11V4H4M17.59,12L15,9.41L16.41,8L19,10.59L21.59,8L23,9.41L20.41,12L23,14.59L21.59,16L19,13.41L16.41,16L15,14.59L17.59,12Z"/></svg>
      </button>
    </div>
    <div class="md-table-toolbar__divider"></div>
    <div class="md-table-toolbar__group">
      <button type="button" class="md-table-toolbar__btn" data-action="alignLeft" title="左对齐">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3,3H21V5H3V3M3,7H15V9H3V7M3,11H21V13H3V11M3,15H15V17H3V15M3,19H21V21H3V19Z"/></svg>
      </button>
      <button type="button" class="md-table-toolbar__btn" data-action="alignCenter" title="居中对齐">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3,3H21V5H3V3M7,7H17V9H7V7M3,11H21V13H3V11M7,15H17V17H7V15M3,19H21V21H3V19Z"/></svg>
      </button>
      <button type="button" class="md-table-toolbar__btn" data-action="alignRight" title="右对齐">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3,3H21V5H3V3M9,7H21V9H9V7M3,11H21V13H3V11M9,15H21V17H9V15M3,19H21V21H3V19Z"/></svg>
      </button>
    </div>
    <div class="md-table-toolbar__divider"></div>
    <div class="md-table-toolbar__group">
      <button type="button" class="md-table-toolbar__btn md-table-toolbar__btn--danger" data-action="deleteTable" title="删除表格">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.46,15.88L16.88,14.46L19,16.59L21.12,14.46L22.54,15.88L20.41,18L22.54,20.12L21.12,21.54L19,19.41L16.88,21.54L15.46,20.12L17.59,18L15.46,15.88M4,3H18A2,2 0 0,1 20,5V12.08C18.45,11.82 16.92,12.18 15.68,13H12V17H13.08C12.97,17.68 12.97,18.35 13.08,19H4A2,2 0 0,1 2,17V5A2,2 0 0,1 4,3M4,7V11H10V7H4M12,7V11H18V7H12M4,13V17H10V13H4Z"/></svg>
      </button>
    </div>
  `
  toolbar.style.display = 'none'
  return toolbar
}

/**
 * Execute table command based on action
 */
function executeAction(action, view) {
  const { state, dispatch } = view

  const commands = {
    addRowBefore: addRowBefore,
    addRowAfter: addRowAfter,
    deleteRow: deleteRow,
    addColBefore: addColumnBefore,
    addColAfter: addColumnAfter,
    deleteCol: deleteColumn,
    deleteTable: deleteTable,
    alignLeft: () => setCellAttr('alignment', 'left')(state, dispatch),
    alignCenter: () => setCellAttr('alignment', 'center')(state, dispatch),
    alignRight: () => setCellAttr('alignment', 'right')(state, dispatch)
  }

  const cmd = commands[action]
  if (cmd) {
    if (typeof cmd === 'function' && cmd.length === 0) {
      cmd()
    } else {
      cmd(state, dispatch)
    }
    view.focus()
  }
}

/**
 * Find the table element from the current selection
 */
function findTableFromSelection(view) {
  const { state } = view
  const { selection } = state
  const { $from } = selection

  // Walk up the document tree to find a table
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === 'table') {
      // Get the position at this depth
      const pos = $from.before(d)
      try {
        const domNode = view.nodeDOM(pos)
        if (domNode && domNode.nodeName === 'TABLE') {
          return domNode
        }
        // Sometimes the DOM node is a wrapper, find the table inside
        if (domNode && domNode.querySelector) {
          const table = domNode.querySelector('table')
          if (table) return table
        }
      } catch (e) {
        // Continue searching
      }
    }
  }

  // Fallback: try to find table from DOM selection
  const domSelection = window.getSelection()
  if (domSelection && domSelection.anchorNode) {
    let node = domSelection.anchorNode
    while (node && node !== view.dom) {
      if (node.nodeName === 'TABLE') {
        return node
      }
      node = node.parentElement
    }
  }

  return null
}

/**
 * Update toolbar position based on table selection
 */
function updateToolbarPosition(toolbar, view) {
  const { state } = view

  // Check if cursor is in a table
  if (!isInTable(state)) {
    toolbar.style.display = 'none'
    return
  }

  // Find the table element
  const tableEl = findTableFromSelection(view)
  if (!tableEl) {
    toolbar.style.display = 'none'
    return
  }

  try {
    // Get the scrollable container (wysiwyg-rendered has overflow: auto)
    const scrollContainer = view.dom.closest('.wysiwyg-rendered') || view.dom.parentElement
    if (!scrollContainer) {
      toolbar.style.display = 'none'
      return
    }

    // Get positions in viewport coordinates
    const tableRect = tableEl.getBoundingClientRect()
    const scrollRect = scrollContainer.getBoundingClientRect()

    // Check if table is at least partially visible in the scroll container
    const tableVisibleTop = Math.max(tableRect.top, scrollRect.top)
    const tableVisibleBottom = Math.min(tableRect.bottom, scrollRect.bottom)
    if (tableVisibleBottom <= tableVisibleTop) {
      // Table is not visible in viewport
      toolbar.style.display = 'none'
      return
    }

    // Toolbar dimensions (approximate)
    const toolbarHeight = 40

    // Calculate toolbar position in viewport coordinates
    // Position toolbar above the table, within the visible scroll area
    let toolbarTop = tableRect.top - toolbarHeight - 8

    // If toolbar would be above the scroll container, position it at the top of visible area
    if (toolbarTop < scrollRect.top) {
      toolbarTop = scrollRect.top + 8
    }

    // If toolbar would be below visible area, clamp it
    if (toolbarTop + toolbarHeight > scrollRect.bottom - 8) {
      toolbarTop = scrollRect.bottom - toolbarHeight - 8
    }

    // Center horizontally relative to table
    const toolbarLeft = tableRect.left + tableRect.width / 2

    // Use fixed positioning for the toolbar so it stays in viewport
    toolbar.style.position = 'fixed'
    toolbar.style.display = 'flex'
    toolbar.style.top = `${toolbarTop}px`
    toolbar.style.left = `${toolbarLeft}px`
    toolbar.style.transform = 'translateX(-50%)'
  } catch (e) {
    toolbar.style.display = 'none'
  }
}

/**
 * Create the Table Toolbar Plugin for Milkdown
 */
export const tableToolbarPlugin = $prose(() => {
  let toolbar = null
  let currentView = null

  return new Plugin({
    key: TABLE_TOOLBAR_KEY,

    view(editorView) {
      toolbar = createToolbar()
      currentView = editorView

      // Find the best container to attach the toolbar
      // The editor DOM is inside .wysiwyg-rendered which is inside .preview-container
      const container = editorView.dom.closest('.wysiwyg-rendered')
        || editorView.dom.closest('.preview-container')
        || editorView.dom.parentElement
      if (container) {
        container.style.position = 'relative'
        container.appendChild(toolbar)
      }

      // Initial check
      setTimeout(() => updateToolbarPosition(toolbar, editorView), 100)

      // Handle button clicks
      toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]')
        if (btn) {
          e.preventDefault()
          e.stopPropagation()
          const action = btn.dataset.action
          executeAction(action, currentView)
        }
      })

      // Prevent toolbar from stealing focus
      toolbar.addEventListener('mousedown', (e) => {
        e.preventDefault()
      })

      return {
        update(view) {
          currentView = view
          updateToolbarPosition(toolbar, view)
        },
        destroy() {
          if (toolbar && toolbar.parentElement) {
            toolbar.parentElement.removeChild(toolbar)
          }
          toolbar = null
          currentView = null
        }
      }
    }
  })
})
