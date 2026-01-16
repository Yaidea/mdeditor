// Table Block Plugin for Milkdown WYSIWYG
// Provides Milkdown-style table editing features:
// - Row/Column drag handles for selection
// - Line handles for adding rows/columns at boundaries
// - Button groups for alignment and deletion
// - Drag and drop reordering

import { Plugin, PluginKey } from '@milkdown/prose/state'
import { $prose } from '@milkdown/utils'
import { DecorationSet } from '@milkdown/prose/view'
import { commandsCtx, editorViewCtx } from '@milkdown/core'
import {
  addColAfterCommand,
  addColBeforeCommand,
  addRowAfterCommand,
  addRowBeforeCommand,
  deleteSelectedCellsCommand,
  moveColCommand,
  moveRowCommand,
  selectColCommand,
  selectRowCommand,
  setAlignCommand
} from '@milkdown/preset-gfm'
import { isInTable } from '@milkdown/prose/tables'
import { findParent } from '@milkdown/prose'

import { icons } from './icons.js'

export const TABLE_BLOCK_KEY = new PluginKey('tableBlock')

// Throttle utility
function throttle(fn, delay) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn.apply(this, args)
    }
  }
}

// Find the cell index from pointer position
function findPointerIndex(event, view) {
  if (!view) return null

  try {
    const posAtCoords = view.posAtCoords({
      left: event.clientX,
      top: event.clientY
    })
    if (!posAtCoords) return null
    const pos = posAtCoords.inside
    if (pos == null || pos < 0) return null

    const $pos = view.state.doc.resolve(pos)
    const node = view.state.doc.nodeAt(pos)
    if (!node) return null

    const cellType = ['table_cell', 'table_header']
    const rowType = ['table_row', 'table_header_row']

    const findNodeIndex = (parent, child) => {
      for (let i = 0; i < parent.childCount; i++) {
        if (parent.child(i) === child) return i
      }
      return -1
    }

    const cell = cellType.includes(node.type.name)
      ? node
      : findParent((n) => cellType.includes(n.type.name))($pos)?.node
    const row = findParent((n) => rowType.includes(n.type.name))($pos)?.node
    const table = findParent((n) => n.type.name === 'table')($pos)?.node
    if (!cell || !row || !table) return null

    const columnIndex = findNodeIndex(row, cell)
    const rowIndex = findNodeIndex(table, row)

    return [rowIndex, columnIndex]
  } catch {
    return null
  }
}

// Get related DOM elements from cell index
function getRelatedDOM(contentWrapper, index) {
  if (!contentWrapper || !index) return null
  const [rowIndex, columnIndex] = index
  const rows = contentWrapper.querySelectorAll('tr')
  const row = rows[rowIndex]
  if (!row) return null

  const firstRow = rows[0]
  if (!firstRow) return null

  const headerCol = firstRow.children[columnIndex]
  if (!headerCol) return null

  const col = row.children[columnIndex]
  if (!col) return null

  return { row, col, headerCol }
}

// Create the table block component DOM
function createTableBlockDOM() {
  const wrapper = document.createElement('div')
  wrapper.className = 'milkdown-table-block'

  // Column drag handle
  const colHandle = document.createElement('div')
  colHandle.className = 'handle cell-handle'
  colHandle.dataset.role = 'col-drag-handle'
  colHandle.dataset.show = 'false'
  colHandle.contentEditable = 'false'
  colHandle.draggable = true
  colHandle.innerHTML = `
    <span class="handle-icon">${icons.dragHandle}</span>
    <div class="button-group" data-show="false">
      <button type="button" data-action="align-left" title="左对齐">${icons.alignLeft}</button>
      <button type="button" data-action="align-center" title="居中对齐">${icons.alignCenter}</button>
      <button type="button" data-action="align-right" title="右对齐">${icons.alignRight}</button>
      <button type="button" data-action="delete-col" title="删除列">${icons.remove}</button>
    </div>
  `

  // Row drag handle
  const rowHandle = document.createElement('div')
  rowHandle.className = 'handle cell-handle'
  rowHandle.dataset.role = 'row-drag-handle'
  rowHandle.dataset.show = 'false'
  rowHandle.contentEditable = 'false'
  rowHandle.draggable = true
  rowHandle.innerHTML = `
    <span class="handle-icon">${icons.dragHandle}</span>
    <div class="button-group" data-show="false">
      <button type="button" data-action="delete-row" title="删除行">${icons.remove}</button>
    </div>
  `

  // Table wrapper
  const tableWrapper = document.createElement('div')
  tableWrapper.className = 'table-wrapper'

  // Drag preview
  const dragPreview = document.createElement('div')
  dragPreview.className = 'drag-preview'
  dragPreview.dataset.show = 'false'
  dragPreview.dataset.direction = 'vertical'
  dragPreview.innerHTML = '<table><tbody></tbody></table>'

  // X line handle (horizontal - for adding rows)
  const xLineHandle = document.createElement('div')
  xLineHandle.className = 'handle line-handle'
  xLineHandle.dataset.role = 'x-line-drag-handle'
  xLineHandle.dataset.show = 'false'
  xLineHandle.dataset.displayType = 'tool'
  xLineHandle.contentEditable = 'false'
  xLineHandle.innerHTML = `<button type="button" class="add-button" data-action="add-row">${icons.plus}</button>`

  // Y line handle (vertical - for adding columns)
  const yLineHandle = document.createElement('div')
  yLineHandle.className = 'handle line-handle'
  yLineHandle.dataset.role = 'y-line-drag-handle'
  yLineHandle.dataset.show = 'false'
  yLineHandle.dataset.displayType = 'tool'
  yLineHandle.contentEditable = 'false'
  yLineHandle.innerHTML = `<button type="button" class="add-button" data-action="add-col">${icons.plus}</button>`

  tableWrapper.appendChild(dragPreview)
  tableWrapper.appendChild(xLineHandle)
  tableWrapper.appendChild(yLineHandle)

  wrapper.appendChild(colHandle)
  wrapper.appendChild(rowHandle)
  wrapper.appendChild(tableWrapper)

  return {
    wrapper,
    colHandle,
    rowHandle,
    tableWrapper,
    dragPreview,
    xLineHandle,
    yLineHandle
  }
}

// Create the Table Block Plugin
export const tableBlockPlugin = $prose((ctx) => {
  return new Plugin({
    key: TABLE_BLOCK_KEY,

    state: {
      init() {
        return {
          hoverIndex: [0, 0],
          lineHoverIndex: [-1, -1],
          dragInfo: null
        }
      },
      apply(tr, value) {
        return value
      }
    },

    props: {
      decorations() {
        return DecorationSet.empty
      }
    },

    view(editorView) {
      const dom = createTableBlockDOM()
      let currentTableEl = null
      let pluginState = this.key.getState(editorView.state)
      let isOverHandle = false

      // Append to document body so it's not clipped by any overflow
      document.body.appendChild(dom.wrapper)

      // Compute column handle position (centered on top border)
      const computeColHandlePosition = (index) => {
        if (!currentTableEl) return
        const relatedDOM = getRelatedDOM(currentTableEl, index)
        if (!relatedDOM) return

        const { headerCol } = relatedDOM
        const rect = headerCol.getBoundingClientRect()

        dom.colHandle.dataset.show = 'true'
        dom.colHandle.style.left = `${rect.left + rect.width / 2}px`
        dom.colHandle.style.top = `${rect.top}px`
        dom.colHandle.style.transform = 'translate(-50%, -50%)'
      }

      // Compute row handle position (centered on left border)
      const computeRowHandlePosition = (index) => {
        if (!currentTableEl) return
        const relatedDOM = getRelatedDOM(currentTableEl, index)
        if (!relatedDOM) return

        const { row } = relatedDOM
        const rect = row.getBoundingClientRect()

        dom.rowHandle.dataset.show = 'true'
        dom.rowHandle.style.left = `${rect.left}px`
        dom.rowHandle.style.top = `${rect.top + rect.height / 2}px`
        dom.rowHandle.style.transform = 'translate(-50%, -50%)'
      }

      // Hide all handles
      const hideAllHandles = () => {
        dom.colHandle.dataset.show = 'false'
        dom.rowHandle.dataset.show = 'false'
        dom.xLineHandle.dataset.show = 'false'
        dom.yLineHandle.dataset.show = 'false'
        dom.colHandle.querySelector('.button-group').dataset.show = 'false'
        dom.rowHandle.querySelector('.button-group').dataset.show = 'false'
      }

      // Find table element from selection
      const findTableElement = (view) => {
        const { state } = view
        const { selection } = state
        const { $from } = selection

        for (let d = $from.depth; d > 0; d--) {
          const node = $from.node(d)
          if (node.type.name === 'table') {
            const pos = $from.before(d)
            try {
              const domNode = view.nodeDOM(pos)
              if (domNode && domNode.nodeName === 'TABLE') {
                return domNode
              }
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

      // Check if any button group is visible
      const isButtonGroupVisible = () => {
        return dom.colHandle.querySelector('.button-group').dataset.show === 'true' ||
               dom.rowHandle.querySelector('.button-group').dataset.show === 'true'
      }

      // Pointer move handler
      const handlePointerMove = throttle((e) => {
        if (!editorView.editable) return

        // Don't process if mouse is over handle or button group is visible
        if (isOverHandle || isButtonGroupVisible()) {
          return
        }

        const index = findPointerIndex(e, editorView)
        if (!index) {
          const tableEl = findTableElement(editorView)
          if (!tableEl) {
            hideAllHandles()
            currentTableEl = null
          }
          return
        }

        // Update current table
        currentTableEl = findTableElement(editorView)
        if (!currentTableEl) {
          hideAllHandles()
          return
        }

        const relatedDOM = getRelatedDOM(currentTableEl, index)
        if (!relatedDOM) return

        const [rowIndex, colIndex] = index
        const boundary = relatedDOM.col.getBoundingClientRect()

        const closeToBoundaryLeft = Math.abs(e.clientX - boundary.left) < 8
        const closeToBoundaryRight = Math.abs(boundary.right - e.clientX) < 8
        const closeToBoundaryTop = Math.abs(e.clientY - boundary.top) < 8
        const closeToBoundaryBottom = Math.abs(boundary.bottom - e.clientY) < 8

        const closeToBoundary = closeToBoundaryLeft || closeToBoundaryRight ||
          closeToBoundaryTop || closeToBoundaryBottom

        // Hide button groups when moving to different cells
        dom.colHandle.querySelector('.button-group').dataset.show = 'false'
        dom.rowHandle.querySelector('.button-group').dataset.show = 'false'

        if (closeToBoundary) {
          const contentBoundary = currentTableEl.getBoundingClientRect()

          dom.rowHandle.dataset.show = 'false'
          dom.colHandle.dataset.show = 'false'
          dom.xLineHandle.dataset.displayType = 'tool'
          dom.yLineHandle.dataset.displayType = 'tool'

          // Show vertical line handle (for adding columns)
          if (closeToBoundaryLeft || closeToBoundaryRight) {
            pluginState.lineHoverIndex[1] = closeToBoundaryLeft ? colIndex : colIndex + 1

            const x = closeToBoundaryLeft ? boundary.left : boundary.right
            dom.yLineHandle.dataset.show = 'true'
            dom.yLineHandle.style.height = `${contentBoundary.height}px`
            dom.yLineHandle.style.left = `${x}px`
            dom.yLineHandle.style.top = `${contentBoundary.top}px`
          } else {
            dom.yLineHandle.dataset.show = 'false'
          }

          // Show horizontal line handle (for adding rows) - not on header row
          if (rowIndex !== 0 && (closeToBoundaryTop || closeToBoundaryBottom)) {
            pluginState.lineHoverIndex[0] = closeToBoundaryTop ? rowIndex : rowIndex + 1

            const y = closeToBoundaryTop ? boundary.top : boundary.bottom
            dom.xLineHandle.dataset.show = 'true'
            dom.xLineHandle.style.width = `${contentBoundary.width}px`
            dom.xLineHandle.style.left = `${contentBoundary.left}px`
            dom.xLineHandle.style.top = `${y}px`
          } else {
            dom.xLineHandle.dataset.show = 'false'
          }

          return
        }

        // Not close to boundary - show cell handles
        pluginState.lineHoverIndex = [-1, -1]
        dom.xLineHandle.dataset.show = 'false'
        dom.yLineHandle.dataset.show = 'false'

        pluginState.hoverIndex = index
        computeColHandlePosition(index)
        computeRowHandlePosition(index)
      }, 16)

      // Pointer leave handler
      const handlePointerLeave = () => {
        setTimeout(() => {
          if (isOverHandle) return
          hideAllHandles()
        }, 300)
      }

      // Execute commands
      const executeCommand = (action) => {
        const commands = ctx.get(commandsCtx)
        const view = ctx.get(editorViewCtx)

        const getTablePos = () => {
          const { selection } = view.state
          const { $from } = selection
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'table') {
              return $from.before(d) + 1
            }
          }
          return 1
        }

        const pos = getTablePos()
        const [rowIndex, colIndex] = pluginState.hoverIndex
        const [lineRowIndex, lineColIndex] = pluginState.lineHoverIndex

        switch (action) {
          case 'align-left':
            commands.call(selectColCommand.key, { pos, index: colIndex })
            commands.call(setAlignCommand.key, 'left')
            break
          case 'align-center':
            commands.call(selectColCommand.key, { pos, index: colIndex })
            commands.call(setAlignCommand.key, 'center')
            break
          case 'align-right':
            commands.call(selectColCommand.key, { pos, index: colIndex })
            commands.call(setAlignCommand.key, 'right')
            break
          case 'delete-col':
            commands.call(selectColCommand.key, { pos, index: colIndex })
            commands.call(deleteSelectedCellsCommand.key)
            hideAllHandles()
            break
          case 'delete-row':
            commands.call(selectRowCommand.key, { pos, index: rowIndex })
            commands.call(deleteSelectedCellsCommand.key)
            hideAllHandles()
            break
          case 'add-row': {
            const rows = currentTableEl?.querySelectorAll('tr') || []
            if (lineRowIndex < 0) break
            if (rows.length === lineRowIndex) {
              commands.call(selectRowCommand.key, { pos, index: lineRowIndex - 1 })
              commands.call(addRowAfterCommand.key)
            } else {
              commands.call(selectRowCommand.key, { pos, index: lineRowIndex })
              commands.call(addRowBeforeCommand.key)
            }
            commands.call(selectRowCommand.key, { pos, index: lineRowIndex })
            dom.xLineHandle.dataset.show = 'false'
            break
          }
          case 'add-col': {
            const cols = currentTableEl?.querySelector('tr')?.children || []
            if (lineColIndex < 0) break
            if (cols.length === lineColIndex) {
              commands.call(selectColCommand.key, { pos, index: lineColIndex - 1 })
              commands.call(addColAfterCommand.key)
            } else {
              commands.call(selectColCommand.key, { pos, index: lineColIndex })
              commands.call(addColBeforeCommand.key)
            }
            commands.call(selectColCommand.key, { pos, index: lineColIndex })
            dom.yLineHandle.dataset.show = 'false'
            break
          }
        }

        requestAnimationFrame(() => {
          view.focus()
        })
      }

      // Select column
      const selectCol = () => {
        const commands = ctx.get(commandsCtx)
        const view = ctx.get(editorViewCtx)
        const [, colIndex] = pluginState.hoverIndex

        const { selection } = view.state
        const { $from } = selection
        let pos = 1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'table') {
            pos = $from.before(d) + 1
            break
          }
        }

        commands.call(selectColCommand.key, { pos, index: colIndex })

        const buttonGroup = dom.colHandle.querySelector('.button-group')
        buttonGroup.dataset.show = buttonGroup.dataset.show === 'true' ? 'false' : 'true'
      }

      // Select row
      const selectRow = () => {
        const commands = ctx.get(commandsCtx)
        const view = ctx.get(editorViewCtx)
        const [rowIndex] = pluginState.hoverIndex

        const { selection } = view.state
        const { $from } = selection
        let pos = 1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'table') {
            pos = $from.before(d) + 1
            break
          }
        }

        commands.call(selectRowCommand.key, { pos, index: rowIndex })

        const buttonGroup = dom.rowHandle.querySelector('.button-group')
        // Only show button group for non-header rows
        if (rowIndex > 0) {
          buttonGroup.dataset.show = buttonGroup.dataset.show === 'true' ? 'false' : 'true'
        }
      }

      // Drag handlers for reordering
      const handleDragStart = (e, type) => {
        if (!editorView.editable) {
          e.preventDefault()
          return
        }

        e.stopPropagation()
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'

        const [rowIndex, colIndex] = pluginState.hoverIndex

        pluginState.dragInfo = {
          startCoords: [e.clientX, e.clientY],
          startIndex: type === 'row' ? rowIndex : colIndex,
          endIndex: type === 'row' ? rowIndex : colIndex,
          type
        }

        // Hide other handle and button groups
        if (type === 'row') {
          dom.colHandle.dataset.show = 'false'
          dom.rowHandle.querySelector('.button-group').dataset.show = 'false'
        } else {
          dom.rowHandle.dataset.show = 'false'
          dom.colHandle.querySelector('.button-group').dataset.show = 'false'
        }

        // Render drag preview
        requestAnimationFrame(() => {
          renderDragPreview(type)
        })
      }

      const renderDragPreview = (type) => {
        if (!currentTableEl) return

        const previewRoot = dom.dragPreview.querySelector('tbody')
        while (previewRoot.firstChild) previewRoot.removeChild(previewRoot.firstChild)

        const tableRect = currentTableEl.getBoundingClientRect()
        const [rowIndex, colIndex] = pluginState.hoverIndex

        if (type === 'row') {
          const rows = currentTableEl.querySelectorAll('tr')
          const row = rows[rowIndex]
          if (!row) return

          previewRoot.appendChild(row.cloneNode(true))
          const height = row.getBoundingClientRect().height

          dom.dragPreview.style.width = `${tableRect.width}px`
          dom.dragPreview.style.height = `${height}px`
          dom.dragPreview.dataset.direction = 'vertical'
        } else {
          const rows = currentTableEl.querySelectorAll('tr')
          let width

          Array.from(rows).forEach((row) => {
            const col = row.children[colIndex]
            if (!col) return

            if (width === undefined) width = col.getBoundingClientRect().width

            const tr = row.cloneNode(false)
            tr.appendChild(col.cloneNode(true))
            previewRoot.appendChild(tr)
          })

          dom.dragPreview.style.width = `${width}px`
          dom.dragPreview.style.height = `${tableRect.height}px`
          dom.dragPreview.dataset.direction = 'horizontal'
        }

        dom.dragPreview.dataset.show = 'true'
      }

      const handleDragOver = throttle((e) => {
        if (!pluginState.dragInfo) return
        if (dom.dragPreview.dataset.show === 'false') return
        if (!currentTableEl) return

        const tableRect = currentTableEl.getBoundingClientRect()
        const info = pluginState.dragInfo

        if (info.type === 'col') {
          const relatedDOM = getRelatedDOM(currentTableEl, pluginState.hoverIndex)
          if (!relatedDOM) return

          const width = relatedDOM.col.getBoundingClientRect().width
          const previewLeft = e.clientX - width / 2

          // Clamp preview position
          const minLeft = tableRect.left - 20
          const maxLeft = tableRect.right - width + 20
          const clampedLeft = Math.max(minLeft, Math.min(maxLeft, previewLeft))

          dom.dragPreview.style.left = `${clampedLeft}px`
          dom.dragPreview.style.top = `${tableRect.top}px`

          // Find drop target
          const firstRow = currentTableEl.querySelector('tr')
          if (firstRow) {
            const cells = Array.from(firstRow.children)
            const dragOverIndex = cells.findIndex((cell) => {
              const rect = cell.getBoundingClientRect()
              return rect.left <= e.clientX && e.clientX <= rect.right
            })
            if (dragOverIndex >= 0) {
              info.endIndex = dragOverIndex

              // Show indicator line
              const [startX] = info.startCoords
              const direction = startX < e.clientX ? 'right' : 'left'
              const targetCell = cells[dragOverIndex]
              const x = direction === 'left' ? targetCell.getBoundingClientRect().left : targetCell.getBoundingClientRect().right

              dom.yLineHandle.dataset.show = 'true'
              dom.yLineHandle.dataset.displayType = 'indicator'
              dom.yLineHandle.style.height = `${tableRect.height}px`
              dom.yLineHandle.style.left = `${x}px`
              dom.yLineHandle.style.top = `${tableRect.top}px`
            }
          }
        } else if (info.type === 'row') {
          const relatedDOM = getRelatedDOM(currentTableEl, pluginState.hoverIndex)
          if (!relatedDOM) return

          const height = relatedDOM.row.getBoundingClientRect().height
          const previewTop = e.clientY - height / 2

          // Clamp preview position
          const minTop = tableRect.top - 20
          const maxTop = tableRect.bottom - height + 20
          const clampedTop = Math.max(minTop, Math.min(maxTop, previewTop))

          dom.dragPreview.style.top = `${clampedTop}px`
          dom.dragPreview.style.left = `${tableRect.left}px`

          // Find drop target
          const rows = Array.from(currentTableEl.querySelectorAll('tr'))
          const dragOverIndex = rows.findIndex((row) => {
            const rect = row.getBoundingClientRect()
            return rect.top <= e.clientY && e.clientY <= rect.bottom
          })
          if (dragOverIndex >= 0) {
            info.endIndex = dragOverIndex

            // Show indicator line
            const [, startY] = info.startCoords
            const direction = startY < e.clientY ? 'down' : 'up'
            const targetRow = rows[dragOverIndex]
            const y = direction === 'up' ? targetRow.getBoundingClientRect().top : targetRow.getBoundingClientRect().bottom

            dom.xLineHandle.dataset.show = 'true'
            dom.xLineHandle.dataset.displayType = 'indicator'
            dom.xLineHandle.style.width = `${tableRect.width}px`
            dom.xLineHandle.style.left = `${tableRect.left}px`
            dom.xLineHandle.style.top = `${y}px`
          }
        }
      }, 16)

      const handleDragEnd = () => {
        const previewRoot = dom.dragPreview.querySelector('tbody')
        while (previewRoot.firstChild) previewRoot.removeChild(previewRoot.firstChild)
        dom.dragPreview.dataset.show = 'false'
      }

      const handleDrop = () => {
        if (dom.dragPreview.dataset.show === 'false') return
        if (!pluginState.dragInfo) return

        const info = pluginState.dragInfo
        dom.xLineHandle.dataset.show = 'false'
        dom.yLineHandle.dataset.show = 'false'

        if (info.startIndex === info.endIndex) {
          pluginState.dragInfo = null
          return
        }

        const commands = ctx.get(commandsCtx)
        const view = ctx.get(editorViewCtx)

        const { selection } = view.state
        const { $from } = selection
        let pos = 1
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'table') {
            pos = $from.before(d) + 1
            break
          }
        }

        const payload = {
          from: info.startIndex,
          to: info.endIndex,
          pos
        }

        if (info.type === 'col') {
          commands.call(selectColCommand.key, { pos, index: info.startIndex })
          commands.call(moveColCommand.key, payload)
          computeColHandlePosition([0, info.endIndex])
        } else {
          commands.call(selectRowCommand.key, { pos, index: info.startIndex })
          commands.call(moveRowCommand.key, payload)
          computeRowHandlePosition([info.endIndex, 0])
        }

        pluginState.dragInfo = null

        requestAnimationFrame(() => {
          view.focus()
        })
      }

      // Track mouse enter/leave on handles
      const handleMouseEnter = () => { isOverHandle = true }
      const handleMouseLeave = () => {
        isOverHandle = false
        // Delay hiding to allow moving between handles
        setTimeout(() => {
          if (!isOverHandle) {
            hideAllHandles()
          }
        }, 300)
      }

      // Event listeners on handles
      dom.colHandle.addEventListener('mouseenter', handleMouseEnter)
      dom.colHandle.addEventListener('mouseleave', handleMouseLeave)
      dom.rowHandle.addEventListener('mouseenter', handleMouseEnter)
      dom.rowHandle.addEventListener('mouseleave', handleMouseLeave)
      dom.xLineHandle.addEventListener('mouseenter', handleMouseEnter)
      dom.xLineHandle.addEventListener('mouseleave', handleMouseLeave)
      dom.yLineHandle.addEventListener('mouseenter', handleMouseEnter)
      dom.yLineHandle.addEventListener('mouseleave', handleMouseLeave)

      // Also track button groups (they are positioned outside their parent handle)
      const colButtonGroup = dom.colHandle.querySelector('.button-group')
      const rowButtonGroup = dom.rowHandle.querySelector('.button-group')
      colButtonGroup.addEventListener('mouseenter', handleMouseEnter)
      colButtonGroup.addEventListener('mouseleave', handleMouseLeave)
      rowButtonGroup.addEventListener('mouseenter', handleMouseEnter)
      rowButtonGroup.addEventListener('mouseleave', handleMouseLeave)

      // Handle clicks on col/row handles
      dom.colHandle.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) {
          const action = e.target.closest('[data-action]').dataset.action
          executeCommand(action)
        } else {
          selectCol()
        }
        e.preventDefault()
        e.stopPropagation()
      })

      dom.rowHandle.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) {
          const action = e.target.closest('[data-action]').dataset.action
          executeCommand(action)
        } else {
          selectRow()
        }
        e.preventDefault()
        e.stopPropagation()
      })

      // Handle clicks on line handles
      dom.xLineHandle.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action
        if (action) executeCommand(action)
        e.preventDefault()
        e.stopPropagation()
      })

      dom.yLineHandle.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action
        if (action) executeCommand(action)
        e.preventDefault()
        e.stopPropagation()
      })

      // Prevent stealing focus
      dom.colHandle.addEventListener('mousedown', (e) => e.preventDefault())
      dom.rowHandle.addEventListener('mousedown', (e) => e.preventDefault())
      dom.xLineHandle.addEventListener('mousedown', (e) => e.preventDefault())
      dom.yLineHandle.addEventListener('mousedown', (e) => e.preventDefault())

      // Drag events on handles
      dom.colHandle.addEventListener('dragstart', (e) => handleDragStart(e, 'col'))
      dom.rowHandle.addEventListener('dragstart', (e) => handleDragStart(e, 'row'))

      // Global drag events
      window.addEventListener('dragover', handleDragOver)
      window.addEventListener('dragend', handleDragEnd)
      window.addEventListener('drop', handleDrop)

      // Listen for pointer events on the editor
      editorView.dom.addEventListener('pointermove', handlePointerMove)
      editorView.dom.addEventListener('pointerleave', handlePointerLeave)

      // Click outside handles closes button groups
      const handleEditorClick = () => {
        if (!isOverHandle) {
          dom.colHandle.querySelector('.button-group').dataset.show = 'false'
          dom.rowHandle.querySelector('.button-group').dataset.show = 'false'
        }
      }
      editorView.dom.addEventListener('click', handleEditorClick)

      // Hide handles on scroll (since they use fixed positioning)
      const handleScroll = () => {
        hideAllHandles()
      }
      // Listen to scroll on the editor container and window
      const scrollContainer = editorView.dom.closest('.wysiwyg-rendered') || editorView.dom.parentElement
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll)
      }
      window.addEventListener('scroll', handleScroll, true)

      return {
        update(view) {
          if (isInTable(view.state)) {
            currentTableEl = findTableElement(view)
          }
        },
        destroy() {
          window.removeEventListener('dragover', handleDragOver)
          window.removeEventListener('dragend', handleDragEnd)
          window.removeEventListener('drop', handleDrop)

          editorView.dom.removeEventListener('pointermove', handlePointerMove)
          editorView.dom.removeEventListener('pointerleave', handlePointerLeave)
          editorView.dom.removeEventListener('click', handleEditorClick)

          if (dom.wrapper.parentElement) {
            dom.wrapper.parentElement.removeChild(dom.wrapper)
          }
        }
      }
    }
  })
})
